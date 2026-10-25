'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/certificate-flow-20261023');
fs.mkdirSync(out, { recursive: true });
const scenes = [
  'certificate',
  'certificate-empty',
  'certificate-loading',
  'certificate-failure',
  'save-failure',
  'certificate-permission',
  'certificate-saved',
  'certificate-share'
];
function inspect() {
  const d = window._nativePreview.page.data,
    box = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
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
    dev = box('.game-device'),
    footer = box('.panel-footer'),
    state = box('.certificate-placeholder'),
    image = box('.certificate-preview'),
    issues = [];
  const check = (ok, label) => {
    if (!ok) issues.push(label);
  };
  check(document.documentElement.scrollWidth <= innerWidth, 'no horizontal overflow');
  for (const r of [footer, state, image].filter(Boolean))
    check(r.left >= dev.left - 0.5 && r.right <= dev.right + 0.5, 'content fits device');
  if (footer) check(footer.bottom <= dev.bottom - 19, 'footer safe area');
  if (image)
    check(
      Math.abs(image.height / image.width - d.certificateImageRatio) < 0.02,
      'certificate PNG ratio'
    );
  for (const e of document.querySelectorAll('.panel-footer button,.modal-actions button'))
    check(e.getBoundingClientRect().height >= 44, '44px actions');
  if (d.certificateImageLoading)
    check(document.querySelector('#footer-primary button').disabled, 'generation disables saving');
  if (d.certificateImageError)
    check(d.footerAction === 'retry-certificate', 'failure offers regeneration');
  if (d.modal === 'certificate-share') {
    const style = getComputedStyle(document.querySelector('#certificate-share-button'));
    check(style.backgroundImage.includes('linear-gradient'), 'share has theme gradient');
    check(style.color !== 'rgb(255, 255, 255)', 'share readable theme text');
  }
  check(
    [...document.images].every((i) => i.complete && i.naturalWidth),
    'all assets loaded'
  );
  return { passed: !issues.length, issues, route: d.route, modal: d.modal, image, state, footer };
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
        page.on('pageerror', (e) => errors.push({ theme, width, error: e.message }));
        for (const scene of scenes) {
          await page.goto(
            `${require('./lib/project-tools.cjs').reviewBase()}/preview/v4.html?revision=certificate-flow-${theme}-${width}-${scene}#/pages/game/index?theme=${theme}&review=1&controls=0&scenario=${scene}`
          );
          await page.waitForFunction(() => window._nativePreview?.page.data.loading === false);
          if (!['certificate-empty', 'certificate-loading', 'certificate-failure'].includes(scene))
            await page.waitForSelector('.certificate-preview');
          await page.waitForFunction(() =>
            [...document.images].every((i) => i.complete && i.naturalWidth)
          );
          const c = { theme, width, height, scene, ...(await page.evaluate(inspect)) };
          checks.push(c);
          if (width === 390) {
            c.screenshot = theme + '-' + scene + '.png';
            await page.screenshot({ path: path.join(out, c.screenshot) });
          }
          assert(c.passed, JSON.stringify(c));
          if (scene === 'certificate') {
            await page.locator('.certificate-preview').click();
            await page.waitForSelector('.native-dialog img');
            assert.equal(
              await page.locator('.native-dialog img').getAttribute('src'),
              await page.evaluate(() => window._nativePreview.page.data.certificateImage)
            );
            await page.getByRole('button', { name: '关闭', exact: true }).click();
          }
          if (scene === 'certificate-failure') {
            await page.locator('#footer-primary button').click();
            await page.waitForSelector('.certificate-preview');
            assert.equal(
              await page.evaluate(() => window._nativePreview.page.data.certificateImageError),
              false
            );
          }
          if (scene === 'save-failure') {
            await page.evaluate(() => {
              wx.saveImageToPhotosAlbum = (o) => {
                window._savedPreviewPath = o.filePath;
                o.success({ destination: 'download' });
              };
            });
            await page.locator('#modal-primary button').click();
            await page.waitForSelector('.certificate-save-feedback');
            assert.equal(
              await page.evaluate(
                () => window._savedPreviewPath === window._nativePreview.page.data.certificateImage
              ),
              true
            );
            assert.match(await page.locator('.certificate-save-feedback').innerText(), /下载/);
          }
          if (scene === 'certificate-permission') {
            await page.evaluate(() => {
              wx.openSetting = (o) => {
                window._settingOpened = true;
                o.success({ authSetting: { 'scope.writePhotosAlbum': true } });
                o.complete();
              };
            });
            await page.locator('#modal-primary button').click();
            await page.waitForSelector('.modal-mask', { state: 'hidden' });
            assert(await page.evaluate(() => window._settingOpened));
            assert.equal(await page.evaluate(() => window._nativePreview.page.data.busy), false);
          }
          if (scene === 'certificate-share') {
            const expected = await page.evaluate(() =>
              window._nativePreview.page.onShareAppMessage()
            );
            assert.match(expected.title, /我获得了/);
            assert.equal(expected.path, `/pages/game/index?theme=${theme}&route=certificate`);
            await page.locator('#certificate-share-button').click();
            await page.waitForSelector('.native-dialog');
            assert.equal(await page.locator('.native-dialog h2').innerText(), expected.title);
            await page.getByRole('button', { name: '返回游戏', exact: true }).click();
            await page.locator('#modal-secondary button').click();
            await page.waitForSelector('.modal-mask', { state: 'hidden' });
          }
        }
        if (theme === 'ecology' && width === 390) {
          await page.evaluate(async () => {
            const p = window._nativePreview.page;
            await p.applyScenario('certificate');
            p.setData({
              certificate: {
                ...p.data.certificate,
                userName: '湖南乡村阅读文化探索者陈小禾ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                description: '在自然观察与生态文化学习中积累知识，珍惜山水，保护家园。'.repeat(4)
              }
            });
            await p.prepareCertificate(true);
          });
          await page.waitForFunction(() => {
            const i = document.querySelector('.certificate-preview');
            return i?.complete && i.naturalHeight > 1280;
          });
          await page.screenshot({ path: path.join(out, 'ecology-long-certificate.png') });
          assert((await page.evaluate(inspect)).passed);
        }
        await context.close();
        console.log('PASS ' + theme + ' ' + width + ' certificate flow');
      }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(out, 'browser-checks.json'),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          passed: checks.length === 96 && checks.every((c) => c.passed) && !errors.length,
          scope:
            'Four themes x three sizes x eight certificate states; actual canvas/preview/retry/share payload, with simulated album/settings callbacks. No phone album or delivered WeChat share acceptance.',
          checks,
          errors
        },
        null,
        2
      ) + '\n'
    );
  }
  assert.equal(errors.length, 0);
  assert.equal(checks.length, 96);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
