import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      emptyOutDir: false,
    },
    define: {
      'process.env.IMGBB_API_KEY': JSON.stringify(process.env.IMGBB_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/server-data-store*.json',
          '**/server-*.log',
          '**/server-uploads/**',
          '**/.data/**',
          '**/data/**',
          '**/*.log',
        ],
      },
    },
  };
});
