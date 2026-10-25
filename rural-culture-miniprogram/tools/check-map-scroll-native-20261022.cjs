'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'),
  project = require('./lib/project-tools.cjs').reviewProject(),
  out = path.join(root, 'qa/mascot-scroll-20261022');
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
  for (const [theme, stage] of [
    ['red', 1],
    ['culture', 1],
    ['industry', 1],
    ['ecology', 1],
    ['ecology', 2],
    ['ecology', 3],
    ['ecology', 4]
  ]) {
    await call('automation_navigate', [
      '--action',
      'reLaunch',
      '--url',
      `/pages/game/index?theme=${theme}&review=1&controls=0&scenario=${stage === 1 ? 'home' : 'chapter-' + stage}`
    ]);
    const start = await evaluate(
      `async function(){const p=getCurrentPages().slice(-1)[0];if(p.data.route!=='home')p.go('home');await new Promise(r=>setTimeout(r,450));const id=p.data.journey.guideId,c=p.selectComponent('#map-actor-'+id);if(typeof p.onMapTouchStart!=='function')throw Error('stale source');p.onMapTouchStart();await new Promise(r=>setTimeout(r,70));p._scrollQaSamples=[];p._scrollQaTop=p.data.mapScrollTop;const max=p.data.journey.maxScroll,other=p._scrollQaTop<max/2?Math.min(max,p._scrollQaTop+45):Math.max(0,p._scrollQaTop-45);for(let i=0;i<40;i++){const top=i%2?p._scrollQaTop:other;p.setData({mapScrollTop:top});p.onMapScroll({detail:{scrollTop:top}});await new Promise(r=>setTimeout(r,30));p._scrollQaSamples.push({playing:p.data.motion.playingId,componentPlaying:c.data.playing,animator:c._animator?c._animator.state():null});}return {theme:p.data.skin.gameId,pose:c.data.pose,scrollSafe:c.data.scrollSafe,nativeCanvas:!!c._animator,initialPlaying:c.data.playing};}`
    );
    const screenshot = `native-${theme}-${stage}-scrolling.png`;
    await call('simulator_screenshot', [
      '--path',
      path.join(out, screenshot),
      '--optimize',
      'false'
    ]);
    const finish = await evaluate(
      `async function(){const p=getCurrentPages().slice(-1)[0],id=p.data.journey.guideId,c=p.selectComponent('#map-actor-'+id);const samples=JSON.parse(JSON.stringify(p._scrollQaSamples));p.setData({mapScrollTop:p._scrollQaTop});p.onMapScroll({detail:{scrollTop:p._scrollQaTop}});p.onMapTouchEnd();await new Promise(r=>setTimeout(r,450));const resumed=c.data.playing&&!c._animator;p.mascotTap({currentTarget:{dataset:{id}}});await new Promise(r=>setTimeout(r,70));const responds=c.data.responding;return {samples,resumed,responds};}`
    );
    const c = {
      theme,
      stage,
      ...start,
      frames: finish.samples.length,
      scrollCanvasStopped: finish.samples.every(
        (s) => !s.playing && !s.componentPlaying && !s.animator
      ),
      resumed: finish.resumed,
      tapWorks: finish.responds,
      screenshot
    };
    c.passed =
      c.frames >= 10 &&
      c.scrollSafe &&
      !c.nativeCanvas &&
      !c.initialPlaying &&
      c.scrollCanvasStopped &&
      c.resumed &&
      c.tapWorks;
    checks.push(c);
    fs.writeFileSync(
      path.join(out, 'native-checks.json'),
      JSON.stringify(
        {
          passed: checks.length === 7 && checks.every((c) => c.passed),
          scope:
            'Current WeChat isolated renderer: 40 alternating scroll positions sampled at 30ms and subsequent screenshots while finger remains held; component property and animator lifecycle samples, inertia settle and tap. No native RGBA clone or physical phone claim.',
          checks
        },
        null,
        2
      ) + '\n'
    );
    console.log(JSON.stringify(c));
    assert(c.passed, JSON.stringify(c));
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
