'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  project = require('./lib/project-tools.cjs').reviewProject(),
  out = path.join(root, 'qa/certificate-flow-20261023');
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
  const partial = process.argv.includes('--states-only'),
    checks = partial
      ? JSON.parse(fs.readFileSync(path.join(out, 'native-checks.json'))).checks
      : [];
  await call('close_project_window');
  await call('open_project_window', ['--window-mode', 'liteMode']);
  await call('simulator_screenshot', [
    '--path',
    path.join(out, 'native-ready.png'),
    '--optimize',
    'false'
  ]);
  const cases = ['red', 'culture', 'industry', 'ecology'].flatMap((theme) =>
    ['certificate', 'certificate-failure', 'certificate-permission', 'certificate-share'].map(
      (scene) => [theme, scene]
    )
  );
  for (const scene of [
    'certificate-loading',
    'certificate-saved',
    'certificate-empty',
    'save-failure'
  ])
    cases.push(['ecology', scene]);
  for (const [theme, scene] of cases.filter(
    ([theme, scene]) => !partial || ['certificate-failure', 'certificate-loading'].includes(scene)
  )) {
    await call('automation_navigate', [
      '--action',
      'reLaunch',
      '--url',
      `/pages/game/index?theme=${theme}&review=1&controls=0&scenario=${scene}`
    ]);
    const d = await evaluate(
      `async function(){const p=getCurrentPages().slice(-1)[0];if(!p._certificateReviewState&&p.data.certificate)await p.prepareCertificate();await new Promise(r=>setTimeout(r,150));const selectors=['.game-device','.section-bar','.panel-body','.panel-footer','.certificate-preview','.certificate-placeholder','.certificate-save-feedback','.records-state','.modal-mask','.theme-modal','.modal-topbar','.modal-actions','#footer-primary','#footer-secondary','#modal-primary','#modal-secondary','#certificate-share-button'],q=wx.createSelectorQuery();selectors.forEach(s=>q.selectAll(s).boundingClientRect());const rows=await new Promise(r=>q.exec(r));const info=p.data.certificateImage?await new Promise((resolve,reject)=>wx.getImageInfo({src:p.data.certificateImage,success:r=>resolve({width:r.width,height:r.height}),fail:reject})):null;return {theme:p.data.skin.gameId,route:p.data.route,loading:p.data.certificateImageLoading,error:p.data.certificateImageError,footerDisabled:p.data.footerDisabled,footerAction:p.data.footerAction,modal:p.data.modal,globalError:p.data.error,share:p.onShareAppMessage(),info,rect:Object.fromEntries(selectors.map((s,i)=>[s,rows[i]]))};}`
    );
    assert.equal(d.theme, theme);
    assert.equal(d.route, 'certificate');
    assert.equal(d.globalError, '');
    const r = d.rect,
      dev = r['.game-device'][0],
      footer = r['.panel-footer'][0];
    assert(r['.section-bar'].length === 1);
    for (const selector of [
      '.certificate-preview',
      '.certificate-placeholder',
      '.records-state',
      '.theme-modal'
    ])
      for (const b of r[selector])
        assert(b.left >= dev.left - 0.5 && b.right <= dev.right + 0.5, selector + ' within device');
    if (footer) {
      assert(footer.bottom <= dev.bottom - 30);
      assert(r['#footer-primary'][0].height >= 44);
      assert(r['#footer-secondary'][0].height >= 44);
    }
    if (d.info) {
      assert.equal(d.info.width, 900);
      assert.equal(d.info.height, 1280);
      const im = r['.certificate-preview'][0];
      assert(Math.abs(im.height / im.width - d.info.height / d.info.width) < 0.02);
    }
    if (scene === 'certificate-loading') assert(d.loading && d.footerDisabled);
    if (scene === 'certificate-failure') assert(d.error && d.footerAction === 'retry-certificate');
    if (scene === 'certificate-share') {
      assert.equal(d.share.path, `/pages/game/index?theme=${theme}&route=certificate`);
      assert(r['#certificate-share-button'][0].height >= 44);
    }
    for (const selector of ['#modal-primary', '#modal-secondary'])
      for (const b of r[selector]) assert(b.height >= 44);
    const screenshot = theme + '-' + scene + '-native.png';
    await call('simulator_screenshot', [
      '--path',
      path.join(out, screenshot),
      '--optimize',
      'false'
    ]);
    let recovery;
    if (scene === 'certificate-failure')
      recovery = await evaluate(
        `async function(){const p=getCurrentPages().slice(-1)[0],before=JSON.stringify(p.data.certificate);await p.action({currentTarget:{dataset:{action:'retry-certificate'}}});return {ready:!!p.data.certificateImage,unchanged:JSON.stringify(p.data.certificate)===before};}`
      );
    if (scene === 'certificate-permission')
      recovery = await evaluate(
        `async function(){const p=getCurrentPages().slice(-1)[0],original=wx.openSetting;let opened=0;wx.openSetting=o=>{opened++;o.success({authSetting:{'scope.writePhotosAlbum':true}});o.complete();};try{await p.action({currentTarget:{dataset:{action:'album-settings'}}});return {ready:p.data.modal===''&&!p.data.busy,opened};}finally{wx.openSetting=original;}}`
      );
    if (scene === 'save-failure')
      recovery = await evaluate(
        `async function(){const p=getCurrentPages().slice(-1)[0],save=wx.saveImageToPhotosAlbum,setting=wx.getSetting;let saved='';wx.getSetting=o=>o.success({authSetting:{'scope.writePhotosAlbum':true}});wx.saveImageToPhotosAlbum=o=>{saved=o.filePath;o.success({});};try{await p.action({currentTarget:{dataset:{action:'save'}}});return {ready:p.data.modal===''&&!p.data.busy,matchingPNG:saved===p.data.certificateImage,message:p.data.certificateSaveMessage};}finally{wx.saveImageToPhotosAlbum=save;wx.getSetting=setting;}}`
      );
    if (recovery) {
      assert(recovery.ready);
      if (recovery.unchanged !== undefined) assert(recovery.unchanged);
      if (recovery.matchingPNG !== undefined) assert(recovery.matchingPNG);
    }
    const entry = { ...d, scene, screenshot, recovery, passed: true },
      index = checks.findIndex((c) => c.theme === theme && c.scene === scene);
    if (index < 0) checks.push(entry);
    else checks[index] = entry;
    fs.writeFileSync(
      path.join(out, 'native-checks.json'),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          passed: checks.length === 20,
          scope:
            'Actual WeChat rendering/canvas export, four-theme certificate states, regeneration, share payload and measured actions. Album/settings recovery use simulated callbacks, no physical-phone album write or delivered share.',
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
    '/pages/game/index?theme=ecology&review=1&controls=0&scenario=certificate'
  ]);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
