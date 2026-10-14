const test = require('node:test');
const assert = require('node:assert/strict');
const App = require('../js/main');
const { Router } = require('../js/core/router');
const { Renderer } = require('../js/ui/renderer');
const { createViewport, toLogical } = require('../js/core/viewport');
const { Input } = require('../js/core/input');
const { THEMES, getLevels } = require('../js/data/themes');
const { inspectPool } = require('../js/data/content');

function drawingContext() {
  const words = [];
  const target = {
    words,
    measureText(value) { return { width: String(value).length * 16 }; },
    fillText(value) { words.push(String(value)); },
  };
  return new Proxy(target, {
    get(object, key) { return key in object ? object[key] : () => {}; },
    set(object, key, value) { object[key] = value; return true; },
  });
}

function makeApp(width = 375, height = 812) {
  const stored = [];
  const ctx = drawingContext();
  const platform = {
    canvas: { getContext: () => ctx },
    api: { getStorageSync: () => null, setStorageSync: (...args) => stored.push(args) },
    viewport: () => createViewport({ windowWidth: width, windowHeight: height, pixelRatio: 2, statusBarHeight: 44 }),
    requestFrame: () => 1, cancelFrame() {}, on() {}, off() {},
    createImage: () => ({ set src(_) { queueMicrotask(() => this.onerror && this.onerror()); } }),
  };
  const app = new App(platform);
  app.router.replace('home');
  return { app, stored };
}

function finishPractice(app) {
  for (let position = 0; position < 10; position++) {
    const question = app.challenge.questions[app.challenge.position];
    app.handle({ type: 'option', index: question.answer });
    app.handle({ type: 'confirm', questionId: question.id });
    if (position < 9) app.handle({ type: 'continue' });
  }
  assert.equal(app.router.current.name, 'result');
  assert.equal(app.challenge.correct, 10);
}

test('四主题主页→地图→准备页可逐层返回，重复入口不压栈', () => {
  for (const theme of THEMES) {
    const { app } = makeApp();
    app.handle({ type: 'theme', themeId: theme.id });
    assert.deepEqual(app.router.current, { name: 'map', params: { themeId: theme.id } });
    app.handle({ type: 'theme', themeId: theme.id });
    assert.equal(app.router.history.length, 1);
    app.handle({ type: 'level', themeId: theme.id, index: 0 });
    app.handle({ type: 'level', themeId: theme.id, index: 0 });
    assert.deepEqual(app.router.current, { name: 'level-ready', params: { themeId: theme.id, levelId: `${theme.id}-1` } });
    assert.equal(app.router.history.length, 2);
    assert.equal(app.challenge, null);
    app.handle({ type: 'back' });
    assert.deepEqual(app.router.current, { name: 'map', params: { themeId: theme.id } });
    app.handle({ type: 'back' });
    assert.equal(app.router.current.name, 'home');
    assert.equal(app.router.history.length, 0);
  }
});

test('未解锁、今日锁定节点与无效参数不改变页面和返回栈', () => {
  for (const theme of THEMES) {
    const { app } = makeApp();
    app.handle({ type: 'theme', themeId: theme.id });
    const before = JSON.stringify({ current: app.router.current, history: app.router.history });
    for (const index of [1, 2, 3, -1, 4, 0.5, '0', undefined]) {
      app.handle({ type: 'level', themeId: theme.id, index });
      assert.equal(JSON.stringify({ current: app.router.current, history: app.router.history }), before);
      assert.equal(app.challenge, null);
    }
    for (const themeId of ['unknown', '', undefined, null]) {
      assert.doesNotThrow(() => app.handle({ type: 'theme', themeId }));
      assert.doesNotThrow(() => app.handle({ type: 'level', themeId, index: 0 }));
      assert.equal(JSON.stringify({ current: app.router.current, history: app.router.history }), before);
    }
    // A future verified progress source may supply a locked first level. This
    // isolated fixture must block entry without changing other themes or storage.
    const originalProgress = app.themeProgress;
    for (const index of [0, 1, 2, 3]) {
      const nodes = originalProgress[theme.id].nodes.map((state, i) => i === index ? 'today-locked' : state);
      app.themeProgress = Object.freeze({ ...originalProgress, [theme.id]: Object.freeze({ completed: 0, nodes: Object.freeze(nodes) }) });
      app.handle({ type: 'level', themeId: theme.id, index });
      assert.equal(JSON.stringify({ current: app.router.current, history: app.router.history }), before);
      assert.match(app.toast, /仅当前关卡今日锁定/);
      assert.equal(app.challenge, null);
      for (const other of THEMES.filter(other => other.id !== theme.id)) assert.equal(app.themeProgress[other.id], originalProgress[other.id]);
    }
  }
});

