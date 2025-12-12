module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  moduleNameMapper: {
    '^@foodtrack/backend-shared$': '<rootDir>/../shared/src/index.ts',
    '^@foodtrack/types$': '<rootDir>/../../packages/types/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@foodtrack)/)',
  ],
};