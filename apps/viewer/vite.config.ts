import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import vuetify from 'vite-plugin-vuetify';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    // autoImport ≈ tree-shake: компоненты Vuetify подтягиваются по использованию
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
