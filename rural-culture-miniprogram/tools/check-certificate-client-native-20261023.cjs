'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/certificate-client-20261023');
fs.mkdirSync(out, { recursive: true });

fs.mkdirSync(path.join(out, 'artwork'), { recursive: true });
async function call(project, tool, args = []) {
  return require('./lib/project-tools.cjs').nativeCall({ project, tool, args });
}
async function evaluate(project, fn) {
  let r = await call(project, 'automation_evaluate', ['--fn-source', fn]);
  for (let i = 0; i < 6 && r?.result !== undefined; i++) r = r.result;
  return r;
}
async function artwork(project, theme) {
  const info = await evaluate(
    project,
    'function(){const p=getCurrentPages().slice(-1)[0];return {length:wx.getFileSystemManager().readFileSync(p.data.certificateImage,"base64").length};}'
  );
  let encoded = '';
  for (let offset = 0; offset < info.length; offset += 30000) {
    const part = await evaluate(
      project,
      `function(){const p=getCurrentPages().slice(-1)[0];return {chunk:wx.getFileSystemManager().readFileSync(p.data.certificateImage,'base64').slice(${offset},${offset + 30000})};}`
    );
    encoded += part.chunk;
  }
  assert.equal(encoded.length, info.length);
  const b = Buffer.from(encoded, 'base64');
  assert.equal(b.slice(1, 4).toString(), 'PNG');
  fs.writeFileSync(path.join(out, 'artwork', theme + '-certificate.png'), b);
  return {
    file: 'artwork/' + theme + '-certificate.png',
    bytes: b.length,
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20)
  };
}
(async () => {
  const checks = [];
  for (const [theme, name, award] of [
    ['red', '十步芳草', '知识达人'],
    ['culture', '千年文脉', '知识达人'],
    ['industry', '金色产业', '知识达人'],
    ['ecology', '青山绿水', '知识达人']
  ]) {
    const project = require('./lib/project-tools.cjs').reviewProject(theme);
    await call(project, 'open_project_window', ['--window-mode', 'liteMode']);
    await call(project, 'simulator_open_page', ['--page', 'pages/game/index']);
    await call(project, 'simulator_screenshot', [
      '--path',
      path.join(out, 'warm-' + theme + '.png'),
      '--optimize',
      'false',
      '--wait',
      '1'
    ]);
    const d = await evaluate(
      project,
      `async function(){const p=getCurrentPages().slice(-1)[0],s=require('services-v4/index.js'),art=require('services-v4/certificate-art.js');if(p.data.loading||p.data.error)throw Error('page not ready');if(p._motion)p._motion.hide();s.activate(Object.assign({},p.data.skin,{mode:'mock',reviewEnabled:true}));await s.scenario('all-complete');p._review=true;p.setData({review:true,reviewControls:false,route:'home',modal:'',error:'',busy:false,soundSettingsOpen:false});p.go('certificate');await p.prepareCertificate();await new Promise(r=>setTimeout(r,200));const model=art.model(p.data.certificate,p.data.skin),q=wx.createSelectorQuery();q.select('.certificate-preview').boundingClientRect();q.select('.panel-body').boundingClientRect();q.select('#footer-primary').boundingClientRect();const rect=await new Promise(r=>q.exec(r));return {theme:p.data.skin.gameId,name:p.data.certificate.name,model,progress:p.data.snapshot.progress,points:p.data.snapshot.points,route:p.data.route,error:p.data.error||p.data.certificateImageError,ratio:p.data.certificateImageRatio,rect};}`
    );
    assert.equal(d.theme, theme);
    assert.equal(d.name, award);
    assert.equal(d.model.award, award);
    assert.equal(d.model.description, '您在' + name + '学习中，\n认真探索，积累知识。');
    assert(!Object.hasOwn(d.model, 'scopeLine'));
    assert(!d.error);
    assert.equal(d.progress.completed, 4);
    assert.equal(d.points, 75);
    assert(
      d.rect[0].width > 200 &&
        d.rect[0].left >= d.rect[1].left &&
        d.rect[0].right <= d.rect[1].right
    );
    assert(d.rect[2].height >= 44);
    await call(project, 'simulator_screenshot', [
      '--path',
      path.join(out, theme + '-certificate-native.png'),
      '--optimize',
      'false',
      '--wait',
      '1'
    ]);
    d.artwork = await artwork(project, theme);
    assert.equal(d.artwork.width, 900);
    assert.equal(d.artwork.height, 1280);
    assert(Math.abs(d.rect[0].height / d.rect[0].width - 1280 / 900) < 0.025);
    await call(project, 'automation_element_action', [
      '--action',
      'scrollTo',
      '--selector',
      '.panel-body',
      '--x',
      '0',
      '--y',
      '9999'
    ]);
    await call(project, 'simulator_screenshot', [
      '--path',
      path.join(out, theme + '-certificate-bottom-native.png'),
      '--optimize',
      'false',
      '--wait',
      '1'
    ]);
    await call(project, 'automation_element_action', [
      '--action',
      'scrollTo',
      '--selector',
      '.panel-body',
      '--x',
      '0',
      '--y',
      '0'
    ]);
    checks.push({ ...d, passed: true });
    fs.writeFileSync(
      path.join(out, 'native-checks.json'),
      JSON.stringify(
        {
          passed: checks.length === 4,
          scope:
            'Four standalone WeChat simulators; real 900x1280 Canvas PNG export, common approved knowledge honor, brief copy and user-name field; all-complete in-memory review, no remote player record mutation or physical phone album write.',
          checks
        },
        null,
        2
      ) + '\n'
    );
    console.log(JSON.stringify({ theme, award, passed: true, artworkBytes: d.artwork.bytes }));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