test('正式题池保持未开放，进度与节点由不可变数据层传入', () => {
  const { app } = makeApp();
  for (const theme of THEMES) {
    app.handle({ type: 'theme', themeId: theme.id });
    const view = app.viewState();
    assert.deepEqual(view.themeProgress[theme.id], { completed: 0, nodes: ['current', 'locked', 'locked', 'locked'] });
    assert.deepEqual(view.nodeStates, view.themeProgress[theme.id].nodes);
    assert.ok(Object.isFrozen(view.themeProgress));
    assert.ok(Object.isFrozen(view.themeProgress[theme.id]));
    assert.ok(Object.isFrozen(view.themeProgress[theme.id].nodes));
    for (const level of getLevels(theme.id)) assert.equal(inspectPool(level.id).ready, false);
    app.handle({ type: 'back' });
  }
});

test('从首页和准备页试玩完成后回地图仅需一次，再返回首页仅需一次', () => {
  for (const source of ['home', 'level-ready']) {
    const { app, stored } = makeApp();
    if (source === 'level-ready') {
      app.handle({ type: 'theme', themeId: 'ecology' });
      app.handle({ type: 'level', themeId: 'ecology', index: 0 });
    }
    const before = JSON.stringify(app.viewState().themeProgress);
    app.handle({ type: 'practice' });
    finishPractice(app);
    assert.equal(JSON.stringify(app.viewState().themeProgress), before);
    app.handle({ type: 'next' });
    assert.deepEqual(app.router.current, { name: 'map', params: { themeId: 'ecology' } });
    assert.equal(app.challenge, null);
    assert.equal(app.feedback, null);
    assert.equal(app.router.history.length, 1);
    assert.equal(JSON.stringify(app.viewState().themeProgress), before);
    assert.equal(stored.length, 0, '试玩不得写入正式积分、通关或证书');
    app.handle({ type: 'back' });
    assert.equal(app.router.current.name, 'home');
    assert.equal(app.router.history.length, 0);
  }
});

test('退出试玩清理本次答题，试玩锁定不改变正式四关状态', () => {
  const { app } = makeApp();
  const before = JSON.stringify(app.viewState().themeProgress);
  app.handle({ type: 'practice' });
  const challenge = app.challenge;
  app.handle({ type: 'back' });
  assert.equal(challenge.closed, true);
  assert.equal(app.challenge, null);
  assert.equal(app.router.current.name, 'map');
  assert.equal(app.router.history.length, 1);
  app.practiceLocked = true;
  app.handle({ type: 'practice' });
  assert.equal(app.router.current.name, 'quiz');
  assert.equal(app.viewState().challengeState, 'locked');
  assert.equal(JSON.stringify(app.viewState().themeProgress), before);
  app.handle({ type: 'back' });
  assert.equal(app.router.current.name, 'map');
  app.handle({ type: 'back' });
  assert.equal(app.router.current.name, 'home');
});

test('returnTo 截断已存在页面之后的历史，并能为首页入口建立唯一地图', () => {
  const router = new Router();
  router.replace('home');
  router.navigate('map', { themeId: 'ecology' });
  router.navigate('level-ready', { themeId: 'ecology', levelId: 'ecology-1' });
  router.navigate('quiz', { practice: true });
  router.replace('result', { practice: true });
  router.returnTo('map', { themeId: 'ecology' });
  assert.equal(router.history.length, 1);
  router.back();
  assert.equal(router.current.name, 'home');
  assert.throws(() => router.returnTo('unknown'));
});

test('四主题准备页禁用正式开始，仅生态显示独立试玩；缺图仍可操作', () => {
  for (const theme of THEMES) {
    const ctx = drawingContext();
    const renderer = new Renderer(ctx);
    const viewport = createViewport({ windowWidth: 375, windowHeight: 812, statusBarHeight: 44 });
    const { app } = makeApp();
    app.handle({ type: 'theme', themeId: theme.id });
    const mapTargets = renderer.render(app.router.current, viewport, app.viewState());
    assert.deepEqual(mapTargets.filter(target => /^level-\d$/.test(target.id)).map(target => target.id), ['level-1', 'level-2', 'level-3', 'level-4']);
    assert.match(ctx.words.join(' '), new RegExp(theme.name));
    assert.ok(!ctx.words.join(' ').includes('主题场景待制作'));
    app.handle({ type: 'level', themeId: theme.id, index: 0 });
    const targets = renderer.render(app.router.current, viewport, app.viewState());
    const start = targets.find(target => target.id === 'ready-start');
    assert.ok(start && start.disabled, '正式题目未开放，开始必须禁用');
    assert.equal(!!targets.find(target => target.id === 'ready-practice'), theme.id === 'ecology');
    const actions = [];
    const input = new Input(action => actions.push(action));
    input.setTargets(targets);
    input.start({ x: start.x + start.w / 2, y: start.y + start.h / 2 });
    input.end({ x: start.x + start.w / 2, y: start.y + start.h / 2 });
    assert.equal(actions.length, 0);
    assert.match(ctx.words.join(' '), /10题/);
    assert.match(ctx.words.join(' '), /10分.*通关积分/);
  }
});

