/* 原生四套独立原型的本地模拟服务。生产判题、分享核验和积分须由后端接管。 */
'use strict';
const { createRemoteService } = require('./remote.js');
const { createGameService } = require('./engine.js');
const presentation = require('./presentation.js');
const STORAGE_PREFIX = 'rural-quiz-native-v4:';
const failure = code => { const error = new Error(code); error.code = code; return error; };
const MESSAGES = {
  STORAGE_UNAVAILABLE: '当前环境无法保存学习记录，离开后可能无法恢复。',
  STORAGE_READ_FAILED: '学习记录读取失败，本次操作暂保存在内存中。原存档未删除。',
  STORAGE_WRITE_FAILED: '学习记录保存失败，请保留当前页面并重试；原存档未删除。',
  INVALID_CHECKPOINT: '学习记录格式异常，原存档已保留，本次操作暂不覆盖。',
  CATALOG_CHANGED: '关卡配置已更新，未完成挑战已结束；历史积分与证书仍保留。'
};

function createService(options) {
  const opts = options || {};
  const gameId = opts.gameId;
  const mode = opts.mode || 'mock';
  const reviewEnabled = opts.reviewEnabled === true;
  const storage = opts.storage || (typeof wx !== 'undefined' ? wx : null);
  const clock = opts.clock || Date.now;
  const storageKey = STORAGE_PREFIX + gameId;
  let engine = null, lastEncoded = '', preserveCorrupt = false, reviewSession = false;
  let persistence = { storageKey, status: 'new', warning: null, message: '', lastSavedAt: null };
  const copy = value => JSON.parse(JSON.stringify(value));
  function warn(code) {
    persistence = Object.assign({}, persistence, { status: 'warning', warning: code, message: MESSAGES[code] || code });
  }
  function assertMode() {
    if (mode !== 'mock') {
      const error = new Error('BACKEND_NOT_CONFIGURED');
      error.code = 'BACKEND_NOT_CONFIGURED';
      error.message = 'BACKEND_NOT_CONFIGURED：尚未配置正式后端，不能以本地模拟结果替代正式服务。';
      throw error;
    }
  }
  function validRecords(saved) {
    const own = record => record && typeof record === 'object' && record.gameId === gameId;
    const levelRecord = record => own(record) && typeof record.levelId === 'string';
    const finite = value => typeof value === 'number' && Number.isFinite(value);
    return saved.completed.every(record => levelRecord(record) && finite(record.at) && finite(record.accuracy) && record.accuracy >= 0 && record.accuracy <= 100 && Number.isInteger(record.total) && record.total > 0 && Number.isInteger(record.correct) && record.correct >= 0 && record.correct <= record.total)
      && saved.ledger.every(record => levelRecord(record) && finite(record.at) && finite(record.points) && record.points >= 0)
      && saved.locks.every(record => levelRecord(record) && finite(record.until))
      && saved.certificates.every(record => own(record) && record.scope === 'game' && typeof record.id === 'string' && typeof record.name === 'string' && typeof record.userName === 'string' && finite(record.completedAt) && Array.isArray(record.levelIds) && record.levelIds.every(id => typeof id === 'string'));
  }
  function ensureReady() {
    assertMode();
    if (engine) return Object.assign({}, copy(persistence), { review: reviewSession });
    if (!gameId || !opts.catalog) throw failure('INVALID_GAME_CONFIGURATION');
    let initial = {};
    if (!storage || typeof storage.getStorageSync !== 'function') warn('STORAGE_UNAVAILABLE');
    else {
      try {
        const raw = storage.getStorageSync(storageKey);
        if (raw !== undefined && raw !== null && raw !== '') {
          const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (!saved || saved.schemaVersion !== 1 || saved.gameId !== gameId || !Array.isArray(saved.completed) || !Array.isArray(saved.ledger) || !Array.isArray(saved.locks) || !Array.isArray(saved.certificates) || !Array.isArray(saved.challenges) || !validRecords(saved)) {
            preserveCorrupt = true;
            warn('INVALID_CHECKPOINT');
          } else {
            initial = saved;
            lastEncoded = JSON.stringify(saved);
            persistence.status = 'restored';
          }
        }
      } catch (error) {
        preserveCorrupt = true;
        warn(error instanceof SyntaxError ? 'INVALID_CHECKPOINT' : 'STORAGE_READ_FAILED');
      }
    }
    engine = createGameService({ gameId, catalog: opts.catalog, initial, clock, delay: opts.delay, random: opts.random });
    const restored = engine.restoration();
    if (restored.warning) {
      warn(restored.warning);
      if (restored.warning === 'INVALID_CHECKPOINT') preserveCorrupt = true;
    }
    return Object.assign({}, copy(persistence), { review: reviewSession });
  }
  function save() {
    if (!engine || preserveCorrupt || reviewSession) return;
    const state = engine.exportState();
    const encoded = JSON.stringify(state);
    if (encoded === lastEncoded) return;
    if (!storage || typeof storage.setStorageSync !== 'function') { warn('STORAGE_UNAVAILABLE'); return; }
    try {
      storage.setStorageSync(storageKey, state);
      lastEncoded = encoded;
      persistence = Object.assign({}, persistence, {
        status: persistence.warning === 'CATALOG_CHANGED' ? 'warning' : 'saved',
        warning: persistence.warning === 'CATALOG_CHANGED' ? persistence.warning : null,
        message: persistence.warning === 'CATALOG_CHANGED' ? persistence.message : '',
        lastSavedAt: clock()
      });
    } catch (error) { warn('STORAGE_WRITE_FAILED'); }
  }
  function run(name, args) {
    ensureReady();
    engine.expire();
    const result = engine[name].apply(engine, args || []);
    if (result && typeof result.then === 'function') {
      return result.then(value => { save(); return value; }, error => { save(); throw error; });
    }
    save();
    return result;
  }
  function reviewOnly() {
    ensureReady();
    if (!reviewEnabled) throw failure('REVIEW_DISABLED');
  }
  return {
    gameId,
    storageKey,
    profile() { return presentation.identity(opts.profile); },
    chapterPresentation(level, index) { return presentation.chapter(level, index); },
    ensureReady,
    snapshot() { return run('snapshot'); },
    configuration() {
      return Object.assign({}, run('configuration'), { mode, mock: true, reviewEnabled, reviewSession });
    },
    start(levelId) { return run('start', [levelId]); },
    challenge() { return run('challenge'); },
    select(index) { return run('select', [index]); },
    submit() { return run('submit'); },
    next() { return run('next'); },
    revive(verified) { return run('revive', [verified]); },
    rankings(period, empty = false) { return run('rankings', [period || 'total', empty === true]); },
    expire() { return run('expire'); },
    exportState() { ensureReady(); return copy(engine.exportState()); },
    getPersistenceStatus() { ensureReady(); return Object.assign({}, copy(persistence), { review: reviewSession }); },
    flush() { ensureReady(); save(); return copy(persistence); },
    updateCatalog(catalog) {
      ensureReady();
      if (!catalog || !Array.isArray(catalog.themes) || !Array.isArray(catalog.levels) || !Array.isArray(catalog.questions)) throw failure('INVALID_GAME_CONFIGURATION');
      const value = run('updateCatalog', [catalog]);
      return value;
    },
    reset() { reviewOnly(); reviewSession = true; persistence = Object.assign({}, persistence, { status: 'review', warning: null, message: '', lastSavedAt: null }); return run('reset'); },
    leaveReview() {
      assertMode();
      if (!reviewSession) return ensureReady();
      engine = null; lastEncoded = ''; preserveCorrupt = false; reviewSession = false;
      persistence = { storageKey, status: 'new', warning: null, message: '', lastSavedAt: null };
      return ensureReady();
    },
    async scenario(name) {
      reviewOnly();
      reviewSession = true;
      persistence = Object.assign({}, persistence, { status: 'review', warning: null, message: '', lastSavedAt: null });
      const target = engine;
      const result = await target.scenario(name);
      if (engine !== target) return null;
      target.pause(false);
      save();
      return result;
    }
  };
}

let singleton = null, activeConfig=null;
function getService() {
  if (!singleton) {
    const config = activeConfig||require('../game-config.js');
    singleton = config.mode==='http'?createRemoteService(Object.assign({gameId:config.gameId},config.connection)):createService({
      gameId: config.gameId,
      catalog: require('./catalog.js'),
      mode: config.mode || 'mock',
      reviewEnabled: config.reviewEnabled === true
    });
  }
  return singleton;
}
const api = { activate(config){activeConfig=config;singleton=null;}, createService, createRemoteService, STORAGE_PREFIX, network:require('../game-config.js').mode==='http' };
['profile','chapterPresentation','snapshot','configuration','start','challenge','select','submit','next','revive','rankings','expire','exportState','getPersistenceStatus','flush','updateCatalog','reset','scenario','ensureReady','leaveReview','sync','poll','refreshChallenge'].forEach(name => {
  api[name] = function () { const s=getService();return typeof s[name]==='function'?s[name].apply(s, arguments):undefined; };
});
module.exports = api;
