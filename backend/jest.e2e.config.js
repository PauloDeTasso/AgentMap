/**
 * Jest config para testes E2E.
 *
 * Estes testes executam o CLI e o MCP server em processos reais,
 * validando o fluxo completo de ponta a ponta.
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/testes-e2e'],
  testMatch: ['**/*.e2e.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
  },
  moduleNameMapper: {
    '^servicios$': '<rootDir>/src/servicios',
    '^servicios/(.*)$': '<rootDir>/src/servicios/$1',
    '^tipos$': '<rootDir>/src/tipos',
    '^tipos/(.*)$': '<rootDir>/src/tipos/$1',
    '^arquivos$': '<rootDir>/src/arquivos',
    '^arquivos/(.*)$': '<rootDir>/src/arquivos/$1',
    '^validacao$': '<rootDir>/src/validacao',
    '^validacao/(.*)$': '<rootDir>/src/validacao/$1',
    '^seguranca$': '<rootDir>/src/seguranca',
    '^seguranca/(.*)$': '<rootDir>/src/seguranca/$1',
    '^api$': '<rootDir>/src/api',
    '^api/(.*)$': '<rootDir>/src/api/$1',
    '^observability$': '<rootDir>/src/observability',
    '^observability/(.*)$': '<rootDir>/src/observability/$1',
    '^websocket$': '<rootDir>/src/websocket',
    '^websocket/(.*)$': '<rootDir>/src/websocket/$1',
    '^generators$': '<rootDir>/src/generators',
    '^generators/(.*)$': '<rootDir>/src/generators/$1',
    '^bootstrap$': '<rootDir>/src/bootstrap',
    '^bootstrap/(.*)$': '<rootDir>/src/bootstrap/$1',
    '^cli$': '<rootDir>/src/cli',
    '^cli/(.*)$': '<rootDir>/src/cli/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testTimeout: 30000,
  setupFilesAfterEnv: [],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: '<rootDir>/coverage-e2e',
  verbose: true,
};
