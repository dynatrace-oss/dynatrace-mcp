/**
 * Preview component for the execute_dql MCP App.
 *
 * Renders the UI in different states with mock data so that Playwright can
 * take screenshots without requiring a live MCP server connection.
 *
 * The active state is controlled via the `?state=` URL query parameter:
 *   - `table`   (default) – success state with a table of sample log records
 *   - `loading`           – loading state (spinner)
 *   - `error`             – error state with a sample error message
 *   - `empty`             – success state that returned no records
 */
import { useMemo } from 'react';
import type { ResultRecord } from '@dynatrace-sdk/client-query';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Text } from '@dynatrace/strato-components/typography';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components-preview/tables';
import { ToggleButtonGroup } from '@dynatrace/strato-components-preview/forms';
import { Tooltip } from '@dynatrace/strato-components-preview/overlays';
import {
  DataTableIcon,
  DocumentStackIcon,
  LineChartIcon,
  RefreshIcon,
  StackedAreaChartIcon,
} from '@dynatrace/strato-icons';
import { LoadingState, ErrorState } from '../components';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_RECORDS: ResultRecord[] = [
  {
    'timestamp': '2025-01-15T10:00:00.000Z',
    'log.source': '/var/log/app.log',
    'status': 'WARN',
    'content': 'Connection pool utilization at 85%',
  },
  {
    'timestamp': '2025-01-15T10:00:01.234Z',
    'log.source': '/var/log/app.log',
    'status': 'INFO',
    'content': 'Request processed in 42ms',
  },
  {
    'timestamp': '2025-01-15T10:00:02.567Z',
    'log.source': '/var/log/api.log',
    'status': 'ERROR',
    'content': 'Database connection timeout after 30s',
  },
  {
    'timestamp': '2025-01-15T10:00:03.890Z',
    'log.source': '/var/log/api.log',
    'status': 'INFO',
    'content': 'Health check passed',
  },
  {
    'timestamp': '2025-01-15T10:00:05.123Z',
    'log.source': '/var/log/app.log',
    'status': 'INFO',
    'content': 'Cache hit ratio: 94.2%',
  },
  {
    'timestamp': '2025-01-15T10:00:06.456Z',
    'log.source': '/var/log/security.log',
    'status': 'WARN',
    'content': 'Rate limit approaching for client 10.0.0.12',
  },
  {
    'timestamp': '2025-01-15T10:00:07.789Z',
    'log.source': '/var/log/app.log',
    'status': 'INFO',
    'content': 'Scheduled maintenance task completed',
  },
  {
    'timestamp': '2025-01-15T10:00:09.012Z',
    'log.source': '/var/log/api.log',
    'status': 'INFO',
    'content': 'New deployment detected for service frontend-v2',
  },
];

const MOCK_COLUMNS = ['timestamp', 'log.source', 'status', 'content'];
const MOCK_EXECUTED_AT = new Date('2025-01-15T10:00:10.000Z');
const MOCK_SCANNED_RECORDS = 8;
const MOCK_SCANNED_BYTES = 1_024_000;
const RECORD_COUNT_TEXT_OPACITY = 0.5;
const EMPTY_STATE_TEXT_OPACITY = 0.6;
const DEFAULT_PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PreviewState = 'table' | 'loading' | 'error' | 'empty';

function parsePreviewState(search: string): PreviewState {
  const state = new URLSearchParams(search).get('state');
  if (state === 'loading' || state === 'error' || state === 'empty') return state;
  return 'table';
}

