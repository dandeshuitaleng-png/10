const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const out = path.resolve(root, process.env.DAY2_EVIDENCE_DIR || 'design/day2-v2/evidence');
const sizes = [[320, 568], [375, 812], [414, 896], [430, 932]];
const themes = ['red', 'culture', 'industry', 'ecology'];
const checks = [], errors = [], screenshots = [];
let browser, page, failure = null;

function check(name, value, details) {
  checks.push({ name, pass: !!value, ...(details ? { details } : {}) });
  if (!value) throw new Error(name);
}

async function boot(relative, width = 375, height = 812) {
  await page.setViewportSize({ width, height });
  await page.goto('file://' + path.join(root, relative));
  await page.waitForFunction(() => app.router.current.name === 'home');
  await page.waitForTimeout(60);
}

async function ensureTargetVisible(id) {
  let target = await page.evaluate(id => app.input.targets.find(item => item.id === id), id);
  if (target) return target;
  const route = await page.evaluate(() => app.router.current.name);
  if (route !== 'map') throw new Error('Missing target: ' + id);
  // Reach hidden map nodes by actual pointer drags, never by setting scroll.
  for (const direction of [1, -1]) for (let attempt = 0; attempt < 5; attempt++) {
    const state = await page.evaluate(() => ({ region: app.renderer.scrollRegion, scale: app.viewport.scale, route: app.router.current, depth: app.router.history.length }));
    if (!state.region) throw new Error('Map has no scroll region for: ' + id);
    const bounds = await page.locator('canvas').boundingBox();
    const x = bounds.x + (state.region.x + state.region.w * 0.5) * state.scale;
    const startY = bounds.y + (state.region.y + state.region.h * (direction > 0 ? 0.25 : 0.75)) * state.scale;
    const endY = bounds.y + (state.region.y + state.region.h * (direction > 0 ? 0.75 : 0.25)) * state.scale;
    await page.mouse.move(x, startY);
    await page.mouse.down();
    await page.mouse.move(x, endY, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(45);
    check('实际拖动查找' + id + '不触发导航', await page.evaluate(before => app.router.current.name === before.route.name && app.router.current.params.themeId === before.route.params.themeId && app.router.history.length === before.depth, state));
    target = await page.evaluate(id => app.input.targets.find(item => item.id === id), id);
    if (target) return target;
  }
  throw new Error('Target not reachable by map dragging: ' + id);
}

async function targetPoint(id) {
  await page.waitForTimeout(25);
  const target = await ensureTargetVisible(id);
  if (/^level-\d$/.test(id)) {
    const frame = await page.evaluate(() => app.renderer.layout.map.frame);
    if (target.x < frame.x - 0.1 || target.y < frame.y - 0.1 || target.x + target.w > frame.x + frame.w + 0.1 || target.y + target.h > frame.y + frame.h + 0.1) throw new Error('Node target outside clipped map: ' + id);
  }
  const bounds = await page.locator('canvas').boundingBox();
  const scale = await page.evaluate(() => app.viewport.scale);
  return { target, x: bounds.x + (target.x + target.w / 2) * scale, y: bounds.y + (target.y + target.h / 2) * scale };
}

async function tap(id) {
  const point = await targetPoint(id);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(50);
}

async function screenshot(scope, name, fixture = false) {
  const relative = `browser-${scope}/${name}.png`;
  const destination = path.join(out, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  await page.screenshot({ path: destination });
  screenshots.push({ file: relative, fixture });
}

async function inspectTargets(label) {
  const layout = await page.evaluate(() => ({ viewport: app.viewport, targets: app.input.targets, route: app.router.current.name, geometry: app.renderer.layout }));
  const { viewport: v, targets } = layout;
  check(label + ' · 当前页面存在可操作热区', targets.some(t => !t.disabled));
  check(label + ' · 主要热区实际至少44px', targets.every(t => t.w * v.scale >= 44 && t.h * v.scale >= 44));
  check(label + ' · 热区在安全区内', targets.every(t => t.x >= 0 && t.x + t.w <= v.width && t.y >= v.top && t.y + t.h <= v.bottom + 0.1));
  let overlap = false;
  for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
    const a = targets[i], b = targets[j];
    if (Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) && Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y)) overlap = true;
  }
  check(label + ' · 热区无重叠', !overlap);
  if (layout.route === 'map') {
    const map = layout.geometry.map;
    check(label + ' · 场景保持2:3比例', Math.abs(map.scene.w / map.scene.h - 2 / 3) < 0.001);
    check(label + ' · 场景横纵缩放一致', Math.abs(map.scaleX - map.scaleY) < 0.001);
    check(label + ' · 可见节点热区在地图裁切区内', targets.filter(t => /^level-\d$/.test(t.id)).every(t => t.x >= map.frame.x - 0.1 && t.y >= map.frame.y - 0.1 && t.x + t.w <= map.frame.x + map.frame.w + 0.1 && t.y + t.h <= map.frame.y + map.frame.h + 0.1));
  }
  if (layout.route === 'level-ready') {
    const ready=layout.geometry.ready;
    check(label + ' · 准备页规则面板与地标图不重叠',ready.panel.y>=ready.hero.y+ready.hero.h);
    check(label + ' · 准备页规则可见或可滚动',ready.panel.y+ready.panel.h<=ready.content.bottom+ready.scrollMax+0.1);
    check(label + ' · 开放状态提示位于操作上方',ready.noticeY+20<=Math.min(...targets.map(t=>t.y)));
    if(ready.source) {
      const a=ready.source;
      check(label+' · 地标局部保持比例',Math.abs(a.sw/a.sh-ready.hero.w/ready.hero.h)<0.001);
      check(label+' · 地标局部有效',a.sx>=0&&a.sy>=0&&a.sw>0&&a.sh>0);
    }
  }
  if (layout.route === 'home') {
    const home = layout.geometry.home;
    check(label + ' · 四主题插画容器实际高度至少88px', home.artBoxes.length === 4 && home.artBoxes.every(box => box.h * v.scale >= 88 - 0.1));
    check(label + ' · 四主题真实插画实际可见宽度至少105px', home.artRects.length === 4 && home.artRects.every(art => art.w * v.scale >= 105 - 0.1));
  }
}

