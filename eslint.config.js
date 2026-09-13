import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', '.vercel/**']
  },
  js.configs.recommended,
  {
    files: ['src/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        jsQR: 'readonly',
        BarcodeDetector: 'readonly'
      }
    }
  },
  {
    files: ['api/**', 'lib/**', 'test/**', 'scripts/**', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    }
  }
];
