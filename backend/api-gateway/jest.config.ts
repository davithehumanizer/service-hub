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
    'migrations',
    '\\.module\\.ts',
    '/src/main.ts',
    'src/scalar.config.ts',
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
  setupFilesAfterEnv: ['./test/setup.ts'],
};
