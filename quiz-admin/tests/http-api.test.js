import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';
import { createHttpApi } from '../src/api/index.js';

const { createApplication } = createRequire(import.meta.url)('../../demo/server/application.cjs');

async function fixture(t) {
  const credentials = { username: 'quality-editor', password: 'quality-editor-password' };
  const app = await createApplication({
    mode: 'experience',
    dbPath: ':memory:',
    adminCredentials: credentials,
    seedBank: { questions: [] }
  });
  t.after(() => app.close());
  const requests = [];
  function call(method, url, body, token) {
    return new Promise((resolve) => {
      const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
      Object.assign(req, {
        method,
        url,
        headers: token ? { authorization: `Bearer ${token}` } : {},
        socket: { remoteAddress: '127.0.0.1' }
      });
      const res = {
        statusCode: 200,
        setHeader() {},
        end(raw) {
          resolve({ status: res.statusCode, json: JSON.parse(raw) });
        }
      };
      app.handler(req, res);
    });
  }
  const auth = await call('POST', '/api/auth/admin', credentials);
  const token = auth.json.data.token;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(url.startsWith('/api/local/admin/'));
    const body = options.body ? JSON.parse(options.body) : undefined;
    requests.push({ url, method: options.method, body });
    const result = await call(
      options.method,
      url.replace('/api/local/admin', '/api/admin'),
      body,
      token
    );
    return { ok: result.status < 400, status: result.status, json: async () => result.json };
  });
  return { requests, request: (method, url, body) => call(method, url, body, token) };
}

test('actual HTTP editors reject stale theme replacement without losing the first change', async (t) => {
  const h = await fixture(t),
    a = createHttpApi(),
    b = createHttpApi();
  const [first, stale] = await Promise.all([a.load(), b.load()]);
  await a.save('themes', { ...first.themes[0], name: '甲的新名称' });
  await assert.rejects(b.save('themes', { ...stale.themes[1], name: '乙的旧快照' }), /更新|刷新/);
  const actual = await a.load();
  assert.equal(actual.themes[0].name, '甲的新名称');
  assert.equal(actual.themes[1].name, first.themes[1].name);
  const writes = h.requests.filter((r) => r.method === 'PUT');
  assert.deepEqual(
    writes.map((r) => r.body.expectedVersion),
    [first.config.version, first.config.version]
  );
});

test('question bulk import and full activity import carry the editor revision to the server', async (t) => {
  const h = await fixture(t);
  await h.request('POST', '/api/admin/questions', {
    id: 'quality-question',
    levelId: 'red-1',
    title: '原题干',
    options: ['甲', '乙', '丙', '丁'],
    answer: 0,
    explanation: '解析'
  });
  const a = createHttpApi(),
    b = createHttpApi();
  const [first, stale] = await Promise.all([a.load(), b.load()]);
  const snapshot = await b.exportActivity();
  await a.save('questions', { ...first.questions[0], title: '已保存的新题干' });
  await assert.rejects(
    b.import('questions', [{ ...stale.questions[0], title: '旧题干CSV' }]),
    /更新|刷新/
  );
  await assert.rejects(b.importActivity(snapshot), /更新|刷新/);
  assert.equal((await a.load()).questions[0].title, '已保存的新题干');
  const imports = h.requests.filter((r) => r.method === 'POST' && r.url.endsWith('/import'));
  assert.equal(imports.length, 2);
  for (const request of imports)
    assert.equal(request.body.questions[0].expectedVersion, stale.questions[0].version);
  assert.equal(imports[1].body.expectedVersion, stale.config.version);
});

test('an old full snapshot cannot silently delete a question created in another editor', async (t) => {
  const h = await fixture(t),
    editor = createHttpApi();
  await editor.load();
  const snapshot = await editor.exportActivity();
  await h.request('POST', '/api/admin/questions', {
    id: 'new-after-snapshot',
    levelId: 'red-1',
    title: '另一页面新增',
    options: ['甲', '乙', '丙', '丁'],
    answer: 0,
    explanation: '解析'
  });
  await assert.rejects(editor.importActivity(snapshot), /更新|刷新/);
  assert.equal((await editor.load()).questions[0].id, 'new-after-snapshot');
});
