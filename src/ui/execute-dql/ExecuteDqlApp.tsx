import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { App } from '@modelcontextprotocol/ext-apps';
import type { RangedFieldTypes } from '@dynatrace-sdk/client-query';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Text, Code } from '@dynatrace/strato-components/typography';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components-preview/tables';
import { TimeseriesChart, convertToTimeseries, type Timeseries } from '@dynatrace/strato-components-preview/charts';
import { ToggleButtonGroup } from '@dynatrace/strato-components-preview/forms';
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

// Constants
const DEFAULT_TIMEFRAME_MS = 2 * 60 * 60 * 1000; // 2 hours
const RECORD_COUNT_TEXT_OPACITY = 0.5;
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
  records?: Record<string, unknown>[];
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
 * Build DataTable column definitions from the record keys.
 */
function buildColumns(columns: string[]): DataTableColumnDef<Record<string, unknown>>[] {
  return columns.map((col) => ({
    id: col,
    header: col,
    accessor: (row: Record<string, unknown>) => row[col],
    width: 'auto' as const,
    cell: ({ value }: { value: unknown }) => {
      if (value === null || value === undefined) {
        return (
          <Text textStyle='small'>
            <em>null</em>
          </Text>
        );
      }
      if (typeof value === 'object') {
        return <Code>{JSON.stringify(value)}</Code>;
      }
      return <Text textStyle='small'>{String(value)}</Text>;
    },
  }));
}

