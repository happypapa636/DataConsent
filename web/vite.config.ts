import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      buffer: 'buffer/',
      events: 'events/',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  server: {
    port: 5173,
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 4000,
  },
});
