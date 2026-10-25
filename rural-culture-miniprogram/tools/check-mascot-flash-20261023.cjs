'use strict';
// Pixel checks of the real component template/styles, including replay boundaries.
// The headless preview is a diagnostic harness; user review stays in WeChat.
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const { createCanvas, loadImage } =
  require('./lib/project-tools.cjs').dependency('@napi-rs/canvas');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/mascot-flash-20261023');
fs.mkdirSync(out, { recursive: true });
async function pixels(buffer) {
  const im = await loadImage(buffer),
    c = createCanvas(im.width, im.height),
    ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0);
  const a = ctx.getImageData(0, 0, im.width, im.height).data;
  let white = 0,
    black = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] > 220 && a[i + 1] > 220 && a[i + 2] > 220) white++;
    if (a[i] < 45 && a[i + 1] < 45 && a[i + 2] < 45) black++;
  }
  return { white, black, pixels: im.width * im.height };
}
function intact(value, base) {
  return value.white > base.white * 0.65 && value.black < base.black + base.pixels * 0.15;
}
(async () => {
  const browser = await chromium.launch({
      headless: true,
      channel: process.env.RURAL_BROWSER_CHANNEL || undefined
    }),
    checks = [],
    errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2
    });
    page.on('pageerror', (e) => errors.push(e.message));
    for (const [stage, pose] of [
      [1, 'welcome'],
      [2, 'celebrate'],
      [3, 'observe'],
      [4, 'think']
    ]) {
      await page.goto(
        require('./lib/project-tools.cjs').reviewBase() +
          '/preview/v4.html?flash=20261023#/pages/game/index?theme=ecology&review=1&controls=0&scenario=' +
          (stage === 1 ? 'home' : 'chapter-' + stage)
      );
      await page.waitForFunction((stage) => {
        const d = window._nativePreview?.page.data;
        return (
          d &&
          !d.loading &&
          d.journey.nodes.length &&
          (stage === 1 || d.challenge?.levelId === 'ecology-' + stage)
        );
      }, stage);
      await page.evaluate(() => window._nativePreview.page.go('home'));
      await page.waitForFunction(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth)
      );
      await page.evaluate(() => {
        const p = window._nativePreview.page;
        p._motion.hide();
      });
      const actor = page.locator('.route-stop.current .chapter-mascot'),
        clip = await actor.boundingBox();
      assert(clip);
      async function shot() {
        return pixels(await page.screenshot({ clip, animations: 'allow' }));
      }
      const base = await shot();
      assert(base.white > 100, pose + ' white-body baseline');
      // Positive control: ensure this loop actually detects the reported black figure.
      await actor.evaluate((e) => {
        e.style.filter = 'brightness(0)';
      });
      assert(!intact(await shot(), base), 'black-frame detector must go red');
      await actor.evaluate((e) => e.style.removeProperty('filter'));
      for (let cycle = 1; cycle <= 24; cycle++) {
        const response = cycle % 3 === 0;
        await page.evaluate(
          ({ cycle, response }) => {
            const p = window._nativePreview.page,
              id = p.data.journey.guideId;
            p.setData({
              motion: {
                playingId: id,
                respondingId: response ? id : '',
                sequence: cycle,
                touchSequence: cycle
              }
            });
          },
          { cycle, response }
        );
        for (const time of cycle <= 2 ? [0, 50, 900, 1800, 2400] : [0, 2400]) {
          await actor.evaluate((e, time) => {
            for (const a of e.getAnimations({ subtree: true })) {
              a.pause();
              a.currentTime = time;
            }
          }, time);
          const v = await shot(),
            ok = intact(v, base);
          checks.push({ pose, cycle, response, time, ok, ...v });
          if (!ok) {
            await page.screenshot({ path: path.join(out, pose + '-failure.png') });
            throw Error(JSON.stringify(checks.at(-1)));
          }
        }
        await page.evaluate(() => {
          const p = window._nativePreview.page;
          p.setData({ motion: { ...p.data.motion, playingId: '', respondingId: '' } });
        });
        const v = await shot();
        checks.push({ pose, cycle, time: 'stopped', ok: intact(v, base), ...v });
        assert(checks.at(-1).ok, JSON.stringify(checks.at(-1)));
      }
      console.log(
        JSON.stringify({
          pose,
          cycles: 24,
          pixelChecks: checks.filter((c) => c.pose === pose).length,
          passed: true
        })
      );
    }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(out, 'browser-pixel-checks.json'),
      JSON.stringify(
        {
          passed: checks.length === 312 && checks.every((c) => c.ok) && !errors.length,
          scope:
            'Actual component template/styles in headless Chrome. Original white body and dark-pixel checks over four seasonal poses, idle/touch/stop/replay boundaries. Black-frame positive control. This does not prove native compositor or physical-phone behavior.',
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