async function pageFlow(scope, entry) {
  for (const [width, height] of sizes) {
    for (const themeId of themes) {
      const label = `${scope} ${width}×${height} ${themeId}`;
      await boot(entry, width, height);
      await inspectTargets(label + ' 首页');
      await screenshot(scope, `home-${themeId}-${width}`);
      check(label + ' · 场景资源加载成功', await page.evaluate(() => app.resources.failures.length === 0));
      if (scope === 'main') check(label + ' · 已确认默认地图实际加载', await page.evaluate(id => { const r=app.resources,image=r.images['map-'+id]; return !!image && image.width>0 && image.height>0 && r.mapArt[id]===quizRequire('/js/services/resources').DEFAULT_MAP_ART[id]; }, themeId));
      await tap('theme-' + themeId);
      check(label + ' · 主题进入对应地图', await page.evaluate(themeId => app.router.current.name === 'map' && app.router.current.params.themeId === themeId, themeId));
      await inspectTargets(label + ' 地图');
      await screenshot(scope, `map-${themeId}-${width}`);
      check(label + ' · 进入地图可见当前第一关', await page.evaluate(() => app.input.targets.some(t => t.id === 'level-1')));
      const fixedFooter = await page.evaluate(() => JSON.stringify(app.input.targets.filter(t => ['back', 'begin'].includes(t.id))));
      const reachedNodes = new Set(['level-1']);
      const depth = await page.evaluate(() => app.router.history.length);
      for (const node of [2, 3, 4]) {
        await tap('level-' + node);
        reachedNodes.add('level-' + node);
        check(label + ` · 未解锁第${node}关只提示`, await page.evaluate(depth => app.router.current.name === 'map' && app.router.history.length === depth && app.challenge === null, depth));
        await inspectTargets(label + ` 第${node}关滚动位置`);
      }
      check(label + ' · 四节点通过实际拖动全部可达', reachedNodes.size === 4);
      check(label + ' · 地图滚动时底部按钮固定', await page.evaluate(before => JSON.stringify(app.input.targets.filter(t => ['back', 'begin'].includes(t.id))) === before, fixedFooter));
      await screenshot(scope, `map-upper-${themeId}-${width}`);
      // Dismiss only the temporary hint for a clean screenshot; no progress or route fixture is injected.
      await page.evaluate(() => { app.toast = null; });
      await tap('begin');
      check(label + ' · 主按钮进入同主题准备页', await page.evaluate(themeId => app.router.current.name === 'level-ready' && app.router.current.params.themeId === themeId && app.router.current.params.levelId === themeId + '-1', themeId));
      await inspectTargets(label + ' 准备页');
      await screenshot(scope, `ready-${themeId}-${width}`);
      check(label + ' · 正式开始禁用，试玩仅生态显示', await page.evaluate(themeId => {
        const start = app.input.targets.find(t => t.id === 'ready-start');
        return start && start.disabled && !!app.input.targets.find(t => t.id === 'ready-practice') === (themeId === 'ecology');
      }, themeId));
      await tap('ready-start');
      check(label + ' · 禁用开始无法开局', await page.evaluate(() => app.router.current.name === 'level-ready' && app.challenge === null));
      await tap('back');
      check(label + ' · 准备页一次返回地图', await page.evaluate(themeId => app.router.current.name === 'map' && app.router.current.params.themeId === themeId && app.router.history.length === 1, themeId));
      await tap('level-1');
      check(label + ' · 第一节点与主按钮入口一致', await page.evaluate(themeId => app.router.current.name === 'level-ready' && app.router.current.params.levelId === themeId + '-1', themeId));
      await tap('back');
      await tap('back');
      check(label + ' · 地图一次返回首页', await page.evaluate(() => app.router.current.name === 'home' && app.router.history.length === 0));
    }
  }
}

