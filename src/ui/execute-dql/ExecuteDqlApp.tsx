import { useState, useEffect, useMemo } from 'react';
import { App } from '@modelcontextprotocol/ext-apps';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Text, Code } from '@dynatrace/strato-components/typography';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components-preview/tables';
import { DataTableIcon } from '@dynatrace/strato-icons';
import { DatabaseIcon } from '@dynatrace/strato-icons';
import { MoneyIcon } from '@dynatrace/strato-icons';
import { WarningIcon } from '@dynatrace/strato-icons';
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

export function ExecuteDqlApp() {
  const [state, setState] = useState<ToolResultState>({
    status: 'loading',
    metadata: { warnings: [] },
    records: [],
    columns: [],
  });

  useEffect(() => {
    const app = new App({ name: 'DQL Results Viewer', version: '1.0.0' });
    app.connect();

    app.ontoolresult = (result) => {
      const text = result.content?.find((c: { type: string }) => c.type === 'text')?.text;
      if (!text) {
        setState({
          status: 'error',
          errorMessage: 'No result data received.',
          metadata: { warnings: [] },
          records: [],
          columns: [],
        });
        return;
      }

      const { metadata, records } = parseToolResult(text);

      if (!records || records.length === 0) {
        setState({
          status: 'error',
          errorMessage: text || 'No records returned from DQL query.',
          metadata: { warnings: [] },
          records: [],
          columns: [],
        });
        return;
      }

      // Get all unique column keys from records
      const columnSet = new Set<string>();
      for (const record of records) {
        if (record && typeof record === 'object') {
          for (const key of Object.keys(record)) {
            columnSet.add(key);
          }
        }
      }

      setState({
        status: 'success',
        metadata,
        records,
        columns: Array.from(columnSet),
      });
    };
  }, []);

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
      </Flex>

      <DataTable data={tableData} columns={tableColumns} sortable resizable fullWidth>
        <DataTable.Pagination defaultPageSize={50} />
      </DataTable>
    </Flex>
  );
}