test('四种节点状态有独立文字语义，隔离样例不改正式进度', () => {
  const { app } = makeApp();
  app.handle({ type: 'theme', themeId: 'ecology' });
  const before = JSON.stringify(app.viewState().themeProgress);
  const ctx = drawingContext();
  const renderer = new Renderer(ctx);
  renderer.render(app.router.current, app.viewport, { ...app.viewState(), nodeStates: ['complete', 'current', 'today-locked', 'locked'] });
  const words = ctx.words.join(' ');
  assert.match(words, /已通关/);
  assert.match(words, /当前关卡/);
  assert.match(words, /今日锁定/);
  assert.match(words, /未解锁/);
  assert.equal(JSON.stringify(app.viewState().themeProgress), before);
});

test('320px短题四个短选项全部可实际点选并提交，不修改正式进度', () => {
  const { app, stored } = makeApp(320, 568);
  const formalBefore = JSON.stringify(app.viewState().themeProgress);
  app.handle({ type: 'practice' });
  Object.assign(app.challenge.questions[0], {
    title: '怎样保护河水？',
    media: null, // This fixture is a text question regardless of randomized practice media.
    options: ['不乱扔垃圾', '把垃圾倒进河里', '破坏河岸植物', '随意排放污水'],
    answer: 0,
  });
  const renderTargets = () => {
    const targets = app.renderer.render(app.router.current, app.viewport, app.viewState());
    app.input.setTargets(targets);
    return targets;
  };
  const tap = id => {
    const target = renderTargets().find(item => item.id === id);
    assert.ok(target && !target.disabled, `${id} visible and enabled`);
    const physical = { clientX: (target.x + target.w / 2) * app.viewport.scale, clientY: (target.y + target.h / 2) * app.viewport.scale };
    const point = toLogical(physical, app.viewport);
    app.input.start(point, 7);
    app.input.end(point, 7);
  };
  const options = renderTargets().filter(target => /^option-\d$/.test(target.id));
  assert.equal(options.length, 4, '渲染出的四个短选项必须都有有效热区');
  for (const option of options) assert.ok(option.h * app.viewport.scale >= 44 && option.w * app.viewport.scale >= 44);
  for (const index of [0, 1, 2, 3]) {
    tap('option-' + index);
    assert.equal(app.challenge.selected, index);
  }
  tap('option-0');
  tap('confirm');
  assert.equal(app.challenge.correct, 1);
  assert.ok(app.feedback);
  assert.equal(JSON.stringify(app.viewState().themeProgress), formalBefore);
  assert.equal(stored.length, 0);
});

test('四种屏幕的首页、四地图和准备页热区实际至少44px，不越界不重叠', () => {
  for (const [width, height] of [[320, 568], [375, 812], [414, 896], [430, 932]]) {
    const viewport = createViewport({ windowWidth: width, windowHeight: height, pixelRatio: 3, statusBarHeight: 24, safeArea: { top: 24, bottom: height - 12 } }, { bottom: 56 });
    const { app } = makeApp();
    const routes = [{ name: 'home', params: {} }, ...THEMES.flatMap(theme => [
      { name: 'map', params: { themeId: theme.id } },
      { name: 'level-ready', params: { themeId: theme.id, levelId: `${theme.id}-1` } },
    ])];
    for (const route of routes) {
      app.router.replace(route.name, route.params);
      const renderer = new Renderer(drawingContext());
      const targets = renderer.render(route, viewport, app.viewState());
      for (const target of targets) {
        const label = `${width}×${height} ${route.name} ${route.params.themeId || ''} ${target.id}`;
        assert.ok(target.w * viewport.scale >= 44 && target.h * viewport.scale >= 44, `${label} actual hit size`);
        assert.ok(target.x >= 0 && target.x + target.w <= viewport.width, `${label} horizontal bounds`);
        assert.ok(target.y >= viewport.top && target.y + target.h <= viewport.bottom + 0.1, `${label} safe area`);
      }
      for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
        const a = targets[i], b = targets[j];
        const overlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        assert.equal(overlap, 0, `${width} ${route.name}: ${a.id}/${b.id} overlap`);
      }
    }
  }
});
