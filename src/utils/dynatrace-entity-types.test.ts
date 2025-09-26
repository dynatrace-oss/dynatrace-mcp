import { getEntityTypeFromId, DYNATRACE_ENTITY_TYPES_ALL } from './dynatrace-entity-types';

describe('DYNATRACE_ENTITY_TYPES', () => {
  it('should be sorted alphabetically', () => {
    const sortedTypes = [...DYNATRACE_ENTITY_TYPES_ALL].sort();
    expect(DYNATRACE_ENTITY_TYPES_ALL).toEqual(sortedTypes);
  });

  it('should have unique values', () => {
    const uniqueTypes = [...new Set(DYNATRACE_ENTITY_TYPES_ALL)];
    expect(DYNATRACE_ENTITY_TYPES_ALL.length).toBe(uniqueTypes.length);
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

  it('should map KUBERNETES_CLUSTER entity ID to dt.entity.kubernetes_cluster', () => {
    const result = getEntityTypeFromId('KUBERNETES_CLUSTER-1234567890ABCDEF');
    expect(result).toBe('dt.entity.kubernetes_cluster');
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

  // Tests for verified entity types found in the environment
  describe('Verified Entity Types', () => {
    const verifiedEntityTypesTestCases = [
      {
        entityId: 'ENVIRONMENT-2D0F07E264ABBB14',
        expectedType: 'dt.entity.environment',
        description: 'ENVIRONMENT entity ID',
      },
      {
        entityId: 'KUBERNETES_NODE-03169E17F0A60BE7',
        expectedType: 'dt.entity.kubernetes_node',
        description: 'KUBERNETES_NODE entity ID',
      },
      {
        entityId: 'SERVICE_INSTANCE-02072B90BE476A9D',
        expectedType: 'dt.entity.service_instance',
        description: 'SERVICE_INSTANCE entity ID',
      },
      {
        entityId: 'PROCESS_GROUP_INSTANCE-02072B90BE476A9D',
        expectedType: 'dt.entity.process_group_instance',
        description: 'PROCESS_GROUP_INSTANCE entity ID',
      },
      {
        entityId: 'EC2_INSTANCE-4F09B64F7C5EC72D',
        expectedType: 'dt.entity.ec2_instance',
        description: 'EC2_INSTANCE entity ID',
      },
      {
        entityId: 'AWS_LAMBDA_FUNCTION-65CB1C926C7A1C03',
        expectedType: 'dt.entity.aws_lambda_function',
        description: 'AWS_LAMBDA_FUNCTION entity ID',
      },
      {
        entityId: 'CLOUD_APPLICATION_INSTANCE-00BAA09E6EC91E39',
        expectedType: 'dt.entity.cloud_application_instance',
        description: 'CLOUD_APPLICATION_INSTANCE entity ID',
      },
      {
        entityId: 'DCG_INSTANCE-02072B90BE476A9D',
        expectedType: 'dt.entity.docker_container_group_instance',
        description: 'DCG_INSTANCE entity ID',
      },
      {
        entityId: 'OS-006B30874F10C837',
        expectedType: 'dt.entity.os',
        description: 'OS entity ID',
      },
      {
        entityId: 'AWS_AVAILABILITY_ZONE-0BAF92AC03BF3E25',
        expectedType: 'dt.entity.aws_availability_zone',
        description: 'AWS_AVAILABILITY_ZONE entity ID',
      },
      {
        entityId: 'AWS_APPLICATION_LOAD_BALANCER-52D56F3FD851FF0C',
        expectedType: 'dt.entity.aws_application_load_balancer',
        description: 'AWS_APPLICATION_LOAD_BALANCER entity ID',
      },
      {
        entityId: 'AWS_NETWORK_LOAD_BALANCER-617A06EFED8F4AB4',
        expectedType: 'dt.entity.aws_network_load_balancer',
        description: 'AWS_NETWORK_LOAD_BALANCER entity ID',
      },
      {
        entityId: 'SYNTHETIC_LOCATION-0000000000000010',
        expectedType: 'dt.entity.synthetic_location',
        description: 'SYNTHETIC_LOCATION entity ID',
      },
      {
        entityId: 'GEOLOCATION-0000000000000000',
        expectedType: 'dt.entity.geolocation',
        description: 'GEOLOCATION entity ID',
      },
      {
        entityId: 'GCP_ZONE-0C3C7E567EAAB95B',
        expectedType: 'dt.entity.gcp_zone',
        description: 'GCP_ZONE entity ID',
      },
      {
        entityId: 'AZURE_VM-42EA5AB8F028E280',
        expectedType: 'dt.entity.azure_vm',
        description: 'AZURE_VM entity ID',
      },
      {
        entityId: 'RELATIONAL_DATABASE_SERVICE-B4EDC0E1E1279494',
        expectedType: 'dt.entity.relational_database_service',
        description: 'RELATIONAL_DATABASE_SERVICE entity ID',
      },
    ];

    it.each(verifiedEntityTypesTestCases)('should map $description to $expectedType', ({ entityId, expectedType }) => {
      const result = getEntityTypeFromId(entityId);
      expect(result).toBe(expectedType);
    });
  });
});
