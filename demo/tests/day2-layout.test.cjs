const test = require('node:test');
const assert = require('node:assert/strict');
const { Renderer } = require('../js/ui/renderer');
const { Input } = require('../js/core/input');
const { createViewport } = require('../js/core/viewport');
const App = require('../js/main');
const { THEMES } = require('../js/data/themes');

const SIZES = [[320, 568], [375, 812], [414, 896], [430, 932]];
const STATES = ['current', 'locked', 'locked', 'locked'];

function context() {
  const drawCalls = [];
  return new Proxy({
    drawCalls,
    drawImage(...args) { drawCalls.push(args); },
    measureText(value) { return { width: String(value).length * 16 }; },
  }, {
    get(object, key) { return key in object ? object[key] : () => {}; },
    set(object, key, value) { object[key] = value; return true; },
  });
}

function viewport(width, height) {
  // Include a more conservative menu-capsule boundary than the browser preview.
  return createViewport({ windowWidth: width, windowHeight: height, pixelRatio: 3, statusBarHeight: 24, safeArea: { top: 24, bottom: height - 12 } }, { bottom: 56 });
}

function inRect(target, frame) {
  return target.x >= frame.x - 0.1 && target.y >= frame.y - 0.1 && target.x + target.w <= frame.x + frame.w + 0.1 && target.y + target.h <= frame.y + frame.h + 0.1;
}

function almostEqual(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 0.001, `${label}: ${actual} vs ${expected}`);
}

test('四主题地图在四种屏幕中保持场景等比，绘制记录与布局一致', () => {
  for (const [width, height] of SIZES) for (const theme of THEMES) {
    const ctx = context(), renderer = new Renderer(ctx), v = viewport(width, height);
    const scene = theme.id === 'ecology' ? { width: 750, height: 1125 } : { width: 1024, height: 1536 };
    renderer.render({ name: 'map', params: { themeId: theme.id } }, v, { images: { ['map-' + theme.id]: scene }, nodeStates: STATES });
    const geometry = renderer.layout.map;
    assert.ok(geometry && geometry.frame && geometry.scene, `${theme.id} exposes actual map layout`);
    almostEqual(geometry.scene.w / geometry.scene.h, scene.width / scene.height, `${width} ${theme.id} map aspect`);
    almostEqual(geometry.scaleX, geometry.scaleY, `${width} ${theme.id} uniform scale`);
    assert.ok(geometry.frame.y >= v.top && geometry.frame.y + geometry.frame.h <= v.bottom, 'map frame respects safe area');
    const calls = ctx.drawCalls.filter(args => args[0] === scene);
    assert.ok(calls.length > 0, 'scene was actually drawn');
    for (const call of calls) {
      const sourceW = call.length === 9 ? call[3] : scene.width;
      const sourceH = call.length === 9 ? call[4] : scene.height;
      const drawnW = call.length === 9 ? call[7] : call[3];
      const drawnH = call.length === 9 ? call[8] : call[4];
      almostEqual(drawnW / drawnH, sourceW / sourceH, 'drawImage does not stretch the scene');
    }
  }
});

test('320px地图真实输入拖动可看全四节点，拖动不触发节点且固定按钮不移动', () => {
  const v = viewport(320, 568), renderer = new Renderer(context());
  const route = { name: 'map', params: { themeId: 'ecology' } };
  const actions = [], seen = new Set();
  const input = new Input(action => actions.push(action), delta => renderer.scrollBy(delta));
  let targets;
  const render = () => {
    targets = renderer.render(route, v, { nodeStates: STATES, images: { 'map-ecology': { width: 750, height: 1125 } } });
    input.setTargets(targets);
    input.scrollRegion = renderer.scrollRegion;
    const frame = renderer.layout.map.frame;
    for (const target of targets.filter(item => /^level-\d$/.test(item.id))) {
      assert.ok(target.w * v.scale >= 44 && target.h * v.scale >= 44, `${target.id} actual hit area`);
      assert.ok(inRect(target, frame), `${target.id} outside clipped map`);
      seen.add(target.id);
    }
    return targets;
  };
  render();
  assert.ok(renderer.scrollMax > 0, 'short screen must scroll rather than flatten the scene');
  assert.ok(targets.some(target => target.id === 'level-1'), 'current first level is visible on entry');
  const footer = JSON.stringify(targets.filter(target => ['back', 'begin'].includes(target.id)));
  const drag = direction => {
    const frame = renderer.layout.map.frame;
    const start = { x: frame.x + frame.w / 2, y: frame.y + frame.h * (direction > 0 ? 0.25 : 0.75) };
    const end = { x: start.x, y: frame.y + frame.h * (direction > 0 ? 0.75 : 0.25) };
    input.start(start, 2);
    for (let step = 1; step <= 6; step++) {
      input.move({ x: start.x, y: start.y + (end.y - start.y) * step / 6 }, 2);
      render();
    }
    input.end(end, 2);
    render();
    assert.equal(JSON.stringify(targets.filter(target => ['back', 'begin'].includes(target.id))), footer, 'footer stays fixed');
  };
  for (let step = 0; step < 4; step++) drag(1);
  almostEqual(renderer.scroll, 0, 'top overscroll clamp');
  for (let step = 0; step < 4; step++) drag(-1);
  almostEqual(renderer.scroll, renderer.scrollMax, 'bottom overscroll clamp');
  assert.deepEqual([...seen].sort(), ['level-1', 'level-2', 'level-3', 'level-4']);
  assert.equal(actions.length, 0, 'scroll gestures must never activate a node');
  const frame = renderer.layout.map.frame;
  input.start({ x: frame.x + frame.w / 2, y: frame.y - 8 }, 3);
  assert.equal(input.active, null, 'map region must not extend into the heading');
});

