import { DYNATRACE_ENTITY_TYPES } from '../utils/dynatrace-entity-types';
import { generateDqlSearchEntityCommand } from './find-monitored-entity-by-name';

describe('generateDqlSearchCommand', () => {
  beforeEach(() => {
    // Ensure we have at least some entity types for testing
    expect(DYNATRACE_ENTITY_TYPES.length).toBeGreaterThan(0);
  });

  it('should include all entity types from DYNATRACE_ENTITY_TYPES', () => {
    const entityName = 'test';
    const result = generateDqlSearchEntityCommand(entityName);

    console.log(result);

    // Check that all entity types are included in the DQL
    DYNATRACE_ENTITY_TYPES.forEach((entityType) => {
      expect(result).toContain(`fetch ${entityType}`);
    });
  });

  it('should structure the DQL correctly with first fetch and subsequent appends', () => {
    const entityName = 'test';
    const result = generateDqlSearchEntityCommand(entityName);

    // First entity type should not have append prefix
    const firstEntityType = DYNATRACE_ENTITY_TYPES[0];
    expect(result).toContain(`fetch ${firstEntityType} | search "*${entityName}*" | fieldsAdd entity.type`);

    // Subsequent entity types should have append prefix (if there are more than 1)
    if (DYNATRACE_ENTITY_TYPES.length > 1) {
      const secondEntityType = DYNATRACE_ENTITY_TYPES[1];
      expect(result).toContain(
        `  | append [ fetch ${secondEntityType} | search "*${entityName}*" | fieldsAdd entity.type ]`,
      );
    }
  });
});
