import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    exclude: ['dist', 'node_modules'],
    clearMocks: true,
    restoreMocks: true,
  },
});
