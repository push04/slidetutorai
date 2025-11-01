import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: false,
    allowedHosts: true,
    hmr: {
      protocol: 'wss',
      host: process.env.REPLIT_DEV_DOMAIN || 'localhost',
      clientPort: 443,
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      external: [
        'pdfjs-dist/legacy/build/pdf',
        'jszip',
      ],
    },
  },
});

