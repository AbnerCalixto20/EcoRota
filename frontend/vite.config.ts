import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Em produção (Render/Docker), Django/WhiteNoise serve o bundle em /static/frontend/.
  base: process.env.ECOROTA_RENDER_BUILD === '1' ? '/static/frontend/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
    },
  },
});
