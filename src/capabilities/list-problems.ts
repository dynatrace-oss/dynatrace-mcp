import { HttpClient } from '@dynatrace-sdk/http-client';
import { executeDql } from './execute-dql';

export const listProblems = async (dtClient: HttpClient, additionalFilter?: string) => {
  // DQL Statement from Problems App to fetch all Davis Problems for the last 12 hours to now
  const dql = `fetch dt.davis.problems, from: now()-12h, to: now()
| filter isNull(dt.davis.is_duplicate) OR not(dt.davis.is_duplicate)
${additionalFilter ? `| filter ${additionalFilter}` : ''}
| fieldsAdd
   duration = coalesce(event.end, now()) - event.start,
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
| sort event.status asc, event.start desc
`;

  return await executeDql(dtClient, { query: dql, maxResultRecords: 5000, maxResultBytes: /* 5 MB */ 5000000 });
};
