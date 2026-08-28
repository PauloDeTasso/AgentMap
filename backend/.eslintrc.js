module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-console': 'off',
    'prefer-const': 'off',
    '@typescript-eslint/no-namespace': 'off',
    'no-constant-condition': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    'no-useless-escape': 'off',
    'no-control-regex': 'off',
    'no-empty': 'off',
    'no-case-declarations': 'off'
  }
};
