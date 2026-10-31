import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to Vite, which forwards /api to the Nest backend,
// so no CORS setup is needed. In production set VITE_API_URL to the backend URL.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': { target: env.BACKEND_URL || 'http://localhost:3000', changeOrigin: true } },
    },
  };
});
