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
    await getEventsForCluster(mockHttpClient, 'cluster-123');

    const query = mockExecuteDql.mock.calls[0][1].query;
    expect(query).toContain('k8s.cluster.uid == "cluster-123"');
    expect(query).not.toContain('dt.entity.kubernetes_cluster');
  });

  it('should escape double quotes in clusterId to prevent DQL injection', async () => {
    await getEventsForCluster(mockHttpClient, 'cluster"inject');

    const query = mockExecuteDql.mock.calls[0][1].query;
    expect(query).toContain('k8s.cluster.uid == "cluster\\"inject"');
    expect(query).not.toContain('k8s.cluster.uid == "cluster"inject"');
  });

  it('should throw for an invalid timeframe', async () => {
    await expect(getEventsForCluster(mockHttpClient, 'cluster-123', undefined, undefined, 'badtime')).rejects.toThrow(
      /Invalid timeframe/,
    );
  });
});
