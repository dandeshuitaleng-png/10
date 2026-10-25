'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/icon-cards-20261022');
fs.mkdirSync(out, { recursive: true });
function measure() {
  const box = (e) => {
      const r = e.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        cx: r.x + r.width / 2,
        cy: r.y + r.height / 2
      };
    },
    one = (s) => box(document.querySelector(s));
  const hud = one('.activity-hud'),
    copy = one('.activity-progress-copy'),
    value = one('.activity-progress-value'),
    points = one('.activity-points'),
    pointsValue = one('.activity-points-value'),
    icon = one('.activity-points game-icon:first-child');
  const cards = [...document.querySelectorAll('.activity-links button')].map((e) => {
    const mark = e.querySelector('.shortcut-mark'),
      label = e.querySelector(':scope > span'),
      a = box(mark),
      b = box(label),
      r = box(e);
    return {
      box: r,
      mark: a,
      label: b,
      icon: box(mark.querySelector('game-icon')),
      groupCenter: (Math.min(a.left, b.left) + Math.max(a.right, b.right)) / 2,
      font: getComputedStyle(label).fontSize
    };
  });
  return {
    hud,
    copy,
    value,
    points,
    pointsValue,
    icon,
    cards,
    numberFonts: [
      ...document.querySelectorAll('.activity-progress-number,.activity-points-number')
    ].map((e) => getComputedStyle(e).fontSize)
  };
}
function validate(r) {
  for (const c of r.cards) {
    assert(Math.abs(c.box.height - 44) < 0.1);
    assert(Math.abs(c.box.width - r.cards[0].box.width) < 1);
    assert(Math.abs(c.groupCenter - c.box.cx) < 0.6);
    assert(Math.abs(c.mark.cy - c.label.cy) < 0.5);
    assert.equal(c.icon.width, 24);
    assert.equal(c.icon.height, 24);
    assert.equal(c.font, '13px');
    assert(c.mark.left >= c.box.left && c.label.right <= c.box.right);
  }
  assert(Math.abs(r.cards[1].box.left - r.cards[0].box.right - 8) < 1);
  assert(Math.abs(r.cards[2].box.left - r.cards[1].box.right - 8) < 1);
  for (const b of [r.copy, r.value, r.pointsValue, r.icon])
    assert(Math.abs(b.cy - r.hud.cy) < 0.6, 'summary row must center every group');
  assert.equal(r.icon.width, 20);
  assert.equal(r.icon.height, 20);
  assert(r.copy.right + 7 <= r.points.left);
  assert.deepEqual(r.numberFonts, ['18px', '18px']);
}
(async () => {
  const b = await chromium.launch({
      headless: true,
      channel: process.env.RURAL_BROWSER_CHANNEL || undefined
    }),
    checks = [],
    errors = [];
  try {
    for (const theme of ['red', 'culture', 'industry', 'ecology'])
      for (const [width, height] of [
        [320, 568],
        [390, 844],
        [430, 932]
      ]) {
        const context = await b.newContext({ viewport: { width, height }, deviceScaleFactor: 2 }),
          p = await context.newPage();
        p.on('pageerror', (e) => errors.push(e.message));
        await p.goto(
          `${require('./lib/project-tools.cjs').reviewBase()}/preview/v4.html?ui=aligned-${theme}-${width}#/pages/game/index?theme=${theme}&review=1&controls=0&scenario=home`
        );
        await p.waitForFunction(() => window._nativePreview?.page.data.loading === false);
        await p.waitForTimeout(250);
        await p.waitForFunction(() =>
          [...document.images].every((i) => i.complete && i.naturalWidth)
        );
        const normal = await p.evaluate(measure);
        validate(normal);
        if (width === 390) {
          const r = normal.hud,
            c = normal.cards[0].box;
          await p.screenshot({
            path: path.join(out, theme + '-ui.png'),
            clip: { x: r.left - 2, y: r.top - 2, width: r.width + 4, height: c.bottom - r.top + 4 }
          });
        }
        await p.evaluate(() => {
          const p = window._nativePreview.page;
          p.setData({
            snapshot: {
              ...p.data.snapshot,
              points: 12345,
              progress: { ...p.data.snapshot.progress, completed: 9, total: 16 }
            }
          });
        });
        const large = await p.evaluate(measure);
        validate(large);
        await p.locator('.activity-points').click();
        await p.waitForFunction(() => window._nativePreview.page.data.route === 'points');
        for (const route of ['ranking', 'certificate', 'profile']) {
          await p.evaluate(() => window._nativePreview.page.go('home'));
          await p.locator(`.activity-links button[data-route="${route}"]`).click();
          await p.waitForFunction(
            (route) => window._nativePreview.page.data.route === route,
            route
          );
        }
        checks.push({
          theme,
          width,
          height,
          passed: true,
          normal,
          large,
          pointsAndThreeShortcutsWork: true
        });
        await context.close();
        console.log('PASS ' + theme + ' ' + width);
      }
  } finally {
    await b.close();
    fs.writeFileSync(
      path.join(out, 'browser-checks.json'),
      JSON.stringify(
        {
          passed: checks.length === 12 && checks.every((c) => c.passed) && !errors.length,
          scope:
            'Actual WXML/browser layout at 3 widths x 4 themes; equal card sizes/gaps, group centers, matching number type, 24px entry / 20px status icon boxes, large values, four real navigation actions per case. Not a physical phone check.',
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
