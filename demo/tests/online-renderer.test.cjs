const test = require('node:test');
const assert = require('node:assert/strict');
const { OnlineRenderer } = require('../js/ui/online-renderer');
const { createViewport } = require('../js/core/viewport');
const { Input } = require('../js/core/input');
const { THEMES } = require('../js/data/themes');
const { landmarkRegion } = require('../js/ui/map-layout');

const SIZES = [[320, 568], [375, 812], [414, 896], [430, 932]];
function context() {
  const values = { font: '16px sans-serif', texts: [], calls: [] };
  values.measureText = value => {
    const size = Number(values.font.match(/(\d+(?:\.\d+)?)px/)?.[1]) || 16;
    return { width: Array.from(String(value)).reduce((sum, char) => sum + (/\p{Script=Han}/u.test(char) ? size : size * .55), 0) };
  };
  values.fillText = (value, x, y) => values.texts.push({ value: String(value), x, y });
  values.drawImage = (...args) => values.calls.push(args);
  return new Proxy(values, { get: (o, key) => key in o ? o[key] : () => {}, set: (o, key, v) => { o[key] = v; return true; } });
}
function viewport(width = 320, height = 568) {
  return createViewport({ windowWidth: width, windowHeight: height, pixelRatio: 2, statusBarHeight: 24, safeArea: { top: 24, bottom: height - 12 } }, { bottom: 56 });
}
const progress = Object.fromEntries(THEMES.map(theme => [theme.id, { completed: 0, total: 4, nodes: ['current', 'locked', 'locked', 'locked'] }]));
const images = Object.fromEntries(THEMES.flatMap(theme => [[theme.id, { width: 1024, height: 1024 }], ['map-' + theme.id, { width: 1024, height: 1536 }]]));
const question = { id: 'question-1', title: '发现家乡的绿色生活，下面哪一种做法更合适？', options: ['在乡村道路旁随意倾倒垃圾', '按分类要求投放垃圾，保持环境整洁', '把垃圾扔进河道中', '把所有垃圾一起焚烧'], total: 10, position: 1, themeName: '青山绿水', levelOrder: 1, difficultyLabel: '基础认知', media: null };
const base = { images, themeProgress: progress, question, remainingSeconds: 30, countdownTotal: 30, totalPoints: 45, mode: 'experience', userName: '乡村探索者', continueLabel: '继续本次挑战', reducedMotion: true };
function render(renderer, v, name, view = {}, params = {}) {
  renderer.ctx.texts.length = 0;
  return renderer.render({ name, params: { themeId: 'ecology', levelId: 'ecology-1', ...params } }, v, { ...base, ...view });
}
function assertSafe(targets, v) {
  for (const target of targets) {
    assert.ok(target.w * v.scale >= 44 - .01 && target.h * v.scale >= 44 - .01, `${target.id} has a 44px physical hit area`);
    assert.ok(target.x >= 0 && target.x + target.w <= 375 + .01, `${target.id} lies within the screen width`);
    assert.ok(target.y >= v.top - .01 && target.y + target.h <= v.bottom + .01, `${target.id} lies within the safe vertical area`);
    assert.ok(target.label && typeof target.label === 'string', `${target.id} has a keyboard/screen-reader label`);
  }
}
function scan(renderer, renderFrame, visit) {
  renderFrame();
  const max = renderer.scrollMax, step = Math.max(30, renderer.scrollRegion.h / 3);
  for (let offset = 0; offset < max + step; offset += step) {
    renderer.scrollBy(offset - (renderer.scroll || 0));
    visit(renderFrame());
  }
}

