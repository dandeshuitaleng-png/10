'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  out = path.resolve(root, process.env.YX_QA_DIR || 'qa/winter-soft-motion-20261023');
fs.mkdirSync(out, { recursive: true });

async function call(project, tool, args = []) {
  return require('./lib/project-tools.cjs').nativeCall({ project, tool, args });
}
async function evaluate(project, fn) {
  let r = await call(project, 'automation_evaluate', ['--fn-source', fn]);
  for (let i = 0; i < 6 && r?.result !== undefined; i++) r = r.result;
  return r;
}
(async () => {
  const checks = [];
  for (const [name, theme] of [
    ['十步芳草', 'red'],
    ['千年文脉', 'culture'],
    ['金色产业', 'industry'],
    ['青山绿水', 'ecology']
  ]) {
    const project = require('./lib/project-tools.cjs').reviewProject(theme);
    await call(project, 'simulator_open_page', ['--page', 'pages/game/index']);
    await call(project, 'simulator_screenshot', [
      '--path',
      path.join(out, 'warm-' + theme + '.png'),
      '--optimize',
      'false',
      '--wait',
      '1'
    ]);
    const result = await evaluate(
      project,
      `async function(){const p=getCurrentPages().slice(-1)[0],s=require('services-v4/index.js');if(p.data.loading||p.data.error)throw Error('page not ready');if(p._motion)p._motion.hide();s.activate(Object.assign({},p.data.skin,{mode:'mock',reviewEnabled:true}));await s.scenario('all-complete');p._review=true;p.setData({review:true,reviewControls:false,route:'home',modal:'',error:'',busy:false,soundSettingsOpen:false});p.go('home');await new Promise(r=>setTimeout(r,300));return {theme:p.data.skin.gameId,progress:p.data.snapshot.progress,points:p.data.snapshot.points,certificates:p.data.certificates.length,nodes:p.data.journey.nodes.map(n=>({id:n.id,status:n.status,pose:n.pose,showMascot:n.showMascot,left:n.left,distance:n.distance,actorTop:n.actorTop,actorBottom:n.actorBottom})),review:p.data.configuration.reviewSession===true};}`
    );
    result.name = name;
    result.winter = await evaluate(
      project,
      `async function(){const p=getCurrentPages().slice(-1)[0],n=p.data.journey.nodes.find(n=>n.pose==='think'),c=p.selectComponent('#map-actor-'+n.id);if(!c)throw Error('winter component missing');p._motion.react(n.id);await new Promise(r=>setTimeout(r,80));return {id:n.id,pose:c.data.pose,playing:c.data.playing,responding:c.data.responding,hasCanvas:!!c._animator,gesture:c.data.rigs.think.gesture,frames:c.data.rigs.think.spriteFrames,duration:c.data.rigs.think.duration,bundleBase64Length:wx.getFileSystemManager().readFileSync('assets/brand/map-motion/think.png','base64').length,source:c.data.rigs.think.spriteSource};}`
    );
    assert.equal(result.winter.pose, 'think');
    assert(result.winter.playing && result.winter.responding);
    assert(!result.winter.hasCanvas);
    assert.deepEqual(result.winter.gesture.box, [92, 362, 164, 240]);
    assert.equal(result.winter.gesture.angles[0], -10.5);
    assert.equal(result.winter.frames, 32);
    assert.equal(result.winter.duration, 2000);
    assert.equal(result.winter.bundleBase64Length, 60748);
    result.screenshot = theme + '-native-after.png';
    await call(project, 'simulator_screenshot', [
      '--path',
      path.join(out, result.screenshot),
      '--optimize',
      'false',
      '--wait',
      '1'
    ]);
    result.passed =
      result.theme === theme &&
      result.progress.completed === result.progress.total &&
      result.points === 75 &&
      result.certificates === 1 &&
      result.nodes.every((n) => n.status === 'completed' && n.showMascot);
    checks.push(result);
    fs.writeFileSync(
      path.join(out, 'native-checks.json'),
      JSON.stringify(
        {
          passed: checks.length === 4 && checks.every((c) => c.passed),
          scope:
            'Four existing standalone WeChat simulators, winter 32-frame soft candy/hand motion using persistent image strips, with fixed feet, snowman and existing map geometry, all-complete in-memory review sessions. No remote player records changed; no physical phone acceptance.',
          checks
        },
        null,
        2
      ) + '\n'
    );
    assert(result.passed);
    console.log(JSON.stringify({ theme, passed: result.passed }));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
