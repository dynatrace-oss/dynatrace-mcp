/**
 * Dynatrace Entity Types
 *
 * Complete list of Dynatrace entity types for querying monitored entities.
 * Generated from ENTITY_ID_PREFIX_TO_TYPE_MAP values to ensure consistency.
 * Last Updated: 2025-08-14
 * @see https://docs.dynatrace.com/docs/discover-dynatrace/references/semantic-dictionary/model/dt-entities
 */

/**
 * Entity ID prefixes mapped to their corresponding Dynatrace entity types
 * When adding a new Entity, there should also be a corresponding test in dynatrace-entity-types.test.ts
 * to ensure that the entity type can be correctly derived from the entity ID.
 *
 * Disclaimer: This mapping is based on the current Dynatrace API and may change in future versions. Use at your own risk!
 *
 * Recommendation: Use `verify_dql` and/or `execute_dql` to ensure that the entity type can be queried correctly.
 */
const ENTITY_ID_PREFIX_TO_TYPE_MAP_BASICS: Record<string, string> = {
  // Core Applications and Services
  APPLICATION: 'dt.entity.application', // Verified!
  SERVICE: 'dt.entity.service', // Verified!
  MOBILE_APPLICATION: 'dt.entity.mobile_application', // Verified! (0 rows found, manually verified that entity exists)
  CUSTOM_APPLICATION: 'dt.entity.custom_application', // Verified!

  // Infrastructure
  HOST: 'dt.entity.host', // Verified!
  HOST_GROUP: 'dt.entity.host_group', // Verified!
  PROCESS_GROUP: 'dt.entity.process_group', // Verified!
  DISK: 'dt.entity.disk', // Verified!
  NETWORK_INTERFACE: 'dt.entity.network_interface', // Verified!

  // Cloud Services
  CLOUD_APPLICATION: 'dt.entity.cloud_application', // Verified!

  CLOUD_APPLICATION_NAMESPACE: 'dt.entity.cloud_application_namespace', // Verified!

  // Containers and Container Groups
  CONTAINER_GROUP: 'dt.entity.container_group', // Verified!

  // Environment
  ENVIRONMENT: 'dt.entity.environment', // Verified!

  // Operating System
  OS: 'dt.entity.os', // Verified!

  // Synthetic Monitoring
  SYNTHETIC_TEST: 'dt.entity.synthetic_test', // Verified!
  SYNTHETIC_LOCATION: 'dt.entity.synthetic_location', // Verified!

  // Custom Devices and Entities
  CUSTOM_DEVICE: 'dt.entity.custom_device', // Verified!
  CUSTOM_DEVICE_GROUP: 'dt.entity.custom_device_group', // Verified!

  // Geolocation
  GEOLOCATION: 'dt.entity.geolocation', // Verified!

  // Database Services
  RELATIONAL_DATABASE_SERVICE: 'dt.entity.relational_database_service', // Verified - might need an additional integration/config to work properly though

  // Kubernetes Entities
  KUBERNETES_NODE: 'dt.entity.kubernetes_node', // Verified!
  KUBERNETES_CLUSTER: 'dt.entity.kubernetes_cluster', // Verified!
  KUBERNETES_SERVICE: 'dt.entity.kubernetes_service', // Verified!
};

const ENTITY_ID_PREFIX_TO_TYPE_MAP_ALL: Record<string, string> = {
  ...ENTITY_ID_PREFIX_TO_TYPE_MAP_BASICS,
  SERVICE_INSTANCE: 'dt.entity.service_instance', // Verified!
  PROCESS_GROUP_INSTANCE: 'dt.entity.process_group_instance', // Verified!
  CLOUD_APPLICATION_INSTANCE: 'dt.entity.cloud_application_instance', // Verified!
  DCG_INSTANCE: 'dt.entity.docker_container_group_instance', // Verified! (0 rows found, manually verified that entity exists, but this might be deprecated / old)
  CONTAINER_GROUP_INSTANCE: 'dt.entity.container_group_instance', // Verified!

  // AWS Services
  EC2_INSTANCE: 'dt.entity.ec2_instance', // Verified!
  AWS_LAMBDA_FUNCTION: 'dt.entity.aws_lambda_function', // Verified!
  AWS_AVAILABILITY_ZONE: 'dt.entity.aws_availability_zone', // Verified!
  AWS_APPLICATION_LOAD_BALANCER: 'dt.entity.aws_application_load_balancer', // Verified!
  AWS_NETWORK_LOAD_BALANCER: 'dt.entity.aws_network_load_balancer', // Verified!

  // GCP Services
  GCP_ZONE: 'dt.entity.gcp_zone', // Verified!

  // Virtual Machines
  AZURE_VM: 'dt.entity.azure_vm', // Verified
  OPENSTACK_VM: 'dt.entity.openstack_vm', // Needs manual verification - available only if OpenStack integration is configured
};

export const DYNATRACE_ENTITY_TYPES_BASICS = Object.values(ENTITY_ID_PREFIX_TO_TYPE_MAP_BASICS).sort();
export const DYNATRACE_ENTITY_TYPES_ALL = Object.values(ENTITY_ID_PREFIX_TO_TYPE_MAP_ALL).sort();

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
 * getEntityTypeFromId("KUBERNETES_SERVICE-ABCDEF1234567890"); // Returns "dt.entity.kubernetes_service"
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
  return ENTITY_ID_PREFIX_TO_TYPE_MAP_ALL[prefix] || null;
}
