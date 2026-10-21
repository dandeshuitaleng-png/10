/* Execute the actual native Page with the actual isolated mock service.
 * This is a lifecycle/action regression harness, not a WeChat renderer or device test. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createService } = require('../miniprogram/services-v4/index.js');
const pagePath = path.resolve(__dirname, '../miniprogram/pages/game/index.js');
const reportPath = path.resolve(__dirname, '../qa/v4/page-service-checks.json');
const clone = value => structuredClone(value);
const results = [];

function catalog(levelCount = 2, gameId = 'culture', questionCount = 1) {
  const themeName={culture:'千年文脉',red:'十步芳草',industry:'金色产业',ecology:'青山绿水'}[gameId];
  return {
    timerSeconds: 30, reviveLimit: 1, questionApproval: '测试专用题库',
    themes: [{ id: gameId, name: themeName, enabled: true, certificateName: gameId==='culture'?'文脉知识达人':themeName+'学习达人' }],
    levels: Array.from({ length: levelCount }, (_, index) => ({ id: gameId+'-' + (index + 1), themeId: gameId, order: index + 1, label: '第' + (index + 1) + '关', name: '测试关卡', enabled: true, questionCount, points: [10,15,20,30][index%4] })),
    questions: Array.from({ length: levelCount }, (_, index) => Array.from({length:questionCount},(_,q)=>({ id: gameId+'-q-' + (index + 1)+'-'+q, themeId: gameId, levelId: gameId+'-' + (index + 1), title: '选择正确项', options: ['正确项', '错误项'], answer: 0, explanation: '测试解析', sourceTitle: '测试资料' }))).flat()
  };
}

function environment({ at = '2026-10-15T12:00:00+08:00', gameId = 'culture', levelCount = 2, questionCount = 1, query = {}, storedCheckpoint, storageWriteFails = false, memory: sharedMemory, geometry, canvasExportFails = false, homeDesign } = {}) {
  let now = Date.parse(at), definition, nextTimer = 1, canvasExports = 0, albumRequests = 0;
  const timers = new Map(), memory = sharedMemory || new Map(), canvasText = [], patches = [], toasts = [], albumPaths = [], imagePreviews = [];
  const book = catalog(levelCount,gameId,questionCount);
  if (storedCheckpoint !== undefined) memory.set('rural-quiz-native-v4:'+gameId, clone(storedCheckpoint));
  const storage = { getStorageSync: key => memory.has(key) ? clone(memory.get(key)) : '', setStorageSync: (key, value) => { if(storageWriteFails) throw Error('TEST_STORAGE_FULL'); memory.set(key, clone(value)); } };
  const service = createService({ gameId, catalog: book, storage, clock: () => now, random: () => 0.5, delay: async () => {}, reviewEnabled: false });
  const skin = {...require('../miniprogram/services-v4/skins')[gameId],mode:'mock',connection:undefined,allowThemeSwitch:false,reviewEnabled:false,...(homeDesign?{homeDesign}: {})};
  const drawing = {font:'20px sans-serif',clearRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},arc(){},createLinearGradient(){return {addColorStop(){}};},measureText(text){const size=Number((this.font.match(/([\d.]+)px/)||[])[1]||20);return {width:Array.from(text).reduce((n,c)=>n+size*(c.charCodeAt(0)>255?1:.55),0)};},fillRect() {}, strokeRect() {}, fillText(text, x, y) { canvasText.push({ text, x, y }); } };
  const canvas = { getContext: type => { assert.equal(type, '2d'); return drawing; } };
  const wx = {
    getWindowInfo: () => ({ windowHeight: 812, screenHeight: 812, statusBarHeight: 44, safeArea: { bottom: 778 } }),
    showShareMenu() {}, showToast: options => toasts.push(options.title),
    nextTick: callback => callback(),
    createSelectorQuery() {
      let selector = '', rectangleCallback = null;
      const query = {
        in() { return query; },
        select(value) { selector = value; return query; },
        selectAll(value) { selector = value; return query; },
        fields() { return query; },
        boundingClientRect(callback) { rectangleCallback = callback; return query; },
        exec(callback) {
          if (rectangleCallback) {if(geometry&&selector==='.option')geometry(selector,rectangleCallback,page);else rectangleCallback([]);}
          if (callback) callback(selector === '#certificate-canvas' ? [{ node: canvas }] : []);
          return query;
        }
      };
      return query;
    },
    canvasToTempFilePath(options) {
      assert.equal(options.canvas, canvas); assert.equal(options.fileType, 'png');
      canvasExports++; if(canvasExportFails){options.fail(Error('TEST_CANVAS_EXPORT'));return;} options.success({ tempFilePath: '/mock-only/certificate.png' });
    },
    previewImage(options){imagePreviews.push(clone(options));},
    saveImageToPhotosAlbum(options) {
      assert.equal(options.filePath, '/mock-only/certificate.png');
      albumRequests++; albumPaths.push(options.filePath); options.success({});
    }
  };
  class TestDate extends Date { static now() { return now; } }
  vm.runInNewContext(fs.readFileSync(process.env.OPTION_PAGE_SOURCE||pagePath, 'utf8'), {
    require(id) {
      if (id === '../../game-config') return skin;
      if (id === '../../services-v4/index') return service;
      if (id === '../../services-v4/home-designs') return require('../miniprogram/services-v4/home-designs');
      if (id === '../../services-v4/home-layout') return require('../miniprogram/services-v4/home-layout');
      if (id === '../../services-v4/theme-content') return require('../miniprogram/services-v4/theme-content');
      if (id === '../../services-v4/certificate-art') return require('../miniprogram/services-v4/certificate-art');
      if (id === '../../services-v4/share-cover') return require('../miniprogram/services-v4/share-cover');
      if (id === '../../services-v4/journey') return require('../miniprogram/services-v4/journey');
      if (id === '../../services-v4/press-feedback') return require('../miniprogram/services-v4/press-feedback');
      if (id === '../../services-v4/audio') return require('../miniprogram/services-v4/audio');
      if (id === '../../services-v4/mascot-motion') return require('../miniprogram/services-v4/mascot-motion');
      if (id === '../../services-v4/visual-feedback') return require('../miniprogram/services-v4/visual-feedback');
      throw Error('Unexpected Page dependency: ' + id);
    },
    Page(value) { definition = value; }, wx, Date: TestDate,
    setInterval(callback, milliseconds) { const id = nextTimer++; timers.set(id, { callback, milliseconds }); return id; },
    clearInterval(id) { timers.delete(id); }, setTimeout, console
  }, { filename: pagePath });
  const page = Object.assign({}, definition, { data: clone(definition.data) });
  page.setData = patch => {
    patches.push(clone(patch));
    for (const [key, value] of Object.entries(patch)) {
      const parts = key.split('.'); let target = page.data;
      for (const part of parts.slice(0, -1)) target = target[part] || (target[part] = {});
      target[parts[parts.length - 1]] = value;
    }
  };
  page.onLoad(query);
  const action = (name, extra = {}) => page.action({ currentTarget: { dataset: Object.assign({ action: name }, extra) } });
  async function begin(id = gameId+'-1') { page.go('levels'); await action('level', { id }); if(page.data.modal==='rules')await action('confirm-start');assert.equal(page.data.route,'quiz','new attempts show rules; resumable attempts return directly to their question'); }
  async function choose(index) { await action('option', { index }); }
  async function answer(index) { await choose(index); await action('submit'); }
  async function lock() { await begin(); await answer(1); assert.equal(page.data.modal, 'revive'); await action('revive-share'); await action('share-success'); await answer(1); assert.equal(page.data.modal, 'locked'); }
  return { albumPaths, imagePreviews, setCanvasExportFailure:value=>{canvasExportFails=value;}, setStorageFailure: value => { storageWriteFails = value; }, page, service, book, memory, timers, patches, canvasText, toasts, action, begin, choose, answer, lock, advance: milliseconds => { now += milliseconds; }, time:()=>now, runTimers: () => [...timers.values()].forEach(timer => timer.callback()), canvasStats: () => ({ canvasExports, albumRequests }) };
}

async function test(name, fn) {
  const started = Date.now();
  try { await fn(); results.push({ name, result: 'passed', elapsedMs: Date.now() - started }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, result: 'failed', message: error.message }); throw error; }
}

async function main() {
  await test('option press feedback survives 100 selection refreshes and cancels on scroll, navigation and background',async()=>{
    const env=environment(),p=env.page;await env.begin();
    for(let i=0;i<100;i++){
      const e={currentTarget:{dataset:{action:'option',index:i%2,pressKey:'option-'+i%2}},touches:[{clientX:100,clientY:400}]};
      p.pressStart(e);assert.equal(p.data.pressedKey,e.currentTarget.dataset.pressKey);
      p.pressEnd();await p.action(e);assert.equal(p.data.pressedKey,e.currentTarget.dataset.pressKey);
      assert.equal(p.data.challenge.selected,i%2);assert.equal(p.data.optionHeight??56,56);p.cancelPress();
    }
    p.pressStart({currentTarget:{dataset:{pressKey:'option-0'}},touches:[{clientX:100,clientY:400}]});
    p.pressMove({touches:[{clientX:100,clientY:430}]});assert.equal(p.data.pressedKey,'');
    p.pressTap({currentTarget:{dataset:{pressKey:'option-0'}}});p.onHide();assert.equal(p.data.pressedKey,'');
    p.onShow();p.pressTap({currentTarget:{dataset:{pressKey:'option-0'}}});p.go('home');assert.equal(p.data.pressedKey,'');p.onUnload();
  });
  await test('sound settings preserve music/effect levels and never suspend quiz time or overlay answer feedback', async()=>{
    const env=environment(),p=env.page;p.openSoundSettings();assert.equal(p.data.soundSettingsOpen,true);assert.equal(p._motion.state().playingId,'');p.changeSoundVolume({currentTarget:{dataset:{channel:'music'}},detail:{value:25}});assert.equal(p.data.musicVolume,25);p.changeSoundChannel({currentTarget:{dataset:{channel:'effects'}},detail:{value:false}});assert.equal(p.data.effectsEnabled,false);p.toggleSoundChannel({currentTarget:{dataset:{channel:'effects'}}});assert.equal(p.data.effectsEnabled,true);p.closeSoundSettings();assert.equal(p.data.soundSettingsOpen,false);assert.equal(p.data.musicVolume,25);await env.begin();p.openSoundSettings();env.advance(2000);p.tick();assert.equal(p.data.challenge.remaining,28);assert.equal(p.data.soundSettingsOpen,true);env.advance(29000);p.tick();assert.equal(p.data.modal,'revive');assert.equal(p.data.soundSettingsOpen,false);p.onUnload();
  });
  for (const gameId of ['red','culture','industry','ecology']) {
    await test(gameId+' full ten-question chapters restore progress, revive, unlock, avoid duplicate points and issue the theme certificate', async () => {
      const opts={gameId,levelCount:4,questionCount:10};let env=environment(opts);
      await env.action('level',{id:gameId+'-2'});assert.equal(env.page.data.modal,'');assert.equal(env.service.snapshot().activeLevelId,null);
      await env.begin();await env.answer(1);assert.equal(env.page.data.modal,'revive');
      const question=env.page.data.challenge.question.id;await env.action('revive-share');await env.action('share-cancel');
      assert.equal(env.page.data.challenge.reviveRemaining,1);assert.equal(env.page.data.modal,'revive');
      await env.action('revive-share');await env.action('share-success');assert.equal(env.page.data.challenge.question.id,question);assert.equal(env.page.data.challenge.reviveRemaining,0);
      await env.choose(0);const before=env.service.exportState().challenges[0];await env.action('exit');assert.equal(env.page.data.modal,'exit');await env.action('levels');env.page.onUnload();
      env=environment({...opts,memory:env.memory,at:new Date(env.time()).toISOString()});await env.begin();
      const restored=env.service.exportState().challenges[0];assert.equal(restored.id,before.id);assert.equal(restored.deadline,before.deadline);assert.deepEqual(restored.questionIds,before.questionIds);assert.equal(env.page.data.challenge.selected,0);
      async function finish(){for(let n=0;n<10;n++){await env.answer(0);assert.equal(env.page.data.challenge.status,'correct');await env.action('next');}assert.equal(env.page.data.route,'result');}
      await finish();assert.equal(env.page.data.result.accuracy,90);assert.equal(env.page.data.result.points,10);assert.equal(env.page.data.snapshot.progress.completed,1);
      env.page.go('home');assert.deepEqual(env.page.data.journey.nodes.filter(n=>n.showMascot).map(n=>n.pose),['welcome','observe']);
      await env.begin();await finish();assert.equal(env.page.data.result.points,0);assert.equal(env.page.data.snapshot.points,10);assert.equal(env.page.data.ledger.length,1);
      for(let i=2;i<=4;i++){await env.begin(gameId+'-'+i);await finish();assert.equal(env.page.data.result.points,[10,15,20,30][i-1]);}
      env.page.go('profile');assert.equal(env.page.data.pageActorPose,'scholar');assert.equal(env.page.data.snapshot.progress.completed,4);assert.equal(env.page.data.snapshot.points,75);
      env.page.go('points');assert.equal(env.page.data.ledger.length,4);assert.equal(env.page.data.pageActorPose,'observe');
      env.page.go('ranking');await env.action('period',{period:'total'});assert.equal(env.page.data.ranking.me.points,75);
      env.page.go('certificate');assert.equal(env.page.data.certificates.length,1);assert.equal(env.page.data.certificate.gameId,gameId);assert.equal(env.page.data.certificate.levelIds.length,4);assert.equal(env.page.data.pageActorPose,'skater');
      const certificate=env.page.data.certificate.id;await env.page.saveCertificate();assert.deepEqual(env.canvasStats(),{canvasExports:1,albumRequests:1});
      await env.action('share-cert');assert.equal(env.page.onShareAppMessage().path,'/pages/game/index?theme='+gameId+'&route=certificate');await env.action('dismiss');
      env.page.onUnload();const memory=env.memory;env=environment({...opts,memory});assert.equal(env.page.data.snapshot.points,75);assert.equal(env.page.data.certificate.id,certificate);assert.equal(env.page.data.footerRoute,'certificate');env.page.onUnload();
      const other=environment({...opts,gameId:gameId==='ecology'?'culture':'ecology',memory});assert.equal(other.page.data.snapshot.points,0);assert.equal(other.page.data.certificates.length,0);other.page.onUnload();
    });
    await test(gameId+' timeout revival and next-day release survive a cold restart', async () => {
      const opts={gameId,levelCount:4,questionCount:10};let env=environment(opts);await env.begin();env.advance(31000);env.page.tick();assert.equal(env.page.data.modal,'revive');
      await env.action('revive-share');await env.action('share-success');await env.answer(1);assert.equal(env.page.data.modal,'locked');env.page.go('home');assert.equal(env.page.data.journey.nodes[0].reached,true);assert.equal(env.page.data.journey.nodes[0].status,'today-locked');
      assert.equal(env.page.data.journey.nodes.filter(n=>n.showMascot).length,1);env.page.onUnload();const memory=env.memory;
      env=environment({...opts,memory,at:new Date(env.time()).toISOString()});assert.equal(env.page.data.levels[0].status,'today-locked');assert.equal(env.page.data.footerAction,'level');
      env.page.onHide();env.advance(13*3600000);env.page.onShow();assert.equal(env.page.data.levels[0].status,'current');await env.begin();assert.equal(env.page.data.challenge.reviveRemaining,1);assert.equal(env.page.data.challenge.remaining,30);assert.equal(env.page.data.snapshot.points,0);env.page.onUnload();
    });
  }
  await test('scene-specific original poses stay distinct and tapping them never changes the challenge or account', async () => {
    const env=environment({levelCount:1}),page=env.page;
    page.go('profile');assert.equal(page.data.pageActorPose,'scholar');
    const beforeProfile=env.service.exportState();page.inlineMascotTap();assert.equal(page.data.motion.respondingId,'page-profile');assert.deepEqual(env.service.exportState(),beforeProfile);
    await env.begin();assert.equal(page.data.pageActorPose,'reader');const beforeQuestion=env.service.exportState();page.inlineMascotTap();assert.deepEqual(env.service.exportState(),beforeQuestion);
    await env.answer(1);assert.equal(page.data.modalActorPose,'heart');const beforeRevive=env.service.exportState();page.inlineMascotTap();assert.equal(page.data.motion.respondingId,'modal-revive');assert.deepEqual(env.service.exportState(),beforeRevive);
    await env.action('revive-share');await env.action('share-success');await env.answer(0);assert.equal(page.data.pageActorPose,'celebrate');
    await env.action('next');assert.equal(page.data.pageActorPose,'drummer');page.go('certificate');assert.equal(page.data.pageActorPose,'skater');
    page._systemReduced=true;page.readMotionPreference();const still=page.data.motion.sequence;page.inlineMascotTap();assert.equal(page.data.motion.sequence,still);assert.equal(page.data.motion.playingId,'');page.onUnload();
    const locked=environment();await locked.lock();assert.equal(locked.page.data.modalActorPose,'lotus');locked.page.onUnload();
  });
  await test('share previews use composed artwork and interface labels do not expose environment modes', async () => {
    const env=environment(),page=env.page,before=env.service.exportState();
    page.data.shareCoverImage='/cached/theme-cover.jpg';page.refresh();
    assert.equal(page.data.sharePreviewImage,'/cached/theme-cover.jpg');
    assert.equal(page.onShareAppMessage().imageUrl,'/cached/theme-cover.jpg');
    for(const modal of ['rules','share','revive','locked','certificate-share','video']){
      page.showModal(modal);assert.ok(!/本地|模拟|演示|联调/.test(page.data.modalTitle+page.data.modalPrimary));
    }
    page.data.configuration={share:{title:'配置标题',image:'https://example.org/custom.jpg'},reviveShare:{image:'/custom-revive.jpg'}};
    page.showModal('share');assert.equal(page.onShareAppMessage().imageUrl,'/custom-revive.jpg');
    page.showModal('certificate-share');assert.equal(page.onShareAppMessage().imageUrl,'https://example.org/custom.jpg');
    assert.deepEqual(env.service.exportState(),before);page.onUnload();
  });
  await test('sharing keeps the active theme and only uses certificate routing on certificate pages', async () => {
    const env=environment({levelCount:1}),page=env.page;
    assert.equal(page.onShareAppMessage().path,'/pages/game/index?theme=culture&route=home');
    await env.begin();await env.answer(0);await env.action('next');page.go('certificate');
    assert.equal(page.onShareAppMessage().path,'/pages/game/index?theme=culture&route=certificate');
    page.go('home');assert.ok(page.data.certificate);assert.equal(page.onShareAppMessage().path,'/pages/game/index?theme=culture&route=home');
    assert.ok(page.onShareAppMessage().title.includes('千年文脉'));assert.ok(!page.onShareAppMessage().title.includes('我获得了'));
    page.go('profile');assert.equal(page.data.content.profile,'把书院、古建与技艺，记进学习足迹');
    assert.equal(page.data.chapterStyle.eyebrow,'文脉初识');page.onUnload();
  });
  await test('direct profile entry sends the route through setData to the native view', () => {
    const env = environment({ query: { route: 'profile' } });
    assert.equal(env.page.data.route, 'profile');
    assert.ok(env.patches.some(patch => patch.route === 'profile'));
    assert.equal(env.page.data.profile.badge, '阅读探索者');
    const invalid = environment({ query: { route: 'unknown' } });
    assert.equal(invalid.page.data.route, 'home');
  });

  await test('onShow replaces an existing timer; hide/unload leave no live interval', () => {
    const env = environment(), { page, timers } = env;
    page.onShow(); assert.equal(timers.size, 1);
    const first = page._timer; page.onShow(); assert.equal(timers.size, 1); assert.notEqual(page._timer, first); assert.ok(!timers.has(first));
    page.onHide(); assert.equal(timers.size, 0); assert.equal(page._timer, null);
    page.onShow(); assert.equal(timers.size, 1); page.onUnload(); assert.equal(timers.size, 0);
    page.onShow(); assert.equal(timers.size, 0);
  });

  await test('ordinary hide/show preserves the active question, selection and absolute deadline', async () => {
    const env = environment(); await env.begin(); await env.choose(1); env.page.onShow();
    const original = env.service.exportState().challenges[0];
    env.page.onHide(); env.advance(12000); env.page.onShow();
    const current = env.service.exportState().challenges[0];
    assert.equal(current.id, original.id); assert.equal(current.deadline, original.deadline); assert.deepEqual(current.questionIds, original.questionIds);
    assert.equal(env.page.data.challenge.remaining, 18); assert.equal(env.page.data.challenge.selected, 1); assert.equal(env.page.data.challenge.status, 'playing'); assert.equal(env.page.data.modal, '');
    env.advance(1000); env.runTimers(); assert.equal(env.page.data.challenge.remaining, 17);
    assert.equal(env.timers.size, 1); env.page.onUnload();
  });

  await test('returning after a background timeout opens revival without revealing an answer', async () => {
    const env = environment(); await env.begin(); env.page.onShow(); env.page.onHide(); env.advance(31000); env.page.onShow();
    assert.equal(env.page.data.challenge.status, 'revive'); assert.equal(env.page.data.challenge.remaining, 0); assert.equal(env.page.data.modal, 'revive');
    assert.equal(env.page.data.challenge.feedback.reason, 'timeout'); assert.equal(env.page.data.challenge.feedback.answer, null); assert.equal(env.page.data.challenge.feedback.explanation, null);
    assert.equal(env.page.data.challenge.reviveRemaining, 1); env.page.onUnload();
  });

  await test('background timeout after revival updates the page to the real locked state', async () => {
    const env = environment(); await env.begin(); await env.answer(1); await env.action('revive-share'); await env.action('share-success');
    assert.equal(env.page.data.challenge.reviveRemaining, 0);
    env.page.onShow(); env.page.onHide(); env.advance(31000); env.page.onShow();
    assert.equal(env.page.data.modal, 'locked'); assert.equal(env.page.data.challenge.status, 'locked'); assert.equal(env.page.data.levels[0].status, 'today-locked');
    assert.equal(env.service.snapshot().points, 0); env.page.onUnload();
  });

  await test('midnight foreground refresh releases a stale today-locked card and permits starting', async () => {
    const env = environment({ at: '2026-10-15T23:59:00+08:00' }); await env.lock(); await env.action('levels');
    assert.equal(env.page.data.levels[0].status, 'today-locked'); env.page.onShow(); env.page.onHide(); env.advance(120000); env.page.onShow();
    assert.equal(env.service.snapshot().levels[0].status, 'current'); assert.equal(env.page.data.levels[0].status, 'current');
    await env.action('level', { id: 'culture-1' }); assert.equal(env.page.data.modal, 'rules'); await env.action('confirm-start');
    assert.equal(env.page.data.challenge.status, 'playing'); assert.equal(env.page.data.challenge.remaining, 30); assert.equal(env.timers.size, 1); env.page.onUnload();
  });

  await test('tapping a stale lock card after midnight checks service state even without onShow', async () => {
    const env = environment({ at: '2026-10-15T23:59:00+08:00' }); await env.lock(); await env.action('levels');
    env.advance(120000); assert.equal(env.page.data.levels[0].status, 'today-locked');
    await env.action('level', { id: 'culture-1' }); assert.equal(env.page.data.levels[0].status, 'current'); assert.equal(env.page.data.modal, 'rules');
  });

  await test('foreground refresh updates yesterday daily ranking without changing total earned points', async () => {
    const env = environment({ at: '2026-10-15T23:59:00+08:00' }); await env.begin(); await env.answer(0); await env.action('next'); env.page.go('ranking');
    assert.equal(env.page.data.ranking.me.points, 10); env.page.onShow(); env.page.onHide(); env.advance(120000); env.page.onShow();
    assert.equal(env.page.data.ranking.me.points, 0); assert.equal(env.page.data.snapshot.points, 10);
    await env.action('period', { period: 'total' }); assert.equal(env.page.data.ranking.me.points, 10); env.page.onUnload();
  });

  await test('saving an old certificate after catalog expansion draws only its issued level scope', async () => {
    const env = environment({ levelCount: 1 }); await env.begin(); await env.answer(0); await env.action('next');
    const certificate = env.service.snapshot().certificates[0]; assert.equal(certificate.levelIds.length, 1);
    env.service.updateCatalog(catalog(2)); env.page.go('certificate');
    assert.equal(env.page.data.snapshot.progress.completed, 1); assert.equal(env.page.data.snapshot.progress.total, 2); assert.equal(env.page.data.certificate.levelIds.length, 1);
    await env.page.saveCertificate();
    const text = env.canvasText.map(entry => entry.text);
    assert.ok(text.join('').includes('已完成本证书记录的 1 个关卡')); assert.ok(!text.some(line => line.includes('全部启用关卡')));
    assert.ok(text.join('').includes(certificate.name)); assert.ok(!text.some(line=>/本地|模拟|演示|联调|DEMO-/.test(line))); assert.ok(text.join('').includes('学习活动纪念，不代表学历或教育资格')); assert.equal(env.service.snapshot().certificates[0].id,certificate.id);
    assert.deepEqual(env.canvasStats(), { canvasExports: 1, albumRequests: 1 }); assert.equal(env.page.data.busy, false); assert.ok(env.toasts.includes('证书图片已保存'));
  });

  await test('failed writes preserve the previous checkpoint and retry restores the active answer without restarting', async () => {
    const env = environment(); await env.begin();
    const key=env.service.storageKey, original=clone(env.memory.get(key));
    const before=env.service.exportState().challenges[0];
    env.setStorageFailure(true); await env.choose(1);
    assert.equal(env.page.data.saveWarningCanRetry,true);
    assert.ok(env.page.data.saveWarning.includes('保存失败'));
    assert.deepEqual(env.memory.get(key),original);
    env.setStorageFailure(false); await env.action('retry-save');
    const current=env.service.exportState().challenges[0];
    assert.equal(current.id,before.id); assert.equal(current.deadline,before.deadline);
    assert.deepEqual(current.questionIds,before.questionIds); assert.equal(env.page.data.challenge.selected,1);
    assert.equal(env.page.data.saveWarning,''); assert.equal(env.page.data.saveWarningCanRetry,false);
    assert.equal(env.memory.get(key).challenges[0].selected,1);
    assert.equal(env.page.data.snapshot.points,0); assert.equal(env.toasts.at(-1),'学习记录已保存');
  });

  await test('retry that still fails keeps the warning and does not report a successful save', async () => {
    const env=environment(); await env.begin(); const key=env.service.storageKey, original=clone(env.memory.get(key));
    env.setStorageFailure(true); await env.choose(0); await env.action('retry-save');
    assert.equal(env.page.data.saveWarningCanRetry,true); assert.ok(env.page.data.saveWarning.includes('保存失败'));
    assert.deepEqual(env.memory.get(key),original); assert.ok(!env.toasts.includes('学习记录已保存'));
  });

  await test('corrupt checkpoints show a non-destructive notice without a misleading retry control', () => {
    const original='{invalid-checkpoint';const env=environment({storedCheckpoint:original});
    assert.equal(env.page.data.saveWarningCanRetry,false); assert.ok(env.page.data.saveWarning.includes('格式异常'));
    assert.equal(env.memory.get(env.service.storageKey),original);
  });

  await test('theme homepage starts the current configured level directly and empty content stays disabled', async () => {
    const env=environment(); assert.equal(env.page.data.route,'home');
    assert.equal(env.page.data.footerAction,'level');assert.equal(env.page.data.footerId,'culture-1');
    await env.action(env.page.data.footerAction,{id:env.page.data.footerId});assert.equal(env.page.data.modal,'rules');
    const empty=environment({levelCount:0});assert.equal(empty.page.data.footerDisabled,true);assert.equal(empty.page.data.footerPrimary,'内容准备中');
  });

  await test('homepage exposes locked explanation and earned rewards retain the historical ledger value', async () => {
    const locked=environment();await locked.lock();locked.page.go('home');
    assert.equal(locked.page.data.footerAction,'level');assert.equal(locked.page.data.footerId,'culture-1');
    await locked.action('level',{id:locked.page.data.footerId});assert.equal(locked.page.data.modal,'locked');
    const env=environment({levelCount:1});await env.begin();await env.answer(0);await env.action('next');
    const revised=catalog(1);revised.levels[0].points=99;env.service.updateCatalog(revised);env.page.go('home');
    assert.equal(env.page.data.levels[0].earnedPoints,10);assert.equal(env.page.data.levels[0].points,99);
    assert.equal(env.page.data.footerRoute,'certificate');assert.equal(env.page.data.snapshot.points,10);
  });

  await test('returning to activity homepage offers continue without changing the pending question', async () => {
    const env=environment();await env.begin();await env.choose(1);
    const before=env.service.exportState().challenges[0];env.page.go('home');
    assert.ok(env.page.data.footerPrimary.startsWith('继续'));assert.equal(env.page.data.footerId,'culture-1');
    await env.action(env.page.data.footerAction,{id:env.page.data.footerId});
    const after=env.service.exportState().challenges[0];assert.equal(env.page.data.route,'quiz');assert.equal(env.page.data.challenge.selected,1);
    assert.equal(after.id,before.id);assert.equal(after.deadline,before.deadline);assert.deepEqual(after.questionIds,before.questionIds);
  });

  await test('opening a route resets scrolling and the map focuses its current configured level', () => {
    const env = environment(); env.page.go('levels'); env.page.go('home'); env.page.go('levels');
    const targets = env.patches.filter(patch => Object.hasOwn(patch, 'scrollInto')).map(patch => patch.scrollInto);
    assert.ok(targets.every(target => target === ''));
    assert.equal(env.page.data.mapScrollTop, env.page.data.journey.focusTop);
    assert.ok(Number.isFinite(env.page.data.mapScrollTop));
  });

  await test('original-figure motion follows map/modal visibility, background and the reduced-motion setting without changing progress', async () => {
    const env=environment(),page=env.page,before=env.service.exportState();
    assert.equal(page._motion.state().playingId,'culture-1');
    await env.action('level',{id:'culture-1'});
    assert.equal(page.data.modal,'rules');assert.equal(page._motion.state().playingId,'modal-rules');
    page.onHide();assert.equal(page._motion.state().playingId,'');
    page.onShow();assert.equal(page._motion.state().playingId,'modal-rules');
    page._systemReduced=true;page.readMotionPreference();assert.equal(page.data.reducedMotion,true);assert.equal(page._motion.state().playingId,'');
    page._systemReduced=false;page.readMotionPreference();assert.equal(page._motion.state().playingId,'modal-rules');
    await env.action('dismiss');assert.equal(page._motion.state().playingId,'culture-1');
    assert.deepEqual(env.service.exportState(),before);page.onUnload();
  });

  await test('non-character overlays pause map motion and quiz revival uses its own visible actor', async () => {
    const env=environment();env.page.showModal('certificate-share');
    assert.equal(env.page._motion.state().playingId,'');
    await env.action('dismiss');assert.equal(env.page._motion.state().playingId,'culture-1');
    await env.begin();assert.equal(env.page._motion.state().playingId,'page-quiz');
    await env.answer(1);assert.equal(env.page.data.modal,'revive');assert.equal(env.page._motion.state().playingId,'modal-revive');
    env.page.onUnload();assert.equal(env.page._motion.state().playingId,'');
  });
  await test('mascots follow actual learning progress, keep completed poses and hide all future nodes', async () => {
    const env=environment({levelCount:4}),page=env.page;
    const visible=()=>page.data.journey.nodes.filter(n=>n.showMascot).map(n=>n.id);
    assert.deepEqual(visible(),['culture-1']);assert.equal(page.data.journey.nodes[0].pose,'welcome');
    await env.begin();await env.answer(0);await env.action('next');page.go('home');
    assert.deepEqual(visible(),['culture-1','culture-2']);assert.equal(page.data.journey.nodes[0].status,'completed');assert.equal(page.data.journey.nodes[1].pose,'observe');
    await env.begin('culture-2');await env.answer(1);await env.action('revive-share');await env.action('share-success');await env.answer(1);page.go('home');
    assert.deepEqual(visible(),['culture-1','culture-2']);assert.equal(page.data.journey.nodes[1].status,'today-locked');assert.equal(page._motion.state().playingId,'culture-2');
    assert.equal(page._motion.play('culture-3'),false);page.onUnload();
  });

  await test('touching a figure responds without opening a level or changing progress, including today lock', async () => {
    const env=environment({levelCount:4}),page=env.page,before=env.service.exportState();
    const touch=id=>page.mascotTap({currentTarget:{dataset:{id}}});
    touch('culture-1');assert.equal(page.data.motion.respondingId,'culture-1');assert.equal(page.data.modal,'');assert.equal(page.data.route,'home');
    touch('culture-2');assert.equal(page.data.motion.respondingId,'culture-1');assert.deepEqual(env.service.exportState(),before);
    page.onHide();assert.equal(page.data.motion.respondingId,'');page.onShow();
    page._systemReduced=true;page.readMotionPreference();touch('culture-1');assert.equal(page.data.motion.playingId,'');assert.ok(env.toasts.at(-1).includes('点击关卡'));
    page._systemReduced=false;page.readMotionPreference();await env.lock();page.go('home');const locked=env.service.exportState();
    assert.equal(page.data.journey.nodes[0].reached,true);assert.equal(page.data.journey.nodes[0].selected,false);
    touch('culture-1');assert.equal(page.data.motion.respondingId,'culture-1');assert.equal(page.data.modal,'');assert.deepEqual(env.service.exportState(),locked);
    await env.action('level',{id:'culture-1'});assert.equal(page.data.modal,'locked');page.onUnload();
  });

  await test('inline figures animate on quiz, profile and points, and pause outside their scroll panel', async () => {
    const env=environment(),page=env.page;page.go('profile');assert.equal(page._motion.state().playingId,'page-profile');
    page.go('points');assert.equal(page._motion.state().playingId,'page-points');assert.equal(page.data.pageActorPose,'observe');
    page._inlineActorVisible=false;page.syncMotion();assert.equal(page._motion.state().playingId,'');
    page._inlineActorVisible=true;page.syncMotion();assert.equal(page._motion.state().playingId,'page-points');
    await env.begin();assert.equal(page._motion.state().playingId,'page-quiz');await env.answer(0);assert.equal(page.data.pageActorPose,'celebrate');
    await env.action('next');assert.equal(page._motion.state().playingId,'page-result');page.onUnload();
  });

}

if(require.main===module) main().then(() => {
  const report = { generatedAt: new Date().toISOString(), result: 'passed', checks: results.length, scope: 'Actual native Page JavaScript plus actual local mock service in a Node VM. Timers, selectors, canvas export and album callbacks are simulated. No UI rendering, WeChat simulator, real device, album write, production backend or trusted sharing is verified.', source: path.relative(path.resolve(__dirname, '..'), pagePath), results };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ checks: results.length, result: 'passed', report: reportPath }));
}).catch(error => {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), result: 'failed', checks: results.length, results }, null, 2) + '\n');
  console.error(error); process.exitCode = 1;
});

module.exports={environment};
