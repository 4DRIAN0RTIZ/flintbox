import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Express API (server.js) listens on :3000. In dev, Vite serves the UI
// on :5173 and proxies every /api call to it, so the client-side contract
// (/api/run, /api/help/:tool, /api/fetch-text, /api/fetch-input) is unchanged.
// `npm run build` emits static assets into dist/, which server.js serves.
export default defineConfig({
  plugins: [react()],
  // Old vanilla frontend lived in public/; static assets now live in assets/
  // so Vite does not also ship the retired public/js and public/css trees.
  publicDir: 'assets',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
  },
});
