import { useState, useEffect, useMemo, useCallback } from 'react';
import type { RangedFieldTypes } from '@dynatrace-sdk/client-query';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Text } from '@dynatrace/strato-components/typography';
import { DataTable, type DataTableColumnDef } from '@dynatrace/strato-components-preview/tables';
import { TimeseriesChart, convertToTimeseries, type Timeseries } from '@dynatrace/strato-components-preview/charts';
import {
  DataTableIcon,
  DatabaseIcon,
  DocumentStackIcon,
  LineChartIcon,
  MoneyIcon,
  RefreshIcon,
  StackedAreaChartIcon,
  WarningIcon,
} from '@dynatrace/strato-icons';
import { LoadingState, ErrorState, ChartButton, MetadataIcon, type ViewMode, type ChartVariant } from '../components';
import { processToolResultText, createNotebooksURL, type ToolResultState } from './ExecuteDqlApp';

// Same constants as main app
const RECORD_COUNT_TEXT_OPACITY = 0.5;
const EMPTY_STATE_TEXT_OPACITY = 0.6;
const DEFAULT_PAGE_SIZE = 50;

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
        return <Text textStyle='small'>—</Text>;
      }
      if (typeof value === 'object') {
        return <Text textStyle='small'>{JSON.stringify(value)}</Text>;
      }
      return <Text textStyle='small'>{String(value)}</Text>;
    },
  }));
}

/**
 * Safely convert DQL records to Timeseries.
 */
function safeConvertToTimeseries(records: Record<string, unknown>[], fieldTypes: RangedFieldTypes[]): Timeseries[] {
  if (records.length === 0 || fieldTypes.length === 0) return [];
  try {
    // @ts-expect-error - Record<string, unknown> is compatible with ResultRecord at runtime
    const result = convertToTimeseries(records, fieldTypes);
    return result;
  } catch (error) {
    console.warn('Failed to convert to timeseries:', error);
    return [];
  }
}

/**
 * Development version of ExecuteDqlApp that loads mock data from mock-data.txt
 * instead of connecting to the MCP server.
 */
export function ExecuteDqlAppDev() {
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

  // Mock environment URL and query for dev mode
  const mockEnvironmentUrl = 'https://abc12345.apps.dynatrace.com';
  const mockQuery = 'timeseries avg(dt.host.cpu.usage), by: {host.name}';

  useEffect(() => {
    // Load mock data from mock-data.txt with 1s delay to simulate loading
    fetch('/mock-data.txt')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load mock data: ${response.statusText}`);
        }
        return response.text();
      })
      .then((text) => {
        // Add 1 second delay to simulate realistic loading experience
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve(text), 1000);
        });
      })
      .then((text) => {
        setState(processToolResultText(text));
      })
      .catch((error) => {
        setState({
          status: 'error',
          errorMessage: `Failed to load mock data: ${error.message}`,
          metadata: { warnings: [] },
          records: [],
          columns: [],
          fieldTypes: [],
          chartWorthy: false,
          analysisTimeframe: undefined,
        });
      });
  }, []);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const handleOpenInNotebooks = useCallback(() => {
    const notebooksUrl = createNotebooksURL(mockEnvironmentUrl, mockQuery);
    window.open(notebooksUrl, '_blank');
  }, []);

  const tableColumns = useMemo(() => buildColumns(state.columns), [state.columns]);
  const tableData = useMemo(() => state.records, [state.records]);
  const timeseriesData = useMemo(
    () => safeConvertToTimeseries(state.records, state.fieldTypes),
    [state.records, state.fieldTypes],
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

  // Wrapper component for dark background with Copilot-like frame in dev mode
  const DarkWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{ background: '#1e1e1e', minHeight: '100vh', color: '#cccccc', display: 'flex', flexDirection: 'column' }}
    >
      {/* User prompt at top */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #3e3e42' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#0078d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              flexShrink: 0,
            }}
          >
            U
          </div>
          <div style={{ flex: 1, paddingTop: '2px' }}>
            <div style={{ color: '#cccccc', fontSize: '14px' }}>Display data</div>
          </div>
        </div>
      </div>

      {/* App content */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>{children}</div>

      {/* Chat input at bottom */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #3e3e42' }}>
        <div
          style={{
            background: '#2d2d30',
            border: '1px solid #3e3e42',
            borderRadius: '6px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: '#858585', fontSize: '14px', flex: 1 }}>Ask a follow-up question...</span>
          <span style={{ color: '#858585', fontSize: '12px' }}>⌘↵</span>
        </div>
      </div>
    </div>
  );

  if (state.status === 'loading') {
    return (
      <DarkWrapper>
        <LoadingState message='Loading mock data...' />
      </DarkWrapper>
    );
  }

  if (state.status === 'error') {
    return (
      <DarkWrapper>
        <ErrorState message={state.errorMessage ?? 'An unknown error occurred.'} />
      </DarkWrapper>
    );
  }

  if (!state.chartWorthy) {
    return null;
  }

  const { metadata } = state;

  return (
    <DarkWrapper>
      <Flex flexDirection='column' gap={4}>
        {/* Dev mode indicator */}
        <Flex
          flexDirection='row'
          gap={8}
          alignItems='center'
          padding={4}
          style={{ background: '#1e1e1e', borderRadius: '4px', color: '#cccccc' }}
        >
          <Text textStyle='small' style={{ fontWeight: 'bold', color: '#cccccc' }}>
            🚧 DEV MODE
          </Text>
          <Text textStyle='small' style={{ color: '#cccccc' }}>
            Loading mock data from mock-data.txt
          </Text>
        </Flex>

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
          <Text textStyle='small' style={{ opacity: RECORD_COUNT_TEXT_OPACITY }}>
            {state.records.length} records
          </Text>
          <Flex flexDirection='row' gap={4} alignItems='center' style={{ marginLeft: 'auto' }}>
            <Button
              variant={viewMode === 'table' ? 'accent' : 'default'}
              size='condensed'
              onClick={() => setViewMode('table')}
              aria-label='Switch to table view'
            >
              <Button.Prefix>
                <DataTableIcon />
              </Button.Prefix>
              Table
            </Button>
            <ChartButton
              mode='line'
              icon={<LineChartIcon />}
              label='Line'
              disabled={!canChart}
              currentViewMode={viewMode}
              currentChartVariant={chartVariant}
              onClick={(mode) => {
                setViewMode('chart');
                setChartVariant(mode);
              }}
            />
            <ChartButton
              mode='area'
              icon={<StackedAreaChartIcon />}
              label='Area'
              disabled={!canChart}
              currentViewMode={viewMode}
              currentChartVariant={chartVariant}
              onClick={(mode) => {
                setViewMode('chart');
                setChartVariant(mode);
              }}
            />{' '}
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
            </Button>{' '}
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
    </DarkWrapper>
  );
}
