'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('./lib/project-tools.cjs').dependency('playwright');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/art-refinement-20261022');
fs.mkdirSync(out, { recursive: true });
const themes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['red', 'culture', 'industry', 'ecology'];
const scenarios = [
  'home',
  'quiz',
  'selected',
  'correct',
  'revive',
  'locked',
  'result',
  'certificate',
  'long',
  'image',
  'video',
  'long-explanation'
];
const selectedScenes = process.env.ART_REFINE_SCENES?.split(','),
  previous = selectedScenes
    ? JSON.parse(fs.readFileSync(path.join(out, 'browser-checks.json')))
    : null;
const checks = previous ? previous.checks.filter((c) => !selectedScenes.includes(c.scene)) : [],
  errors = previous ? previous.errors : [],
  requestFailures = [];
let revision = 0;
function inspect() {
  const d = window._nativePreview.page.data,
    body = document.querySelector('.panel-body').getBoundingClientRect(),
    device = document.querySelector('.game-device').getBoundingClientRect(),
    issues = [],
    test = (x, l) => {
      if (!x) issues.push(l);
    };
  const rows = (s) =>
    [...document.querySelectorAll(s)].map((e) => ({ e, r: e.getBoundingClientRect() }));
  test(document.documentElement.scrollWidth <= innerWidth, 'document horizontal bounds');
  for (const { r } of rows('.option,.question-card,.answer-feedback,.stat,.result-next'))
    test(r.left >= device.left - 0.5 && r.right <= device.right + 0.5, 'content horizontal bounds');
  for (const { r } of rows('.option')) test(r.height >= 44, 'option target height');
  for (const { e, r } of rows('.option')) {
    const letter = e.querySelector('.letter').getBoundingClientRect(),
      ring = e.querySelector('.option-status').getBoundingClientRect();
    test(
      Math.abs(letter.y + letter.height / 2 - r.y - r.height / 2) < 0.75,
      'answer letter vertically centered'
    );
    test(ring.width === 20 && ring.height === 20, '20px answer state circle');
    test(
      Math.abs(ring.y + ring.height / 2 - r.y - r.height / 2) < 0.75,
      'answer state vertically centered'
    );
    for (const mark of e.querySelectorAll('.option-status game-icon,.option-status img')) {
      const m = mark.getBoundingClientRect();
      test(
        m.width === 16 &&
          m.height === 16 &&
          m.left >= ring.left &&
          m.right <= ring.right &&
          m.top >= ring.top &&
          m.bottom <= ring.bottom,
        '16px check contained in state circle'
      );
    }
  }
  for (const { r } of rows('.timer game-icon,.timer img'))
    test(r.width === 16 && r.height === 16, '16px timer mark');
  if (d.challenge?.status === 'correct') {
    test(
      document.querySelectorAll(
        '.options.is-answered .option.correct[disabled][aria-label*="正确答案"]'
      ).length === 1,
      'one explicitly labelled correct answer'
    );
    test(
      [...document.querySelectorAll('.option')].every((e) => e.disabled),
      'review options are read-only'
    );
  }
  if (d.modal) {
    const overlay = document.querySelector('.theme-modal');
    test(
      overlay?.getAttribute('role') === 'dialog' && overlay?.getAttribute('aria-modal') === 'true',
      'modal role and label'
    );
    test(
      overlay?.contains(document.activeElement) && document.querySelector('.theme-panel').inert,
      'focus and keyboard stay in overlay'
    );
  }
  for (const { r } of rows('#footer-primary .game-button'))
    test(r.height >= 51.9 && r.bottom <= device.bottom + 0.5, '52px primary stays visible');
  for (const { e, r } of rows('.option .option-text'))
    test(e.scrollWidth <= r.width + 1 && e.scrollHeight <= r.height + 1, 'option text not clipped');
  const first = document.querySelector('.option')?.getBoundingClientRect(),
    firstText = document.querySelector('.option-text')?.getBoundingClientRect();
  const visible = first
    ? Math.max(0, Math.min(first.bottom, body.bottom) - Math.max(first.top, body.top))
    : 0;
  const topic = d.chapterTopic,
    heading = rows('.theme-heading')[0]?.r;
  if (d.route === 'quiz' && d.scenarioIndex === 8) {
    test(
      firstText && firstText.bottom <= body.bottom + 0.5 && firstText.top >= body.top - 0.5,
      'long question reveals the complete first answer'
    );
    test(visible >= Math.min(80, first.height), 'long question answer preview');
  }
  if (d.route === 'home' && !d.soundSettingsOpen && !d.modal) {
    const active = rows('.route-stop.current .route-caption')[0]?.r;
    test(
      active && active.top >= body.top - 0.5 && active.bottom <= body.bottom + 0.5,
      'current caption visible'
    );
    const future = rows('.route-stop.locked .route-caption')[0]?.r;
    test(!future || future.height < active.height, 'future chapters have less paper');
    for (const { e } of rows('.route-caption-name'))
      test(e.innerText.length > 0, 'chapter topic present');
  }
  if (d.route === 'result') {
    const next = rows('.result-next')[0]?.r;
    if (innerHeight >= 800)
      test(!next || next.bottom <= body.bottom + 0.5, 'next chapter fits the normal viewport');
    test(!!document.querySelector('.completion-title'), 'completion hierarchy');
    test(!d.nextChapter || !!document.querySelector('.result-next'), 'next chapter context');
    const circle = rows('.completion-icon')[0]?.r,
      mark = rows('.completion-icon .icon')[0]?.r;
    test(
      circle &&
        mark &&
        mark.left >= circle.left &&
        mark.right <= circle.right &&
        mark.top >= circle.top &&
        mark.bottom <= circle.bottom,
      'completion check fits its circle'
    );
  }
  const broken = [...document.images]
    .filter((i) => !i.complete || !i.naturalWidth)
    .map((i) => i.src);
  test(!broken.length, 'images loaded');
  return {
    passed: !issues.length,
    issues,
    route: d.route,
    modal: d.modal,
    topic,
    body: { top: body.top, bottom: body.bottom, height: body.height },
    firstAnswerVisible: visible,
    firstAnswerTextBottom: firstText?.bottom,
    heading: heading && { top: heading.top, bottom: heading.bottom, width: heading.width },
    broken
  };
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.RURAL_BROWSER_CHANNEL || undefined
  });
  try {
    for (const theme of themes)
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
        page.on('requestfailed', (r) =>
          requestFailures.push({ theme, width, url: r.url(), error: r.failure()?.errorText })
        );
        async function settle() {
          await page.waitForTimeout(600);
          await page.waitForFunction(() =>
            [...document.images].every((i) => i.complete && i.naturalWidth > 0)
          );
          await page.evaluate(
            () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          );
        }
        async function load(scene) {
          const scenario = ['rules', 'sound'].includes(scene) ? 'home' : scene;
          await page.goto(
            `${require('./lib/project-tools.cjs').reviewBase()}/preview/v4.html?refinement=${++revision}#/pages/game/index?theme=${theme}&review=1&controls=0&scenario=${scenario}`
          );
          await page.waitForFunction(
            ({ theme, scenario, names }) => {
              const d = window._nativePreview?.page.data;
              return (
                d &&
                !d.loading &&
                d.skin.gameId === theme &&
                d.review &&
                d.snapshot.progress.total > 0 &&
                d.scenarioIndex === names.indexOf(scenario)
              );
            },
            { theme, scenario, names: scenarios }
          );
          if (scene === 'rules') {
            await page.locator('#footer-primary .game-button').click();
            await page.waitForSelector('.modal-rules');
          }
          if (scene === 'sound') {
            await page.locator('#sound-settings').click();
            await page.waitForSelector('.sound-settings-panel');
          }
          await settle();
        }
        for (const scene of selectedScenes || [
          'home',
          'quiz',
          'selected',
          'long',
          'correct',
          'long-explanation',
          'revive',
          'locked',
          'rules',
          'result',
          'certificate',
          'sound'
        ]) {
          await load(scene);
          if (scene === 'home') await page.waitForTimeout(3500);
          if (['correct', 'long-explanation'].includes(scene)) {
            await page.locator('.answer-feedback').scrollIntoViewIfNeeded();
            await settle();
          }
          const c = { theme, width, height, scene, ...(await page.evaluate(inspect)) };
          if (
            width === 390 ||
            (width === 320 && ['home', 'long', 'long-explanation'].includes(scene))
          ) {
            c.screenshot = theme + '-' + scene + '-' + width + '.png';
            await page.screenshot({ path: path.join(out, c.screenshot) });
          }
          checks.push(c);
          if (scene === 'quiz' && width === 390) {
            await page.locator('.option').first().click();
            await page.waitForFunction(
              () => window._nativePreview.page.data.challenge.selected === 0
            );
            assert.equal(await page.locator('#footer-primary button').isEnabled(), true);
            await page.locator('#footer-primary .game-button').click();
            await page.waitForFunction(
              () =>
                !window._nativePreview.page.data.busy &&
                window._nativePreview.page.data.challenge.status !== 'playing'
            );
            await settle();
            checks.push({
              theme,
              width,
              scene: 'submit-interaction',
              passed: !(await page.locator('.native-fatal').count()),
              status: await page.evaluate(() => window._nativePreview.page.data.challenge.status)
            });
          }
          if (scene === 'home' && width === 390) {
            const before = await page.evaluate(() =>
              JSON.stringify(window._nativePreview.page.data.snapshot)
            );
            await page.locator('.chapter-mascot').first().click();
            assert.equal(
              await page.evaluate(() => JSON.stringify(window._nativePreview.page.data.snapshot)),
              before
            );
          }
        }
        await context.close();
        console.log('Checked ' + theme + ' ' + width);
      }
  } finally {
    await browser.close();
  }
  const report = {
    date: new Date().toISOString(),
    scope:
      'Current native page source through browser adapter, isolated repository-question fixtures. Responsive and interaction checks; not physical phones.',
    passed: checks.every((c) => c.passed) && !errors.length,
    checks,
    errors,
    requestFailures
  };
  fs.writeFileSync(path.join(out, 'browser-checks.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      passed: report.passed,
      checks: checks.length,
      failed: checks
        .filter((c) => !c.passed)
        .map((c) => ({ theme: c.theme, width: c.width, scene: c.scene, issues: c.issues })),
      errors
    })
  );
  if (!report.passed) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
