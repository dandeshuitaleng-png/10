'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, process.env.MAP_SCROLL_QA || 'qa/mascot-scroll-20261022');
fs.mkdirSync(out, { recursive: true });
async function probe() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms)),
    frame = () => new Promise((r) => requestAnimationFrame(r)),
    p = window._nativePreview.page;
  if (p.data.route !== 'home') p.go('home');
  await wait(350);
  const panel = document.querySelector('scroll-view.panel-body'),
    button =
      document.querySelector('.route-stop.current .chapter-mascot') ||
      document.querySelector('.route-stop.today-locked .chapter-mascot');
  if (!button) throw Error('No current actor');
  const actor = button.querySelector('.actor-original'),
    strip = button.querySelector('.map-motion-strip'),
    base = button.closest('.route-stop');
  if (!strip || button.querySelector('canvas') || button.querySelector('.gesture-original'))
    throw Error('Map must have one image strip and no second body/canvas');
  await wait(50);
  const top = panel.scrollTop,
    max = panel.scrollHeight - panel.clientHeight,
    other = top < max / 2 ? Math.min(max, top + 45) : Math.max(0, top - 45),
    anchor = button.getBoundingClientRect().top - base.getBoundingClientRect().top;
  const check = {
    theme: p.data.skin.gameId,
    pose: actor.dataset.pose,
    width: innerWidth,
    height: innerHeight,
    frames: 0,
    maxAnchorError: 0,
    scrollMin: Infinity,
    scrollMax: 0,
    violations: []
  };
  button.click();
  await frame();
  for (let i = 0; i < 40; i++) {
    panel.scrollTop = i % 2 ? top : other;
    await frame();
    const anchorError = Math.abs(
      button.getBoundingClientRect().top - base.getBoundingClientRect().top - anchor
    );
    check.maxAnchorError = Math.max(check.maxAnchorError, anchorError);
    check.scrollMin = Math.min(check.scrollMin, panel.scrollTop);
    check.scrollMax = Math.max(check.scrollMax, panel.scrollTop);
    check.frames++;
    if (p.data.motion.playingId || getComputedStyle(strip).animationName !== 'none')
      check.violations.push({ frame: i, error: 'moving strip must pause' });
    if (
      button.querySelectorAll('.map-motion-strip').length !== 1 ||
      button.querySelector('canvas') ||
      button.querySelector('.gesture-original')
    )
      check.violations.push({ frame: i, error: 'duplicate full-body layer' });
  }
  panel.scrollTop = top;
  await wait(300);
  check.resumed =
    actor.classList.contains('is-playing') &&
    getComputedStyle(strip).animationName.startsWith('map-frames-');
  check.passed =
    !check.violations.length &&
    check.maxAnchorError < 0.5 &&
    check.scrollMax - check.scrollMin > 10 &&
    check.resumed;
  return check;
}
(async () => {
  const b = await chromium.launch({
      headless: true,
      channel: process.env.RURAL_BROWSER_CHANNEL || undefined
    }),
    checks = [],
    errors = [];
  let revision = 0;
  try {
    for (const theme of ['red', 'culture', 'industry', 'ecology'])
      for (const stage of [1, 2, 3, 4]) {
        const context = await b.newContext({
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 2
          }),
          page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(
          `${require('./lib/project-tools.cjs').reviewBase()}/preview/v4.html?scroll=20261022-${++revision}#/pages/game/index?theme=${theme}&review=1&controls=0&scenario=${stage === 1 ? 'home' : 'chapter-' + stage}`
        );
        await page.waitForFunction(
          ({ theme, stage }) => {
            const d = window._nativePreview?.page.data;
            return (
              d &&
              !d.loading &&
              d.skin.gameId === theme &&
              d.journey.nodes.length &&
              (stage === 1 || d.challenge?.levelId === theme + '-' + stage)
            );
          },
          { theme, stage }
        );
        const c = await page.evaluate(probe);
        checks.push(c);
        console.log(
          JSON.stringify({
            theme,
            stage,
            passed: c.passed,
            violations: c.violations.length,
            resumed: c.resumed
          })
        );
        assert(c.passed, JSON.stringify(c));
        // A real pointer click bubbles through the new touchstart/end bindings.
        const actor = page.locator('.route-stop.current .chapter-mascot');
        await actor.click();
        await page.waitForFunction(() => !!window._nativePreview.page.data.motion.respondingId);
        c.trustedTapWorks = true;
        if (theme === 'ecology' && stage === 1)
          await page.screenshot({ path: path.join(out, 'browser-after.png') });
        await context.close();
      }
  } finally {
    await b.close();
    fs.writeFileSync(
      path.join(out, 'browser-checks.json'),
      JSON.stringify(
        {
          passed: checks.length === 16 && checks.every((c) => c.passed) && !errors.length,
          scope:
            'Current actual DOM scroll events and same-layer image strips (zero map canvases): 4 themes x 4 seasonal actors, 40 direction reversals each; single body layer exclusivity, anchor, settle resume and trusted pointer tap. Not a physical phone/compositor recording.',
          checks,
          errors
        },
        null,
        2
      ) + '\n'
    );
  }
  assert.equal(errors.length, 0);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
