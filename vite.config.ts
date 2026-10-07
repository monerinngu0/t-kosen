import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        // Keep the development proxy compatible with the API's same-origin check.
        headers: { Origin: 'http://localhost:8787' },
      },
    },
  },
});
