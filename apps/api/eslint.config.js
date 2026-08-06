import tseslint from 'typescript-eslint';

export default tseslint.config(
  // template.ts is the scaffold node-pg-migrate copies for new migrations; its
  // empty up/down bodies are intentional.
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'migration-template.ts'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
