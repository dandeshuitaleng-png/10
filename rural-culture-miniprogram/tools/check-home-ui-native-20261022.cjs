'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  project = require('./lib/project-tools.cjs').reviewProject(),
  out = path.join(root, 'qa/icon-cards-20261022');
fs.mkdirSync(out, { recursive: true });

async function call(tool, args = []) {
  return require('./lib/project-tools.cjs').nativeCall({ project, tool, args });
}
async function evaluate(fn) {
  let r = await call('automation_evaluate', ['--fn-source', fn]);
  for (let i = 0; i < 6 && r?.result !== undefined; i++) r = r.result;
  return r;
}
(async () => {
  const checks = [];
  for (const theme of ['red', 'culture', 'industry', 'ecology']) {
    await call('automation_navigate', [
      '--action',
      'reLaunch',
      '--url',
      `/pages/game/index?theme=${theme}&review=1&controls=0&scenario=home`
    ]);
    const d = await evaluate(
      `async function(){const p=getCurrentPages().slice(-1)[0];await new Promise(r=>setTimeout(r,300));const selectors=['.game-device','.activity-hud','.activity-progress-copy','.activity-progress-value','.activity-points-value','.activity-points','.activity-links .activity-shortcut','.shortcut-mark','.shortcut-label'],q=wx.createSelectorQuery();selectors.forEach(s=>q.selectAll(s).boundingClientRect());return {theme:p.data.skin.gameId,rect:await new Promise(r=>q.exec(rows=>r(Object.fromEntries(selectors.map((s,i)=>[s,rows[i]])))))};}`
    );
    assert.equal(d.theme, theme);
    const r = d.rect,
      cy = (b) => b.top + b.height / 2,
      cx = (b) => b.left + b.width / 2,
      hud = r['.activity-hud'][0],
      cards = r['.activity-links .activity-shortcut'],
      marks = r['.shortcut-mark'],
      labels = r['.shortcut-label'];
    assert.equal(cards.length, 3);
    assert.equal(marks.length, 3);
    assert.equal(labels.length, 3);
    for (const s of [
      '.activity-progress-copy',
      '.activity-progress-value',
      '.activity-points-value'
    ])
      assert(Math.abs(cy(r[s][0]) - cy(hud)) < 1, s);
    for (let i = 0; i < 3; i++) {
      assert.equal(cards[i].height, 44);
      assert(Math.abs(cards[i].width - cards[0].width) < 1);
      assert.equal(marks[i].width, 24);
      assert.equal(marks[i].height, 24);
      assert(Math.abs(cy(marks[i]) - cy(labels[i])) < 1);
      const center = (marks[i].left + labels[i].right) / 2;
      assert(Math.abs(center - cx(cards[i])) < 1);
      if (i) assert(Math.abs(cards[i].left - cards[i - 1].right - 8) < 1);
    }
    const screenshot = theme + '-native.png';
    await call('simulator_screenshot', [
      '--path',
      path.join(out, screenshot),
      '--optimize',
      'false'
    ]);
    checks.push({ ...d, passed: true, screenshot });
    fs.writeFileSync(
      path.join(out, 'native-checks.json'),
      JSON.stringify(
        {
          passed: checks.length === 4,
          scope:
            'Actual WeChat isolated renderer; four themes, measured card/icon/text alignment and current screenshots. Not physical-phone acceptance.',
          checks
        },
        null,
        2
      ) + '\n'
    );
    console.log('PASS ' + theme + ' native alignment');
  }
  await call('automation_navigate', [
    '--action',
    'reLaunch',
    '--url',
    '/pages/game/index?theme=ecology&review=1&controls=0&scenario=home'
  ]);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
