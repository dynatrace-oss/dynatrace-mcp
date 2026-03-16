'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.listProblems = void 0;
const execute_dql_1 = require('./execute-dql');
/**
 * List all problems via dt.davis.problems
 * @param dtClient Dynatrace HTTP Client
 * @param additionalFilter Any additional DQL filter
 * @param status Status (ACTIVE, CLOSED, or ALL)
 * @param timeframe Timeframe to query problems (e.g., '24h', '7d', '30d'). Default: '24h'
 * @returns DQL query result
 */
const listProblems = async (dtClient, additionalFilter, status, timeframe = '24h') => {
  // DQL Statement from Problems App to fetch all Davis Problems
  let statusFilter = '';
  if (status === 'ACTIVE') {
    statusFilter = '| filter isNull(event.end)';
  } else if (status === 'CLOSED') {
    statusFilter = '| filter not(isNull(event.end))';
  }
  // For 'ALL' or undefined, no additional filter
  const dql = `fetch dt.davis.problems, from: now()-${timeframe}, to: now()
| filter isNull(dt.davis.is_duplicate) OR not(dt.davis.is_duplicate)
${statusFilter}
${additionalFilter ? `| filter ${additionalFilter}` : ''}
| fieldsAdd
   duration = (coalesce(event.end, now()) - event.start)/1000000000,
   affected_entities_count = arraySize(affected_entity_ids),
   event_count = arraySize(dt.davis.event_ids),
   affected_users_count = dt.davis.affected_users_count,
   problem_id = event.id
| fields display_id, event.name, event.description, event.status, event.category, event.start, event.end,
         root_cause_entity_id, root_cause_entity_name, duration, affected_entities_count,
         event_count, affected_users_count, problem_id, dt.davis.mute.status, dt.davis.mute.user,
         entity_tags, labels.alerting_profile, maintenance.is_under_maintenance,
         aws.account.id, azure.resource.group, azure.subscription, cloud.provider, cloud.region,
         dt.cost.costcenter, dt.cost.product, dt.host_group.id, dt.security_context, gcp.project.id,
         host.name,
         k8s.cluster.name, k8s.cluster.uid, k8s.container.name, k8s.namespace.name, k8s.node.name, k8s.pod.name, k8s.service.name, k8s.workload.kind, k8s.workload.name
| sort event.start desc
`;
  return await (0, execute_dql_1.executeDql)(dtClient, {
    query: dql,
    maxResultRecords: 5000,
    maxResultBytes: /* 5 MB */ 5000000,
  });
};
exports.listProblems = listProblems;
