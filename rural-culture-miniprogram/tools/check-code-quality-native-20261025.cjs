'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict'),
  { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const project = path.resolve(
  process.argv[2] || path.join(root, '../.rural-quiz-runtime/art-refinement-review-20261022')
);
const out = path.resolve(process.argv[3] || path.join(root, 'qa/code-quality-20261025'));
fs.mkdirSync(out, { recursive: true });
async function call(tool, args = []) {
  return new Promise((resolve, reject) => {
    const p = spawn('/usr/local/bin/wechatide', [
      '-c',
      'Codex',
      tool,
      '--project',
      project,
      ...args
    ]);
    let s = '';
    p.stdout.on('data', (b) => (s += b));
    p.stderr.on('data', (b) => (s += b));
    const timer = setTimeout(() => {
      p.kill();
      reject(Error(tool + ' timeout'));
    }, 45000);
    p.on('close', (code) => {
      clearTimeout(timer);
      let r;
      try {
        r = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
      } catch {
        return reject(Error(s.slice(0, 600)));
      }
      if (code || !r.ok || r.result?.success === false) return reject(Error(s.slice(0, 600)));
      resolve(r.result);
    });
  });
}
async function evaluate(fn) {
  let r = await call('automation_evaluate', ['--fn-source', fn]);
  for (let i = 0; i < 6 && r?.result !== undefined; i++) r = r.result;
  return r;
}
(async () => {
  const checks = [];
  try {
    await call('close_project_window');
  } catch (e) {
    if (!String(e.message).includes('CLOSE_PROJECT_WINDOW_FAILED')) throw e;
  }
  await call('open_project_window', ['--window-mode', 'liteMode']);
  await call('simulator_screenshot', [
    '--path',
    path.join(out, 'native-ready.png'),
    '--optimize',
    'false'
  ]);
  for (const theme of ['red', 'culture', 'industry', 'ecology'])
    for (const scene of ['home', 'quiz', 'certificate', 'certificate-failure']) {
      await call('automation_navigate', [
        '--action',
        'reLaunch',
        '--url',
        `/pages/game/index?theme=${theme}&review=1&controls=0&scenario=${scene}`
      ]);
      const d = await evaluate(
        `async function(){const p=getCurrentPages().slice(-1)[0];await new Promise(r=>setTimeout(r,220));if(p.data.route==='certificate'&&p.data.certificate&&!p._certificateReviewState)await p.prepareCertificate();const selectors=['.game-device','.panel-body','.panel-footer','#footer-primary','.route-caption','.route-base','.certificate-preview'],q=wx.createSelectorQuery();selectors.forEach(s=>q.selectAll(s).boundingClientRect());const rows=await new Promise(r=>q.exec(r));const info=p.data.certificateImage?await new Promise((resolve,reject)=>wx.getImageInfo({src:p.data.certificateImage,success:r=>resolve({width:r.width,height:r.height}),fail:reject})):null;return {theme:p.data.skin.gameId,route:p.data.route,error:p.data.error,certificateError:p.data.certificateImageError,footerAction:p.data.footerAction,info,rect:Object.fromEntries(selectors.map((s,i)=>[s,rows[i]]))};}`
      );
      assert.equal(d.theme, theme);
      assert.equal(d.error, '');
      assert.equal(d.route, scene.startsWith('certificate') ? 'certificate' : scene);
      assert(d.rect['.game-device'][0]);
      for (const r of d.rect['#footer-primary']) assert(r.height >= 44);
      if (scene === 'certificate') {
        assert.deepEqual(d.info, { width: 900, height: 1280 });
        assert(d.rect['.certificate-preview'][0]);
      }
      let recovery;
      if (scene === 'certificate-failure') {
        assert(d.certificateError);
        assert.equal(d.footerAction, 'retry-certificate');
        recovery = await evaluate(
          `async function(){const p=getCurrentPages().slice(-1)[0],before=JSON.stringify(p.data.certificate);await p.action({currentTarget:{dataset:{action:'retry-certificate'}}});return {ready:!!p.data.certificateImage,unchanged:JSON.stringify(p.data.certificate)===before};}`
        );
        assert(recovery.ready && recovery.unchanged);
      }
      const screenshot = `native-${theme}-${scene}.png`;
      await call('simulator_screenshot', [
        '--path',
        path.join(out, screenshot),
        '--optimize',
        'false'
      ]);
      checks.push({ ...d, scene, recovery, screenshot, passed: true });
      fs.writeFileSync(
        path.join(out, 'native-checks.json'),
        JSON.stringify(
          {
            passed: checks.length === 16,
            scope:
              'Current WeChat isolated review renderer, four-theme home/quiz/certificate/regeneration. Memory fixtures only; no phone, deployed backend, album or delivered share acceptance.',
            checks
          },
          null,
          2
        )
      );
      console.log('PASS', theme, scene);
    }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
