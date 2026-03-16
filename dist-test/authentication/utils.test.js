'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const utils_1 = require('./utils');
describe('getRandomPort', () => {
  it('should return a port within the specified range', () => {
    const min = 5344;
    const max = 5349;
    const port = (0, utils_1.getRandomPort)(min, max);
    expect(port).toBeGreaterThanOrEqual(min);
    expect(port).toBeLessThanOrEqual(max);
  });
  it('should exclude specified ports', () => {
    const min = 5344;
    const max = 5349;
    const excludePorts = [5344, 5345];
    // Mock Math.random to return 0 first (excluded port), then 0.5 (valid port)
    const mockRandom = jest.spyOn(Math, 'random');
    mockRandom.mockReturnValueOnce(0); // selects 5344, excluded
    mockRandom.mockReturnValueOnce(0.5); // selects 5347, valid
    const port = (0, utils_1.getRandomPort)(min, max, excludePorts);
    expect(port).toBe(5347);
    expect(excludePorts).not.toContain(port);
    jest.restoreAllMocks();
  });
  it('should throw an error when no ports are available', () => {
    // we will allow ports between 5344 and 5346, but exclude all of them
    const min = 5344;
    const max = 5346;
    const excludePorts = [5344, 5345, 5346];
    expect(() => (0, utils_1.getRandomPort)(min, max, excludePorts)).toThrow('No available ports to choose from');
  });
  it('should always return the only available port', () => {
    // we will allow ports between 5344 and 5346, but exclude 5344 and 5345 -> 5346 is the only available port
    const min = 5344;
    const max = 5346;
    const excludePorts = [5344, 5345];
    const port = (0, utils_1.getRandomPort)(min, max, excludePorts);
    expect(port).toBe(5346);
  });
  it('should use default min and max when not provided', () => {
    const port = (0, utils_1.getRandomPort)();
    expect(port).toBeGreaterThanOrEqual(5344);
    expect(port).toBeLessThanOrEqual(5349);
  });
});
