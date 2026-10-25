'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/quiz-states-20261022');
fs.mkdirSync(out, { recursive: true });
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
    async function open(theme, scenario = 'home') {
      await page.goto(
        `${require('./lib/project-tools.cjs').reviewBase()}/preview/v4.html?revision=quiz-states-${theme}#/pages/game/index?theme=${theme}&review=1&controls=0&scenario=${scenario}`
      );
      await page.waitForFunction(() => window._nativePreview?.page.data.loading === false);
    }
    async function focusInside(selector) {
      assert(
        await page.evaluate(
          (s) => document.querySelector(s).contains(document.activeElement),
          selector
        ),
        'focus left ' + selector
      );
    }
    await open('ecology');
    await page.locator('#footer-primary button').click();
    await page.waitForSelector('.modal-rules');
    await focusInside('.theme-modal');
    for (const key of ['Tab', 'Shift+Tab'])
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press(key);
        await focusInside('.theme-modal');
      }
    await page.locator('.modal-close').click();
    await page.waitForSelector('.theme-modal', { state: 'hidden' });
    assert(
      await page.locator('#footer-primary button').evaluate((e) => e === document.activeElement)
    );
    checks.push({ case: 'rules-focus-wrap-and-restore', passed: true, keyboardSteps: 24 });
    await page.locator('#sound-settings').click();
    await page.waitForSelector('.sound-settings-panel');
    await focusInside('.sound-settings-panel');
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      await focusInside('.sound-settings-panel');
    }
    await page.locator('#sound-settings-done').click();
    assert(await page.locator('#sound-settings').evaluate((e) => e === document.activeElement));
    checks.push({ case: 'sound-focus-wrap-and-restore', passed: true, keyboardSteps: 12 });
    await page.locator('#footer-primary button').click();
    await page.waitForSelector('.modal-rules');
    await page.evaluate(() => {
      window.wx.showModal({ title: '焦点检查', content: '仅用于隔离评审的嵌套弹窗。' });
    });
    await page.waitForSelector('.native-dialog');
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      await focusInside('.native-dialog');
    }
    await page.locator('.native-dialog button').last().click();
    await page.waitForSelector('.native-dialog', { state: 'hidden' });
    await focusInside('.theme-modal');
    assert.equal(await page.evaluate(() => window._nativePreview.page.data.route), 'home');
    await page.locator('.modal-close').click();
    checks.push({ case: 'nested-native-dialog-restores-previous-overlay', passed: true });
    await page.evaluate(() => window._nativePreview.page.applyScenario('long'));
    await page.waitForSelector('.options');
    await page.locator('.option').first().click();
    await page.locator('.quiz-meta button').click();
    await page.waitForSelector('.modal-exit');
    await page.keyboard.press('2');
    assert.equal(await page.evaluate(() => window._nativePreview.page.data.challenge.selected), 0);
    await page.locator('#modal-primary button').focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('.modal-exit', { state: 'hidden' });
    assert.equal(
      await page.evaluate(() => window._nativePreview.page.data.challenge.status),
      'playing'
    );
    checks.push({ case: 'overlay-blocks-number-and-submit-shortcuts', passed: true });
    // Actual selection and submission of the repository's explicit layout sample (answer A).
    await page.locator('#footer-primary button').click();
    await page.waitForFunction(
      () =>
        window._nativePreview.page.data.challenge.status === 'correct' &&
        !window._nativePreview.page.data.busy
    );
    assert(await page.locator('.option.correct').first().isDisabled());
    await page.locator('#footer-primary button').click();
    await page.waitForFunction(() => window._nativePreview.page.data.challenge.index === 1);
    checks.push({ case: 'selection-submit-read-next', passed: true });
    for (const theme of ['red', 'culture', 'industry', 'ecology']) {
      await open(theme, 'quiz');
      await page.evaluate(() => window._nativePreview.page.setData({ 'challenge.remaining': 5 }));
      await page.waitForSelector('.timer.urgent');
      const urgent = await page.locator('.timer.urgent').evaluate((e) => {
        const s = getComputedStyle(e);
        return {
          label: e.getAttribute('aria-label'),
          background: s.backgroundColor,
          border: s.borderColor,
          animation: s.animationName
        };
      });
      assert.equal(urgent.label, '剩余5秒');
      assert.notEqual(urgent.background, 'rgba(0, 0, 0, 0)');
      assert.equal(urgent.animation, 'none');
      await page.screenshot({ path: path.join(out, theme + '-urgent.png') });
      checks.push({ theme, case: 'urgent-presentation', passed: true, ...urgent });
      await page.evaluate(() => window._nativePreview.page.applyScenario('revive'));
      await page.waitForSelector('.modal-revive');
      for (const reason of ['answer', 'timeout']) {
        await page.evaluate((reason) => {
          const p = window._nativePreview.page;
          p.setData({ 'challenge.feedback.reason': reason });
          p.showModal('revive');
        }, reason);
        const mark = await page.locator('.modal-state-line game-icon').evaluate((e) => {
          const r = e.getBoundingClientRect();
          return {
            src: e.querySelector('img').getAttribute('src'),
            width: r.width,
            height: r.height
          };
        });
        assert(mark.src.endsWith('/' + (reason === 'timeout' ? 'clock' : 'info') + '.png'));
        assert.equal(mark.width, 20);
        assert.equal(mark.height, 20);
        assert.equal(await page.locator('.answer-feedback,.option.correct').count(), 0);
        await focusInside('.theme-modal');
        await page.screenshot({ path: path.join(out, theme + '-' + reason + '.png') });
        checks.push({
          theme,
          case: reason + '-presentation',
          passed: true,
          mark,
          noAnswerRevealed: true
        });
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(out, 'browser-checks.json'),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          passed: checks.length === 17 && !errors.length,
          scope:
            'Actual keyboard navigation, nested browser dialogs and select/submit/next flow; four-theme urgency and timeout presentation fixtures. Fixed review time, not a real countdown or phone test.',
          checks,
          errors
        },
        null,
        2
      ) + '\n'
    );
  }
  assert.equal(errors.length, 0);
  console.log('PASS ' + checks.length + ' state and keyboard checks');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
