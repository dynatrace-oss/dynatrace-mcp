import { useState, useEffect } from 'react';
import { App } from '@modelcontextprotocol/ext-apps';
import { useDocumentTheme } from '@modelcontextprotocol/ext-apps/react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Text } from '@dynatrace/strato-components/typography';
import { LoadingState, ErrorState } from '../components';
import { SummaryCard } from './SummaryCard';
import { ProblemRow, type ProblemRecord } from './ProblemRow';

/** Shape of the _meta object returned by the list_problems tool. */
interface ListProblemsMeta {
  problems?: ProblemRecord[];
  environmentUrl?: string;
  timeframe?: string;
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

type AppStatus = 'loading' | 'error' | 'success';

interface AppState {
  status: AppStatus;
  errorMessage?: string;
  problems: ProblemRecord[];
  environmentUrl?: string;
  timeframe: string;
}

export function ListProblemsApp() {
  useDocumentTheme();
  const [hostTheme, setHostTheme] = useState<HostTheme | null>(null);

  const [state, setState] = useState<AppState>({
    status: 'loading',
    problems: [],
    timeframe: '24h',
  });

  useEffect(() => {
    const app = new App({ name: 'Problems Overview', version: '1.0.0' });

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
        environmentUrl: meta?.environmentUrl,
        timeframe: meta?.timeframe ?? '24h',
      });
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

  if (state.status === 'loading') {
    return <LoadingState message='Loading problems...' />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.errorMessage ?? 'An unknown error occurred.'} />;
  }

  const { problems, environmentUrl, timeframe } = state;

  // Compute summary stats
  const activeCount = problems.filter((p) => p['event.status'] === 'ACTIVE').length;
  const totalCount = problems.length;
  const availabilityCount = problems.filter((p) => p['event.category'] === 'AVAILABILITY').length;
  const usersAffected = problems.reduce((sum, p) => sum + (Number(p['affected_users_count']) || 0), 0);

  return (
    <div className='list-problems-surface'>
      <Flex flexDirection='column' gap={12} className='list-problems-app'>
        {/* Summary cards */}
        <Flex flexDirection='row' gap={8} style={{ flexWrap: 'wrap' }}>
          <SummaryCard count={activeCount} label='Active problems' variant='critical' />
          <SummaryCard count={totalCount} label={`Total (last ${timeframe})`} variant='neutral' />
          <SummaryCard count={availabilityCount} label='Availability issues' variant='warning' />
          <SummaryCard count={usersAffected.toLocaleString()} label='Users affected' variant='primary' />
        </Flex>

        {/* Problem list */}
        {problems.length === 0 ? (
          <Flex flexDirection='column' alignItems='center' justifyContent='center' padding={32}>
            <Text textStyle='base-emphasized'>No problems found</Text>
            <Text textStyle='small' style={{ opacity: 0.6 }}>
              No problems were detected in the selected timeframe.
            </Text>
          </Flex>
        ) : (
          <Flex flexDirection='column' gap={6}>
            {problems.map((problem, idx) => (
              <ProblemRow
                key={String(problem['problem_id'] ?? idx)}
                problem={problem}
                environmentUrl={environmentUrl}
              />
            ))}
          </Flex>
        )}
      </Flex>
    </div>
  );
}
