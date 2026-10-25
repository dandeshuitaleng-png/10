import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  base: '/management/',
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [
        {
          postcssPlugin: 'management-vendor-css-layer',
          Once(root, { AtRule }) {
            const file = root.source?.input.file?.replace(/\\/g, '/') || '';
            if (!file.includes('/node_modules/element-plus/theme-chalk/')) return;
            // App overrides remain unlayered, so deferred vendor CSS cannot override them.
            const layer = new AtRule({ name: 'layer', params: 'element-plus' });
            for (const node of [...root.nodes]) {
              if (node.type === 'atrule' && node.name === 'charset') node.remove();
              else layer.append(node);
            }
            root.append(layer);
          }
        }
      ]
    }
  },
  build: { manifest: true },
  server: {
    host: '127.0.0.1',
    port: 5190,
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:63112', changeOrigin: true } }
  }
});
