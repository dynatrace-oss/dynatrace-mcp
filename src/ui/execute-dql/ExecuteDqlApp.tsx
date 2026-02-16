import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { App } from '@modelcontextprotocol/ext-apps';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Text, Code } from '@dynatrace/strato-components/typography';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components-preview/tables';
import { DataTableIcon } from '@dynatrace/strato-icons';
import { DatabaseIcon } from '@dynatrace/strato-icons';
import { MoneyIcon } from '@dynatrace/strato-icons';
import { WarningIcon } from '@dynatrace/strato-icons';
import { RefreshIcon } from '@dynatrace/strato-icons';
import { ExternalLinkIcon } from '@dynatrace/strato-icons';
import { LoadingState, ErrorState } from '../components';

/** Structured metadata parsed from the tool result text. */
interface ParsedMetadata {
  scannedRecords?: string;
  scannedBytes?: string;
  budgetInfo?: string;
  warnings: string[];
}

/**
 * Parse the tool result text (structured as markdown from execute_dql) and extract
 * structured metadata + JSON records block.
 */
function parseToolResult(text: string): { metadata: ParsedMetadata; records: Record<string, unknown>[] } {
  let records: Record<string, unknown>[] = [];
  const metadata: ParsedMetadata = { warnings: [] };

  // Extract JSON block from the text
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      records = JSON.parse(jsonMatch[1]);
    } catch {
      // If JSON parse fails, records stays empty
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

  return { metadata, records };
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
    //visualization: 'table',
    //visualizationSettings: { autoSelectVisualization: false },
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
    };
  }

  const { metadata, records } = parseToolResult(text);

  if (!records || records.length === 0) {
    return {
      status: 'error',
      errorMessage: text || 'No records returned from DQL query.',
      metadata: { warnings: [] },
      records: [],
      columns: [],
    };
  }

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
  };
}

export function ExecuteDqlApp() {
  const [state, setState] = useState<ToolResultState>({
    status: 'loading',
    metadata: { warnings: [] },
    records: [],
    columns: [],
  });

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
        <Flex flexDirection='row' gap={8} alignItems='center'>
          {metadata.scannedRecords && (
            <MetadataIcon icon={<DataTableIcon />} tooltip={`Scanned Records: ${metadata.scannedRecords}`} />
          )}
          {metadata.scannedBytes && (
            <MetadataIcon icon={<DatabaseIcon />} tooltip={`Scanned Bytes: ${metadata.scannedBytes}`} />
          )}
          {metadata.budgetInfo && <MetadataIcon icon={<MoneyIcon />} tooltip={`Budget: ${metadata.budgetInfo}`} />}
          {metadata.warnings.map((warning, i) => (
            <MetadataIcon key={i} icon={<WarningIcon />} tooltip={warning} warning />
          ))}
        </Flex>
        <Text textStyle='small' style={{ opacity: 0.5 }}>
          {state.records.length} records
        </Text>
        <Flex flexDirection='row' gap={4} alignItems='center' style={{ marginLeft: 'auto' }}>
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

      <DataTable data={tableData} columns={tableColumns} sortable resizable fullWidth>
        <DataTable.Pagination defaultPageSize={50} />
      </DataTable>
    </Flex>
  );
}
