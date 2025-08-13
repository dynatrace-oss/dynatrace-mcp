import { getEntityTypeFromId, DYNATRACE_ENTITY_TYPES } from './dynatrace-entity-types';

describe('DYNATRACE_ENTITY_TYPES', () => {
  it('should contain all entity types from the mapping', () => {
    // Verify that DYNATRACE_ENTITY_TYPES contains the expected entity types
    expect(DYNATRACE_ENTITY_TYPES).toContain('dt.entity.application');
    expect(DYNATRACE_ENTITY_TYPES).toContain('dt.entity.service');
    expect(DYNATRACE_ENTITY_TYPES).toContain('dt.entity.host');
    expect(DYNATRACE_ENTITY_TYPES).toContain('dt.entity.process_group');
    expect(DYNATRACE_ENTITY_TYPES).toContain('dt.entity.cloud_kubernetes_pod');
    expect(DYNATRACE_ENTITY_TYPES).toContain('dt.entity.cloud_kubernetes_cluster');
  });

  it('should be sorted alphabetically', () => {
    const sortedTypes = [...DYNATRACE_ENTITY_TYPES].sort();
    expect(DYNATRACE_ENTITY_TYPES).toEqual(sortedTypes);
  });

  it('should have unique values', () => {
    const uniqueTypes = [...new Set(DYNATRACE_ENTITY_TYPES)];
    expect(DYNATRACE_ENTITY_TYPES.length).toBe(uniqueTypes.length);
  });
});

describe('getEntityTypeFromId', () => {
  it('should map PROCESS_GROUP entity ID to dt.entity.process_group', () => {
    const result = getEntityTypeFromId('PROCESS_GROUP-F84E4759809ADA84');
    expect(result).toBe('dt.entity.process_group');
  });

  it('should map APPLICATION entity ID to dt.entity.application', () => {
    const result = getEntityTypeFromId('APPLICATION-1234567890ABCDEF');
    expect(result).toBe('dt.entity.application');
  });

  it('should map SERVICE entity ID to dt.entity.service', () => {
    const result = getEntityTypeFromId('SERVICE-ABCDEF1234567890');
    expect(result).toBe('dt.entity.service');
  });

  it('should map HOST entity ID to dt.entity.host', () => {
    const result = getEntityTypeFromId('HOST-1234567890ABCDEF');
    expect(result).toBe('dt.entity.host');
  });

  it('should map KUBERNETES_POD entity ID to dt.entity.cloud_kubernetes_pod', () => {
    const result = getEntityTypeFromId('KUBERNETES_POD-ABCDEF1234567890');
    expect(result).toBe('dt.entity.cloud_kubernetes_pod');
  });

  it('should map KUBERNETES_CLUSTER entity ID to dt.entity.cloud_kubernetes_cluster', () => {
    const result = getEntityTypeFromId('KUBERNETES_CLUSTER-1234567890ABCDEF');
    expect(result).toBe('dt.entity.cloud_kubernetes_cluster');
  });

  it('should map CLOUD_APPLICATION entity ID to dt.entity.cloud_application', () => {
    const result = getEntityTypeFromId('CLOUD_APPLICATION-FEDCBA0987654321');
    expect(result).toBe('dt.entity.cloud_application');
  });

  it('should return null for entity ID without hyphen', () => {
    const result = getEntityTypeFromId('INVALID_ENTITY_ID');
    expect(result).toBeNull();
  });

  it('should return null for unknown entity prefix', () => {
    const result = getEntityTypeFromId('UNKNOWN_PREFIX-1234567890ABCDEF');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = getEntityTypeFromId('');
    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    const result = getEntityTypeFromId(null as any);
    expect(result).toBeNull();
  });

  it('should return null for undefined input', () => {
    const result = getEntityTypeFromId(undefined as any);
    expect(result).toBeNull();
  });

  it('should return null for non-string input', () => {
    const result = getEntityTypeFromId(123 as any);
    expect(result).toBeNull();
  });

  it('should handle entity ID with multiple hyphens correctly', () => {
    const result = getEntityTypeFromId('PROCESS_GROUP-F84E-4759-809A-DA84');
    expect(result).toBe('dt.entity.process_group');
  });

  it('should map KUBERNETES_HORIZONTAL_POD_AUTOSCALER entity ID correctly', () => {
    const result = getEntityTypeFromId('KUBERNETES_HORIZONTAL_POD_AUTOSCALER-1234567890ABCDEF');
    expect(result).toBe('dt.entity.cloud_kubernetes_horizontal_pod_autoscaler');
  });
});
