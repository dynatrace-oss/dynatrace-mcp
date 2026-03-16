'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.listDavisAnalyzers = listDavisAnalyzers;
exports.executeDavisAnalyzer = executeDavisAnalyzer;
const client_davis_analyzers_1 = require('@dynatrace-sdk/client-davis-analyzers');
/**
 * List available Davis Analyzers
 * @returns A condensed list of Davis Analyzers (array of DavisAnalyzer objects).
 */
async function listDavisAnalyzers(dtClient) {
  const analyzersClient = new client_davis_analyzers_1.AnalyzersClient(dtClient);
  const response = await analyzersClient.queryAnalyzers({});
  return response.analyzers.map((analyzer) => ({
    name: analyzer.name,
    displayName: analyzer.displayName,
    description: analyzer.description || '',
    type: analyzer.type,
    category: analyzer.category?.displayName,
    labels: analyzer.labels,
  }));
}
/**
 * Runs a specified Davis Analyzer with given input parameters and returns the result.
 * @returns The result of the analyzer execution.
 */
async function executeDavisAnalyzer(dtClient, analyzerName, input) {
  const analyzersClient = new client_davis_analyzers_1.AnalyzersClient(dtClient);
  const response = await analyzersClient.executeAnalyzer({
    analyzerName,
    body: {
      ...input,
      generalParameters: {
        timeframe: {
          startTime: 'now-1h',
          endTime: 'now',
        },
      },
    },
  });
  // If there's a request token, we need to poll
  if (response.requestToken) {
    // Simple polling implementation
    const maxAttempts = 10;
    const intervalMs = 1000;
    let attempts = 0;
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      const pollResponse = await analyzersClient.pollAnalyzerExecution({
        analyzerName,
        requestToken: response.requestToken,
      });
      if (pollResponse.result?.executionStatus === 'COMPLETED') {
        return pollResponse.result;
      }
      if (pollResponse.result?.executionStatus === 'ABORTED') {
        throw new Error('Analyzer execution was aborted');
      }
      attempts++;
    }
    // Cancel if still running
    await analyzersClient.cancelAnalyzerExecution({
      analyzerName,
      requestToken: response.requestToken,
    });
    throw new Error('Analyzer execution timed out');
  }
  return response.result;
}
