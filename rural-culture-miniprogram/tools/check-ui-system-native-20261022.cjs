'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  project = require('./lib/project-tools.cjs').reviewProject(),
  out = path.join(root, 'qa/ui-system-20261022');
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
      `/pages/game/index?theme=${theme}&review=1&controls=0&scenario=home&route=profile`
    ]);
    const d = await evaluate(
      `async function(){const p=getCurrentPages().slice(-1)[0];await new Promise(r=>setTimeout(r,300));const selectors=['.profile-stats','.profile-stat-entry','.profile-link'],q=wx.createSelectorQuery();selectors.forEach(s=>q.selectAll(s).boundingClientRect());const rows=await new Promise(r=>q.exec(r));return {theme:p.data.skin.gameId,route:p.data.route,rect:Object.fromEntries(selectors.map((s,i)=>[s,rows[i]]))};}`
    );
    assert.equal(d.theme, theme);
    assert.equal(d.route, 'profile');
    assert.equal(d.rect['.profile-stat-entry'].length, 2);
    assert(d.rect['.profile-link'][0].height >= 44);
    const row = d.rect['.profile-stats'][0],
      entries = d.rect['.profile-stat-entry'];
    for (let i = 0; i < 2; i++) {
      const expected = row.left + (row.width - 12) / 4 + i * ((row.width - 12) / 2 + 12);
      assert(Math.abs(entries[i].left + entries[i].width / 2 - expected) < 1);
      assert.equal(entries[i].height, 20);
    }

    const screenshot = theme + '-profile-native.png';
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
          date: new Date().toISOString(),
          passed: checks.length === 4,
          scope:
            'Four native WeChat learning pages. Real native entry-group centering and current screenshots. Icon pixel bounds are measured in the browser record; native tag selectors cannot read isolated icon hosts; no physical-phone claim.',
          checks
        },
        null,
        2
      ) + '\n'
    );
    console.log('PASS ' + theme + ' native UI roles');
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
