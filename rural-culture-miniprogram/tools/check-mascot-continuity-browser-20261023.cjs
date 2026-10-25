'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const { createCanvas, loadImage } =
  require('./lib/project-tools.cjs').dependency('@napi-rs/canvas');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/mascot-continuity-20261023');
fs.mkdirSync(out, { recursive: true });

async function colors(buffer) {
  const im = await loadImage(buffer),
    c = createCanvas(im.width, im.height),
    ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0);
  const a = ctx.getImageData(0, 0, im.width, im.height).data;
  let white = 0,
    black = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.min(a[i], a[i + 1], a[i + 2]) > 220) white++;
    if (Math.max(a[i], a[i + 1], a[i + 2]) < 50) black++;
  }
  return { white, black, pixels: im.width * im.height };
}
(async () => {
  const b = await chromium.launch({
      headless: true,
      channel: process.env.RURAL_BROWSER_CHANNEL || undefined
    }),
    checks = [],
    errors = [];
  try {
    const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(
      require('./lib/project-tools.cjs').reviewBase() +
        '/preview/v4.html?continuity=20261023#/pages/game/index?theme=ecology&review=1&controls=0&scenario=home'
    );
    await page.waitForFunction(() => window._nativePreview?.page.data.loading === false);
    for (const pose of [
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
    ]) {
      await page.evaluate((pose) => {
        const p = window._nativePreview.page;
        p.setData({ ruleLevel: p.data.levels[0], rulePose: pose });
        p.showModal('rules');
        p._motion.hide();
      }, pose);
      await page.waitForFunction(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth)
      );
      const actor = page.locator('.modal-actor'),
        clip = await actor.boundingBox();
      assert(clip);
      const pixels = () => page.screenshot({ clip, animations: 'allow' }).then(colors),
        base = await pixels();
      assert(base.white > 100);
      await actor.evaluate((e) => {
        e._body = e.querySelector('.map-motion-strip,.extension-base');
        e._src = e._body.src;
        e._body.style.filter = 'brightness(0)';
      });
      const black = await pixels();
      assert(black.black > base.black + 100, 'detector positive control');
      await actor.evaluate((e) => e._body.style.removeProperty('filter'));
      for (let cycle = 1; cycle <= 8; cycle++)
        for (const playing of [true, false]) {
          await page.evaluate(
            ({ cycle, playing }) =>
              window._nativePreview.page.setData({
                motion: {
                  playingId: playing ? 'modal-rules' : '',
                  respondingId: playing && cycle % 2 ? 'modal-rules' : '',
                  sequence: cycle,
                  touchSequence: cycle
                }
              }),
            { cycle, playing }
          );
          for (const time of playing ? [0, 700, 2800] : [0]) {
            const continuous = await actor.evaluate((e, time) => {
              for (const a of e.getAnimations({ subtree: true })) {
                a.pause();
                a.currentTime = time;
              }
              const body = e.querySelector('.map-motion-strip,.extension-base'),
                s = getComputedStyle(body);
              return (
                body === e._body &&
                body.src === e._src &&
                Number(s.opacity) === 1 &&
                !e.querySelector('canvas,.extension-still,.gesture-original')
              );
            }, time);
            const v = await pixels(),
              ok =
                continuous &&
                v.white > base.white * 0.6 &&
                v.black < base.black + base.pixels * 0.15;
            checks.push({ pose, cycle, playing, time, continuous, ok, ...v });
            if (!ok) {
              await page.screenshot({ path: path.join(out, pose + '-failure.png') });
              throw Error(JSON.stringify(checks.at(-1)));
            }
          }
        }
      await page.screenshot({ path: path.join(out, 'browser-' + pose + '.png') });
      console.log(
        JSON.stringify({ pose, checks: checks.filter((c) => c.pose === pose).length, passed: true })
      );
    }
  } finally {
    await b.close();
    fs.writeFileSync(
      path.join(out, 'browser-checks.json'),
      JSON.stringify(
        {
          passed: checks.length === 320 && checks.every((c) => c.ok) && !errors.length,
          scope:
            'All ten actual component poses in dialog; idle/play/replay/touch and end samples use stable body node/src and screenshot white/black pixel checks, with dark-body positive control. Headless Chrome; not native compositor or physical-phone video.',
          checks,
          errors
        },
        null,
        2
      ) + '\n'
    );
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
