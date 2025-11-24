import { DYNATRACE_ENTITY_TYPES_ALL, DYNATRACE_ENTITY_TYPES_BASICS } from '../utils/dynatrace-entity-types';
import { generateDqlSearchEntityCommand } from './find-monitored-entity-by-name';

describe('generateDqlSearchCommand', () => {
  beforeEach(() => {
    // Ensure we have at least some entity types for testing
    expect(DYNATRACE_ENTITY_TYPES_ALL.length).toBeGreaterThan(0);
  });

  it('should include all entity types from DYNATRACE_ENTITY_TYPES_ALL', () => {
    const entityName = 'test';
    const result = generateDqlSearchEntityCommand([entityName], true);

    console.log(result);

    // Check that all entity types are included in the DQL
    DYNATRACE_ENTITY_TYPES_ALL.forEach((entityType) => {
      expect(result).toContain(`fetch ${entityType}`);
    });
  });

  it('should include entity types from DYNATRACE_ENTITY_TYPES_BASICS', () => {
    const entityName = 'test';
    const result = generateDqlSearchEntityCommand([entityName], false);

    console.log(result);

    // Check that all entity types are included in the DQL
    DYNATRACE_ENTITY_TYPES_BASICS.forEach((entityType) => {
      expect(result).toContain(`fetch ${entityType}`);
    });
  });

  it('should structure the DQL correctly with first fetch and subsequent appends', () => {
    const entityName = 'test';
    const result = generateDqlSearchEntityCommand([entityName], true);

    // First entity type should not have append prefix
    const firstEntityType = DYNATRACE_ENTITY_TYPES_ALL[0];
    expect(result).toContain(
      `fetch ${firstEntityType} | search "*${entityName}*" | fieldsAdd entity.type | expand tags`,
    );

    // Subsequent entity types should have append prefix (if there are more than 1)
    if (DYNATRACE_ENTITY_TYPES_ALL.length > 1) {
      const secondEntityType = DYNATRACE_ENTITY_TYPES_ALL[1];
      expect(result).toContain(
        `  | append [ fetch ${secondEntityType} | search "*${entityName}*" | fieldsAdd entity.type | expand tags ]`,
      );
    }
  });

  it('should handle multiple entityNames correctly', () => {
    const entityNames = ['test1', 'test2', 'example'];
    const result = generateDqlSearchEntityCommand(entityNames, true);

    // Check that the search part includes all entity names joined by OR
    const searchPart = `search "*test1*" OR "*test2*" OR "*example*"`;
    expect(result).toContain(searchPart);
  });
});
