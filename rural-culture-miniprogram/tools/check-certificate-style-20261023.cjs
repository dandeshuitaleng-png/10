'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const sharp = require('./lib/project-tools.cjs').dependency('sharp');
const q = path.resolve(__dirname, '../qa/certificate-unified-20261023');
fs.mkdirSync(q, { recursive: true });

(async () => {
  let baseline;
  const checks = [];
  for (const theme of ['red', 'culture', 'industry', 'ecology']) {
    const { data, info } = await sharp(path.join(q, 'artwork', theme + '-certificate.png'))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (!baseline) baseline = data;
    let sampled = 0,
      changed = 0,
      verticalFlatFrame = true;
    for (let y = 0; y < 1280; y++)
      for (let x = 0; x < 900; x++)
        if (x < 65 || x >= 840) {
          sampled++;
          const i = (y * 900 + x) * 4;
          if ([0, 1, 2, 3].some((k) => data[i + k] !== baseline[i + k])) changed++;
        }
    for (let y = 300; y <= 900; y++) {
      const i = (y * 900 + 25) * 4;
      if (data[i] !== 216 || data[i + 1] !== 198 || data[i + 2] !== 158 || data[i + 3] !== 255)
        verticalFlatFrame = false;
    }
    checks.push({
      theme,
      width: info.width,
      height: info.height,
      comparedFramePixels: sampled,
      differentFramePixels: changed,
      frameHex: '#D8C69E',
      verticalFlatFrame,
      passed: changed === 0 && verticalFlatFrame && info.width === 900 && info.height === 1280
    });
  }
  const report = {
    passed: checks.every((c) => c.passed),
    scope:
      'Exact RGBA comparison of shared light-gold frame margins across four actual WeChat Canvas exports; vertical frame must be flat #D8C69E, without dark gradient. Text fields may differ.',
    checks
  };
  fs.writeFileSync(path.join(q, 'style-consistency.json'), JSON.stringify(report, null, 2) + '\n');
  assert(report.passed);
  console.log(JSON.stringify(report));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
