'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.listExceptions = void 0;
const execute_dql_1 = require('./execute-dql');
const listExceptions = async (dtClient, additionalFilter, timeframe = '24h', maxResultRecords = 5000) => {
  // DQL statement to fetch exception data from user.events for the specified timeframe
  const dql = `fetch user.events, from: now()-${timeframe}, to: now()
| filter isNotNull(exception.stack_trace)
| filter isNotNull(error.id)
${additionalFilter ? `| filter ${additionalFilter}` : ''}
| fields error.id, error.type, exception.message, os.name, dt.rum.application.id, dt.rum.application.entity, start_time
| sort start_time desc
`;
  return await (0, execute_dql_1.executeDql)(dtClient, {
    query: dql,
    maxResultRecords,
    maxResultBytes: /* 5 MB */ 5000000,
  });
};
exports.listExceptions = listExceptions;
