// eslint.config.js
export default [
  {
    ignores: ['node_modules', 'bun.lockb', 'build', 'dist'],
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        Bun: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Response: 'readonly',
        ReadableStream: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      'no-console': 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'eqeqeq': ['error', 'always']
    }
  }
];
