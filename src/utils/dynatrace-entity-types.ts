/**
 * Dynatrace Entity Types
 *
 * Complete list of Dynatrace entity types for querying monitored entities.
 * Generated from ENTITY_ID_PREFIX_TO_TYPE_MAP values to ensure consistency.
 * Last Updated: 2045-08-13
 * @see https://docs.dynatrace.com/docs/discover-dynatrace/references/semantic-dictionary/model/dt-entities
 */

/**
 * Entity ID prefixes mapped to their corresponding Dynatrace entity types
 */
const ENTITY_ID_PREFIX_TO_TYPE_MAP: Record<string, string> = {
  APPLICATION: 'dt.entity.application',
  SERVICE: 'dt.entity.service',
  HOST: 'dt.entity.host',
  PROCESS_GROUP: 'dt.entity.process_group',
  CLOUD_APPLICATION: 'dt.entity.cloud_application',
  CLOUD_SERVICE: 'dt.entity.cloud_service',
  CLOUD_FUNCTION: 'dt.entity.cloud_function',
  CLOUD_DATABASE: 'dt.entity.cloud_database',
  CLOUD_STORAGE: 'dt.entity.cloud_storage',
  CLOUD_VM: 'dt.entity.cloud_vm',
  CLOUD_CONTAINER: 'dt.entity.cloud_container',
  KUBERNETES_NODE: 'dt.entity.cloud_kubernetes_node',
  KUBERNETES_POD: 'dt.entity.cloud_kubernetes_pod',
  KUBERNETES_CLUSTER: 'dt.entity.cloud_kubernetes_cluster',
  KUBERNETES_NAMESPACE: 'dt.entity.cloud_kubernetes_namespace',
  KUBERNETES_SERVICE: 'dt.entity.cloud_kubernetes_service',
  KUBERNETES_WORKLOAD: 'dt.entity.cloud_kubernetes_workload',
  KUBERNETES_DEPLOYMENT: 'dt.entity.cloud_kubernetes_deployment',
  KUBERNETES_STATEFULSET: 'dt.entity.cloud_kubernetes_statefulset',
  KUBERNETES_DAEMONSET: 'dt.entity.cloud_kubernetes_daemonset',
  KUBERNETES_JOB: 'dt.entity.cloud_kubernetes_job',
  KUBERNETES_CRONJOB: 'dt.entity.cloud_kubernetes_cronjob',
  KUBERNETES_REPLICA_SET: 'dt.entity.cloud_kubernetes_replica_set',
  KUBERNETES_INGRESS: 'dt.entity.cloud_kubernetes_ingress',
  KUBERNETES_ENDPOINT: 'dt.entity.cloud_kubernetes_endpoint',
  KUBERNETES_SECRET: 'dt.entity.cloud_kubernetes_secret',
  KUBERNETES_CONFIGMAP: 'dt.entity.cloud_kubernetes_configmap',
  KUBERNETES_PERSISTENT_VOLUME: 'dt.entity.cloud_kubernetes_persistent_volume',
  KUBERNETES_PERSISTENT_VOLUME_CLAIM: 'dt.entity.cloud_kubernetes_persistent_volume_claim',
  KUBERNETES_STORAGE_CLASS: 'dt.entity.cloud_kubernetes_storage_class',
  KUBERNETES_HORIZONTAL_POD_AUTOSCALER: 'dt.entity.cloud_kubernetes_horizontal_pod_autoscaler',
  KUBERNETES_ROLE: 'dt.entity.cloud_kubernetes_role',
  KUBERNETES_ROLE_BINDING: 'dt.entity.cloud_kubernetes_role_binding',
  KUBERNETES_CLUSTER_ROLE: 'dt.entity.cloud_kubernetes_cluster_role',
  KUBERNETES_CLUSTER_ROLE_BINDING: 'dt.entity.cloud_kubernetes_cluster_role_binding',
  KUBERNETES_SERVICE_ACCOUNT: 'dt.entity.cloud_kubernetes_service_account',
  KUBERNETES_CUSTOM_RESOURCE: 'dt.entity.cloud_kubernetes_custom_resource',
  KUBERNETES_API_RESOURCE: 'dt.entity.cloud_kubernetes_api_resource',
  KUBERNETES_CONTROLLER: 'dt.entity.cloud_kubernetes_controller',
  KUBERNETES_OPERATOR: 'dt.entity.cloud_kubernetes_operator',
  KUBERNETES_EVENT: 'dt.entity.cloud_kubernetes_event',
  KUBERNETES_RESOURCE_QUOTA: 'dt.entity.cloud_kubernetes_resource_quota',
  KUBERNETES_LIMIT_RANGE: 'dt.entity.cloud_kubernetes_limit_range',
  KUBERNETES_NETWORK_POLICY: 'dt.entity.cloud_kubernetes_network_policy',
  KUBERNETES_POD_DISRUPTION_BUDGET: 'dt.entity.cloud_kubernetes_pod_disruption_budget',
  KUBERNETES_POD_SECURITY_POLICY: 'dt.entity.cloud_kubernetes_pod_security_policy',
  KUBERNETES_RUNTIME_CLASS: 'dt.entity.cloud_kubernetes_runtime_class',
  KUBERNETES_VOLUME_ATTACHMENT: 'dt.entity.cloud_kubernetes_volume_attachment',
  KUBERNETES_ENDPOINT_SLICE: 'dt.entity.cloud_kubernetes_endpoint_slice',
  KUBERNETES_FLOW_SCHEMA: 'dt.entity.cloud_kubernetes_flow_schema',
  KUBERNETES_PRIORITY_LEVEL_CONFIGURATION: 'dt.entity.cloud_kubernetes_priority_level_configuration',
  KUBERNETES_STORAGE_VERSION: 'dt.entity.cloud_kubernetes_storage_version',
  KUBERNETES_TOKEN_REVIEW: 'dt.entity.cloud_kubernetes_token_review',
  KUBERNETES_SELF_SUBJECT_ACCESS_REVIEW: 'dt.entity.cloud_kubernetes_self_subject_access_review',
  KUBERNETES_SELF_SUBJECT_RULES_REVIEW: 'dt.entity.cloud_kubernetes_self_subject_rules_review',
  KUBERNETES_SUBJECT_ACCESS_REVIEW: 'dt.entity.cloud_kubernetes_subject_access_review',
  KUBERNETES_CERTIFICATE_SIGNING_REQUEST: 'dt.entity.cloud_kubernetes_certificate_signing_request',
  KUBERNETES_LEASE: 'dt.entity.cloud_kubernetes_lease',
};

