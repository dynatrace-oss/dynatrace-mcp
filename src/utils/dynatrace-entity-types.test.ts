import { getEntityTypeFromId, DYNATRACE_ENTITY_TYPES } from './dynatrace-entity-types';

describe('DYNATRACE_ENTITY_TYPES', () => {
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
    it('should map ENVIRONMENT entity ID to dt.entity.environment', () => {
      const result = getEntityTypeFromId('ENVIRONMENT-2D0F07E264ABBB14');
      expect(result).toBe('dt.entity.environment');
    });

    it('should map KUBERNETES_NODE entity ID to dt.entity.kubernetes_node', () => {
      const result = getEntityTypeFromId('KUBERNETES_NODE-03169E17F0A60BE7');
      expect(result).toBe('dt.entity.kubernetes_node');
    });

    it('should map SERVICE_INSTANCE entity ID to dt.entity.service_instance', () => {
      const result = getEntityTypeFromId('SERVICE_INSTANCE-02072B90BE476A9D');
      expect(result).toBe('dt.entity.service_instance');
    });

    it('should map PROCESS_GROUP_INSTANCE entity ID to dt.entity.process_group_instance', () => {
      const result = getEntityTypeFromId('PROCESS_GROUP_INSTANCE-02072B90BE476A9D');
      expect(result).toBe('dt.entity.process_group_instance');
    });

    it('should map EC2_INSTANCE entity ID to dt.entity.ec2_instance', () => {
      const result = getEntityTypeFromId('EC2_INSTANCE-4F09B64F7C5EC72D');
      expect(result).toBe('dt.entity.ec2_instance');
    });

    it('should map AWS_LAMBDA_FUNCTION entity ID to dt.entity.aws_lambda_function', () => {
      const result = getEntityTypeFromId('AWS_LAMBDA_FUNCTION-65CB1C926C7A1C03');
      expect(result).toBe('dt.entity.aws_lambda_function');
    });

    it('should map CLOUD_APPLICATION_INSTANCE entity ID to dt.entity.cloud_application_instance', () => {
      const result = getEntityTypeFromId('CLOUD_APPLICATION_INSTANCE-00BAA09E6EC91E39');
      expect(result).toBe('dt.entity.cloud_application_instance');
    });

    it('should map DCG_INSTANCE entity ID to dt.entity.docker_container_group_instance', () => {
      const result = getEntityTypeFromId('DCG_INSTANCE-02072B90BE476A9D');
      expect(result).toBe('dt.entity.docker_container_group_instance');
    });

    it('should map OS entity ID to dt.entity.os', () => {
      const result = getEntityTypeFromId('OS-006B30874F10C837');
      expect(result).toBe('dt.entity.os');
    });

    it('should map AWS_AVAILABILITY_ZONE entity ID to dt.entity.aws_availability_zone', () => {
      const result = getEntityTypeFromId('AWS_AVAILABILITY_ZONE-0BAF92AC03BF3E25');
      expect(result).toBe('dt.entity.aws_availability_zone');
    });

    it('should map AWS_APPLICATION_LOAD_BALANCER entity ID to dt.entity.aws_application_load_balancer', () => {
      const result = getEntityTypeFromId('AWS_APPLICATION_LOAD_BALANCER-52D56F3FD851FF0C');
      expect(result).toBe('dt.entity.aws_application_load_balancer');
    });

    it('should map AWS_NETWORK_LOAD_BALANCER entity ID to dt.entity.aws_network_load_balancer', () => {
      const result = getEntityTypeFromId('AWS_NETWORK_LOAD_BALANCER-617A06EFED8F4AB4');
      expect(result).toBe('dt.entity.aws_network_load_balancer');
    });

    it('should map SYNTHETIC_LOCATION entity ID to dt.entity.synthetic_location', () => {
      const result = getEntityTypeFromId('SYNTHETIC_LOCATION-0000000000000010');
      expect(result).toBe('dt.entity.synthetic_location');
    });

    it('should map GEOLOCATION entity ID to dt.entity.geolocation', () => {
      const result = getEntityTypeFromId('GEOLOCATION-0000000000000000');
      expect(result).toBe('dt.entity.geolocation');
    });

    it('should map GCP_ZONE entity ID to dt.entity.gcp_zone', () => {
      const result = getEntityTypeFromId('GCP_ZONE-0C3C7E567EAAB95B');
      expect(result).toBe('dt.entity.gcp_zone');
    });

    it('should map AZURE_VM entity ID to dt.entity.azure_vm', () => {
      const result = getEntityTypeFromId('AZURE_VM-42EA5AB8F028E280');
      expect(result).toBe('dt.entity.azure_vm');
    });
  });
});
