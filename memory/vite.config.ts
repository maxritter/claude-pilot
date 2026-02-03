import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/ui/viewer',
  publicDir: 'public',
  base: './',
  build: {
    outDir: '../../../build/viewer',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/ui/viewer/index.html',
      output: {
        entryFileNames: 'viewer-bundle.js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo: { name?: string }) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'viewer.css';
          }
          return '[name][extname]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@ui': path.resolve(__dirname, 'src/ui/viewer'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:37777',
        changeOrigin: true
      }
    }
  }
});