test('全部正式游戏页面在四种尺寸的实际热点均满足44物理像素并留在安全区', () => {
  for (const [width, height] of SIZES) {
    const v = viewport(width, height), r = new OnlineRenderer(context());
    const cases = [
      ['home', {}], ['map', {}], ['level-ready', {}], ['quiz', {}],
      ['quiz', { feedback: { question, selected: 1, explanation: '垃圾分类能减少环境污染，也便于资源循环利用。', right: true, answer: 1 } }],
      ['quiz', { modal: 'revive', incorrectSelected: 0, shareReady: true }],
      ['quiz', { exitRequested: true }], ['quiz', { challengeState: 'locked' }],
      ['result', { result: { themeName: '青山绿水', levelOrder: 4, points: 30, accuracyPercent: 90, correct: 9, attempts: 10, passed: true } }],
      ['ranking', { rankings: { period: 'day', entries: [] } }], ['certificates', {}], ['settings', { soundEnabled: true }], ['error', {}]
    ];
    for (const [name, view] of cases) assertSafe(render(r, v, name, view), v);
  }
});

test('320短屏复活弹窗可操作，显示体验测试标识且不泄露答案与解析', () => {
  const r = new OnlineRenderer(context()), v = viewport();
  const targets = render(r, v, 'quiz', { modal: 'revive', incorrectSelected: 0, shareReady: true });
  const dialog = r.layout.revive, text = r.ctx.texts.map(t => t.value).join('');
  assert.ok(dialog.y >= v.top && dialog.y + dialog.h <= v.bottom);
  assert.deepEqual(targets.map(t => t.id), ['revive-share', 'revive-back']);
  assert.equal(targets[0].disabled, false); assert.equal(targets[0].action.type, 'share');
  assert.match(text, /体验版使用测试复活/); assert.equal(dialog.answerRevealed, false);
  assert.doesNotMatch(text, /正确答案|知识解析/);
  assertSafe(targets, v);
});

test('退出说明保留当前挑战并明确计时继续，按钮与底层题面隔离', () => {
  const r = new OnlineRenderer(context()), v = viewport(), targets = render(r, v, 'quiz', { exitRequested: true });
  assert.deepEqual(targets.map(t => t.action.type), ['exit-cancel', 'exit-confirm']);
  const text = r.ctx.texts.map(t => t.value).join('');
  assert.match(text, /挑战会保存/); assert.match(text, /倒计时仍会继续/); assert.doesNotMatch(text, /不会保留|作答清空/);
  assertSafe(targets, v);
});

test('320长题实际拖动看全四个选项，确认与退出固定，滚动不会误选', () => {
  const r = new OnlineRenderer(context()), v = viewport(), actions = [], input = new Input(a => actions.push(a), delta => r.scrollBy(delta));
  const q = { ...question, title: question.title.repeat(3), options: question.options.map(o => o.repeat(3)) }, seen = new Set();
  const frame = () => {
    const targets = render(r, v, 'quiz', { question: q }); input.setTargets(targets); input.scrollRegion = r.scrollRegion;
    targets.filter(t => t.action.type === 'option').forEach(t => seen.add(t.id)); assertSafe(targets, v); return targets;
  };
  const first = frame(), footer = JSON.stringify(first.filter(t => ['confirm', 'quiz-exit'].includes(t.id)));
  assert.ok(r.scrollMax > 0);
  for (let i = 0; i < 12; i++) {
    const region = r.scrollRegion, start = { x: 320, y: region.y + region.h * .8 }, end = { x: start.x, y: region.y + region.h * .2 };
    input.start(start, 1); input.move(end, 1); input.end(end, 1);
    assert.equal(JSON.stringify(frame().filter(t => ['confirm', 'quiz-exit'].includes(t.id))), footer);
  }
  assert.deepEqual([...seen].sort(), ['option-0', 'option-1', 'option-2', 'option-3']); assert.deepEqual(actions, []);
});

test('四主题地图等比绘制，320短屏滚动可触及每个关卡节点', () => {
  const v = viewport();
  for (const theme of THEMES) {
    const r = new OnlineRenderer(context()), seen = new Set(), frame = () => render(r, v, 'map', {}, { themeId: theme.id });
    frame(); assert.ok(r.scrollMax > 0);
    assert.equal(r.layout.map.scaleX, r.layout.map.scaleY);
    scan(r, frame, targets => { assertSafe(targets, v); targets.filter(t => /^level-\d$/.test(t.id)).forEach(t => seen.add(t.id)); });
    assert.deepEqual([...seen].sort(), ['level-1', 'level-2', 'level-3', 'level-4']);
  }
});

