/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/testes'],
  testMatch: ['**/*.test.ts'],
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
    '^@kilocode/plugin$': '<rootDir>/testes/__mocks__/kilocode-plugin.ts'
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