export const DYNATRACE_ENTITY_TYPES = Object.values(ENTITY_ID_PREFIX_TO_TYPE_MAP).sort();

/**
 * Maps a Dynatrace entity ID to its corresponding entity type.
 *
 * @param entityId - The Dynatrace entity ID (e.g., "PROCESS_GROUP-F84E4759809ADA84")
 * @returns The corresponding entity type (e.g., "dt.entity.process_group") or null if no mapping exists
 *
 * @example
 * ```typescript
 * getEntityTypeFromId("PROCESS_GROUP-F84E4759809ADA84"); // Returns "dt.entity.process_group"
 * getEntityTypeFromId("APPLICATION-1234567890ABCDEF"); // Returns "dt.entity.application"
 * getEntityTypeFromId("KUBERNETES_POD-ABCDEF1234567890"); // Returns "dt.entity.cloud_kubernetes_pod"
 * getEntityTypeFromId("INVALID_ID"); // Returns null
 * ```
 */
export function getEntityTypeFromId(entityId: string): string | null {
  if (!entityId || typeof entityId !== 'string') {
    return null;
  }

  // Extract the prefix (everything before the first hyphen)
  const hyphenIndex = entityId.indexOf('-');
  if (hyphenIndex === -1) {
    return null;
  }

  const prefix = entityId.substring(0, hyphenIndex);

  // Look up the entity type in our mapping
  return ENTITY_ID_PREFIX_TO_TYPE_MAP[prefix] || null;
}
