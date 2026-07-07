import { getEventsForCluster } from './get-events-for-cluster';
import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';

jest.mock('./execute-dql');

const mockExecuteDql = executeDql as jest.MockedFunction<typeof executeDql>;

describe('getEventsForCluster', () => {
  const mockHttpClient = {} as HttpClient;

  beforeEach(() => {
    mockExecuteDql.mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not throw and produce valid DQL when only clusterId is provided', async () => {
    await expect(getEventsForCluster(mockHttpClient, 'cluster-123', undefined as any, '')).resolves.not.toThrow();

    const query = mockExecuteDql.mock.calls[0][1].query;
    expect(query).toContain('k8s.cluster.uid == "cluster-123"');
  });

  it('should escape double quotes in clusterId to prevent DQL injection', async () => {
    await getEventsForCluster(mockHttpClient, 'cluster"inject', undefined as any, '');

    const query = mockExecuteDql.mock.calls[0][1].query;
    expect(query).toContain('k8s.cluster.uid == "cluster\\"inject"');
    expect(query).not.toContain('k8s.cluster.uid == "cluster"inject"');
  });

  it('should throw for an invalid timeframe', async () => {
    await expect(getEventsForCluster(mockHttpClient, 'cluster-123', undefined as any, '', 'badtime')).rejects.toThrow(
      /Invalid timeframe/,
    );
  });
});
