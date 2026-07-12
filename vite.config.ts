import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // publicDir is the default 'public/' — generated from data/ by `npm run data:sync`
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.spec.ts'],
  },
});
