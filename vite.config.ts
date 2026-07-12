import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // publicDir is the default 'public/' — generated from data/ by `npm run data:sync`
  build: {
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing vendors into their own chunks:
        // cytoscape is ~400 kB on its own, so keeping it out of the app chunk
        // lets it download in parallel and stay cached across app deploys.
        manualChunks: {
          cytoscape: ['cytoscape'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.spec.ts'],
  },
});
