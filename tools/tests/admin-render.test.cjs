'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

test('lazy descriptions render their actual slot labels and values through the real UI registry', async (t) => {
  const admin = path.resolve(__dirname, '../../quiz-admin');
  const fromAdmin = createRequire(path.join(admin, 'package.json'));
  const vite = await import(pathToFileURL(fromAdmin.resolve('vite')).href);
  const server = await vite.createServer({
    root: admin,
    server: { middlewareMode: true, hmr: false },
    ssr: { noExternal: ['element-plus'] },
    appType: 'custom'
  });
  t.after(() => server.close());
  const { installUi } = await server.ssrLoadModule('/src/ui/element-plus.js');
  const { createSSRApp, h, resolveComponent } = fromAdmin('vue');
  const { renderToString } = fromAdmin('@vue/server-renderer');
  const app = createSSRApp({
    render() {
      return h(
        resolveComponent('ElDescriptions'),
        { column: 1 },
        {
          default: () => [
            h(
              resolveComponent('ElDescriptionsItem'),
              { label: '来源信息' },
              () => '原始内容保持可见'
            )
          ]
        }
      );
    }
  });
  app.use(installUi);
  const html = await renderToString(app);
  assert.match(html, /来源信息/);
  assert.match(html, /原始内容保持可见/);
});
