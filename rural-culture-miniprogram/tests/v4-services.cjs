/* Native mock adapter: durable isolated state, deadlines and rule regression checks. */
'use strict';
const assert = require('node:assert/strict');
const { createService, STORAGE_PREFIX } = require('../miniprogram/services-v4/index.js');
const ownCatalog = require('../miniprogram/services-v4/catalog.js');
let checks = 0;
const test = async (name, fn) => { await fn(); checks++; console.log('PASS ' + name); };
const clone = value => structuredClone(value);
function fixture(gameId = 'culture') {
  return {
    timerSeconds: 30, reviveLimit: 1, questionApproval: '演示样题，待业务审核',
    themes: [{ id: gameId, name: gameId, enabled: true, certificateName: gameId + '证书' }],
    levels: [1, 2].map((order) => ({ id: gameId + '-' + order, themeId: gameId, name: '关卡' + order, order, enabled: true, questionCount: 2, points: order === 1 ? 10 : 15 })),
    questions: [1, 2].flatMap(level => [1, 2, 3].map(index => ({ id: gameId + '-q-' + level + '-' + index, themeId: gameId, levelId: gameId + '-' + level, title: '题目' + level + '-' + index, options: ['正确项', '错误项'], answer: 0, explanation: '解析 ' + index, sourceTitle: '测试材料' })))
  };
}
function environment() {
  let now = Date.parse('2026-10-15T12:00:00+08:00');
  const memory = new Map();
  const storage = { getStorageSync: key => memory.has(key) ? clone(memory.get(key)) : '', setStorageSync: (key, value) => memory.set(key, clone(value)) };
  const create = (overrides = {}) => createService(Object.assign({ gameId: 'culture', catalog: fixture(), mode: 'mock', storage, clock: () => now, delay: async () => {}, random: () => 0.5, reviewEnabled: true }, overrides));
  return { memory, storage, create, advance: ms => { now += ms; }, time: () => now };
}
async function finish(service, levelId) {
  service.start(levelId);
  for (;;) {
    service.select(0);
    const checked = await service.submit();
    assert.equal(checked.status, 'correct');
    const next = service.next();
    if (next.status === 'result') return next.result;
  }
}
function assertNoAnswerFields(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    assert.ok(!['answer', 'answerIndex', 'explanation', 'questions', 'options'].includes(key), 'unexpected checkpoint field ' + key);
    assertNoAnswerFields(item);
  }
}
(async () => {
  await test('native catalog contains one fixed game and configured ten-question levels', () => {
    assert.equal(ownCatalog.themes.length, 1);
    const id = ownCatalog.themes[0].id;
    assert.ok(ownCatalog.levels.every(level => level.themeId === id && level.questionCount === 10));
    assert.ok(ownCatalog.questions.every(question => question.themeId === id));
    assert.equal(ownCatalog.timerSeconds, 30); assert.equal(ownCatalog.reviveLimit, 1);
  });
  await test('new state does not touch original V2 storage or unrelated game keys', () => {
    const env = environment(); env.memory.set('rural-culture-ui-v1', { original: true });
    env.create().start('culture-1');
    assert.deepEqual(env.memory.get('rural-culture-ui-v1'), { original: true });
    assert.deepEqual([...env.memory.keys()].sort(), ['rural-culture-ui-v1', STORAGE_PREFIX + 'culture'].sort());
  });
  await test('question DTO excludes answer and explanation before submission', () => {
    const question = environment().create().start('culture-1').question;
    assert.equal('answer' in question, false); assert.equal('explanation' in question, false);
  });
  await test('random draws use configured count and restore the same question ID sequence', () => {
    const env = environment(), service = env.create(); service.start('culture-1');
    const ids = service.exportState().challenges[0].questionIds;
    assert.equal(ids.length, 2); assert.equal(new Set(ids).size, 2);
    const restored = env.create({ random: () => 0 });
    assert.deepEqual(restored.exportState().challenges[0].questionIds, ids);
    assert.equal(restored.challenge().question.id, ids[0]);
    const another = environment().create({ random: () => 0 }); another.start('culture-1');
    assert.notDeepEqual(another.exportState().challenges[0].questionIds, ids);
  });
  await test('absolute deadline and selected option survive rebuilding the service', () => {
    const env = environment(), service = env.create(); service.start('culture-1'); service.select(1); env.advance(12000);
    const rebuilt = env.create(); assert.equal(rebuilt.challenge().remaining, 18); assert.equal(rebuilt.challenge().selected, 1);
    assert.equal(rebuilt.getPersistenceStatus().status, 'restored');
  });
  await test('expired challenge enters revival after a cold start without receiving a new deadline', () => {
    const env = environment(), service = env.create(); service.start('culture-1'); env.advance(31000);
    const rebuilt = env.create(); const state = rebuilt.challenge();
    assert.equal(state.status, 'revive'); assert.equal(state.feedback.reason, 'timeout'); assert.equal(state.remaining, 0);
  });
  await test('cancelled or unverified sharing never consumes revival allowance', async () => {
    const service = environment().create(); service.start('culture-1'); service.select(1); await service.submit();
    assert.equal(service.revive(false).status, 'revive'); assert.equal(service.revive(undefined).reviveRemaining, 1);
  });
  await test('verified revival survives rebuilding and a second failure locks only this level', async () => {
    const env = environment(), service = env.create(); service.start('culture-1'); service.select(1); await service.submit(); service.revive(true);
    const rebuilt = env.create(); assert.equal(rebuilt.challenge().reviveRemaining, 0); rebuilt.select(1);
    const failed = await rebuilt.submit(); assert.equal(failed.status, 'locked'); assert.throws(() => rebuilt.start('culture-1'), /TODAY_LOCKED/);
    const red = env.create({ gameId: 'red', catalog: fixture('red') }); assert.equal(red.start('red-1').status, 'playing');
    assert.equal(red.snapshot().points, 0); assert.deepEqual(red.snapshot().certificates, []);
  });
  await test('Beijing next midnight releases daily level lock', async () => {
    const env = environment(), service = env.create(); service.start('culture-1');
    for (let i = 0; i < 2; i++) { service.select(1); await service.submit(); if (i === 0) service.revive(true); }
    env.advance(13 * 3600000); assert.equal(env.create().start('culture-1').status, 'playing');
  });
  await test('correct analysis freezes remaining time across suspension and reconstruction', async () => {
    const env = environment(), service = env.create(); service.start('culture-1'); env.advance(6000); service.select(0); await service.submit();
    env.advance(3600000); const rebuilt = env.create(), state = rebuilt.challenge();
    assert.equal(state.status, 'correct'); assert.equal(state.remaining, 24); assert.ok(state.feedback.explanation.startsWith('解析'));
    assert.equal(rebuilt.next().remaining, 30);
  });
  await test('checkpoint contains question IDs and feedback types but no standard answers or explanation', async () => {
    const env = environment(), service = env.create(); service.start('culture-1'); service.select(0); await service.submit();
    const checkpoint = env.memory.get(service.storageKey); assertNoAnswerFields(checkpoint);
    assert.equal(checkpoint.challenges[0].feedback.type, 'correct'); assert.ok(checkpoint.challenges[0].questionIds.length);
  });
  await test('wrong response and persisted feedback do not reveal the standard answer', async () => {
    const env = environment(), service = env.create(); service.start('culture-1'); service.select(1); const state = await service.submit();
    assert.equal(state.feedback.answer, null); assert.equal(state.feedback.explanation, null);
    assertNoAnswerFields(env.memory.get(service.storageKey));
  });
  await test('first-attempt accuracy remains incorrect after revival and survives a reload', async () => {
    const env = environment(), service = env.create(); service.start('culture-1'); service.select(1); await service.submit(); service.revive(true);
    const rebuilt = env.create(); rebuilt.select(0); await rebuilt.submit(); rebuilt.next(); rebuilt.select(0); await rebuilt.submit();
    const result = rebuilt.next().result; assert.equal(result.accuracy, 50); assert.equal(result.correct, 1); assert.equal(result.points, 10);
  });
  await test('repeat completion and repeated result read cannot grant duplicate points', async () => {
    const env = environment(), service = env.create(); const first = await finish(service, 'culture-1');
    assert.equal(first.points, 10); const rebuilt = env.create(); assert.equal(rebuilt.challenge().result.points, 10);
    const repeated = await finish(rebuilt, 'culture-1'); assert.equal(repeated.points, 0); assert.equal(repeated.cumulative, 10);
    assert.equal(env.create().snapshot().ledger.length, 1);
  });
  await test('next challenge sequence remains unique after persistence restores previous sessions', async () => {
    const env = environment(), service = env.create(); const original = service.start('culture-1').id; await finish(service, 'culture-1');
    assert.notEqual(env.create().start('culture-1').id, original);
  });
  await test('complete game issues only own game certificate and restores it', async () => {
    const env = environment(), service = env.create(); await finish(service, 'culture-1'); await finish(service, 'culture-2');
    const certificate = env.create().snapshot().certificates;
    assert.equal(certificate.length, 1); assert.equal(certificate[0].gameId, 'culture'); assert.equal(certificate[0].scope, 'game');
    assert.equal(env.create({ gameId: 'red', catalog: fixture('red') }).snapshot().certificates.length, 0);
  });
  await test('catalog mismatch invalidates an active attempt while retaining historical points and certificate', async () => {
    const env = environment(), service = env.create(); await finish(service, 'culture-1'); await finish(service, 'culture-2'); service.start('culture-1');
    const changed = fixture(); changed.levels[0].name = '配置更新后的关卡';
    const rebuilt = env.create({ catalog: changed }); const snapshot = rebuilt.snapshot();
    assert.equal(snapshot.activeLevelId, null); assert.equal(snapshot.points, 25); assert.equal(snapshot.certificates.length, 1);
    assert.equal(rebuilt.getPersistenceStatus().warning, 'CATALOG_CHANGED'); assert.throws(() => rebuilt.challenge(), /NO_CHALLENGE/);
  });
  await test('disabled completed levels leave current progress but do not erase earned records or certificates', async () => {
    const env = environment(), service = env.create(); await finish(service, 'culture-1'); await finish(service, 'culture-2');
    const changed = fixture(); changed.levels[0].enabled = false; service.updateCatalog(changed);
    const snapshot = service.snapshot(); assert.equal(snapshot.progress.total, 1); assert.equal(snapshot.progress.completed, 1);
    assert.equal(snapshot.points, 25); assert.equal(snapshot.certificates.length, 1);
  });
  await test('empty or disabled catalog has no fabricated progress, ranking or new certificate', () => {
    const env = environment(), empty = fixture(); empty.levels = []; empty.questions = [];
    const service = env.create({ catalog: empty }); assert.deepEqual(service.snapshot().progress, { completed: 0, total: 0, ratio: 0 });
    assert.deepEqual(service.rankings('daily').rows, []); assert.deepEqual(service.snapshot().certificates, []);
    assert.throws(() => service.start('culture-1'), /INVALID_GAME_LEVEL/);
  });
  await test('rankings and ledger are scoped to fixed gameId with no cross-game points', async () => {
    const env = environment(), culture = env.create(); await finish(culture, 'culture-1');
    const red = env.create({ gameId: 'red', catalog: fixture('red') });
    assert.equal(red.rankings('total').me.points, 0); assert.equal(red.rankings('daily').me.rank, null);
    assert.ok(culture.rankings('total').rows.every(row => row.gameId === 'culture'));
    assert.equal(culture.rankings('daily').me.points, 10);
  });
  await test('save failure preserves previous checkpoint and exposes a recovery warning', () => {
    const env = environment(), service = env.create(); service.start('culture-1');
    const before = clone(env.memory.get(service.storageKey)); env.storage.setStorageSync = () => { throw Error('quota'); };
    service.select(1); assert.deepEqual(env.memory.get(service.storageKey), before);
    assert.equal(service.getPersistenceStatus().warning, 'STORAGE_WRITE_FAILED');
    env.storage.setStorageSync = (key, value) => env.memory.set(key, clone(value)); service.flush();
    assert.equal(service.getPersistenceStatus().warning, null); assert.equal(env.create().challenge().selected, 1);
  });
  await test('corrupt checkpoint is not destroyed by ordinary actions', () => {
    const env = environment(), bad = '{invalid'; env.memory.set(STORAGE_PREFIX + 'culture', bad);
    const service = env.create(); service.start('culture-1'); assert.equal(env.memory.get(service.storageKey), bad);
    assert.equal(service.getPersistenceStatus().warning, 'INVALID_CHECKPOINT');
  });
  await test('foreign game checkpoint cannot supply progress and is preserved without overwrite', () => {
    const env = environment(); const red = env.create({ gameId: 'red', catalog: fixture('red') }); red.start('red-1');
    const foreign = red.exportState(); env.memory.set(STORAGE_PREFIX + 'culture', foreign);
    const service = env.create(); assert.equal(service.snapshot().points, 0); assert.equal(service.snapshot().activeLevelId, null);
    assert.deepEqual(env.memory.get(STORAGE_PREFIX + 'culture'), foreign); assert.equal(service.getPersistenceStatus().warning, 'INVALID_CHECKPOINT');
  });
  await test('no persistent storage explicitly reports that progress remains in memory', () => {
    const service = createService({ gameId: 'culture', catalog: fixture(), clock: Date.now, delay: async () => {} });
    service.start('culture-1'); assert.equal(service.getPersistenceStatus().warning, 'STORAGE_UNAVAILABLE');
  });
  await test('snapshot refresh expires a warm suspended attempt before calculating resumability', () => {
    const env = environment(), service = env.create(); service.start('culture-1'); env.advance(31000);
    assert.equal(service.snapshot().levels[0].resumable, true);
    assert.equal(service.challenge().status, 'revive');
    service.revive(true); env.advance(31000);
    const snapshot = service.snapshot(); assert.equal(snapshot.levels[0].status, 'today-locked'); assert.equal(snapshot.levels[0].resumable, false);
  });
  await test('malformed inner challenge record cannot crash initialization or overwrite original data', () => {
    const env = environment(), original = env.create(); original.start('culture-1');
    const state = env.memory.get(original.storageKey); state.challenges[0] = null; env.memory.set(original.storageKey, clone(state));
    const rebuilt = env.create(); assert.equal(rebuilt.snapshot().activeLevelId, null);
    assert.equal(rebuilt.getPersistenceStatus().warning, 'INVALID_CHECKPOINT'); assert.deepEqual(env.memory.get(original.storageKey), state);
  });
  await test('duplicate submission while validation is pending produces one completion reward', async () => {
    const env = environment(), one = fixture(); one.levels[0].questionCount = 1;
    let resume; const service = env.create({ catalog: one, delay: () => new Promise(resolve => { resume = resolve; }) });
    service.start('culture-1'); service.select(0); const pending = service.submit();
    const duplicate = await service.submit(); assert.equal(duplicate.busy, true);
    resume(); const checked = await pending; assert.equal(checked.result.points, 10);
    assert.equal(service.snapshot().ledger.length, 1);
  });
  await test('deadline passing during submission rejects a late correct answer', async () => {
    const env = environment(); let resume;
    const service = env.create({ delay: () => new Promise(resolve => { resume = resolve; }) });
    service.start('culture-1'); service.select(0); const pending = service.submit(); env.advance(31000); resume();
    const state = await pending; assert.equal(state.status, 'revive'); assert.equal(state.feedback.reason, 'timeout'); assert.equal(service.snapshot().points, 0);
  });
  await test('restore after an interrupted pending submit clears busy without inventing an answer result', async () => {
    const env = environment(); let resume;
    const service = env.create({ delay: () => new Promise(resolve => { resume = resolve; }) });
    service.start('culture-1'); service.select(0); const pending = service.submit(); service.flush();
    const rebuilt = env.create(); assert.equal(rebuilt.challenge().busy, false); assert.equal(rebuilt.challenge().status, 'playing');
    assert.equal(rebuilt.snapshot().points, 0); resume(); await pending;
  });
  await test('explicit ranking empty preview is passed through without changing ordinary player rankings', () => {
    const service = environment().create();
    assert.deepEqual(service.rankings('daily', true).rows, []);
    assert.ok(service.rankings('daily').rows.length > 0);
  });
  await test('service and engine errors expose stable machine-readable codes', async () => {
    const service = environment().create();
    assert.throws(() => service.start('culture-2'), error => error.code === 'LEVEL_LOCKED');
    assert.throws(() => service.start('red-1'), error => error.code === 'INVALID_GAME_LEVEL');
    service.start('culture-1');
    assert.throws(() => service.select(8), error => error.code === 'INVALID_OPTION');
    assert.throws(() => service.next(), error => error.code === 'ANSWER_REQUIRED');
    assert.throws(() => service.revive(true), error => error.code === 'NO_REVIVE');
    assert.throws(() => service.rankings('week'), error => error.code === 'INVALID_PERIOD');
    const player = environment().create({ reviewEnabled: false });
    await assert.rejects(player.scenario('result'), error => error.code === 'REVIEW_DISABLED');
    const invalid = createService({ mode: 'mock' });
    assert.throws(() => invalid.ensureReady(), error => error.code === 'INVALID_GAME_CONFIGURATION');
  });
  await test('media preview never persists mutated questions or overwrites an active player checkpoint', async () => {
    const env = environment(), service = env.create(); const original = service.start('culture-1'); service.select(1);
    const before = clone(env.memory.get(service.storageKey));
    const preview = await service.scenario('image'); assert.equal(preview.question.media.type, 'image');
    service.flush(); assert.deepEqual(env.memory.get(service.storageKey), before);
    const restored = env.create(); assert.equal(restored.challenge().question.id, original.question.id);
    assert.equal(restored.challenge().question.media, null); assert.equal(restored.challenge().selected, 1);
    assert.equal(restored.getPersistenceStatus().warning, null);
  });
  await test('review result and certificate fixtures stay in memory and do not grant player rewards', async () => {
    const env = environment(), service = env.create(); service.snapshot();
    const before = clone(env.memory.get(service.storageKey));
    await service.scenario('result'); assert.equal(service.snapshot().points, 10);
    await service.scenario('certificate'); assert.equal(service.snapshot().certificates.length, 1);
    assert.deepEqual(env.memory.get(service.storageKey), before);
    assert.equal(env.create().snapshot().points, 0); assert.deepEqual(env.create().snapshot().certificates, []);
  });
  await test('leaveReview restores original player session and absolute deadline without catalog mismatch', async () => {
    const env = environment(), service = env.create(); service.start('culture-1'); service.select(1);
    await service.scenario('video'); env.advance(12000); service.leaveReview();
    const state = service.challenge(); assert.equal(state.remaining, 18); assert.equal(state.selected, 1); assert.equal(state.question.media, null);
    assert.equal(service.configuration().reviewSession, false); assert.equal(service.getPersistenceStatus().warning, null);
    assert.equal(service.getPersistenceStatus().review, false);
  });
  await test('review reset cannot erase an existing player completion ledger', async () => {
    const env = environment(), service = env.create(); await finish(service, 'culture-1');
    const before = clone(env.memory.get(service.storageKey)); service.reset(); assert.equal(service.snapshot().points, 0);
    assert.deepEqual(env.memory.get(service.storageKey), before); service.leaveReview(); assert.equal(service.snapshot().points, 10);
  });
  await test('malformed completion or points records cannot crash launch or replace the damaged checkpoint', () => {
    const env = environment(), service = env.create(); service.start('culture-1');
    const original = env.memory.get(service.storageKey);
    for (const patch of [{ completed: [null] }, { ledger: [{ gameId: 'culture', levelId: 'culture-1', at: env.time(), points: 'bad-number' }] }]) {
      const malformed = Object.assign(clone(original), patch); env.memory.set(service.storageKey, clone(malformed));
      const rebuilt = env.create(); assert.equal(rebuilt.snapshot().points, 0); assert.equal(rebuilt.getPersistenceStatus().warning, 'INVALID_CHECKPOINT');
      assert.deepEqual(env.memory.get(service.storageKey), malformed);
    }
  });
  await test('malformed certificate fields do not enter the public certificate DTO', () => {
    const env = environment(), service = env.create(); service.snapshot();
    const original = env.memory.get(service.storageKey); original.certificates = [{ gameId: 'culture', scope: 'game', id: 'test', name: null, completedAt: env.time(), userName: 123, levelIds: [] }];
    env.memory.set(service.storageKey, clone(original)); const rebuilt = env.create();
    assert.deepEqual(rebuilt.snapshot().certificates, []); assert.equal(rebuilt.getPersistenceStatus().warning, 'INVALID_CHECKPOINT');
    assert.deepEqual(env.memory.get(service.storageKey), original);
  });
  await test('production mode cannot silently use the mock question bank', () => {
    const service = environment().create({ mode: 'remote' }); assert.throws(() => service.snapshot(), /BACKEND_NOT_CONFIGURED/);
    assert.throws(() => service.start('culture-1'), /BACKEND_NOT_CONFIGURED/);
  });
  await test('review reset and scenario APIs are disabled in ordinary player configuration', async () => {
    const service = environment().create({ reviewEnabled: false }); assert.throws(() => service.reset(), /REVIEW_DISABLED/);
    await assert.rejects(service.scenario('result'), /REVIEW_DISABLED/);
  });
  console.log(JSON.stringify({ checks, result: 'passed', scope: 'native local mock services; not backend or device acceptance' }));
})().catch(error => { console.error(error); process.exitCode = 1; });
