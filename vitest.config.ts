import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Exclude Lambda tests (they use Jest and run separately)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/aws-lambda/**',
      '**/cypress/**',
    ],
    // Increase timeout for async operations
    testTimeout: 15000,
    hookTimeout: 15000,
    // Configure test environment
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'coverage/',
        'cypress/',
        'public/',
        'azure-functions/',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    // Suppress console output during tests
    silent: false,
    reporter: ['verbose'],
  },
});