async function inputAndPractice() {
  await boot('design/play.html');
  await tap('theme-industry');
  await tap('level-2');
  check('未解锁提示在当前地图即时出现', await page.evaluate(() => !!app.toast && app.router.current.name === 'map'));
  await screenshot('main', 'locked-hint-before-navigation-375');
  await tap('begin');
  check('进入准备页立即清除上一地图提示', await page.evaluate(() => app.router.current.name === 'level-ready' && app.toast === null));
  await screenshot('main', 'ready-after-locked-hint-375');
  await tap('back');
  check('返回地图不恢复旧提示', await page.evaluate(() => app.router.current.name === 'map' && app.toast === null));
  await tap('level-3');
  check('再次点击未解锁节点重新显示本页提示', await page.evaluate(() => !!app.toast));
  await tap('back');
  check('返回首页立即清除地图提示', await page.evaluate(() => app.router.current.name === 'home' && app.toast === null));
  await tap('theme-ecology');
  check('切换主题后没有上一主题的锁定提示', await page.evaluate(() => app.router.current.name === 'map' && app.router.current.params.themeId === 'ecology' && app.toast === null));

  await boot('design/play.html');
  let point = await targetPoint('theme-red');
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(40);
  check('实际按下立即反馈', await page.evaluate(() => app.input.pressedId === 'theme-red'));
  await screenshot('main', 'home-pressed-375');
  await page.mouse.move(point.x - 200, point.y + 10);
  await page.mouse.move(point.x, point.y);
  await page.mouse.up();
  await page.waitForTimeout(40);
  check('拖出再移回不触发主题入口', await page.evaluate(() => app.router.current.name === 'home' && app.router.history.length === 0));
  await tap('theme-red');
  point = await targetPoint('begin');
  await page.mouse.dblclick(point.x, point.y, { delay: 0 });
  await page.waitForTimeout(80);
  check('重复点击不重复压入准备页', await page.evaluate(() => app.router.current.name === 'level-ready' && app.router.history.length === 2 && app.challenge === null));
  await tap('back');
  await tap('back');

  // All ten answers are chosen through actual pointer input; answer lookup is test-only.
  for (const entry of ['home', 'ready']) {
    await boot('design/play.html');
    const formalBefore = await page.evaluate(() => JSON.stringify(app.viewState().themeProgress));
    if (entry === 'ready') {
      await tap('theme-ecology');
      await tap('begin');
      await tap('ready-practice');
    } else await tap('practice');
    check(entry + ' · 独立入口进入生态试玩', await page.evaluate(() => app.router.current.name === 'quiz' && app.router.current.params.practice === true));
    for (let position = 0; position < 10; position++) {
      const answer = await page.evaluate(() => app.challenge.questions[app.challenge.position].answer);
      await tap('option-' + answer);
      await tap('confirm');
      if (position < 9) await tap('confirm');
    }
    check(entry + ' · 十题全对到达结果', await page.evaluate(() => app.router.current.name === 'result' && app.challenge.correct === 10));
    check(entry + ' · 试玩不改变正式进度', await page.evaluate(before => JSON.stringify(app.viewState().themeProgress) === before, formalBefore));
    await screenshot('main', `practice-result-from-${entry}-375`);
    await tap('next');
    check(entry + ' · 结果一次返回地图且清理本次答题', await page.evaluate(() => app.router.current.name === 'map' && app.router.history.length === 1 && app.challenge === null && app.feedback === null));
    await tap('back');
    check(entry + ' · 地图一次返回首页', await page.evaluate(() => app.router.current.name === 'home' && app.router.history.length === 0));
  }

  await boot('design/play.html', 320, 568);
  await tap('theme-ecology');
  const formalBefore = await page.evaluate(() => JSON.stringify(app.viewState().themeProgress));
  await page.evaluate(() => {
    const original = app.viewState.bind(app);
    app.viewState = () => ({ ...original(), nodeStates: ['complete', 'current', 'today-locked', 'locked'] });
  });
  await page.waitForTimeout(60);
  await inspectTargets('320×568 隔离节点状态');
  await screenshot('main', 'node-states-fixture-320', true);
  await ensureTargetVisible('level-4');
  await screenshot('main', 'node-states-fixture-upper-320', true);
  check('隔离状态样例不改正式进度', await page.evaluate(before => JSON.stringify(app.viewState().themeProgress) === before, formalBefore));

  await boot('design/play.html', 320, 568);
  await tap('theme-ecology');
  await page.evaluate(() => { app.resources.images = {}; });
  await page.waitForTimeout(60);
  await screenshot('main', 'map-art-failure-fixture-320', true);
  const fallbackNodes = new Set();
  for (const node of [1, 2, 3, 4]) {
    const target = await ensureTargetVisible('level-' + node);
    const scale = await page.evaluate(() => app.viewport.scale);
    check('场景图片失败时第' + node + '节点可达且热区至少44px', target.w * scale >= 44 && target.h * scale >= 44);
    fallbackNodes.add(target.id);
  }
  check('场景图片失败仍保留四节点与固定入口', fallbackNodes.size === 4 && await page.evaluate(() => app.input.targets.some(t => t.id === 'begin')));
  await screenshot('main', 'map-art-failure-fixture-upper-320', true);
  await tap('begin');
  check('场景图片失败仍可进入准备页', await page.evaluate(() => app.router.current.name === 'level-ready'));
}

