/**
 * Preview entry for the execute_dql MCP App.
 *
 * Renders the live {@link ExecuteDqlView} component with mock data so that
 * Playwright can take screenshots without a running MCP server.
 *
 * Active state is selected via the `?state=` URL query parameter:
 *   - `table`   (default) – success state with sample log records
 *   - `loading`           – loading state (spinner)
 *   - `error`             – error state with a sample error message
 *   - `empty`             – success state with no records
 */
import type { ResultRecord } from '@dynatrace-sdk/client-query';
import { ExecuteDqlView, processToolResult, type ToolResultState } from './ExecuteDqlApp';

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

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

const MOCK_SCANNED_BYTES = 1_024_000;

type PreviewStateName = 'table' | 'loading' | 'error' | 'empty';

function parsePreviewState(search: string): PreviewStateName {
  const state = new URLSearchParams(search).get('state');
  if (state === 'loading' || state === 'error' || state === 'empty') return state;
  return 'table';
}

function buildMockState(previewState: PreviewStateName): ToolResultState {
  if (previewState === 'loading') {
    return { status: 'loading', metadata: { warnings: [] }, records: [], columns: [], fieldTypes: [] };
  }
  if (previewState === 'error') {
    return {
      status: 'error',
      errorMessage: 'Failed to execute DQL: timeout waiting for query results after 30s.',
      metadata: { warnings: [] },
      records: [],
      columns: [],
      fieldTypes: [],
    };
  }
  const records = previewState === 'empty' ? [] : MOCK_RECORDS;
  return processToolResult(`DQL query returned ${records.length} records.`, {
    records,
    types: [],
    scannedRecords: records.length,
    scannedBytes: records.length > 0 ? MOCK_SCANNED_BYTES : 0,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExecuteDqlPreview() {
  const state = buildMockState(parsePreviewState(window.location.search));
  return <ExecuteDqlView state={state} onRefresh={() => undefined} onOpenInNotebooks={() => undefined} />;
}