test('长排行榜所有名次可滚入屏幕，比例正确率渲染为百分数，切换榜单保持可用', () => {
  const r = new OnlineRenderer(context()), v = viewport(), entries = Array.from({ length: 50 }, (_, i) => ({ rank: i + 1, name: `旅人${i + 1}`, completedLevels: 16 - i % 16, points: 75, accuracy: .9, isMe: i === 10 })), seen = new Set();
  const frame = () => render(r, v, 'ranking', { rankings: { period: 'day', entries } });
  scan(r, frame, targets => {
    assertSafe(targets, v); assert.equal(targets.find(t => t.id === 'ranking-total').action.period, 'total');
    const region = r.scrollRegion;
    r.layout.ranking.rows.filter(row => row.y >= region.y && row.y + row.h <= region.y + region.h).forEach(row => seen.add(row.rank));
    assert.ok(r.ctx.texts.some(t => t.value === '90%'));
  });
  assert.equal(seen.size, 50); assert.ok(r.scrollMax > 0);
});

test('五张证书保存按钮都可滚动触及，证书日期按北京时间显示', () => {
  const r = new OnlineRenderer(context()), v = viewport(), certificates = [...THEMES.map(t => ({ id: t.id, themeId: t.id, issuedAt: '2026-10-11T18:00:00.000Z' })), { id: 'all', themeId: null, issuedAt: '2026-10-11T18:00:00.000Z' }], seen = new Set();
  const frame = () => render(r, v, 'certificates', { certificates });
  scan(r, frame, targets => {
    assertSafe(targets, v); targets.filter(t => t.action.type === 'certificate-download').forEach(t => seen.add(t.action.id));
    assert.ok(r.ctx.texts.some(t => t.value === '2026年10月12日获得'));
  });
  assert.deepEqual([...seen].sort(), ['all', 'culture', 'ecology', 'industry', 'red']); assert.equal(r.layout.certificates.total, 5);
});

test('设置可控制声音和减少动画，规则长内容可滚动，返回保持固定', () => {
  const r = new OnlineRenderer(context()), v = viewport(), seen = new Set(), frame = () => render(r, v, 'settings', { soundEnabled: false, reducedMotion: true });
  scan(r, frame, targets => { assertSafe(targets, v); targets.forEach(t => seen.add(t.action.type)); assert.equal(targets.find(t => t.id === 'settings-back').y, v.bottom - 52); });
  assert.ok(seen.has('toggle-sound') && seen.has('toggle-motion'));
  assert.equal(r.layout.settings.soundEnabled, false); assert.ok(r.scrollMax > 0);
});

test('首次连接失败时重试可点击，长错误说明滚动但弹窗操作仍在安全区', () => {
  const r = new OnlineRenderer(context()), v = viewport(), view = { loadingRemote: true, connectionError: '网络暂时不可用，请重新连接。'.repeat(30) }, targets = render(r, v, 'error', view);
  assert.ok(r.layout.remoteError.scrollMax > 0);
  assert.equal(targets.find(t => t.id === 'retry-remote').disabled, false);
  assertSafe(targets, v);
  const footer = JSON.stringify(targets); r.scrollBy(10000);
  assert.equal(JSON.stringify(render(r, v, 'error', view)), footer);
  assert.equal(r.scroll, r.scrollMax);
});

test('倒计时最后五秒温和强调，提交阶段阻止操作，结果使用明确后续动作', () => {
  const r = new OnlineRenderer(context()), v = viewport();
  render(r, v, 'quiz', { remainingSeconds: 4, selected: 1 }); assert.equal(r.layout.quiz.timer.urgent, true);
  const busy = render(r, v, 'quiz', { selected: 1, submitting: true }); assert.ok(busy.every(t => t.disabled));
  const result = render(r, v, 'result', { result: { themeName: '青山绿水', levelOrder: 4, points: 0, accuracyPercent: 90, passed: true } });
  assert.equal(result.find(t => t.id === 'next').label, '查看主题证书'); assert.equal(result.find(t => t.id === 'next').action.type, 'next');
  assert.match(r.ctx.texts.map(t => t.value).join(''), /重玩不重复发放/); assertSafe(result, v);
  const home = render(r, v, 'home'); assert.equal(home.find(t => t.id === 'practice').label, '继续本次挑战');
});

