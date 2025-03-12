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
        clearInterval: 'readonly',
      },
    },
    rules: {
      // ✅ Bonnes pratiques JS modernes
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',

      // ✅ Style & lisibilité
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      indent: ['error', 2, { SwitchCase: 1 }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'comma-dangle': ['error', 'always-multiline'],
      'space-before-function-paren': ['error', 'never'],
      'keyword-spacing': ['error', { before: true, after: true }],

      // ✅ Production safety
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'no-debugger': 'error',

      // Optionnel si besoin :
      // 'no-trailing-spaces': 'error',
      // 'eol-last': ['error', 'always'],
    },
  },
];