export interface ToolResultState {
  status: 'loading' | 'error' | 'success';
  errorMessage?: string;
  metadata: ParsedMetadata;
  records: Record<string, unknown>[];
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
 * Safely convert DQL records to Timeseries using Strato's convertToTimeseries.
 * Falls back to a manual conversion for array-based timeseries that lack
 * explicit timeframe/interval columns (e.g. timeseries queries grouped by a
 * dimension where the user projected away the time columns).
 */
function safeConvertToTimeseries(
  records: Record<string, unknown>[],
  fieldTypes: RangedFieldTypes[],
  analysisTimeframe?: { start?: string; end?: string },
): Timeseries[] {
  if (records.length === 0 || fieldTypes.length === 0) return [];
  try {
    // @ts-expect-error - Record<string, unknown> is compatible with ResultRecord at runtime
    const result = convertToTimeseries(records, fieldTypes);
    if (result.length > 0) return result;
  } catch (error) {
    console.warn('Failed to convert to timeseries using standard conversion:', error);
    // Fall back to manual conversion
  }

  // Fallback: build timeseries manually from numeric array columns.
  // This handles cases where timeseries data has no timeframe/interval columns.
  return fallbackConvertArrayTimeseries(records, fieldTypes, analysisTimeframe);
}

/**
 * Fallback conversion for timeseries data stored as numeric arrays without
 * explicit timeframe/interval columns. Builds Timeseries objects using the
 * analysisTimeframe from query metadata (or a default 2h range).
 */
function fallbackConvertArrayTimeseries(
  records: Record<string, unknown>[],
  fieldTypes: RangedFieldTypes[],
  analysisTimeframe?: { start?: string; end?: string },
): Timeseries[] {
  // Identify numeric array columns and string (label) columns from field types
  const arrayColumns: string[] = [];
  const stringColumns: string[] = [];

  for (const rangedType of fieldTypes) {
    for (const [key, fieldType] of Object.entries(rangedType.mappings)) {
      if (!fieldType) continue;
      if (fieldType.type === 'array' && fieldType.types?.length) {
        const hasNumeric = fieldType.types.some((t) => {
          const elType = t.mappings?.element?.type;
          return elType === 'double' || elType === 'long';
        });
        if (hasNumeric) arrayColumns.push(key);
      }
      if (fieldType.type === 'string') {
        stringColumns.push(key);
      }
    }
  }

  if (arrayColumns.length === 0) return [];

  // Determine time range from metadata or default to 2h
  const now = new Date();
  const defaultStart = new Date(now.getTime() - DEFAULT_TIMEFRAME_MS);
  const rangeStart = analysisTimeframe?.start ? new Date(analysisTimeframe.start) : defaultStart;
  const rangeEnd = analysisTimeframe?.end ? new Date(analysisTimeframe.end) : now;

  const result: Timeseries[] = [];

  for (const record of records) {
    for (const arrayCol of arrayColumns) {
      const values = record[arrayCol];
      if (!Array.isArray(values) || values.length === 0) continue;

      // Build the series name from string columns or fall back to array column name
      const label = stringColumns.length > 0 ? stringColumns.map((c) => String(record[c] ?? '')).join(' – ') : arrayCol;
      const seriesName: string | string[] = arrayColumns.length > 1 ? [label, arrayCol] : label;

      // Compute interval per data point
      const totalMs = rangeEnd.getTime() - rangeStart.getTime();
      const intervalMs = totalMs / values.length;

      const datapoints: Timeseries['datapoints'] = [];
      for (let i = 0; i < values.length; i++) {
        const v = values[i] as number | null;
        if (v !== null && v !== undefined) {
          datapoints.push({
            start: new Date(rangeStart.getTime() + i * intervalMs),
            end: new Date(rangeStart.getTime() + (i + 1) * intervalMs),
            value: v,
          });
        }
      }

      if (datapoints.length > 0) {
        result.push({ name: seriesName, datapoints });
      }
    }
  }

  return result;
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
  const [state, setState] = useState<ToolResultState>({
    status: 'loading',
    metadata: { warnings: [] },
    records: [],
    columns: [],
    fieldTypes: [],
    analysisTimeframe: undefined,
    environmentUrl: undefined,
  });
  /** Combined toggle value: 'table' | 'line' | 'area' */
  type ToggleValue = 'table' | ChartVariant;
  const [toggleValue, setToggleValue] = useState<ToggleValue>('table');

  const viewMode: ViewMode = toggleValue === 'table' ? 'table' : 'chart';
  const chartVariant: ChartVariant = toggleValue === 'area' ? 'area' : 'line';

  const appRef = useRef<App | null>(null);
  const [toolArguments, setToolArguments] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const app = new App({ name: 'DQL Results Viewer', version: '1.0.0' });
    appRef.current = app;
    app.connect();

    app.ontoolinput = (params) => {
      setToolArguments(params.arguments ?? null);
    };

    app.ontoolresult = (result) => {
      const textContent = result.content?.find(isTextContent);
      const meta = result._meta as ExecuteDqlMeta | undefined;
      setState(processToolResult(textContent?.text, meta));
    };

    return () => {
      app.ontoolinput = undefined;
      app.ontoolresult = undefined;
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
  const tableData = useMemo(() => state.records, [state.records]);
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

  // Auto-select chart view when timeseries data is available
  useEffect(() => {
    if (canChart) {
      setToggleValue('line');
    } else {
      setToggleValue('table');
    }
  }, [canChart]);

  if (state.status === 'loading') {
    return <LoadingState message='Loading query results...' />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.errorMessage ?? 'An unknown error occurred.'} />;
  }

  const { metadata } = state;

  return (
    <Flex flexDirection='column' gap={4}>
      {/* Compact metadata toolbar */}
      <Flex flexDirection='row' gap={12} alignItems='center' padding={4} style={{ paddingLeft: 8 }}>
        <Text textStyle='small'>
          {state.records.length} {state.records.length === 1 ? 'record' : 'records'}
        </Text>
        {metadataText && (
          <Text textStyle='small' style={{ opacity: RECORD_COUNT_TEXT_OPACITY }}>
            {metadataText}
          </Text>
        )}
        {metadata.warnings.length > 0 && (
          <Flex flexDirection='row' gap={8} alignItems='center'>
            {metadata.warnings.map((warning, i) => (
              <MetadataIcon key={`${warning}-${i}`} icon={<WarningIcon />} tooltip={warning} warning />
            ))}
          </Flex>
        )}
        <Flex flexDirection='row' gap={4} alignItems='center' style={{ marginLeft: 'auto' }}>
          <ToggleButtonGroup value={toggleValue} onChange={(val) => setToggleValue(val as ToggleValue)}>
            <ToggleButtonGroup.Item value='table' aria-label='Switch to table view'>
              <DataTableIcon />
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item value='line' disabled={!canChart} aria-label='Switch to line chart view'>
              <LineChartIcon />
            </ToggleButtonGroup.Item>
            <ToggleButtonGroup.Item value='area' disabled={!canChart} aria-label='Switch to area chart view'>
              <StackedAreaChartIcon />
            </ToggleButtonGroup.Item>
          </ToggleButtonGroup>
          <Button
            variant='default'
            size='condensed'
            onClick={handleOpenInNotebooks}
            aria-label='Open query in Dynatrace Notebooks'
          >
            <Button.Prefix>
              <DocumentStackIcon />
            </Button.Prefix>
            Open in Notebooks
          </Button>
          <Button variant='default' size='condensed' onClick={handleRefresh} aria-label='Refresh query results'>
            <Button.Prefix>
              <RefreshIcon />
            </Button.Prefix>
          </Button>
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
        <DataTable data={tableData} columns={tableColumns} sortable resizable fullWidth>
          <DataTable.Pagination defaultPageSize={DEFAULT_PAGE_SIZE} />
        </DataTable>
      ) : (
        <TimeseriesChart data={timeseriesData} variant={chartVariant}>
          <TimeseriesChart.Legend />
          <TimeseriesChart.YAxis label='Value' />
        </TimeseriesChart>
      )}
    </Flex>
  );
}
