// Disable telemetry during tests to prevent network connections and unwanted data collection
process.env.DT_MCP_DISABLE_TELEMETRY = 'true';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testTimeout: 10000, // Default timeout for tests
  // Separate test configurations
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/integration-tests/**/*.integration.test.ts'],
    },
  ],
};
