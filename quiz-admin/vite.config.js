import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  base: '/management/',
  plugins: [vue()],
  build: { manifest: true },
  server: {
    host: '127.0.0.1',
    port: 5190,
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:63112', changeOrigin: true } }
  }
});
