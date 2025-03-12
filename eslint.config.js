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
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-console': 'off',
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single'],
      'eqeqeq': ['error', 'always']
    }
  }
];
