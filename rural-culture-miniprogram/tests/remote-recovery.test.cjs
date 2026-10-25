'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRemoteService } = require('../miniprogram/services-v4/remote');

function fixture({ pending = {}, reply } = {}) {
  let saved = { schemaVersion: 1, token: 'fixture-token', pending };
  const requests = [],
    callbackErrors = [];
  const responses = {
    '/api/catalog': {
      themes: [{ id: 'red', name: '十步芳草', enabled: true }],
      levels: [],
      config: {}
    },
    '/api/me': {
      user: { id: 'reader', name: '阅读者' },
      progress: {},
      ledger: [],
      activeChallenges: [],
      points: 0
    },
    '/api/certificates': { certificates: [] },
    '/api/rankings?period=day': { entries: [] },
    '/api/rankings?period=total': { entries: [] }
  };
  const service = createRemoteService({
    gameId: 'red',
    apiBase: 'https://fixture.invalid',
    identity: 'local-shared',
    transport: {
      getStorageSync: () => structuredClone(saved),
      setStorageSync: (_, value) => {
        saved = structuredClone(value);
      },
      request(options) {
        const route = options.url.replace('https://fixture.invalid', '');
        requests.push({ route, body: options.data });
        queueMicrotask(() => {
          try {
            const custom = reply?.(route, options);
            options.success(custom ?? { statusCode: 200, data: { data: responses[route] } });
          } catch (error) {
            callbackErrors.push(error);
          }
        });
      }
    }
  });
  return { service, requests, callbackErrors, saved: () => saved };
}

test('cold-start abandons a definitively rejected pending operation and loads authoritative progress', async () => {
  const f = fixture({
    pending: {
      start: { route: '/api/challenges', body: { levelId: 'disabled', requestId: 'original' } }
    },
    reply: (route) =>
      route === '/api/challenges'
        ? { statusCode: 409, data: { error: { code: 'LEVEL_UNAVAILABLE', message: '关卡未开放' } } }
        : undefined
  });
  await f.service.ensureReady();
  assert.deepEqual(f.saved().pending, {});
  assert.equal(f.service.snapshot().points, 0);
  assert.match(f.service.getPersistenceStatus().message, /关卡未开放/);
  await f.service.sync();
  assert.equal(f.requests.filter((r) => r.route === '/api/challenges').length, 1);
});

test('cold-start preserves the exact idempotency key when an operation outcome remains uncertain', async () => {
  const pending = {
    start: { route: '/api/challenges', body: { levelId: 'red-1', requestId: 'keep-this-key' } }
  };
  const f = fixture({
    pending,
    reply: (route) =>
      route === '/api/challenges'
        ? { statusCode: 503, data: { error: { code: 'TEMPORARY', message: '请重试' } } }
        : undefined
  });
  await assert.rejects(f.service.ensureReady());
  await assert.rejects(f.service.ensureReady());
  assert.deepEqual(f.saved().pending, pending);
  assert(f.requests.every((r) => r.body.requestId === 'keep-this-key'));
});

test('malformed async success callbacks reject initialization instead of leaving it pending', async () => {
  for (const data of [null, 'gateway response', {}, { data: null }]) {
    const f = fixture({ reply: () => ({ statusCode: 200, data }) });
    const settled = await Promise.race([
      f.service.ensureReady().then(
        () => 'resolved',
        (error) => error.code
      ),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 50))
    ]);
    assert.equal(settled, 'INVALID_RESPONSE');
    assert.deepEqual(f.callbackErrors, []);
  }
});

test('malformed operation responses keep their idempotency key, and invalid endpoint field types reject', async () => {
  const pending = {
    start: { route: '/api/challenges', body: { levelId: 'red-1', requestId: 'uncertain-result' } }
  };
  const f = fixture({ pending, reply: () => ({ statusCode: 200, data: { data: {} } }) });
  await assert.rejects(f.service.ensureReady(), { code: 'INVALID_RESPONSE' });
  assert.deepEqual(f.saved().pending, pending);
  const badCatalog = fixture({
    reply: (route) =>
      route === '/api/catalog'
        ? { statusCode: 200, data: { data: { themes: null, levels: [], config: {} } } }
        : undefined
  });
  await assert.rejects(badCatalog.service.ensureReady(), { code: 'INVALID_RESPONSE' });
});