function dynamicCatalog(themeCount, levelCount = 1, questionCount = 15) {
  const themes = Array.from({ length: themeCount }, (_, i) => ({ id: `journey-theme-${i + 1}`, name: `新的乡村知识主题${i + 1}含较长名称`, description: '认识更多家乡文化与绿色生活', motif: 'book', order: i + 1, enabled: true, certificateName: `第${i + 1}个动态主题知识证书` }));
  return { themes, levels: themes.flatMap((theme, themeIndex) => Array.from({ length: levelCount }, (_, i) => ({ id: `stage-t${themeIndex + 1}-number-${i + 1}`, themeId: theme.id, name: `新的知识关卡${i + 1}使用真实目录名称`, order: i + 1, questionCount, points: 7 + i, enabled: true }))), config: { timer: { seconds: 45 }, revive: { limit: 2 } } };
}

test('1/5/12主题首页按目录生成行数，长名称不丢完整操作名，短屏每个入口可达', () => {
  for (const count of [1, 5, 12]) for (const [width, height] of SIZES) {
    const catalog = dynamicCatalog(count), r = new OnlineRenderer(context()), v = viewport(width, height), seen = new Set();
    const frame = () => render(r, v, 'home', { catalog });
    frame(); assert.equal(r.layout.home.rows, Math.ceil(count / 2)); assert.equal(r.layout.home.themes.length, count);
    assert.equal(r.semanticTargets.filter(t => t.action.type === 'theme').length, count);
    assert.ok(r.semanticTargets.find(t => t.action.type === 'theme').label.includes(catalog.themes[0].name));
    scan(r, frame, targets => { assertSafe(targets, v); targets.filter(t => t.action.type === 'theme').forEach(t => seen.add(t.action.themeId)); });
    assert.equal(seen.size, count);
  }
});

test('1/3/5/20关使用通用旅程，启用序列和真实关卡ID保持一致，全部节点可滚动触及', () => {
  for (const count of [1, 3, 5, 20]) for (const [width, height] of SIZES) {
    const catalog = dynamicCatalog(1, count), theme = catalog.themes[0], r = new OnlineRenderer(context()), v = viewport(width, height), seen = new Set();
    const frame = () => render(r, v, 'map', { catalog }, { themeId: theme.id });
    frame(); assert.equal(r.layout.map.style, 'generic'); assert.equal(r.layout.map.nodes.length, count); assert.equal(r.layout.map.scene, null);
    assert.equal(r.semanticTargets.filter(t => /^level-\d+$/.test(t.id)).length, count);
    scan(r, frame, targets => {
      assertSafe(targets, v);
      for (const target of targets.filter(t => /^level-\d+$/.test(t.id))) {
        assert.equal(target.action.levelId, catalog.levels[target.action.index].id); seen.add(target.action.levelId);
      }
      assert.equal(targets.find(t => t.id === 'begin').action.levelId, catalog.levels[0].id);
    });
    assert.equal(seen.size, count);
  }
});

test('通用20关旅程真实输入拖动保持固定操作，全部关卡可达且不会误触', () => {
  const catalog = dynamicCatalog(1, 20), theme = catalog.themes[0], r = new OnlineRenderer(context()), v = viewport(), seen = new Set(), actions = [];
  const input = new Input(a => actions.push(a), delta => r.scrollBy(delta));
  const frame = () => {
    const targets = render(r, v, 'map', { catalog }, { themeId: theme.id });
    input.setTargets(targets); input.scrollRegion = r.scrollRegion;
    targets.filter(t => /^level-\d+$/.test(t.id)).forEach(t => seen.add(t.action.levelId)); return targets;
  };
  const fixed = JSON.stringify(frame().filter(t => ['back', 'begin'].includes(t.id)));
  for (let i = 0; i < 24; i++) {
    const region = r.scrollRegion, start = { x: 315, y: region.y + region.h * .8 }, end = { x: start.x, y: region.y + region.h * .2 };
    input.start(start, 8); input.move(end, 8); input.end(end, 8);
    assert.equal(JSON.stringify(frame().filter(t => ['back', 'begin'].includes(t.id))), fixed);
  }
  assert.equal(seen.size, 20); assert.deepEqual(actions, []);
});

