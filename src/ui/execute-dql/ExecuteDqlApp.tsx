import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { App } from '@modelcontextprotocol/ext-apps';
import { useDocumentTheme } from '@modelcontextprotocol/ext-apps/react';
import type { RangedFieldTypes, ResultRecord } from '@dynatrace-sdk/client-query';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Text, Code } from '@dynatrace/strato-components/typography';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { TimeseriesChart, type Timeseries } from '@dynatrace/strato-components/charts';
import { ToggleButtonGroup } from '@dynatrace/strato-components/forms';
import { Tooltip } from '@dynatrace/strato-components/overlays';
import {
  DataTableIcon,
  DocumentStackIcon,
  LineChartIcon,
  RefreshIcon,
  StackedAreaChartIcon,
  WarningIcon,
} from '@dynatrace/strato-icons';
import { LoadingState, ErrorState, MetadataIcon, type ViewMode, type ChartVariant } from '../components';
import { createNotebooksURL } from '../../utils/environment-url-parser';
import { safeConvertToTimeseries } from './dql-chart-helpers';

// Constants
const SUBDUED_TEXT_COLOR = 'var(--dt-colors-text-neutral-subdued)';
const EMPTY_STATE_TEXT_OPACITY = 0.6;
const DEFAULT_PAGE_SIZE = 10;

/** Structured metadata from the tool result _meta. */
interface ParsedMetadata {
  scannedRecords?: number;
  scannedBytes?: number;
  sampled?: boolean;
  warnings: string[];
}

/** Budget state information from Grail query */
interface BudgetState {
  totalBytesScanned: number;
  budgetLimitBytes: number;
  budgetLimitGB: number;
}

/** Metadata structure returned by execute_dql tool in _meta */
interface ExecuteDqlMeta {
  records?: ResultRecord[];
  types?: RangedFieldTypes[];
  analysisTimeframe?: { start?: string; end?: string };
  scannedRecords?: number;
  scannedBytes?: number;
  sampled?: boolean;
  environmentUrl?: string;
  budgetState?: BudgetState;
  warnings?: string[];
  recordLimit?: number;
  recordLimitReached?: boolean;
}

type HostTheme = 'light' | 'dark';

function isValidHostTheme(theme: unknown): theme is HostTheme {
  return theme === 'light' || theme === 'dark';
}

/** Type guard for text content in tool results */
function isTextContent(content: unknown): content is { type: 'text'; text: string } {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    (content as { type: string }).type === 'text' &&
    'text' in content
  );
}

/**
 * Build Strato DataTable column definitions from the record keys.
 * @param columns - Array of column names to create definitions for
 * @returns Array of Strato DataTable column definitions
 * @example
 * buildColumns(['timestamp', 'event.type', 'status'])
 * // Returns array of column definitions where each column:
 * // - has id and header set to the column name
 * // - includes an accessor to retrieve the value from row data
 * // - renders null values as italic "null" text
 * // - renders objects as formatted JSON strings
 */
function buildColumns(columns: string[]): DataTableColumnDef<ResultRecord>[] {
  return columns.map((col) => ({
    id: col,
    header: col,
    accessor: (row: ResultRecord) => row[col],
    width: 'auto' as const,
  }));
}

/** Combined toggle value for our chart: 'table' | 'line' | 'area' */
type CombinedChartVariantToggleValue = 'table' | ChartVariant;

export interface ToolResultState {
  status: 'loading' | 'error' | 'success';
  errorMessage?: string;
  metadata: ParsedMetadata;
  records: ResultRecord[];
  columns: string[];
  fieldTypes: RangedFieldTypes[];
  /** Analysis timeframe from query metadata, used for fallback chart rendering. */
  analysisTimeframe?: { start?: string; end?: string };
  /** Timestamp when the query results were received. */
  executedAt?: Date;
  /** Dynatrace environment URL. */
  environmentUrl?: string;
}

/**
 * Process a tool result into state. Uses _meta for structured data and text for warnings.
 * Extracted for reuse between the initial ontoolresult notification and the refresh callServerTool response.
 */
export function processToolResult(text: string | undefined, meta: ExecuteDqlMeta | undefined): ToolResultState {
  if (!text) {
    return {
      status: 'error',
      errorMessage: 'No result data received.',
      metadata: { warnings: [] },
      records: [],
      columns: [],
      fieldTypes: [],
      analysisTimeframe: undefined,
      environmentUrl: undefined,
    };
  }

  // Extract structured data from _meta (preferred) or fallback to empty arrays
  const records = meta?.records ?? [];
  const fieldTypes = meta?.types ?? [];
  const analysisTimeframe = meta?.analysisTimeframe;

  // Build metadata object from structured _meta data
  const metadata: ParsedMetadata = {
    scannedRecords: meta?.scannedRecords,
    scannedBytes: meta?.scannedBytes,
    sampled: meta?.sampled,
    warnings: meta?.warnings ?? [],
  };

  // Build column list from records
  const columnSet = new Set<string>();
  for (const record of records) {
    if (record && typeof record === 'object') {
      for (const key of Object.keys(record)) {
        columnSet.add(key);
      }
    }
  }

  return {
    status: 'success',
    metadata,
    records,
    columns: Array.from(columnSet),
    fieldTypes,
    analysisTimeframe,
    executedAt: new Date(),
    environmentUrl: meta?.environmentUrl,
  };
}

