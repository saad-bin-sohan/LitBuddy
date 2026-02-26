import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:5001';

  return {
    plugins: [react()],
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.js$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: devApiTarget.replace(/^http/, 'ws'),
          ws: true,
          changeOrigin: true,
        },
        '/uploads': {
          target: devApiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  };
});
