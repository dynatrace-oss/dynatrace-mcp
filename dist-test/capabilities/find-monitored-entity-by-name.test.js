'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const dynatrace_entity_types_1 = require('../utils/dynatrace-entity-types');
const find_monitored_entity_by_name_1 = require('./find-monitored-entity-by-name');
describe('generateDqlSearchCommand', () => {
  beforeEach(() => {
    // Ensure we have at least some entity types for testing
    expect(dynatrace_entity_types_1.DYNATRACE_ENTITY_TYPES_ALL.length).toBeGreaterThan(0);
  });
  it('should include all entity types from DYNATRACE_ENTITY_TYPES_ALL', () => {
    const entityName = 'test';
    const result = (0, find_monitored_entity_by_name_1.generateDqlSearchEntityCommand)([entityName], true);
    console.log(result);
    // Check that all entity types are included in the DQL
    dynatrace_entity_types_1.DYNATRACE_ENTITY_TYPES_ALL.forEach((entityType) => {
      expect(result).toContain(`fetch ${entityType}`);
    });
  });
  it('should include entity types from DYNATRACE_ENTITY_TYPES_BASICS', () => {
    const entityName = 'test';
    const result = (0, find_monitored_entity_by_name_1.generateDqlSearchEntityCommand)([entityName], false);
    console.log(result);
    // Check that all entity types are included in the DQL
    dynatrace_entity_types_1.DYNATRACE_ENTITY_TYPES_BASICS.forEach((entityType) => {
      expect(result).toContain(`fetch ${entityType}`);
    });
  });
  it('should structure the DQL correctly with first fetch and subsequent appends', () => {
    const entityName = 'test';
    const result = (0, find_monitored_entity_by_name_1.generateDqlSearchEntityCommand)([entityName], true);
    // First entity type should not have append prefix
    const firstEntityType = dynatrace_entity_types_1.DYNATRACE_ENTITY_TYPES_ALL[0];
    expect(result).toContain(
      `fetch ${firstEntityType} | search "*${entityName}*" | fieldsAdd entity.type | expand tags`,
    );
    // Subsequent entity types should have append prefix (if there are more than 1)
    if (dynatrace_entity_types_1.DYNATRACE_ENTITY_TYPES_ALL.length > 1) {
      const secondEntityType = dynatrace_entity_types_1.DYNATRACE_ENTITY_TYPES_ALL[1];
      expect(result).toContain(
        `  | append [ fetch ${secondEntityType} | search "*${entityName}*" | fieldsAdd entity.type | expand tags ]`,
      );
    }
  });
  it('should handle multiple entityNames correctly', () => {
    const entityNames = ['test1', 'test2', 'example'];
    const result = (0, find_monitored_entity_by_name_1.generateDqlSearchEntityCommand)(entityNames, true);
    // Check that the search part includes all entity names joined by OR
    const searchPart = `search "*test1*" OR "*test2*" OR "*example*"`;
    expect(result).toContain(searchPart);
  });
});
