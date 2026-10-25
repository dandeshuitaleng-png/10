'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const { rigs } = require('../miniprogram/services-v4/mascot-rig');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/map-legibility-20261023');
fs.mkdirSync(out, { recursive: true });
const feet = Object.fromEntries(
  ['welcome', 'celebrate', 'observe', 'think'].map((p) => [
    p,
    { ...rigs[p].mapFoot, width: rigs[p].width, height: rigs[p].height }
  ])
);
function inspect(feet) {
  const p = window._nativePreview.page,
    box = (e) => {
      const r = e.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height
      };
    },
    issues = [],
    check = (v, s) => {
      if (!v) issues.push(s);
    };
  const rows = [...document.querySelectorAll('.route-stop')].map((stop) => {
    const card = stop.querySelector('.route-caption'),
      c = box(card),
      base = box(stop.querySelector('.route-base')),
      state = stop.classList.contains('completed')
        ? 'completed'
        : stop.classList.contains('locked')
          ? 'locked'
          : 'current';
    check(
      Math.abs(c.height - { completed: 76, locked: 64, current: 90 }[state]) < 0.5,
      'accepted card height retained'
    );
    check(
      Math.abs(c.top + c.height / 2 - base.top - base.height / 2) < 0.5,
      'card remains paired with base'
    );
    const text = [
      ...card.querySelectorAll(
        '.route-caption-label,.route-caption-name,.route-caption-state,.route-caption-reward'
      )
    ]
      .filter((e) => getComputedStyle(e).display !== 'none')
      .map((e) => {
        const b = box(e),
          s = getComputedStyle(e),
          line = parseFloat(s.lineHeight);
        check(b.height >= line - 0.5, e.className + ' line box not compressed');
        check(b.top >= c.top + 4 && b.bottom <= c.bottom - 4, e.className + ' inside card');
        return { text: e.textContent, font: parseFloat(s.fontSize), line, height: b.height };
      });
    const actor = stop.querySelector('.chapter-mascot');
    let foot, actorBox;
    if (actor) {
      actorBox = box(actor);
      const plane = box(actor.querySelector('.actor-source-plane')),
        pose = actor.querySelector('.actor-original').dataset.pose,
        f = feet[pose];
      foot = {
        x: plane.left + (plane.width * f.x) / f.width,
        y: plane.top + (plane.height * f.y) / f.height
      };
      foot.dx = foot.x - (base.left + base.width / 2);
      foot.dy = foot.y - (base.top + (base.height * 65) / 165);
      check(
        Math.abs(foot.dx) < 0.35 && Math.abs(foot.dy) < 0.35,
        'feet centered on podium standing surface'
      );
      check(
        actor.querySelectorAll('.map-motion-strip').length === 1 && !actor.querySelector('canvas'),
        'single map body layer'
      );
    }
    return { id: card.dataset.id, state, card: c, base, text, actor: actorBox, foot };
  });
  const overlap = (a, b) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  for (const a of rows)
    for (const b of rows)
      if (a.id !== b.id) {
        check(overlap(a.card, b.card) < 0.5, 'neighbour cards clear');
        if (b.actor) check(overlap(a.card, b.actor) < 0.5, 'neighbour character clear');
      }
  const body = box(document.querySelector('.panel-body')),
    focus = rows.find((n) => n.id === (p.data.journey.guideId || rows.at(-1).id));
  for (const r of [focus.card, focus.actor].filter(Boolean))
    check(r.top >= body.top - 0.5 && r.bottom <= body.bottom + 0.5, 'focused chapter visible');
  check(document.documentElement.scrollWidth <= innerWidth, 'no page overflow');
  return { passed: !issues.length, issues, rows };
}
(async () => {
  const browser = await chromium.launch({
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
        const context = await browser.newContext({
            viewport: { width, height },
            deviceScaleFactor: 2
          }),
          page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        for (const scenario of [
          'home',
          'chapter-2',
          'chapter-3',
          'chapter-4',
          'locked',
          'complete'
        ]) {
          await page.goto(
            `${require('./lib/project-tools.cjs').reviewBase()}/preview/v4.html?revision=map-legibility-${theme}-${width}-${scenario}#/pages/game/index?theme=${theme}&review=1&controls=0&scenario=${scenario}`
          );
          await page.waitForFunction(() => window._nativePreview?.page.data.loading === false);
          await page.evaluate(() => window._nativePreview.page.go('home'));
          await page.waitForSelector('.route-caption');
          await page.waitForFunction(() =>
            [...document.images].every((i) => i.complete && i.naturalWidth)
          );
          const c = { theme, width, height, scenario, ...(await page.evaluate(inspect, feet)) };
          checks.push(c);
          assert(c.passed, JSON.stringify(c));
          if (width === 390 && ['home', 'complete'].includes(scenario)) {
            c.screenshot = `${theme}-${scenario}.png`;
            await page.screenshot({ path: path.join(out, c.screenshot) });
            if (scenario === 'complete') {
              await page.locator('.panel-body').evaluate((e) => (e.scrollTop = e.scrollHeight));
              await page.screenshot({ path: path.join(out, `${theme}-complete-bottom.png`) });
            }
          }
        }
        await context.close();
        console.log('PASS ' + theme + ' ' + width + ' cards/feet');
      }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(out, 'browser-checks.json'),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          passed: checks.length === 72 && checks.every((c) => c.passed) && !errors.length,
          scope:
            'Four themes x three sizes x six map progress states. Accepted card heights, uncompressed line boxes, centered primary-body feet, neighbour clearance and one image strip per map actor.',
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
