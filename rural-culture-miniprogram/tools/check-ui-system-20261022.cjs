'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/ui-system-20261022');
fs.mkdirSync(out, { recursive: true });

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
        [390, 844]
      ]) {
        const context = await browser.newContext({
            viewport: { width, height },
            deviceScaleFactor: 2
          }),
          page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        async function open() {
          await page.goto(
            `${require('./lib/project-tools.cjs').reviewBase()}/preview/v4.html?ui-system=${theme}-${width}#/pages/game/index?theme=${theme}&review=1&controls=0&scenario=home`
          );
          await page.waitForFunction(() => window._nativePreview?.page.data.loading === false);
          await page.waitForFunction(() =>
            [...document.images].every((i) => i.complete && i.naturalWidth)
          );
        }
        async function shot(scene) {
          if (width === 390)
            await page.screenshot({ path: path.join(out, theme + '-' + scene + '.png') });
        }
        await open();
        await shot('home');
        const main = await page.locator('#footer-primary button').evaluate((e) => {
          const r = e.getBoundingClientRect(),
            t = e.querySelector('.button-label').getBoundingClientRect();
          return {
            center: r.x + r.width / 2,
            labelCenter: t.x + t.width / 2,
            images: [...e.querySelectorAll('img')].map((x) =>
              x.getAttribute('src').replace(/^\/miniprogram/, '')
            )
          };
        });
        assert(Math.abs(main.center - main.labelCenter) < 0.5);
        assert.deepEqual(main.images, ['/assets/icons/next.png']);
        await page.locator('.activity-shortcut[data-route="profile"]').click();
        await page.waitForSelector('.profile-stats');
        const profile = await page.locator('.profile-stats button').evaluateAll((list) =>
          list.map((e) => {
            const r = e.getBoundingClientRect(),
              group = e.querySelector('.profile-stat-entry').getBoundingClientRect(),
              i = e.querySelector('game-icon').getBoundingClientRect();
            return {
              width: r.width,
              height: r.height,
              entryCenter: group.x + group.width / 2,
              center: r.x + r.width / 2,
              icon: [i.width, i.height],
              src: e
                .querySelector('img')
                .getAttribute('src')
                .replace(/^\/miniprogram/, '')
            };
          })
        );
        assert.equal(profile.length, 2);
        assert(Math.abs(profile[0].height - profile[1].height) < 1);
        assert(Math.abs(profile[0].width - profile[1].width) < 1);
        for (const c of profile) {
          assert(c.height >= 44);
          assert.deepEqual(c.icon, [16, 16]);
          assert.equal(c.src, '/assets/icons/next.png');
          assert(Math.abs(c.entryCenter - c.center) < 1);
        }
        await shot('profile');
        for (const route of ['levels', 'points']) {
          await page.locator(`.profile-stats button[data-route="${route}"]`).click();
          await page.waitForFunction((r) => window._nativePreview.page.data.route === r, route);
          await page.evaluate(() => window._nativePreview.page.go('profile'));
          await page.waitForSelector('.profile-stats');
        }
        checks.push({
          theme,
          width,
          scene: 'profile',
          passed: true,
          profile,
          realNavigation: true
        });
        await page.evaluate(() => window._nativePreview.page.go('home'));
        await page.locator('#sound-settings').click();
        await page.waitForSelector('.sound-settings-panel');
        const sound = await page.locator('.sound-settings-label game-icon').evaluateAll((list) =>
          list.map((e) => {
            const r = e.getBoundingClientRect();
            return {
              size: [r.width, r.height],
              src: e
                .querySelector('img')
                .getAttribute('src')
                .replace(/^\/miniprogram/, '')
            };
          })
        );
        assert.deepEqual(
          sound.map((x) => x.src),
          ['/assets/icons/music.png', '/assets/icons/effects.png']
        );
        assert(sound.every((x) => x.size[0] === 20 && x.size[1] === 20));
        await shot('sound');
        const enabled = await page.locator('#effects-switch').isChecked();
        await page.locator('#effects-switch').click();
        await page.waitForFunction(
          (enabled) => window._nativePreview.page.data.effectsEnabled === !enabled,
          enabled
        );
        await page.locator('#effects-switch').click();
        await page.locator('#sound-settings-done').click();
        await page.waitForSelector('.sound-settings-panel', { state: 'hidden' });
        checks.push({ theme, width, scene: 'sound', passed: true, sound, switchWorks: true });
        await page.locator('#footer-primary button').click();
        await page.waitForSelector('.modal-rules');
        const buttons = await page.locator('.modal-actions .game-button').evaluateAll((list) =>
          list.map((e) => {
            const r = e.getBoundingClientRect(),
              s = getComputedStyle(e);
            return {
              kind: e.className,
              height: r.height,
              width: r.width,
              font: s.fontSize,
              weight: s.fontWeight,
              fill: s.backgroundColor,
              image: s.backgroundImage,
              shadow: s.boxShadow
            };
          })
        );
        const primary = buttons.find((x) => x.kind.includes('primary')),
          secondary = buttons.find((x) => x.kind.includes('secondary'));
        assert(primary && secondary);
        assert.equal(primary.height, 52);
        assert(secondary.height >= 44);
        assert(primary.image.startsWith('linear-gradient'));
        assert.equal(secondary.fill, 'rgba(0, 0, 0, 0)');
        assert.equal(secondary.image, 'none');
        assert.equal(secondary.weight, '500');
        assert(buttons.every((b) => b.shadow === 'none'));
        await shot('rules');
        checks.push({ theme, width, scene: 'rules', passed: true, buttons });
        await context.close();
        console.log('PASS ' + theme + ' ' + width + ' profile/sound/rules');
      }
    for (const theme of ['red', 'culture', 'industry', 'ecology']) {
      const context = await browser.newContext({
          viewport: { width: 336, height: 1291 },
          deviceScaleFactor: 1
        }),
        page = await context.newPage();
      await page.goto(
        `${require('./lib/project-tools.cjs').reviewBase()}/preview/v4.html?tall=${theme}#/pages/game/index?theme=${theme}&review=1&controls=0&scenario=home`
      );
      await page.waitForFunction(() => window._nativePreview?.page.data.loading === false);
      const layout = await page.evaluate(() => {
        const d = window._nativePreview.page.data,
          r = document.querySelector('.game-device').getBoundingClientRect(),
          m = document.querySelector('.route-canvas').getBoundingClientRect();
        return {
          frame: { width: r.width, height: r.height, top: r.top, bottom: r.bottom },
          mapHeight: m.height,
          viewport: d.mapViewport,
          tiles: d.journey.tiles.map((t) => t.height),
          blank: Math.max(0, d.mapViewport - d.journey.height)
        };
      });
      assert.equal(layout.frame.height, 941);
      assert(layout.blank < 10, theme + ' map blank');
      assert(layout.frame.top > 100 && layout.frame.bottom < 1291);
      assert(layout.mapHeight > 0);
      await page.screenshot({ path: path.join(out, theme + '-tall.png') });
      checks.push({ theme, scene: 'tall-preview', passed: true, layout });
      await context.close();
    }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(out, 'browser-checks.json'),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          passed: checks.length === 28 && !errors.length,
          scope:
            'Current four-theme WXML/browser UI roles at 320/390 widths, actual profile navigation and sound switch; four 336x1291 bounded phone previews. Native WeChat and phone acceptance are separate.',
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