test('动态目录仅原四主题原四关保留原画，新关数不复用不存在的地标', () => {
  const r = new OnlineRenderer(context()), v = viewport();
  const catalog = { themes: THEMES, levels: THEMES.flatMap(theme => require('../js/data/themes').getLevels(theme.id)) };
  render(r, v, 'map', { catalog }); assert.equal(r.layout.map.style, 'original');
  const altered = { ...catalog, levels: [...catalog.levels, { id: 'ecology-5', themeId: 'ecology', order: 5, questionCount: 15, points: 45 }] };
  render(r, v, 'map', { catalog: altered }); assert.equal(r.layout.map.style, 'generic'); assert.equal(r.layout.map.nodes.length, 5);
  render(r, v, 'level-ready', { catalog: altered }, { levelId: 'ecology-5' }); assert.equal(r.layout.ready.landmark, null); assert.equal(r.layout.ready.source, null);
  assert.equal(landmarkRegion(images['map-ecology'], null, 327, 155), null);
  assert.equal(landmarkRegion(images['map-ecology'], { crop: [0, 0, 0, 1], focus: [.5, .5] }, 327, 155), null);
});

test('5/15/30题准备页和答题进度一致，奖励来自真实关卡，最后一题显示查看结果', () => {
  for (const count of [5, 15, 30]) for (const [width, height] of SIZES) {
    const catalog = dynamicCatalog(1, 5, count), theme = catalog.themes[0], level = catalog.levels[4], r = new OnlineRenderer(context()), v = viewport(width, height);
    const ready = render(r, v, 'level-ready', { catalog, reviveLimit: 2, countdownTotal: 45 }, { themeId: theme.id, levelId: level.id });
    assertSafe(ready, v); assert.equal(r.layout.ready.questionCount, count); assert.equal(r.layout.ready.points, 11); assert.equal(r.layout.ready.levelId, level.id);
    assert.equal(ready.find(t => t.id === 'ready-start').action.levelId, level.id);
    assert.match(r.ctx.texts.map(t => t.value).join(''), new RegExp(`${count} 题`));
    assert.match(r.ctx.texts.map(t => t.value).join(''), /最多复活2次/);
    const q = { ...question, themeName: theme.name, levelName: level.name, levelOrder: 5, position: count, total: count };
    const targets = render(r, v, 'quiz', { catalog, question: q, feedback: { question: q, selected: 1, explanation: '这里是最后一题知识解析。', answer: 1, right: true }, countdownTotal: 45 }, { themeId: theme.id, levelId: level.id });
    assert.equal(r.layout.quiz.total, count); assert.equal(r.layout.quiz.position, count); assert.equal(targets.find(t => t.id === 'confirm').label, '查看结果'); assertSafe(targets, v);
  }
});

test('显式空目录或全部停用不会回退原四主题，无开放关卡也有清晰可操作空态', () => {
  const r = new OnlineRenderer(context()), v = viewport();
  for (const catalog of [{ themes: [], levels: [] }, { ...dynamicCatalog(5), themes: dynamicCatalog(5).themes.map(t => ({ ...t, enabled: false })) }]) {
    const targets = render(r, v, 'home', { catalog }); assert.equal(r.layout.home.themes.length, 0); assert.equal(targets.some(t => t.action.type === 'theme'), false);
    assert.equal(targets.find(t => t.id === 'practice').disabled, true); assert.match(r.ctx.texts.map(t => t.value).join(''), /没有开放的主题/); assertSafe(targets, v);
    const resume = render(r, v, 'home', { catalog, hasActiveChallenge: true }); assert.equal(resume.find(t => t.id === 'practice').disabled, false);
  }
  const catalog = dynamicCatalog(1); catalog.levels = [];
  const targets = render(r, v, 'map', { catalog }, { themeId: catalog.themes[0].id });
  assert.equal(targets.some(t => t.action.type === 'level'), false); assert.equal(targets.find(t => t.id === 'empty-back').action.type, 'home');
  assert.match(r.ctx.texts.map(t => t.value).join(''), /没有开放的关卡/);
});