async function shortOptionRegression() {
  for (const [width, height] of sizes) {
    await boot('design/play.html', width, height);
    const formalBefore = await page.evaluate(() => JSON.stringify(app.viewState().themeProgress));
    await tap('practice');
    // This isolated practice fixture prevents long sample text from masking
    // missing click targets for the shorter option layout on small screens.
    await page.evaluate(() => {
      Object.assign(app.challenge.questions[0], {
        title: '怎样保护河水？',
        options: ['不乱扔垃圾', '把垃圾倒进河里', '破坏河岸植物', '随意排放污水'],
        answer: 0,
      });
    });
    await page.waitForTimeout(60);
    const options = await page.evaluate(() => ({ scale: app.viewport.scale, targets: app.input.targets.filter(t => /^option-\d$/.test(t.id)) }));
    check(`${width}×${height} · 短题四个短选项都有有效热区`, options.targets.length === 4);
    check(`${width}×${height} · 短选项热区实际至少44px`, options.targets.every(t => t.w * options.scale >= 44 && t.h * options.scale >= 44));
    await screenshot('main', `short-options-fixture-${width}`, true);
    for (const index of [0, 1, 2, 3]) {
      await tap('option-' + index);
      check(`${width}×${height} · 短选项${'ABCD'[index]}可实际点选`, await page.evaluate(index => app.challenge.selected === index, index));
    }
    await tap('option-0');
    await tap('confirm');
    check(`${width}×${height} · 短题实际提交并显示正确反馈`, await page.evaluate(() => app.challenge.correct === 1 && !!app.feedback));
    check(`${width}×${height} · 短题样例不修改正式进度`, await page.evaluate(before => JSON.stringify(app.viewState().themeProgress) === before, formalBefore));
    await screenshot('main', `short-options-correct-fixture-${width}`, true);
  }
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  try {
    browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
    page.on('pageerror', error => errors.push(error.message));
    await pageFlow('main', 'design/play.html');
    if (process.env.DAY2_SKIP_PREVIEW !== '1') await pageFlow('preview', process.env.DAY2_PREVIEW_ENTRY || 'design/day2-v2/play.html');
    await shortOptionRegression();
    await inputAndPractice();
    check('浏览器无未捕获异常', errors.length === 0, errors);
  } catch (error) {
    failure = error.stack || String(error);
    if (page) {
      try { await screenshot('main', 'failure'); } catch (_) { /* preserve original failure */ }
    }
  } finally {
    if (browser) await browser.close();
    const report = {
      generatedAt: new Date().toISOString(),
      scope: 'Fresh Chromium pointer-input checks of approved-art main runtime and isolated map-art preview. Node-state and missing-image screenshots are explicit fixtures only. No WeChat device evidence.',
      previewSkipped: process.env.DAY2_SKIP_PREVIEW === '1',
      checks, errors, failure, screenshots,
      passed: !failure && checks.every(item => item.pass),
      wechatSimulator: 'not_checked_by_this_script',
      iosDevice: 'not_checked', androidDevice: 'not_checked', artAccepted: false,
    };
    fs.writeFileSync(path.join(out, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: report.passed, checks: checks.length, screenshots: screenshots.length, failure, errors }));
    if (!report.passed) process.exitCode = 1;
  }
})();
