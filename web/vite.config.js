import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const LIVE_API = process.env.LIVE_API || 'https://catalogo-suplementos.pages.dev';
const PROXY = {
  '/api': { target: LIVE_API, changeOrigin: true, secure: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: '.',
  publicDir: 'static',
  server: { proxy: PROXY },
  preview: { proxy: PROXY },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});