test('未知主题没有青山绿水图像替代，失效关卡不生成开始挑战，停用挑战名称仍显示快照', () => {
  const r = new OnlineRenderer(context()), v = viewport(), catalog = dynamicCatalog(1, 1);
  r.ctx.calls.length = 0;
  render(r, v, 'home', { catalog }); assert.equal(r.ctx.calls.length, 0);
  const unknown = render(r, v, 'map', { catalog }, { themeId: 'missing-theme' }); assert.equal(r.layout.map, undefined); assert.equal(unknown.some(t => t.action.type === 'level'), false);
  const level = { ...catalog.levels[0], enabled: false }, changed = { ...catalog, levels: [level] };
  const unavailable = render(r, v, 'level-ready', { catalog: changed }, { themeId: level.themeId, levelId: level.id });
  assert.equal(unavailable.some(t => t.action.type === 'formal-start'), false);
  const q = { ...question, themeName: '原来开放的主题', levelName: '继续已保存的挑战' };
  render(r, v, 'quiz', { catalog: { themes: [], levels: [] }, question: q }, { themeId: 'removed-theme' });
  assert.equal(r.layout.quiz.total, 10); assert.ok(r.ctx.texts.map(t => t.value).join('').includes('原来开放的主题'));
});

test('0/2/3复活次数尊重权威剩余值与设置，弹窗不会错误宣称仅一次', () => {
  const r = new OnlineRenderer(context()), v = viewport(), catalog = dynamicCatalog(1);
  for (const count of [0, 2, 3]) {
    const targets = render(r, v, 'quiz', { catalog, modal: 'revive', reviveLimit: 3, revivesRemaining: count, shareReady: true, incorrectSelected: 0 });
    assert.equal(r.layout.revive.revivesRemaining, count); assert.equal(targets.find(t => t.id === 'revive-share').disabled, count === 0); assertSafe(targets, v);
    const text = r.ctx.texts.map(t => t.value).join(''); assert.doesNotMatch(text, /仅有一次|仅1次/);
    if (count) assert.match(text, new RegExp(`还剩${count}次复活`));
  }
  render(r, v, 'settings', { catalog, reviveLimit: 0, dailyPointCap: 0, dailyPoints: 0, dailyRemaining: 0 });
  const text = r.ctx.texts.map(t => t.value).join(''); assert.match(text, /没有复活机会/); assert.match(text, /每日上限0分/); assert.match(text, /后续挑战生效/);
});

test('结果依据主题完成和真实nextLevelId导航，日额度零奖励与重复通关区别清楚', () => {
  const r = new OnlineRenderer(context()), v = viewport(), catalog = dynamicCatalog(1, 5), theme = catalog.themes[0];
  const result = { themeName: theme.name, levelOrder: 4, passed: true, points: 0, accuracyPercent: 100, themeComplete: false, nextLevelId: catalog.levels[4].id, requestedPoints: 30, dailyCapReached: true };
  const targets = render(r, v, 'result', { catalog, result }, { themeId: theme.id, levelId: catalog.levels[3].id });
  assert.equal(r.layout.result.themeComplete, false); assert.equal(targets.find(t => t.id === 'next').label, '进入第5关'); assert.equal(targets.find(t => t.id === 'next').action.levelId, catalog.levels[4].id);
  assert.match(r.layout.result.rewardNote, /今日积分额度已用完/); assert.doesNotMatch(r.layout.result.rewardNote, /已领过/);
  const earned = { ...result, points: 5 }; render(r, v, 'result', { catalog, result: earned }, { themeId: theme.id }); assert.match(r.layout.result.rewardNote, /奖励30分.*获得5分/);
  render(r, v, 'result', { catalog, result: { ...result, dailyCapReached: false, alreadyRewarded: true } }, { themeId: theme.id }); assert.match(r.layout.result.rewardNote, /已领过/);
  const complete = render(r, v, 'result', { catalog, result: { ...result, levelOrder: 5, themeComplete: true, nextLevelId: null, dailyCapReached: false, requestedPoints: 0 } }, { themeId: theme.id });
  assert.equal(complete.find(t => t.id === 'next').label, '查看主题证书'); assert.match(r.layout.result.rewardNote, /奖励为0积分/); assertSafe(complete, v);
});

