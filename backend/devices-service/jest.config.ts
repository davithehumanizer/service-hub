export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coveragePathIgnorePatterns: [
    'node_modules',
    'config',
    'database',
    '/src/migrations/',
    '\\.module\\.ts',
    '/src/main.ts',
    '/src/cli.ts',
    '/src/devices/commands/',
    '/src/devices/utils/icecat.utils.ts',
    '/src/devices/utils/logger.utils.ts',
    '\\.e2e-spec\\.ts$',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  collectCoverage: true,
  coverageReporters: ['text', 'text-summary'],
};
