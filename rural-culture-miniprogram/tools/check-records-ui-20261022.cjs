'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/records-ui-20261022');
fs.mkdirSync(out, { recursive: true });
const scenes = [
  'ranking',
  'ranking-empty',
  'ranking-loading',
  'ranking-failure',
  'points',
  'points-empty',
  'points-loading',
  'points-failure',
  'certificate-empty'
];
function inspect() {
  const p = window._nativePreview.page,
    d = p.data,
    dev = document.querySelector('.game-device').getBoundingClientRect(),
    issues = [];
  const box = (e) => {
    const r = e.getBoundingClientRect();
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
      cy: r.y + r.height / 2
    };
  };
  const test = (ok, n) => {
      if (!ok) issues.push(n);
    },
    all = (s) => [...document.querySelectorAll(s)],
    one = (s) => document.querySelector(s);
  test(document.documentElement.scrollWidth <= innerWidth, 'no horizontal overflow');
  for (const e of all(
    '.rank-table,.my-rank,.record-list,.points-hero,.records-state,.records-tabs'
  )) {
    const r = box(e);
    test(r.left >= dev.left - 0.5 && r.right <= dev.right + 0.5, 'surface fits reading panel');
  }
  const rank = all('.rank-row').map((e) => {
    const row = box(e),
      place = box(e.querySelector('.rank-number')),
      avatar = box(e.querySelector('.avatar')),
      score = box(e.querySelector('.rank-score')),
      name = box(e.querySelector('.rank-name'));
    test(row.height >= 68, 'rank row readable height');
    test(
      Math.abs(place.cy - row.cy) < 0.75 &&
        Math.abs(avatar.cy - row.cy) < 0.75 &&
        Math.abs(score.cy - row.cy) < 0.75,
      'rank groups vertically centered'
    );
    return { row, place, score, name };
  });
  if (rank.length) {
    const score = box(one('.rank-col-score')),
      reader = box(one('.rank-col-reader'));
    for (const r of rank) {
      test(Math.abs(score.right - r.score.right) < 0.75, 'score column matches header');
      test(Math.abs(reader.left - r.name.left) < 0.75, 'reader column matches header');
    }
    test(box(one('.my-rank')).bottom < box(one('.rank-table')).top, 'own rank precedes list');
  }
  const ledger = all('.record-row').map((e) => {
    const row = box(e),
      amount = box(e.querySelector('.b')),
      copy = box(e.querySelector('.record-copy'));
    test(row.height >= 64, 'ledger row target');
    test(Math.abs(row.cy - amount.cy) < 0.75, 'ledger number vertically centered');
    test(copy.right + 7 <= amount.left, 'long labels leave room for numbers');
    return { row, amount };
  });
  for (const r of ledger)
    test(Math.abs(r.amount.right - ledger[0].amount.right) < 0.75, 'ledger number column');
  for (const e of all('.records-tabs button,.records-state button'))
    test(box(e).height >= 44, '44px action target');
  if (d.recordsLoading || d.recordsError) {
    test(
      !rank.length && !ledger.length && !one('.my-rank') && !one('.points-hero'),
      'loading/failure never pretends to be cached success'
    );
    test(!!one('.records-state'), 'state has dedicated panel');
    test(!d.error, 'section failure retains page navigation');
  }
  if (d.recordsError) test(!!one('#records-retry'), 'failure offers retry');
  test(
    [...document.images].every((i) => i.complete && i.naturalWidth),
    'all assets loaded'
  );
  return {
    passed: !issues.length,
    issues,
    route: d.route,
    loading: d.recordsLoading,
    error: d.recordsError,
    rank,
    ledger
  };
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
        const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 }),
          page = await ctx.newPage();
        page.on('pageerror', (e) => errors.push({ theme, width, error: e.message }));
        for (const scene of scenes) {
          await page.goto(
            `${require('./lib/project-tools.cjs').reviewBase()}/preview/v4.html?records=${theme}-${width}-${scene}#/pages/game/index?theme=${theme}&review=1&controls=0&scenario=${scene}`
          );
          await page.waitForFunction(() => window._nativePreview?.page.data.loading === false);
          await page.waitForFunction(() =>
            [...document.images].every((i) => i.complete && i.naturalWidth)
          );
          const c = { theme, width, height, scene, ...(await page.evaluate(inspect)) };
          checks.push(c);
          if (width === 390) {
            c.screenshot = theme + '-' + scene + '.png';
            await page.screenshot({ path: path.join(out, c.screenshot) });
          }
          if (scene === 'ranking') {
            await page.locator('.records-tabs [data-period="total"]').click();
            assert.equal(
              await page
                .locator('.records-tabs [data-period="total"]')
                .getAttribute('aria-pressed'),
              'true'
            );
            assert(
              await page
                .locator('.my-rank')
                .innerText()
                .then((t) => t.includes('总排名'))
            );
            await page.waitForFunction(
              () =>
                !window._nativePreview.page.data.pressedKey &&
                [...document.querySelectorAll('.records-tabs button')].every(
                  (e) => getComputedStyle(e).transform === 'none'
                )
            );
            // The nickname remains accessible in full even when visually truncated.
            await page.evaluate(() => {
              const p = window._nativePreview.page;
              p.setData({
                'ranking.rows[0].name': '特别长的学习者昵称用于窄屏显示检查',
                'ranking.rows[0].points': 12345
              });
            });
            {
              const changed = await page.evaluate(inspect);
              assert(changed.passed, JSON.stringify(changed.issues));
            }
          }
          if (scene === 'points') {
            assert.match(
              await page.locator('.record-copy .small').first().innerText(),
              /\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/
            );
            await page.evaluate(() => {
              const p = window._nativePreview.page;
              p.setData({
                'ledger[0].label': '青山绿水 · 很长的关卡名称，用于检查来源文字自然换行',
                'ledger[0].points': 12345
              });
            });
            {
              const changed = await page.evaluate(inspect);
              assert(changed.passed, JSON.stringify(changed.issues));
            }
          }
          if (scene.endsWith('failure')) {
            await page.locator('#records-retry button').click();
            await page.waitForSelector('#records-retry', { state: 'hidden' });
            assert.equal(
              await page.evaluate(() => window._nativePreview.page.data.recordsError),
              ''
            );
          }
          if (scene.endsWith('empty')) {
            await page.locator('.records-state button').click();
            await page.waitForFunction(() => window._nativePreview.page.data.route === 'levels');
          }
        }
        await ctx.close();
        console.log('PASS ' + theme + ' ' + width + ' records/states');
      }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(out, 'browser-checks.json'),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          passed: checks.length === 108 && checks.every((c) => c.passed) && !errors.length,
          scope:
            'Four themes x three viewport sizes x nine ranking/ledger/state screens, real tab/empty/retry actions and long-content geometry. Loading/failure visual fixtures; actual HTTP failure/recovery is tested separately.',
          checks,
          errors
        },
        null,
        2
      ) + '\n'
    );
  }
  assert.equal(errors.length, 0);
  assert(
    checks.length === 108 && checks.every((c) => c.passed),
    JSON.stringify(
      checks
        .filter((c) => !c.passed)
        .map((c) => ({ theme: c.theme, width: c.width, scene: c.scene, issues: c.issues }))
    )
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
