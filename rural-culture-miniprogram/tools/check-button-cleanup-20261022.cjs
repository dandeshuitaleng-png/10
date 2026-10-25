'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/button-cleanup-20261022');
fs.mkdirSync(out, { recursive: true });
function inspect() {
  const e = document.querySelector('#footer-primary .game-button'),
    s = getComputedStyle(e),
    r = e.getBoundingClientRect();
  return {
    background: s.backgroundColor,
    image: s.backgroundImage,
    shadow: s.boxShadow,
    color: s.color,
    border: s.borderColor,
    width: r.width,
    height: r.height,
    label: e.innerText,
    icons: [...e.querySelectorAll('img')].map((i) => i.getAttribute('src'))
  };
}
(async () => {
  const browser = await chromium.launch({
      headless: true,
      channel: process.env.RURAL_BROWSER_CHANNEL || undefined
    }),
    checks = [],
    errors = [];
  let revision = 0;
  try {
    for (const theme of ['red', 'culture', 'industry', 'ecology'])
      for (const [width, height] of [
        [320, 568],
        [390, 844],
        [430, 932]
      ]) {
        const context = await browser.newContext({
            viewport: { width, height },
            deviceScaleFactor: 2
          }),
          page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(
          `${require('./lib/project-tools.cjs').reviewBase()}/preview/v4.html?button=${++revision}#/pages/game/index?theme=${theme}&review=1&controls=0&scenario=home`
        );
        await page.waitForFunction((theme) => {
          const d = window._nativePreview?.page.data;
          return d && !d.loading && d.skin.gameId === theme && d.snapshot.progress.total > 0;
        }, theme);
        await page.waitForTimeout(350);
        await page.waitForFunction(() =>
          [...document.images].every((i) => i.complete && i.naturalWidth > 0)
        );
        const before = await page.evaluate(inspect);
        assert(before.image.startsWith('linear-gradient('));
        assert.equal(before.shadow, 'none');
        assert.equal(before.height, 52);
        assert(before.width <= width);
        assert(before.icons.every((src) => !src.endsWith('-white.png')));
        if (width === 390) {
          await page
            .locator('#footer-primary .game-button')
            .screenshot({ path: path.join(out, theme + '-button.png') });
          await page.screenshot({ path: path.join(out, theme + '-home.png') });
        }
        const button = page.locator('#footer-primary .game-button');
        await button.hover();
        await page.mouse.down();
        await page.waitForTimeout(80);
        const pressed = await page.evaluate(inspect);
        assert(pressed.image.startsWith('linear-gradient('));
        assert.equal(pressed.shadow, 'none');
        await page.mouse.up();
        await page.waitForSelector('.modal-rules');
        await page.locator('#modal-primary .game-button').click();
        await page.waitForSelector('.options');
        await page.locator('.option').first().click();
        await page.waitForFunction(() => window._nativePreview.page.data.challenge.selected === 0);
        assert(await page.locator('#footer-primary button').isEnabled());
        checks.push({
          theme,
          width,
          passed: true,
          style: before,
          pressedShadow: pressed.shadow,
          startAndSelectionWork: true
        });
        await context.close();
      }
  } finally {
    await browser.close();
  }
  function luminance(rgb) {
    const v = rgb
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map((x) => Number(x) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  for (const c of checks) {
    const colors = c.style.image.match(/rgb\([^)]+\)/g);
    assert.equal(colors.length, 2);
    c.textContrast = Math.min(
      ...colors.map((bg) => {
        const x = [luminance(c.style.color), luminance(bg)].sort((a, b) => b - a);
        return Number(((x[0] + 0.05) / (x[1] + 0.05)).toFixed(2));
      })
    );
    assert(c.textContrast >= 4.5);
  }
  const report = {
    passed: checks.length === 12 && !errors.length,
    scope:
      'Soft same-hue light-gradient primary buttons without shadows at three browser sizes; actual press, start and option selection. Original native checks are rerun separately for affected states.',
    checks,
    errors
  };
  fs.writeFileSync(path.join(out, 'browser-checks.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: checks.length, errors }));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
