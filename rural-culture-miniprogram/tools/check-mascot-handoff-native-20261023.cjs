'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/mascot-flash-20261023');
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
    console.log(name + ' compile');
    await call(project, 'simulator_open_page', ['--page', 'pages/game/index']);
    await call(project, 'simulator_screenshot', [
      '--path',
      path.join(out, 'warm-' + theme + '.png'),
      '--optimize',
      'false',
      '--wait',
      '1'
    ]);
    console.log(name + ' setup');
    await evaluate(
      project,
      `async function(){
  const p=getCurrentPages().slice(-1)[0],wait=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<30&&p.data.loading;i++)await wait(100);if(p.data.error||p.data.loading)throw Error('page not ready');p.go('home');p.setData({ruleLevel:p.data.levels[0],rulePose:'welcome'});p.showModal('rules');await wait(350);
  const c=p.selectComponent('#modal-rules-actor');if(!c||!c._animator||!c._handoffToken)throw Error('patched component not loaded');
  p._flashStartSequence=p.data.motion.sequence;p._flashStartToken=Number(c._handoffToken);
  await wait(2000);return {ready:true};
 }`
    );
    console.log(name + ' manual');
    await evaluate(
      project,
      `async function(){const p=getCurrentPages().slice(-1)[0];p._motion.react('modal-rules');await new Promise(r=>setTimeout(r,1800));return {manualFinished:true};}`
    );
    // Keep each RPC below the automator response deadline while allowing the real
    // 8-second automatic replay to run. Never await a native Page's reserved _ready.
    for (let i = 0; i < 3; i++)
      await evaluate(
        project,
        `async function(){await new Promise(r=>setTimeout(r,3000));return {sampled:true};}`
      );
    console.log(name + ' inspect');
    const result = await evaluate(
      project,
      `async function(){
  const p=getCurrentPages().slice(-1)[0],c=p.selectComponent('#modal-rules-actor');p._motion.update({enabled:false});await new Promise(r=>setTimeout(r,150));
  const state=c._animator.state();return JSON.parse(JSON.stringify({theme:p.data.skin.gameId,modal:p.data.modal,patched:Boolean(c._handoffToken),handoffToken:Number(c._handoffToken),startToken:p._flashStartToken,canvasReady:Boolean(c.data.canvasReady),playing:Boolean(c.data.playing),animator:state,sequence:p.data.motion.sequence,replays:p.data.motion.sequence-p._flashStartSequence}));
 }`
    );
    result.name = name;
    result.passed =
      result.theme === theme &&
      result.modal === 'rules' &&
      result.patched &&
      result.handoffToken > result.startToken &&
      result.canvasReady &&
      !result.playing &&
      typeof result.animator.active === 'boolean' &&
      !result.animator.active &&
      !result.animator.framePending &&
      result.replays >= 2;
    result.screenshot = 'native-' + theme + '-rules-after.png';
    await call(project, 'simulator_screenshot', [
      '--path',
      path.join(out, result.screenshot),
      '--optimize',
      'false'
    ]);
    await evaluate(
      project,
      `function(){const p=getCurrentPages().slice(-1)[0];delete p._flashStartSequence;delete p._flashStartToken;p.syncMotion();return {restored:true};}`
    );
    checks.push(result);
    fs.writeFileSync(
      path.join(out, 'native-handoff-checks.json'),
      JSON.stringify(
        {
          passed: checks.length === 4 && checks.every((c) => c.passed),
          scope:
            'Current four independent WeChat simulator projects. Patched component loaded, initial idle, manual gesture and subsequent natural 8-second replay; handoff tokens advance and stopped animator has no pending frame. Simulator snapshots and logical renderer-state checks only. View-commit ordering is covered by the pixel regression test, not by native continuous compositor recording or physical-phone acceptance.',
          checks
        },
        null,
        2
      ) + '\n'
    );
    console.log(JSON.stringify(result));
    assert(result.passed, JSON.stringify(result));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
