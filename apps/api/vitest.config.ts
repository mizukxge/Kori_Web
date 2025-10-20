import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    // Keep everything local to the API app
    dir: resolve(process.cwd(), 'apps', 'api', 'test'),
    include: ['**/*.test.ts'],
    threads: false, // Windows stability
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: ['dot'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: resolve(process.cwd(), 'coverage', 'api'),
      reporter: ['text', 'lcov']
      // No hard threshold yet; we'll raise gates after unit tests exist
    }
  }
});
