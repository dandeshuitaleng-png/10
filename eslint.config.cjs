const js = require('@eslint/js');
const globals = require('globals');
const vue = require('eslint-plugin-vue');

module.exports = [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/qa/**', '**/preview/**', '交付/**'] },
  js.configs.recommended,
  {
    files: [
      'demo/server/**/*.cjs',
      'rural-culture-miniprogram/miniprogram/**/*.js',
      'tools/**/*.cjs',
      'rural-culture-miniprogram/tools/**/*.cjs'
    ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        wx: 'readonly',
        Page: 'readonly',
        App: 'readonly',
        Component: 'readonly',
        getCurrentPages: 'readonly'
      }
    }
  },
  {
    files: ['quiz-admin/src/**/*.js', 'quiz-admin/src/**/*.vue'],
    languageOptions: { sourceType: 'module', globals: globals.browser }
  },
  ...vue.configs['flat/essential'].map((config) => ({
    ...config,
    files: ['quiz-admin/src/**/*.vue']
  })),
  {
    rules: {
      'no-unused-vars': [
        'error',
        { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true, varsIgnorePattern: '^_' }
      ],
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  }
];
