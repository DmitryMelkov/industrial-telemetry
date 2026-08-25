import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const src = (...segments: string[]) => path.resolve(rootDir, 'src', ...segments);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': src('app'),
      '@pages': src('pages'),
      '@widgets': src('widgets'),
      '@features': src('features'),
      '@entities': src('entities'),
      '@shared': src('shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
