'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { dependency, reviewBase } = require('./lib/project-tools.cjs');
const { chromium } = dependency('playwright');
const out = path.resolve(__dirname, '../qa/art-refinement-20261022');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.RURAL_BROWSER_CHANNEL || undefined
  });
  const checks = [],
    errors = [];
  try {
    for (const width of [390, 1320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(reviewBase() + '/preview/' + encodeURIComponent('美术精修-20261022.html'));
      await page.locator('[data-board]').last().scrollIntoViewIfNeeded();
      await page.waitForFunction(() =>
        [...document.images].every((image) => image.complete && image.naturalWidth > 0)
      );
      assert.equal(await page.locator('[data-board]').count(), 5);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, `gallery-${width}.png`), fullPage: true });
      checks.push({ width, boards: 5, passed: true });
      await page.close();
    }
    assert.equal(errors.length, 0);
    fs.writeFileSync(
      path.join(out, 'gallery-checks.json'),
      JSON.stringify(
        {
          passed: true,
          checks,
          errors,
          scope:
            'Browser overview assets and responsive bounds; not a current-game or physical-device acceptance.'
        },
        null,
        2
      ) + '\n'
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