test('首页短屏方形插画实际高度至少88px，主题与固定操作仍在安全区', () => {
  for (const [width, height] of SIZES) {
    const v = viewport(width, height), renderer = new Renderer(context());
    // These generic square fixtures are not the bundled PNGs with measured transparent padding.
    const images = Object.fromEntries(THEMES.map(theme => [theme.id, { width: 777, height: 777 }]));
    const targets = renderer.render({ name: 'home', params: {} }, v, { images });
    const layout = renderer.layout.home;
    assert.equal(layout.artBoxes.length, 4);
    assert.equal(layout.artRects.length, 4);
    for (const box of layout.artBoxes) assert.ok(box.h * v.scale >= 88 - 0.1, `${width} ${box.themeId} art box height`);
    for (const art of layout.artRects) {
      assert.ok(art.h * v.scale >= 88 - 0.1, `${width} ${art.themeId} square art height`);
      almostEqual(art.w / art.h, 1, `${width} ${art.themeId} square aspect preserved`);
    }
    for (const id of [...THEMES.map(theme => 'theme-' + theme.id), 'ranking', 'certificates', 'practice']) {
      const target = targets.find(item => item.id === id);
      assert.ok(target, `${width} ${id} visible`);
      assert.ok(target.w * v.scale >= 44 && target.h * v.scale >= 44);
      assert.ok(target.y >= v.top && target.y + target.h <= v.bottom + 0.1);
    }
  }
});

test('滚动后的地图入口和返回仍保持唯一首页→地图→准备页历史', () => {
  const ctx = context();
  const platform = {
    canvas: { getContext: () => ctx }, api: { getStorageSync: () => null },
    viewport: () => viewport(320, 568), requestFrame: () => 1, cancelFrame() {}, on() {}, off() {},
    createImage: () => ({ set src(_) { queueMicrotask(() => this.onerror && this.onerror()); } }),
  };
  const app = new App(platform);
  app.router.replace('home');
  const formalBefore = JSON.stringify(app.viewState().themeProgress);
  const render = () => {
    const targets = app.renderer.render(app.router.current, app.viewport, app.viewState());
    app.input.setTargets(targets);
    app.input.scrollRegion = app.renderer.scrollRegion;
    return targets;
  };
  const tap = id => {
    const target = render().find(item => item.id === id);
    assert.ok(target && !target.disabled, id + ' is available');
    const point = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
    app.input.start(point, 4);
    app.input.end(point, 4);
  };
  for (const theme of THEMES) {
    tap('theme-' + theme.id);
    render();
    const frame = app.renderer.layout.map.frame;
    const start = { x: frame.x + frame.w / 2, y: frame.y + frame.h * 0.25 };
    const end = { x: start.x, y: frame.y + frame.h * 0.75 };
    app.input.start(start, 4);
    app.input.move(end, 4);
    app.input.end(end, 4);
    assert.equal(app.router.current.name, 'map');
    assert.equal(app.router.history.length, 1);
    tap('begin');
    assert.equal(app.router.current.name, 'level-ready');
    assert.equal(app.router.current.params.themeId, theme.id);
    assert.equal(app.router.history.length, 2);
    tap('back');
    assert.equal(app.router.current.name, 'map');
    assert.equal(app.router.history.length, 1);
    tap('back');
    assert.equal(app.router.current.name, 'home');
    assert.equal(app.router.history.length, 0);
    assert.equal(JSON.stringify(app.viewState().themeProgress), formalBefore);
  }
});