test('动态证书条件按实际关数显示，历史已获证书保留并均可保存分享', () => {
  const r = new OnlineRenderer(context()), v = viewport(), catalog = dynamicCatalog(5, 3), certificates = catalog.themes.map(theme => ({ id: `cert-${theme.id}`, themeId: theme.id, title: `${theme.name}证书`, issuedAt: '2026-10-12T20:00:00.000Z' }));
  certificates.push({ id: 'historical-certificate', themeId: 'retired-theme', title: '上期已完成的乡村知识证书', issuedAt: '2026-10-11T18:00:00.000Z' });
  const seen = new Set(), shares = new Set(), frame = () => render(r, v, 'certificates', { catalog, certificates, canShareCertificate: true });
  scan(r, frame, targets => {
    assertSafe(targets, v); targets.filter(t => t.action.type === 'certificate-download').forEach(t => seen.add(t.action.id));
    targets.filter(t => t.action.type === 'certificate-share' && !t.disabled).forEach(t => shares.add(t.action.id));
    assert.equal(r.semanticTargets.filter(t => t.action.type === 'certificate-download').length, 6);
  });
  assert.equal(seen.size, 6); assert.equal(shares.size, 6); assert.equal(r.layout.certificates.total, 7); assert.equal(r.layout.certificates.cards.find(c => c.certificateId === 'historical-certificate').historical, true);
  render(r, v, 'certificates', { catalog, certificates: [], canShareCertificate: false });
  assert.match(r.ctx.texts.map(t => t.value).join(''), /完成本主题3关获得/); assert.match(r.ctx.texts.map(t => t.value).join(''), /完成5主题，共15关获得/);
  render(r, v, 'certificates', { catalog: { themes: [], levels: [] }, certificates, canShareCertificate: false });
  assert.equal(r.layout.certificates.owned, 6); assert.equal(r.layout.certificates.total, 6); assert.ok(r.semanticTargets.filter(t => t.action.type === 'certificate-share').every(t => t.disabled));
});

test('键盘描述保留被裁切的长内容热点，弹窗和视频接管时不泄露背景操作', () => {
  const r = new OnlineRenderer(context()), v = viewport(), catalog = dynamicCatalog(12, 20);
  const home = render(r, v, 'home', { catalog }); assert.ok(home.filter(t => t.action.type === 'theme').length < 12); assert.equal(r.semanticTargets.filter(t => t.action.type === 'theme').length, 12);
  const raw = r.semanticTargets.find(t => t.action.type === 'theme' && t.action.themeId === catalog.themes[11].id); assert.ok(raw.y > r.scrollRegion.y + r.scrollRegion.h);
  for (const view of [{ modal: 'revive', incorrectSelected: 0 }, { exitRequested: true }, { connectionError: '连接失败' }]) {
    render(r, v, 'quiz', { catalog, ...view }); assert.ok(r.semanticTargets.every(t => !['option', 'confirm', 'exit-request'].includes(t.action.type)));
  }
  render(r, v, 'quiz', { catalog, videoActive: true }); assert.deepEqual(r.semanticTargets.map(t => t.action.type), ['close-video']); assert.equal(r.scrollRegion, null);
});
