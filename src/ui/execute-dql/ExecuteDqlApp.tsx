import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { App } from '@modelcontextprotocol/ext-apps';
import type { RangedFieldTypes } from '@dynatrace-sdk/client-query';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Text, Code } from '@dynatrace/strato-components/typography';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components-preview/tables';
import { TimeseriesChart, convertToTimeseries, type Timeseries } from '@dynatrace/strato-components-preview/charts';
import {
  DataTableIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  LineChartIcon,
  MoneyIcon,
  RefreshIcon,
  StackedAreaChartIcon,
  WarningIcon,
} from '@dynatrace/strato-icons';
import { LoadingState, ErrorState } from '../components';

type ViewMode = 'table' | 'chart';
type ChartVariant = 'line' | 'area';

/** Structured metadata parsed from the tool result text. */
interface ParsedMetadata {
  scannedRecords?: string;
  scannedBytes?: string;
  budgetInfo?: string;
  warnings: string[];
}

/**
 * Parse the tool result text (structured as markdown from execute_dql) and extract
 * structured metadata + JSON records block + field types.
 */
function parseToolResult(text: string): {
  metadata: ParsedMetadata;
  records: Record<string, unknown>[];
  fieldTypes: RangedFieldTypes[];
  chartWorthy: boolean;
  analysisTimeframe?: { start?: string; end?: string };
} {
  let records: Record<string, unknown>[] = [];
  let fieldTypes: RangedFieldTypes[] = [];
  let chartWorthy = false;
  let analysisTimeframe: { start?: string; end?: string } | undefined;
  const metadata: ParsedMetadata = { warnings: [] };

  // Extract main JSON block (records) from the text
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      records = JSON.parse(jsonMatch[1]);
    } catch {
      // If JSON parse fails, records stays empty
    }
  }

  // Extract field types JSON block (tagged as json:types)
  const typesMatch = text.match(/```json:types\n([\s\S]*?)\n```/);
  if (typesMatch) {
    try {
      fieldTypes = JSON.parse(typesMatch[1]);
    } catch {
      // If JSON parse fails, fieldTypes stays empty
    }
  }

  // Extract chartWorthy flag (tagged as json:chartWorthy)
  const chartWorthyMatch = text.match(/```json:chartWorthy\n([\s\S]*?)\n```/);
  if (chartWorthyMatch) {
    chartWorthy = chartWorthyMatch[1].trim() === 'true';
  }

  // Extract analysisTimeframe metadata (tagged as json:analysisTimeframe)
  const timeframeMatch = text.match(/```json:analysisTimeframe\n([\s\S]*?)\n```/);
  if (timeframeMatch) {
    try {
      analysisTimeframe = JSON.parse(timeframeMatch[1]);
    } catch {
      // If JSON parse fails, analysisTimeframe stays undefined
    }
  }

  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Parse scanned records
    const recordsMatch = trimmed.match(/Scanned Records:\*?\*?\s*(.+)/);
    if (recordsMatch) {
      metadata.scannedRecords = recordsMatch[1].trim();
      continue;
    }

    // Parse scanned bytes (including session budget info)
    const bytesMatch = trimmed.match(/Scanned Bytes:\*?\*?\s*(.+)/);
    if (bytesMatch) {
      const bytesValue = bytesMatch[1].trim();
      const budgetMatch = bytesValue.match(/^([\d.]+\s*GB)\s*\((.+)\)$/);
      if (budgetMatch) {
        metadata.scannedBytes = budgetMatch[1];
        metadata.budgetInfo = budgetMatch[2];
      } else {
        metadata.scannedBytes = bytesValue;
      }
      continue;
    }

    // Collect warnings (⚠️ lines) but skip "No Data consumed" / info-only lines
    if (trimmed.includes('⚠️')) {
      const cleanWarning = trimmed
        .replace(/^-\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/^⚠️\s*/, '');
      metadata.warnings.push(cleanWarning);
    }
    // Skip 💡 lines entirely (e.g. "No Data consumed")
  }

  return { metadata, records, fieldTypes, chartWorthy, analysisTimeframe };
}

/**
 * Build DataTable column definitions from the record keys.
 */
