'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.executeDql = exports.verifyDqlStatement = void 0;
const client_query_1 = require('@dynatrace-sdk/client-query');
const user_agent_1 = require('../utils/user-agent');
const grail_budget_tracker_1 = require('../utils/grail-budget-tracker');
const verifyDqlStatement = async (dtClient, dqlStatement) => {
  const queryAssistanceClient = new client_query_1.QueryAssistanceClient(dtClient);
  const response = await queryAssistanceClient.queryVerify({
    body: {
      query: dqlStatement,
    },
  });
  return response;
};
exports.verifyDqlStatement = verifyDqlStatement;
/**
 * Helper function to create a DQL execution result and log metadata information.
 * @param queryResult - The query result from Dynatrace API
 * @param logPrefix - Prefix for the log message (e.g., "DQL Execution Metadata" or "DQL Execution Metadata (Polled)")
 * @param budgetLimitGB - Budget limit in GB for tracking purposes
 * @returns DqlExecutionResult with extracted metadata
 */
const createResultAndLog = (queryResult, logPrefix, budgetLimitGB) => {
  const scannedBytes = queryResult.metadata?.grail?.scannedBytes || 0;
  // Track budget if limit is provided
  let budgetState;
  let budgetWarning;
  if (budgetLimitGB !== undefined) {
    const tracker = (0, grail_budget_tracker_1.getGrailBudgetTracker)(budgetLimitGB);
    budgetState = tracker.addBytesScanned(scannedBytes);
    budgetWarning = (0, grail_budget_tracker_1.generateBudgetWarning)(budgetState, scannedBytes) || undefined;
  }
  const result = {
    records: queryResult.records,
    metadata: queryResult.metadata,
    types: queryResult.types ?? [],
    scannedBytes,
    scannedRecords: queryResult.metadata?.grail?.scannedRecords,
    executionTimeMilliseconds: queryResult.metadata?.grail?.executionTimeMilliseconds,
    queryId: queryResult.metadata?.grail?.queryId,
    sampled: queryResult.metadata?.grail?.sampled,
    budgetState,
    budgetWarning,
  };
  console.error(
    `${logPrefix} scannedBytes=${result.scannedBytes} scannedRecords=${result.scannedRecords} executionTime=${result.executionTimeMilliseconds} queryId=${result.queryId}`,
  );
  return result;
};
/**
 * Execute a DQL statement against the Dynatrace API.
 * If the result is immediately available, it will be returned.
 * If the result is not immediately available, it will poll for the result until it is available.
 * @param dtClient
 * @param body - Contains the DQL statement to execute, and optional parameters like maxResultRecords and maxResultBytes
 * @param budgetLimitGB - Optional budget limit in GB for tracking bytes scanned
 * @returns the result with records, metadata and cost information, or undefined if the query failed or no result was returned.
 */
const executeDql = async (dtClient, body, budgetLimitGB) => {
  // Check budget before executing the query if budget limit is provided
  if (budgetLimitGB !== undefined) {
    const tracker = (0, grail_budget_tracker_1.getGrailBudgetTracker)(budgetLimitGB);
    const currentState = tracker.getState();
    if (currentState.isBudgetExceeded) {
      console.error('DQL execution aborted: Grail budget has been exceeded');
      const budgetWarning = (0, grail_budget_tracker_1.generateBudgetWarning)(currentState, 0);
      throw new Error(budgetWarning || 'DQL execution aborted: Grail budget has been exceeded');
    }
  }
  // create a Dynatrace QueryExecutionClient
  const queryExecutionClient = new client_query_1.QueryExecutionClient(dtClient);
  // and execute the query (part of body)
  const response = await queryExecutionClient.queryExecute({
    body,
    // define a dedicated user agent to enable tracking of DQL queries executed by the dynatrace-mcp-server
    dtClientContext: (0, user_agent_1.getUserAgent)(),
  });
  // check if we already got a result back
  if (response.result) {
    // yes - return response result immediately
    return createResultAndLog(response.result, 'execute_dql - Metadata:', budgetLimitGB);
  }
  // no result yet? we have wait and poll (this requires requestToken to be set)
  if (response.requestToken) {
    // poll for the result
    let pollResponse;
    do {
      // sleep for 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));
      pollResponse = await queryExecutionClient.queryPoll({
        requestToken: response.requestToken,
        dtClientContext: (0, user_agent_1.getUserAgent)(),
      });
      // check if we got a result from the polling endpoint
      if (pollResponse.result) {
        // yes - let's return the polled result
        return createResultAndLog(pollResponse.result, 'execute_dql Metadata (polled):', budgetLimitGB);
      }
    } while (pollResponse.state === 'RUNNING' || pollResponse.state === 'NOT_STARTED');
    // state != RUNNING and != NOT_STARTED - we should log that
    console.error(
      `execute_dql with requestToken ${response.requestToken} ended with state ${pollResponse.state}, stopping...`,
    );
    return undefined;
  }
  // no requestToken set? This should not happen, but just in case, let's log it
  console.error(`execute_dql did not respond with a requestToken, stopping...`);
  return undefined;
};
exports.executeDql = executeDql;
