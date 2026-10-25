'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { dependency, reviewBase } = require('./project-tools.cjs');
const { chromium } = dependency('playwright');
const { createCanvas, loadImage } = dependency('@napi-rs/canvas');
const { rigs } = require('../../miniprogram/services-v4/mascot-rig');

async function colors(bytes) {
  const image = await loadImage(bytes),
    canvas = createCanvas(image.width, image.height),
    context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, image.width, image.height).data;
  let white = 0,
    black = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (Math.min(data[i], data[i + 1], data[i + 2]) > 220) white++;
    if (Math.max(data[i], data[i + 1], data[i + 2]) < 50) black++;
  }
  return { white, black, pixels: image.width * image.height };
}

async function checkWinterBrowser(out) {
  fs.mkdirSync(path.join(out, 'frames'), { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.RURAL_BROWSER_CHANNEL || undefined
  });
  const checks = [],
    errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      reviewBase() +
        '/preview/v4.html#/pages/game/index?theme=industry&review=1&controls=0&scenario=complete'
    );
    await page.waitForFunction(() => window._nativePreview?.page.data.loading === false);
    await page.waitForFunction(() =>
      [...document.images].every((image) => image.complete && image.naturalWidth)
    );
    const actor = page.locator('.chapter-mascot[data-id="industry-4"]'),
      body = actor.locator('.map-motion-strip');
    await actor.waitFor({ state: 'visible' });
    await page.evaluate(() => window._nativePreview.page._motion.hide());
    const baseline = await colors(await actor.screenshot({ animations: 'allow' }));
    await body.evaluate((element) => {
      element.style.filter = 'brightness(0)';
    });
    const black = await colors(await actor.screenshot({ animations: 'allow' }));
    assert(black.black > baseline.black + 100, 'pixel positive control');
    await body.evaluate((element) => {
      element.style.removeProperty('filter');
    });
    await actor.evaluate((element) => {
      element._checkedBody = element.querySelector('.map-motion-strip');
    });
    await page.evaluate(() =>
      window._nativePreview.page.setData({
        motion: { playingId: 'industry-4', respondingId: '', sequence: 1, touchSequence: 0 }
      })
    );
    for (let frame = 0; frame < rigs.think.spriteFrames; frame++) {
      const stable = await actor.evaluate(
        (element, time) => {
          for (const animation of element.getAnimations({ subtree: true })) {
            animation.pause();
            animation.currentTime = time;
          }
          return (
            element._checkedBody === element.querySelector('.map-motion-strip') &&
            !element.querySelector('canvas')
          );
        },
        (rigs.think.duration * frame) / (rigs.think.spriteFrames - 1)
      );
      const bytes = await actor.screenshot({ animations: 'allow' }),
        pixels = await colors(bytes);
      assert(
        stable &&
          pixels.white > baseline.white * 0.7 &&
          pixels.black < baseline.black + baseline.pixels * 0.12
      );
      fs.writeFileSync(path.join(out, 'frames', frame + '.png'), bytes);
      checks.push({ frame, stable, passed: true });
    }
    for (let index = 0; index < 8; index++) {
      await actor.click();
      assert(
        await actor.evaluate(
          (element) => element._checkedBody === element.querySelector('.map-motion-strip')
        )
      );
      checks.push({ repeatedTap: index, passed: true });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await body.evaluate((element) => getComputedStyle(element).animationName), 'none');
    checks.push({ reducedMotion: true, passed: true });
    assert.equal(errors.length, 0);
    fs.writeFileSync(
      path.join(out, 'browser-checks.json'),
      JSON.stringify(
        {
          passed: true,
          scope:
            'Current winter sprite frames, pixel control, repeated taps and reduced motion. No archived before-image dependency; browser only.',
          checks,
          errors
        },
        null,
        2
      ) + '\n'
    );
    return checks;
  } finally {
    await browser.close();
  }
}
module.exports = { checkWinterBrowser };
