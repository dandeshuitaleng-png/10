'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  project = require('./lib/project-tools.cjs').reviewProject(),
  out = path.join(root, 'qa/records-ui-20261022');
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
  await call('close_project_window');
  await call('open_project_window', ['--window-mode', 'liteMode']);
  await call('simulator_screenshot', [
    '--path',
    path.join(out, 'native-ready.png'),
    '--optimize',
    'false'
  ]);
  const cases = ['red', 'culture', 'industry', 'ecology'].flatMap((theme) =>
    ['ranking', 'points', 'points-failure'].map((scene) => [theme, scene])
  );
  for (const scene of [
    'ranking-empty',
    'ranking-loading',
    'points-empty',
    'certificate-empty',
    'ranking-failure'
  ])
    cases.push(['ecology', scene]);
  for (const [theme, scene] of cases) {
    await call('automation_navigate', [
      '--action',
      'reLaunch',
      '--url',
      `/pages/game/index?theme=${theme}&review=1&controls=0&scenario=${scene}`
    ]);
    const d = await evaluate(
      `async function(){const p=getCurrentPages().slice(-1)[0];await new Promise(r=>setTimeout(r,250));const selectors=['.game-device','.section-bar','.rank-table','.rank-row','.rank-number','.rank-score','.rank-name','.rank-col-reader','.rank-col-score','.my-rank','.record-row','.record-copy','.record-row .b','.records-state','.records-tabs .tab','#records-retry','.points-hero'],q=wx.createSelectorQuery();selectors.forEach(s=>q.selectAll(s).boundingClientRect());const rows=await new Promise(r=>q.exec(r));return {theme:p.data.skin.gameId,route:p.data.route,loading:p.data.recordsLoading,error:p.data.recordsError,globalError:p.data.error,rect:Object.fromEntries(selectors.map((s,i)=>[s,rows[i]]))};}`
    );
    assert.equal(d.theme, theme);
    assert.equal(d.globalError, '');
    const r = d.rect,
      cy = (b) => b.top + b.height / 2;
    assert(r['.section-bar'].length === 1, 'navigation retained');
    for (const s of ['.rank-table', '.my-rank', '.records-state', '.points-hero'])
      for (const b of r[s])
        assert(b.left >= r['.game-device'][0].left && b.right <= r['.game-device'][0].right);
    if (scene === 'ranking') {
      assert(r['.rank-row'].length >= 5);
      assert(r['.my-rank'][0].bottom < r['.rank-table'][0].top);
      r['.rank-row'].forEach((row, i) => {
        assert(row.height >= 68);
        assert(Math.abs(cy(row) - cy(r['.rank-number'][i])) < 1);
        assert(Math.abs(cy(row) - cy(r['.rank-score'][i])) < 1);
        assert(Math.abs(r['.rank-score'][i].right - r['.rank-col-score'][0].right) < 1);
        assert(Math.abs(r['.rank-name'][i].left - r['.rank-col-reader'][0].left) < 1);
      });
    }
    if (scene === 'points') {
      assert.equal(r['.record-row'].length, 2);
      r['.record-row'].forEach((row, i) => {
        assert(row.height >= 64);
        assert(Math.abs(cy(row) - cy(r['.record-row .b'][i])) < 1);
        assert(r['.record-copy'][i].right + 7 <= r['.record-row .b'][i].left);
      });
    }
    if (scene.endsWith('failure') || scene.endsWith('loading')) {
      assert.equal(r['.rank-table'].length + r['.record-row'].length + r['.points-hero'].length, 0);
      assert.equal(r['.records-state'].length, 1);
    }
    if (scene.endsWith('failure')) assert(r['#records-retry'][0].height >= 44);
    const screenshot = theme + '-' + scene + '-native.png';
    await call('simulator_screenshot', [
      '--path',
      path.join(out, screenshot),
      '--optimize',
      'false'
    ]);
    checks.push({ ...d, scene, screenshot, passed: true });
    fs.writeFileSync(
      path.join(out, 'native-checks.json'),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          passed: checks.length === 17,
          scope:
            'Actual WeChat renderer: four themes x ranking/ledger/failure plus ecology empty/loading/certificate states. Measured columns and actual screenshots; not physical phones.',
          checks
        },
        null,
        2
      ) + '\n'
    );
    console.log('PASS ' + theme + ' ' + scene + ' native');
  }
  await call('automation_navigate', [
    '--action',
    'reLaunch',
    '--url',
    '/pages/game/index?theme=ecology&review=1&controls=0&scenario=ranking'
  ]);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
