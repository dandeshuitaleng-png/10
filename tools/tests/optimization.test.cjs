'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { losslessPng } = require('../../rural-culture-miniprogram/tools/optimize-runtime-png.cjs');
const { dependency } = require('../../rural-culture-miniprogram/tools/lib/project-tools.cjs');
const { inspectAdminBuild, verifyAdminMount } = require('../check-admin-build.cjs');

test('PNG compression preserves every RGBA byte including transparent-edge colors', async () => {
  const sharp = dependency('sharp');
  const raw = Buffer.alloc(96 * 64 * 4);
  for (let index = 0; index < raw.length; index++)
    raw[index] = (index * 17 + Math.floor(index / 13)) % 256;
  const original = await sharp(raw, { raw: { width: 96, height: 64, channels: 4 } })
    .png({ compressionLevel: 0 })
    .toBuffer();
  const result = await losslessPng(original);
  assert.ok(result.savedBytes > 0);
  assert.equal(result.width, 96);
  assert.equal(result.height, 64);
  assert.deepEqual(await sharp(result.buffer).ensureAlpha().raw().toBuffer(), raw);
});

test('optimized ecology banner retains the approved pixel fingerprint in every published copy', async () => {
  const sharp = dependency('sharp');
  const evidence = require('../../rural-culture-miniprogram/design-source/runtime-png-optimization-20261025.json');
  const root = path.resolve(__dirname, '../..');
  for (const project of evidence.projects) {
    const file = path.join(root, project, 'miniprogram', evidence.asset);
    const pixels = await sharp(file).ensureAlpha().raw().toBuffer();
    assert.equal(crypto.createHash('sha256').update(pixels).digest('hex'), evidence.pixelSha256);
  }
});

test('admin build budget follows transitive static imports while retaining deferred chunks', (t) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-admin-bundle-'));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  fs.mkdirSync(path.join(folder, '.vite'));
  const manifest = {
    'index.html': {
      file: 'entry.js',
      isEntry: true,
      imports: ['shared'],
      dynamicImports: ['editor'],
      css: ['entry.css']
    },
    shared: { file: 'shared.js', imports: [] },
    editor: { file: 'editor.js', imports: ['shared'] }
  };
  for (const [file, size] of Object.entries({
    'entry.js': 100,
    'shared.js': 200,
    'editor.js': 600000,
    'entry.css': 50
  }))
    fs.writeFileSync(path.join(folder, file), Buffer.alloc(size));
  fs.writeFileSync(path.join(folder, '.vite/manifest.json'), JSON.stringify(manifest));
  const report = inspectAdminBuild(folder);
  assert.equal(report.initialJavaScriptBytes, 300);
  assert.equal(report.totalJavaScriptBytes, 600300);
  assert.equal(report.initialCssBytes, 50);
  assert.equal(report.passed, true);
  fs.writeFileSync(path.join(folder, 'shared.js'), Buffer.alloc(600000));
  assert.equal(inspectAdminBuild(folder).passed, false);
});

test('lazy management assets use the backend management mount', async () => {
  assert.equal(await verifyAdminMount(), '/management/');
});
