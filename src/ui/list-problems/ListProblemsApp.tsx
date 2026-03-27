import { useState, useEffect, useRef, useCallback } from 'react';
import { App } from '@modelcontextprotocol/ext-apps';
import { useDocumentTheme } from '@modelcontextprotocol/ext-apps/react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Text } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { LoadingState, ErrorState } from '../components';
import { SummaryCard } from './SummaryCard';
import { ProblemRow, type ProblemRecord } from './ProblemRow';
import { type HostTheme, isValidHostTheme } from '../utils/theme';

const PAGE_SIZE = 5;

/** Shape of the _meta object returned by the list_problems tool. */
interface ListProblemsMeta {
  problems?: ProblemRecord[];
  totalProblems?: number;
  environmentUrl?: string;
  timeframe?: string;
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

type AppStatus = 'loading' | 'error' | 'success';

interface AppState {
  status: AppStatus;
  errorMessage?: string;
  problems: ProblemRecord[];
  totalProblems?: number;
  environmentUrl?: string;
  timeframe: string;
}

export function ListProblemsApp() {
  useDocumentTheme();
  const [hostTheme, setHostTheme] = useState<HostTheme | null>(null);
  const appRef = useRef<App | null>(null);

  const [state, setState] = useState<AppState>({
    status: 'loading',
    problems: [],
    timeframe: '24h',
  });

  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const app = new App({ name: 'Problems Overview', version: '1.0.0' });
    appRef.current = app;

    app.ontoolresult = (result) => {
      const textContent = result.content?.find(isTextContent);
      if (!textContent) {
        setState({ status: 'error', errorMessage: 'No result data received.', problems: [], timeframe: '24h' });
        return;
      }

      const meta = result._meta as ListProblemsMeta | undefined;
      setState({
        status: 'success',
        problems: meta?.problems ?? [],
        totalProblems: meta?.totalProblems,
        environmentUrl: meta?.environmentUrl,
        timeframe: meta?.timeframe ?? '24h',
      });
      // Reset to first page whenever a new result arrives
      setCurrentPage(0);
    };

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
      app.ontoolresult = undefined;
      app.onhostcontextchanged = undefined;
      app.close();
      appRef.current = null;
    };
  }, []);

  // Keep Strato theme in sync with MCP host theme once available.
  useEffect(() => {
    if (!hostTheme) return;

    document.documentElement.setAttribute('data-theme', hostTheme);
    const appRootElement = document.querySelector('[data-dt-component="AppRoot"]');
    if (appRootElement instanceof HTMLElement) {
      appRootElement.setAttribute('data-theme', hostTheme);
    }
  }, [hostTheme]);

  const handleNavigate = useCallback((url: string) => {
    void appRef.current?.openLink({ url });
  }, []);

  if (state.status === 'loading') {
    return <LoadingState message='Loading problems...' />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.errorMessage ?? 'An unknown error occurred.'} />;
  }

  const { problems, environmentUrl, timeframe } = state;

  // Compute summary stats over all problems
  const activeCount = problems.filter((p) => p['event.status'] === 'ACTIVE').length;
  const totalCount = problems.length;
  const totalProblems = state.totalProblems ?? totalCount;
  const isTruncated = totalProblems > totalCount;
  const usersAffected = problems.reduce((sum, p) => sum + (Number(p['affected_users_count']) || 0), 0); // field aliased from dt.davis.affected_users_count in DQL
  const entitiesAffected = problems.reduce((sum, p) => sum + (Number(p['affected_entities_count']) || 0), 0);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(problems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pagedProblems = problems.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className='list-problems-surface'>
      <Flex flexDirection='column' gap={8} className='list-problems-app'>
        {/* Summary cards */}
        <Flex flexDirection='row' gap={6} style={{ flexWrap: 'wrap' }}>
          <SummaryCard count={activeCount} label='Active problems' variant='critical' />
          <SummaryCard count={totalProblems} label={`Total (last ${timeframe})`} variant='neutral' />
          <SummaryCard count={usersAffected} label='Users affected' variant='warning' />
          <SummaryCard count={entitiesAffected.toLocaleString()} label='Entities affected' variant='primary' />
        </Flex>

        {/* Truncation notice */}
        {isTruncated && (
          <Text textStyle='small' style={{ color: 'var(--dt-colors-text-neutral-subdued)', fontStyle: 'italic' }}>
            Showing {totalCount} of {totalProblems.toLocaleString()} problems — use filters or a shorter timeframe to
            narrow results.
          </Text>
        )}

        {/* Problem list */}
        {problems.length === 0 ? (
          <Flex flexDirection='column' alignItems='center' justifyContent='center' padding={32}>
            <Text textStyle='base-emphasized'>No problems found</Text>
            <Text textStyle='small' style={{ opacity: 0.6 }}>
              No problems were detected in the selected timeframe.
            </Text>
          </Flex>
        ) : (
          <>
            <Flex flexDirection='column' gap={4}>
              {pagedProblems.map((problem, idx) => (
                <ProblemRow
                  key={String(problem['problem_id'] ?? idx)}
                  problem={problem}
                  environmentUrl={environmentUrl}
                  onNavigate={handleNavigate}
                />
              ))}
            </Flex>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <Flex flexDirection='row' alignItems='center' justifyContent='center' gap={8}>
                <Button
                  variant='default'
                  disabled={safePage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  aria-label='Previous page'
                >
                  &lsaquo; Previous
                </Button>
                <Text textStyle='small' style={{ color: 'var(--dt-colors-text-neutral-subdued)' }}>
                  {safePage + 1} / {totalPages}
                </Text>
                <Button
                  variant='default'
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  aria-label='Next page'
                >
                  Next &rsaquo;
                </Button>
              </Flex>
            )}
          </>
        )}
      </Flex>
    </div>
  );
}
