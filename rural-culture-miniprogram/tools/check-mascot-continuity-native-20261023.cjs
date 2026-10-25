'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/mascot-continuity-20261023');
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
  for (const [, theme, poses] of [
    [
      '十步芳草',
      'red',
      [
        'welcome',
        'celebrate',
        'observe',
        'think',
        'reader',
        'scholar',
        'heart',
        'lotus',
        'drummer',
        'skater'
      ]
    ],
    ['千年文脉', 'culture', ['celebrate']],
    ['金色产业', 'industry', ['observe']],
    ['青山绿水', 'ecology', ['think']]
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
    for (const pose of poses) {
      const sample = await evaluate(
        project,
        `async function(){const p=getCurrentPages().slice(-1)[0];if(p.data.loading||p.data.error)throw Error('page not ready');p.go('home');p.setData({ruleLevel:p.data.levels[0],rulePose:'${pose}'});p.showModal('rules');p._motion.hide();await new Promise(r=>setTimeout(r,180));const c=p.selectComponent('#modal-rules-actor');if(!c||c._animator||c.prepareCanvas)throw Error('stale native component');const samples=[];for(let i=0;i<24;i++){p.setData({motion:{playingId:i%2?'':'modal-rules',respondingId:i%4===0?'modal-rules':'',sequence:i+1,touchSequence:i+1}});await new Promise(r=>setTimeout(r,25));samples.push({pose:c.data.pose,canvas:!!c._animator});}p.setData({motion:{playingId:'modal-rules',respondingId:'modal-rules',sequence:25,touchSequence:25}});await new Promise(r=>setTimeout(r,300));return {theme:p.data.skin.gameId,pose:c.data.pose,componentHasCanvas:!!c._animator,source:c.data.rigs[c.data.pose].spriteSource||c.data.rigs[c.data.pose].baseSource,samples};}`
      );
      sample.activeScreenshot = `native-${theme}-${pose}-active.png`;
      await call(project, 'simulator_screenshot', [
        '--path',
        path.join(out, sample.activeScreenshot),
        '--optimize',
        'false'
      ]);
      await evaluate(
        project,
        `async function(){const p=getCurrentPages().slice(-1)[0];p.setData({motion:{...p.data.motion,playingId:'',respondingId:''}});await new Promise(r=>setTimeout(r,100));return {stopped:true};}`
      );
      sample.idleScreenshot = `native-${theme}-${pose}-idle.png`;
      await call(project, 'simulator_screenshot', [
        '--path',
        path.join(out, sample.idleScreenshot),
        '--optimize',
        'false'
      ]);
      sample.passed =
        sample.theme === theme &&
        sample.pose === pose &&
        !sample.componentHasCanvas &&
        sample.samples.length === 24 &&
        sample.samples.every((s) => s.pose === pose && !s.canvas);
      checks.push(sample);
      fs.writeFileSync(
        path.join(out, 'native-checks.json'),
        JSON.stringify(
          {
            passed: checks.length === 13 && checks.every((c) => c.passed),
            scope:
              'Actual four independent WeChat simulators, all ten supplied poses plus alternate seasonal poses in the other three themes. Rapid property transitions, no native canvas, active/idle screenshots. Samples do not claim continuous compositor or physical-phone recording.',
            checks
          },
          null,
          2
        ) + '\n'
      );
      console.log(JSON.stringify({ theme, pose, passed: sample.passed }));
      assert(sample.passed);
    }
    await evaluate(
      project,
      `function(){const p=getCurrentPages().slice(-1)[0];p.setData({rulePose:'welcome'});p.showModal('rules');return {restored:true};}`
    );
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
