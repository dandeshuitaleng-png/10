'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const { palettes } = require('../miniprogram/services-v4/visual-feedback');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/theme-tone-20261023');
fs.mkdirSync(out, { recursive: true });

const originalMaps = Object.fromEntries(
  Object.keys(palettes).map((theme) => [
    theme,
    fs.readFileSync(path.join(root, 'miniprogram/assets/journey', theme + '-a-v4.jpg'))
  ])
);
const rgb = (h) => 'rgb(' + [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';
const luminance = (h) => {
  const c = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};
(async () => {
  const browser = await chromium.launch({
      headless: true,
      channel: process.env.RURAL_BROWSER_CHANNEL || undefined
    }),
    checks = [];
  for (const theme of Object.keys(palettes)) {
    const palette = palettes[theme],
      page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(
      require('./lib/project-tools.cjs').reviewBase() +
        '/preview/v4.html?theme-tone=20261023#/pages/game/index?theme=' +
        theme +
        '&review=1&controls=0&scenario=complete'
    );
    await page.waitForFunction(() => window._nativePreview?.page.data.loading === false);
    for (const route of ['home', 'profile', 'points', 'ranking', 'rules']) {
      await page.evaluate((route) => {
        const p = window._nativePreview.page;
        p._motion.hide();
        if (route === 'rules') {
          p.go('home');
          p.setData({ ruleLevel: p.data.levels[0], rulePose: 'welcome' });
          p.showModal('rules');
        } else {
          p.setData({ modal: '' });
          p.go(route);
        }
      }, route);
      const sample = await page.evaluate(() => {
        const get = (s) => {
          const el = document.querySelector(s);
          if (!el) return null;
          const c = getComputedStyle(el);
          return { background: c.backgroundColor, image: c.backgroundImage, color: c.color };
        };
        return {
          root: get('.game-device'),
          header: get('.activity-header'),
          footer: get('.panel-footer'),
          hud: get('.activity-hud'),
          shortcut: get('.activity-links button'),
          caption: get('.route-caption'),
          profile: get('.profile-card'),
          panel: get('.theme-panel'),
          modal: get('.theme-modal'),
          button: get('.game-button')
        };
      });
      let passed = sample.root.background === rgb(palette.light);
      if (route === 'home' || route === 'rules')
        passed =
          passed &&
          sample.header.background === rgb(palette.light) &&
          sample.footer.background === rgb(palette.light) &&
          sample.hud.background === rgb(palette.paper) &&
          sample.shortcut.background === rgb(palette.paper) &&
          sample.caption.image.includes(rgb(palette.paper)) &&
          sample.caption.image.includes(rgb(palette.light));
      if (route === 'profile') passed = passed && sample.profile.background === rgb(palette.paper);
      if (route === 'rules')
        passed =
          passed &&
          sample.modal.image.includes(rgb(palette.paper)) &&
          sample.modal.image.includes(rgb(palette.light));
      if (sample.button)
        passed =
          passed &&
          sample.button.image.includes(rgb(palette.top)) &&
          sample.button.image.includes(rgb(palette.bottom));
      checks.push({ theme, route, passed, sample });
      assert(passed, theme + ' ' + route + ' palette cascade mismatch');
      if (route === 'home' || route === 'profile')
        await page.screenshot({ path: path.join(out, theme + '-' + route + '-browser.png') });
    }
    await page.close();
  }
  await browser.close();
  const readability = Object.entries(palettes).map(([theme, p]) => ({
    theme,
    body: contrast(p.ink, p.light),
    caption: contrast(p.muted, p.light),
    button: contrast(p.buttonText, p.bottom)
  }));
  assert(readability.every((r) => Math.min(r.body, r.caption, r.button) >= 4.5));
  const artwork = Object.keys(palettes).map((theme) => ({
    theme,
    unchanged: fs
      .readFileSync(path.join(root, 'miniprogram/assets/journey', theme + '-a-v4.jpg'))
      .equals(originalMaps[theme])
  }));
  assert(artwork.every((r) => r.unchanged));
  const report = {
    passed: true,
    scope:
      'Computed-color cascade across four themes and five routes in the isolated browser adapter; text contrast and original map-byte checks. Native simulator screenshots are recorded separately.',
    checks,
    readability,
    artwork
  };
  fs.writeFileSync(path.join(out, 'browser-checks.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({ passed: true, scenes: checks.length, artworkUnchanged: artwork.length })
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
