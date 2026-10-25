'use strict';
// Uses an isolated review project; no award or player record is written.
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  project = require('./lib/project-tools.cjs').reviewProject(),
  out = path.join(root, 'qa/contract-local-20261025');
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
  try {
    await call('close_project_window');
  } catch (e) {
    if (!e.message.includes('CLOSE_PROJECT_WINDOW_FAILED')) throw e;
  }
  await call('open_project_window', ['--window-mode', 'liteMode']);
  await call('simulator_screenshot', [
    '--path',
    path.join(out, '原生就绪.png'),
    '--optimize',
    'false'
  ]);
  const checks = [];
  for (const [theme, title] of [
    ...['red', 'culture', 'industry', 'ecology'].map((t) => [t, '乡村阅读荣誉证书']),
    ['ecology', '乡村文化知识探索与阅读学习活动纪念荣誉证书']
  ]) {
    await call('automation_navigate', [
      '--action',
      'reLaunch',
      '--url',
      `/pages/game/index?theme=${theme}&review=1&controls=0&scenario=certificate`
    ]);
    const d = await evaluate(
      `async function(){const p=getCurrentPages().slice(-1)[0];p.setData({certificate:Object.assign({},p.data.certificate,{title:${JSON.stringify(title)}}),certificateImage:''});await p.prepareCertificate(true);await new Promise(r=>setTimeout(r,250));const q=wx.createSelectorQuery();q.select('.certificate-preview').boundingClientRect();const rect=await new Promise(r=>q.exec(r));const info=await new Promise((resolve,reject)=>wx.getImageInfo({src:p.data.certificateImage,success:r=>resolve({width:r.width,height:r.height}),fail:reject}));return {theme:p.data.skin.gameId,title:p.data.certificate.title,info,rect:rect[0],error:p.data.error||p.data.certificateImageError};}`
    );
    assert.equal(d.theme, theme);
    assert.equal(d.title, title);
    assert(!d.error);
    assert.equal(d.info.width, 900);
    assert(d.info.height >= 1280);
    assert(
      Math.abs(d.rect.height / d.rect.width - d.info.height / d.info.width) < 0.025,
      JSON.stringify(d)
    );
    const screenshot = theme + '-配置证书-' + (title.length > 12 ? '长标题' : '原生') + '.png';
    await call('simulator_screenshot', [
      '--path',
      path.join(out, screenshot),
      '--optimize',
      'false'
    ]);
    checks.push({ ...d, screenshot, passed: true });
    console.log('PASS ' + theme + ' configured title PNG generated');
  }
  fs.writeFileSync(
    path.join(out, '原生证书配置检查.json'),
    JSON.stringify(
      {
        passed: true,
        scope:
          'Actual WeChat simulator Canvas PNG export and layout. Isolated review fixture; configured title is assigned to an issued-object presentation fixture. No phone album or delivered-share proof.',
        checks
      },
      null,
      2
    ) + '\n'
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
