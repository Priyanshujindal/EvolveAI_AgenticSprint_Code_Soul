import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = env.VITE_BACKEND_PORT || env.PORT || '8080';
  const backendHost = env.VITE_BACKEND_HOST || 'localhost';
  const target = `http://${backendHost}:${backendPort}`;

  return {
    plugins: [react()],
    build: {
      // Increase limit (in kB) to silence large chunk warnings in production builds
      chunkSizeWarningLimit: 2000,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/functions': {
          target,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});