function buildColumns(columns: string[]): DataTableColumnDef<Record<string, unknown>>[] {
  return columns.map((col) => ({
    id: col,
    header: col,
    accessor: col,
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

interface ToolResultState {
  status: 'loading' | 'error' | 'success';
  errorMessage?: string;
  metadata: ParsedMetadata;
  records: Record<string, unknown>[];
  columns: string[];
  fieldTypes: RangedFieldTypes[];
  /** Whether the server determined this result is chart-worthy (timeseries/metric data). */
  chartWorthy: boolean;
  /** Analysis timeframe from query metadata, used for fallback chart rendering. */
  analysisTimeframe?: { start?: string; end?: string };
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
    const result = convertToTimeseries(records, fieldTypes);
    if (result.length > 0) return result;
  } catch {
    // convertToTimeseries throws if data is malformed or not timeseries-shaped
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
  const defaultStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
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

/** Small icon button with a hover tooltip. */
function MetadataIcon({ icon, tooltip, warning }: { icon: React.ReactNode; tooltip: string; warning?: boolean }) {
  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'default',
        opacity: 0.7,
        color: warning ? 'var(--dt-colors-text-warning-default, #e5be01)' : 'inherit',
      }}
    >
      {icon}
    </span>
  );
}

/**
 * Create a Dynatrace Notebooks URL that opens a DQL query in the Notebooks app.
 * @param environmentUrl - The base URL of the Dynatrace environment (e.g. "https://abc12345.apps.dynatrace.com")
 * @param query - The DQL query string to open in Notebooks
 * @returns The full URL to open the query in Dynatrace Notebooks
 */
export function createNotebooksURL(environmentUrl: string, query: string): string {
  const params = {
    'visualizationSettings': { autoSelectVisualization: true },
    'dt.query': query,
    'hideInput': false,
    'sourceApplication': 'dynatrace.notebooks',
  };

  const baseUrl = environmentUrl.replace(/\/$/, '');
  return `${baseUrl}/ui/intent/dynatrace.notebooks/view-query#${encodeURIComponent(JSON.stringify(params))}`;
}

/**
 * Process a tool result text into state. Extracted for reuse between
 * the initial ontoolresult notification and the refresh callServerTool response.
 */
function processToolResultText(text: string | undefined): ToolResultState {
  if (!text) {
    return {
      status: 'error',
      errorMessage: 'No result data received.',
      metadata: { warnings: [] },
      records: [],
      columns: [],
      fieldTypes: [],
      chartWorthy: false,
      analysisTimeframe: undefined,
    };
  }

  const { metadata, records, fieldTypes, chartWorthy, analysisTimeframe } = parseToolResult(text);

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
    chartWorthy,
    analysisTimeframe,
  };
}

export function ExecuteDqlApp() {
  const [state, setState] = useState<ToolResultState>({
    status: 'loading',
    metadata: { warnings: [] },
    records: [],
    columns: [],
    fieldTypes: [],
    chartWorthy: false,
    analysisTimeframe: undefined,
  });
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [chartVariant, setChartVariant] = useState<ChartVariant>('line');

  const appRef = useRef<App | null>(null);
  const [toolArguments, setToolArguments] = useState<Record<string, unknown> | null>(null);
  const [environmentUrl, setEnvironmentUrl] = useState<string | null>(null);

  useEffect(() => {
    const app = new App({ name: 'DQL Results Viewer', version: '1.0.0' });
    appRef.current = app;
    app.connect();

    app.ontoolinput = (params) => {
      setToolArguments(params.arguments ?? null);
    };

    app.ontoolresult = (result) => {
      const text = result.content?.find((c: { type: string }) => c.type === 'text')?.text;
      setState(processToolResultText(text));
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
      chartWorthy: false,
      analysisTimeframe: undefined,
    });

    try {
      const result = await appRef.current.callServerTool({
        name: 'execute_dql',
        arguments: toolArguments,
      });

      const text = result.content?.find((c) => c.type === 'text')?.text as string | undefined;
      setState(processToolResultText(text));
    } catch (error) {
      setState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Refresh failed.',
        metadata: { warnings: [] },
        records: [],
        columns: [],
        fieldTypes: [],
        chartWorthy: false,
        analysisTimeframe: undefined,
      });
    }
  }, [toolArguments]);

  const handleOpenInNotebooks = useCallback(async () => {
    if (!appRef.current) return;

    const query = toolArguments?.dqlStatement as string | undefined;
    if (!query) return;

    let envUrl = environmentUrl;
    if (!envUrl) {
      try {
        const result = await appRef.current.callServerTool({
          name: 'get_environment_info',
          arguments: {},
        });
        const text = result.content?.find((c) => c.type === 'text')?.text as string | undefined;
        if (text) {
          const match = text.match(/You can reach it via (.+)/);
          if (match) {
            envUrl = match[1].trim();
            setEnvironmentUrl(envUrl);
          }
        }
      } catch {
        // If we can't get the environment URL, we can't open the link
        return;
      }
    }

    if (!envUrl) return;

    const notebooksUrl = createNotebooksURL(envUrl, query);
    await appRef.current.openLink({ url: notebooksUrl });
  }, [toolArguments, environmentUrl]);

  const tableColumns = useMemo(() => buildColumns(state.columns), [state.columns]);
  const tableData = useMemo(() => state.records, [state.records]);
  const timeseriesData = useMemo(
    () => safeConvertToTimeseries(state.records, state.fieldTypes, state.analysisTimeframe),
    [state.records, state.fieldTypes, state.analysisTimeframe],
  );
  const canChart = timeseriesData.length > 0;

  // Auto-select chart view when timeseries data is available
  useEffect(() => {
    if (canChart) {
      setViewMode('chart');
    } else {
      setViewMode('table');
    }
  }, [canChart]);

  if (state.status === 'loading') {
    return <LoadingState message='Loading query results...' />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.errorMessage ?? 'An unknown error occurred.'} />;
  }

  // For non-chart-worthy results (plain tabular data like logs, entities, etc.)
  // render nothing so the host can collapse the app panel. The text content in
  // the tool result is sufficient for the LLM and the user.
  if (!state.chartWorthy) {
    return null;
  }

  const { metadata } = state;

  return (
    <Flex flexDirection='column' gap={4}>
      {/* Compact metadata toolbar */}
      <Flex flexDirection='row' gap={12} alignItems='center' padding={4} style={{ paddingLeft: 8 }}>
        <Flex flexDirection='row' gap={8} alignItems='center'>
          {metadata.scannedRecords && (
            <MetadataIcon icon={<DataTableIcon />} tooltip={`Scanned Records: ${metadata.scannedRecords}`} />
          )}
          {metadata.scannedBytes && (
            <MetadataIcon icon={<DatabaseIcon />} tooltip={`Scanned Bytes: ${metadata.scannedBytes}`} />
          )}
          {metadata.budgetInfo && <MetadataIcon icon={<MoneyIcon />} tooltip={`Budget: ${metadata.budgetInfo}`} />}
          {metadata.warnings.map((warning, i) => (
            <MetadataIcon key={`${warning}-${i}`} icon={<WarningIcon />} tooltip={warning} warning />
          ))}
        </Flex>
        <Text textStyle='small' style={{ opacity: 0.5 }}>
          {state.records.length} records
        </Text>
        <Flex flexDirection='row' gap={4} alignItems='center' style={{ marginLeft: 'auto' }}>
          <Button
            variant={viewMode === 'table' ? 'accent' : 'default'}
            size='condensed'
            onClick={() => setViewMode('table')}
          >
            <Button.Prefix>
              <DataTableIcon />
            </Button.Prefix>
            Table
          </Button>
          <Button
            variant={viewMode === 'chart' && chartVariant === 'line' ? 'accent' : 'default'}
            size='condensed'
            onClick={() => {
              setViewMode('chart');
              setChartVariant('line');
            }}
            disabled={!canChart}
            title={canChart ? 'Switch to line chart view' : 'No numeric columns available for charting'}
          >
            <Button.Prefix>
              <LineChartIcon />
            </Button.Prefix>
            Line
          </Button>
          <Button
            variant={viewMode === 'chart' && chartVariant === 'area' ? 'accent' : 'default'}
            size='condensed'
            onClick={() => {
              setViewMode('chart');
              setChartVariant('area');
            }}
            disabled={!canChart}
            title={canChart ? 'Switch to area chart view' : 'No numeric columns available for charting'}
          >
            <Button.Prefix>
              <StackedAreaChartIcon />
            </Button.Prefix>
            Area
          </Button>
          <Button variant='default' size='condensed' onClick={handleOpenInNotebooks}>
            <Button.Prefix>
              <ExternalLinkIcon />
            </Button.Prefix>
            Open in Notebooks
          </Button>
          <Button variant='default' size='condensed' onClick={handleRefresh}>
            <Button.Prefix>
              <RefreshIcon />
            </Button.Prefix>
            Refresh
          </Button>
        </Flex>
      </Flex>

      {state.records.length === 0 ? (
        <Flex flexDirection='column' alignItems='center' justifyContent='center' padding={32}>
          <Text textStyle='base-emphasized'>No records returned</Text>
          <Text textStyle='small' style={{ opacity: 0.6 }}>
            The query executed successfully but returned no data. Try adjusting your query or timeframe.
          </Text>
        </Flex>
      ) : viewMode === 'table' ? (
        <DataTable data={tableData} columns={tableColumns} sortable resizable fullWidth>
          <DataTable.Pagination defaultPageSize={50} />
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
