'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { createApplication } = require('../server/application.cjs');
const credentials = { username: 'quality-fixture', password: 'quality-fixture-password' };
function call(app, method, url, body, token) {
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
        resolve({ status: res.statusCode, ...JSON.parse(raw) });
      }
    };
    app.handler(req, res);
  });
}
async function fixture(t, options = {}) {
  const app = await createApplication({
    mode: 'experience',
    dbPath: ':memory:',
    adminCredentials: credentials,
    seedBank: { questions: [] },
    ...options
  });
  t.after(() => app.close());
  const token = (await call(app, 'POST', '/api/auth/admin', credentials)).data.token;
  return { app, token, request: (method, url, body) => call(app, method, url, body, token) };
}

test('stale config replacement returns conflict and preserves an unrelated editor change', async (t) => {
  const h = await fixture(t),
    cfg = (await h.request('GET', '/api/admin/config')).data;
  const a = structuredClone(cfg.themes),
    b = structuredClone(cfg.themes);
  a[0].name = '编辑者甲';
  b[1].name = '编辑者乙';
  assert.equal(
    (await h.request('PUT', '/api/admin/config', { themes: a, expectedVersion: cfg.version }))
      .status,
    200
  );
  const stale = await h.request('PUT', '/api/admin/config', {
    themes: b,
    expectedVersion: cfg.version
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.error.code, 'VERSION_CONFLICT');
  const actual = (await h.request('GET', '/api/admin/config')).data;
  assert.equal(actual.themes[0].name, '编辑者甲');
  assert.equal(actual.themes[1].name, cfg.themes[1].name);
});

test('stale activity import cannot reset configuration or remove a newly added level', async (t) => {
  const h = await fixture(t),
    snapshot = (await h.request('GET', '/api/admin/activity/export')).data;
  await h.request('POST', '/api/admin/levels', {
    id: 'new-chapter',
    themeId: 'red',
    order: 5,
    name: '新增关',
    enabled: true,
    questionCount: 1,
    points: 1
  });
  const result = await h.request('POST', '/api/admin/activity/import', {
    ...snapshot,
    expectedVersion: snapshot.config.version
  });
  assert.equal(result.status, 409);
  assert(
    (await h.request('GET', '/api/admin/levels')).data.levels.some(
      (l) => l.id === 'new-chapter' && !l.deleted
    )
  );
});

test('stale question edits preserve the first saved question', async (t) => {
  const h = await fixture(t);
  const q = (
    await h.request('POST', '/api/admin/questions', {
      id: 'q-fixture',
      levelId: 'red-1',
      title: '原题干',
      options: ['甲', '乙', '丙', '丁'],
      answer: 0,
      explanation: '解析'
    })
  ).data;
  assert.equal(
    (
      await h.request('PUT', '/api/admin/questions/q-fixture', {
        title: '新题干',
        expectedVersion: q.version
      })
    ).status,
    200
  );
  const result = await h.request('PUT', '/api/admin/questions/q-fixture', {
    explanation: '旧页面解析',
    expectedVersion: q.version
  });
  assert.equal(result.status, 409);
  assert.equal((await h.request('GET', '/api/admin/questions/q-fixture')).data.title, '新题干');
});

test('a pending sync receiver leaves the database queue free and concurrent retries deliver once', async (t) => {
  let release,
    entered,
    calls = 0;
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const h = await fixture(t, {
    syncReceiver: async () => {
      calls++;
      entered();
      await gate;
      return true;
    },
    syncTimeoutMs: 500
  });
  await h.app.store.set('outbox', 'fixture', {
    id: 'fixture',
    type: 'fixture',
    payload: {},
    status: 'pending',
    attempts: 0,
    at: 1
  });
  const first = h.request('POST', '/api/admin/outbox/retry', {});
  await started;
  const second = h.request('POST', '/api/admin/outbox/retry', {});
  const health = await Promise.race([
    call(h.app, 'GET', '/api/health'),
    new Promise((resolve) => setTimeout(() => resolve({ status: 'blocked' }), 40))
  ]);
  release();
  await Promise.all([first, second]);
  assert.equal(health.status, 200);
  assert.equal(calls, 1);
});

test('sync receiver timeout releases its event for retry and a late success cannot change its status', async (t) => {
  let finish;
  const h = await fixture(t, {
    syncTimeoutMs: 10,
    syncReceiver: () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  });
  await h.app.store.set('outbox', 'fixture', {
    id: 'fixture',
    type: 'fixture',
    payload: {},
    status: 'pending',
    attempts: 0,
    at: 1
  });
  const result = await Promise.race([
    h.request('POST', '/api/admin/outbox/retry', {}),
    new Promise((resolve) => setTimeout(() => resolve({ status: 'blocked' }), 80))
  ]);
  finish(true);
  assert.equal(result.status, 200);
  assert.equal(result.data.failed, 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal((await h.app.store.get('outbox', 'fixture')).status, 'failed');
});
