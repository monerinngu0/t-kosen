import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import architecture from './scripts/eslint/architecture.js';
export default ts.config(
  { ignores: ['dist/**', '.wrangler/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    plugins: { architecture: { rules: { boundaries: architecture } } },
    rules: { 'architecture/boundaries': 'error' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: { ...hooks.configs.recommended.rules },
  },
);