export function ExecuteDqlApp() {
  // MCP Host Theme Detection
  const documentTheme = useDocumentTheme();
  // local theme
  const [hostTheme, setHostTheme] = useState<'light' | 'dark' | null>(null);

  const [state, setState] = useState<ToolResultState>({
    status: 'loading',
    metadata: { warnings: [] },
    records: [],
    columns: [],
    fieldTypes: [],
    analysisTimeframe: undefined,
    environmentUrl: undefined,
  });
  const [toggleValue, setToggleValue] = useState<CombinedChartVariantToggleValue>('table');

  const viewMode: ViewMode = toggleValue === 'table' ? 'table' : 'chart';
  const chartVariant: ChartVariant = toggleValue === 'area' ? 'area' : 'line';

  const appRef = useRef<App | null>(null);
  const hasInitializedViewModeRef = useRef(false);
  const [toolArguments, setToolArguments] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const app = new App({ name: 'DQL Results Viewer', version: '1.0.0' });
    appRef.current = app;

    app.ontoolinput = (params) => {
      setToolArguments(params.arguments ?? null);
    };

    app.ontoolresult = (result) => {
      const textContent = result.content?.find(isTextContent);
      const meta = result._meta as ExecuteDqlMeta | undefined;
      setState(processToolResult(textContent?.text, meta));
    };

    // Listen on Host Context Changes in order to update the current theme
    app.onhostcontextchanged = (context) => {
      if (isValidHostTheme(context.theme)) {
        setHostTheme(context.theme);
      }
    };

    void (async () => {
      try {
        await app.connect();

        const initialHostTheme = app.getHostContext()?.theme;
        if (isValidHostTheme(initialHostTheme)) {
          setHostTheme(initialHostTheme);
        }
      } catch (error) {
        console.warn('Failed to connect MCP app for host context', error);
      }
    })();

    return () => {
      app.ontoolinput = undefined;
      app.ontoolresult = undefined;
      app.onhostcontextchanged = undefined;
      app.close();
      appRef.current = null;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!appRef.current || !toolArguments) return;

    setState({
      status: 'loading',
      metadata: { warnings: [] },
      records: [],
      columns: [],
      fieldTypes: [],
      analysisTimeframe: undefined,
      environmentUrl: undefined,
    });

    try {
      // call execute_dql tool and refresh the result
      const result = await appRef.current.callServerTool({
        name: 'execute_dql',
        arguments: toolArguments,
      });

      const textContent = result.content?.find(isTextContent);
      const meta = result._meta as ExecuteDqlMeta | undefined;
      setState(processToolResult(textContent?.text, meta));
    } catch (error) {
      setState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Refresh failed.',
        metadata: { warnings: [] },
        records: [],
        columns: [],
        fieldTypes: [],
        analysisTimeframe: undefined,
        environmentUrl: undefined,
      });
    }
  }, [toolArguments]);

  const handleOpenInNotebooks = useCallback(async () => {
    if (!appRef.current) return;

    const query = toolArguments?.dqlStatement as string | undefined;
    const envUrl = state.environmentUrl;

    if (!query || !envUrl) {
      console.warn('Missing query or environment URL');
      return;
    }

    const notebooksUrl = createNotebooksURL(envUrl, query);
    await appRef.current.openLink({ url: notebooksUrl });
  }, [toolArguments, state.environmentUrl]);

  const tableColumns = useMemo(() => buildColumns(state.columns), [state.columns]);
  const tableData = state.records;
  const timeseriesData = useMemo(
    () => safeConvertToTimeseries(state.records, state.fieldTypes, state.analysisTimeframe),
    [state.records, state.fieldTypes, state.analysisTimeframe],
  );
  const canChart = timeseriesData.length > 0;

  const metadataText = useMemo(() => {
    const parts: string[] = [];
    if (state.executedAt) {
      parts.push(`Executed at: ${state.executedAt.toLocaleString()}`);
    }
    if (state.metadata.scannedBytes !== undefined) {
      const scannedGB = (state.metadata.scannedBytes / (1000 * 1000 * 1000)).toFixed(2);
      parts.push(`Scanned: ${scannedGB} GB`);
    }
    if (state.metadata.scannedRecords !== undefined) {
      parts.push(`${state.metadata.scannedRecords.toLocaleString()} records scanned`);
    }
    if (state.metadata.sampled) {
      parts.push('Sampled');
    }
    return parts.length > 0 ? parts.join(', ') : '';
  }, [state.executedAt, state.metadata.scannedBytes, state.metadata.scannedRecords, state.metadata.sampled]);

  // Auto-select view only once on first successful data load.
  // After that, preserve the user's manual toggle choice across refreshes.
  useEffect(() => {
    if (hasInitializedViewModeRef.current || state.status !== 'success') {
      return;
    }

    setToggleValue(canChart ? 'line' : 'table');
    hasInitializedViewModeRef.current = true;
  }, [canChart, state.status]);

  // Keep Strato theme in sync with MCP host theme once available.
  useEffect(() => {
    if (!hostTheme) {
      return;
    }

    document.documentElement.setAttribute('data-theme', hostTheme);

    const appRootElement = document.querySelector('[data-dt-component="AppRoot"]');
    if (appRootElement instanceof HTMLElement) {
      appRootElement.setAttribute('data-theme', hostTheme);
    }
  }, [hostTheme]);

  if (state.status === 'loading') {
    return <LoadingState message='Loading query results...' />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.errorMessage ?? 'An unknown error occurred.'} />;
  }

  const { metadata } = state;

  return (
    <div className='execute-dql-results-surface'>
      <Flex flexDirection='column' gap={8} className='execute-dql-app'>
        {/* Compact metadata toolbar */}
        <Flex flexDirection='row' gap={12} alignItems='center' className='execute-dql-toolbar'>
          <Text
            textStyle='small'
            style={{ color: 'var(--dt-colors-text-neutral-default)' }}
            className='execute-dql-record-count'
          >
            {state.records.length} {state.records.length === 1 ? 'record' : 'records'}
          </Text>
          {metadataText && (
            <Text textStyle='small' style={{ color: SUBDUED_TEXT_COLOR }} className='execute-dql-metadata-text'>
              {metadataText}
            </Text>
          )}
          {metadata.warnings.length > 0 && (
            <Flex flexDirection='row' gap={8} alignItems='center' className='execute-dql-warnings'>
              {metadata.warnings.map((warning, i) => (
                <MetadataIcon key={`${warning}-${i}`} icon={<WarningIcon />} tooltip={warning} warning />
              ))}
            </Flex>
          )}
          <Flex
            flexDirection='row'
            gap={4}
            alignItems='center'
            style={{ marginLeft: 'auto' }}
            className='execute-dql-toolbar-actions'
          >
            <ToggleButtonGroup
              value={toggleValue}
              onChange={(val) => setToggleValue(val as CombinedChartVariantToggleValue)}
            >
              <Tooltip text='Table'>
                <ToggleButtonGroup.Item value='table' aria-label='Switch to table view'>
                  <ToggleButtonGroup.Prefix>
                    <DataTableIcon />
                  </ToggleButtonGroup.Prefix>
                </ToggleButtonGroup.Item>
              </Tooltip>
              <Tooltip text='Line'>
                <ToggleButtonGroup.Item value='line' disabled={!canChart} aria-label='Switch to line chart view'>
                  <ToggleButtonGroup.Prefix>
                    <LineChartIcon />
                  </ToggleButtonGroup.Prefix>
                </ToggleButtonGroup.Item>
              </Tooltip>
              <Tooltip text='Area'>
                <ToggleButtonGroup.Item value='area' disabled={!canChart} aria-label='Switch to area chart view'>
                  <ToggleButtonGroup.Prefix>
                    <StackedAreaChartIcon />
                  </ToggleButtonGroup.Prefix>
                </ToggleButtonGroup.Item>
              </Tooltip>
            </ToggleButtonGroup>

            <Tooltip text='Open in Notebooks'>
              <Button
                variant='default'
                onClick={handleOpenInNotebooks}
                aria-label='Open query in Dynatrace Notebooks'
                className='execute-dql-open-button'
              >
                <Button.Prefix>
                  <DocumentStackIcon />
                </Button.Prefix>
                <Button.Label className='execute-dql-open-button-label'>Open in Notebooks</Button.Label>
              </Button>
            </Tooltip>
            <Tooltip text='Refresh'>
              <Button variant='default' onClick={handleRefresh} aria-label='Refresh query results'>
                <Button.Prefix>
                  <RefreshIcon />
                </Button.Prefix>
              </Button>
            </Tooltip>
          </Flex>
        </Flex>

        {state.records.length === 0 ? (
          <Flex flexDirection='column' alignItems='center' justifyContent='center' padding={32}>
            <Text textStyle='base-emphasized'>No records returned</Text>
            <Text textStyle='small' style={{ opacity: EMPTY_STATE_TEXT_OPACITY }}>
              The query executed successfully but returned no data. Try adjusting your query or timeframe.
            </Text>
          </Flex>
        ) : viewMode === 'table' ? (
          <DataTable
            data={tableData}
            columns={tableColumns}
            sortable
            resizable
            fullWidth
            variant={{ rowDensity: 'condensed' }}
          >
            <DataTable.Pagination defaultPageSize={DEFAULT_PAGE_SIZE} />
          </DataTable>
        ) : (
          <TimeseriesChart data={timeseriesData} variant={chartVariant}>
            <TimeseriesChart.Legend />
            <TimeseriesChart.YAxis label='Value' />
          </TimeseriesChart>
        )}
      </Flex>
    </div>
  );
}
