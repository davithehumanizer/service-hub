export default {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    "^.+.(t|j)s$": "ts-jest",
  },
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: ["src/**/*.(t|j)s"],
  coveragePathIgnorePatterns: [
    "node_modules",
    "/dist/",
    "config",
    "database",
    "migrations",
    ".module.ts",
    "/src/main.ts",
    ".e2e-spec.ts$",
  ],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  collectCoverage: true,
  coverageReporters: ["text", "text-summary"],
  setupFilesAfterEnv: ["./jest.setup.ts"],
};