function buildColumns(columns: string[]): DataTableColumnDef<ResultRecord>[] {
  return columns.map((col) => ({
    id: col,
    header: col,
    accessor: (row: ResultRecord) => row[col],
    width: 'auto' as const,
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExecuteDqlPreview() {
  const previewState = parsePreviewState(window.location.search);

  const tableColumns = useMemo(() => buildColumns(MOCK_COLUMNS), []);

  const metadataText = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Executed at: ${MOCK_EXECUTED_AT.toLocaleString()}`);
    const scannedGB = (MOCK_SCANNED_BYTES / (1000 * 1000 * 1000)).toFixed(2);
    parts.push(`Scanned: ${scannedGB} GB`);
    parts.push(`${MOCK_SCANNED_RECORDS.toLocaleString()} records scanned`);
    return parts.join(', ');
  }, []);

  if (previewState === 'loading') {
    return <LoadingState message='Loading query results...' />;
  }

  if (previewState === 'error') {
    return <ErrorState message='Failed to execute DQL: timeout waiting for query results after 30s.' />;
  }

  const records = previewState === 'empty' ? [] : MOCK_RECORDS;

  return (
    <Flex flexDirection='column' gap={4} className='execute-dql-app'>
      {/* Compact metadata toolbar */}
      <Flex
        flexDirection='row'
        gap={12}
        alignItems='center'
        padding={4}
        style={{ paddingLeft: 8 }}
        className='execute-dql-toolbar'
      >
        <Text textStyle='small' className='execute-dql-record-count'>
          {records.length} {records.length === 1 ? 'record' : 'records'}
        </Text>
        {previewState !== 'empty' && (
          <Text textStyle='small' style={{ opacity: RECORD_COUNT_TEXT_OPACITY }} className='execute-dql-metadata-text'>
            {metadataText}
          </Text>
        )}
        <Flex
          flexDirection='row'
          gap={4}
          alignItems='center'
          style={{ marginLeft: 'auto' }}
          className='execute-dql-toolbar-actions'
        >
          <ToggleButtonGroup value='table' onChange={() => undefined}>
            <Tooltip text='Table'>
              <ToggleButtonGroup.Item value='table' aria-label='Switch to table view'>
                <DataTableIcon />
              </ToggleButtonGroup.Item>
            </Tooltip>
            <Tooltip text='Line'>
              <ToggleButtonGroup.Item value='line' disabled aria-label='Switch to line chart view'>
                <LineChartIcon />
              </ToggleButtonGroup.Item>
            </Tooltip>
            <Tooltip text='Area'>
              <ToggleButtonGroup.Item value='area' disabled aria-label='Switch to area chart view'>
                <StackedAreaChartIcon />
              </ToggleButtonGroup.Item>
            </Tooltip>
          </ToggleButtonGroup>

          <Flex flexDirection='row' gap={4} alignItems='center' className='execute-dql-primary-actions'>
            <Tooltip text='Open in Notebooks'>
              <Button
                variant='default'
                size='condensed'
                onClick={() => undefined}
                aria-label='Open query in Dynatrace Notebooks'
                className='execute-dql-open-button'
              >
                <Button.Prefix>
                  <DocumentStackIcon />
                </Button.Prefix>
                <span className='execute-dql-open-button-label'>Open in Notebooks</span>
              </Button>
            </Tooltip>
            <Tooltip text='Refresh'>
              <Button variant='default' size='condensed' onClick={() => undefined} aria-label='Refresh query results'>
                <Button.Prefix>
                  <RefreshIcon />
                </Button.Prefix>
              </Button>
            </Tooltip>
          </Flex>
        </Flex>
      </Flex>

      {records.length === 0 ? (
        <Flex flexDirection='column' alignItems='center' justifyContent='center' padding={32}>
          <Text textStyle='base-emphasized'>No records returned</Text>
          <Text textStyle='small' style={{ opacity: EMPTY_STATE_TEXT_OPACITY }}>
            The query executed successfully but returned no data. Try adjusting your query or timeframe.
          </Text>
        </Flex>
      ) : (
        <DataTable data={records} columns={tableColumns} sortable resizable fullWidth>
          <DataTable.Pagination defaultPageSize={DEFAULT_PAGE_SIZE} />
        </DataTable>
      )}
    </Flex>
  );
}
