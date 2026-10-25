'use strict';
// Composite the local ImageGen crop behind the approved road and near landmarks.
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { createCanvas, loadImage } =
  require('./lib/project-tools.cjs').dependency('@napi-rs/canvas');
const sharp = require('./lib/project-tools.cjs').dependency('sharp');
const root = path.resolve(__dirname, '..'),
  qa = path.join(root, 'qa/culture-horizon-20261023');
fs.mkdirSync(qa, { recursive: true });

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
async function read(file, w, h) {
  const im = await loadImage(file),
    c = createCanvas(w || im.width, h || im.height),
    x = c.getContext('2d');
  x.drawImage(im, 0, 0, c.width, c.height);
  return { w: c.width, h: c.height, data: x.getImageData(0, 0, c.width, c.height).data };
}
function dilate(mask, w, h, r) {
  const out = new Float32Array(mask);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++)
          if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h)
            out[y * w + x] = Math.max(out[y * w + x], mask[(y + dy) * w + x + dx]);
  return out;
}
const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
(async () => {
  fs.mkdirSync(path.join(qa, 'proposed'), { recursive: true });
  const sourceBytes = fs.readFileSync(
      path.join(root, 'design-source/build-inputs/culture-horizon/inputs/culture-current.jpg')
    ),
    source = await read(sourceBytes, 750, 1280),
    edit = await read(
      path.join(root, 'design-source/culture-horizon-20261023/culture-top-edited.png'),
      750,
      280
    ),
    fg = new Float32Array(750 * 280),
    road = new Float32Array(750 * 280);
  const scroll = await read(
    path.join(root, 'design-source/build-inputs/culture-horizon/preserve-masks/scroll.png')
  );
  for (let y = 0; y < 170; y++)
    for (let x = 0; x < 240; x++)
      fg[y * 750 + x] = scroll.data[((y * 2 + 80) * scroll.w + x * 2 + 80) * 4] / 255;
  const academy = await read(
    path.join(root, 'design-source/build-inputs/culture-horizon/academy.png')
  );
  for (let y = 0; y < 280; y++)
    for (let x = 0; x < 225; x++)
      fg[y * 750 + 525 + x] = Math.max(
        fg[y * 750 + 525 + x],
        academy.data[(y * 2 * academy.w + x * 2) * 4] / 255
      );
  const boundary = JSON.parse(
    fs.readFileSync(path.join(root, 'design-source/build-inputs/road-boundaries/culture.json'))
  );
  for (let y = 0; y < 280; y++)
    for (let x = 0; x < 750; x++)
      if (boundary.left[y] !== null && x >= boundary.left[y] - 4 && x <= boundary.right[y] + 4)
        road[y * 750 + x] = 1;
  const protectedFg = dilate(fg, 750, 280, 1),
    protectedRoad = dilate(road, 750, 280, 2),
    output = new Uint8ClampedArray(source.data);
  for (let y = 0; y < 280; y++)
    for (let x = 0; x < 750; x++) {
      const p = y * 750 + x,
        i = p * 4,
        a = protectedRoad[p] ? 0 : (1 - smooth((y - 190) / 65)) * (1 - protectedFg[p]);
      if (a > 0)
        for (let k = 0; k < 3; k++)
          output[i + k] = Math.round(source.data[i + k] * (1 - a) + edit.data[i + k] * a);
    }
  let changed = 0,
    outside = 0,
    roadChanged = 0,
    foregroundChanged = 0,
    maxRow = -1;
  for (let y = 0; y < 1280; y++)
    for (let x = 0; x < 750; x++) {
      const p = y * 750 + x,
        i = p * 4;
      if ([0, 1, 2].some((k) => source.data[i + k] !== output[i + k])) {
        changed++;
        maxRow = Math.max(maxRow, y);
        if (y >= 280) outside++;
        if (y < 280 && protectedRoad[p]) roadChanged++;
        if (y < 280 && protectedFg[p] === 1) foregroundChanged++;
      }
    }
  if (outside || roadChanged || foregroundChanged) throw Error('Protected original pixels changed');
  const canvas = createCanvas(750, 1280),
    ctx = canvas.getContext('2d'),
    d = ctx.createImageData(750, 1280);
  d.data.set(output);
  ctx.putImageData(d, 0, 0);
  fs.writeFileSync(path.join(qa, 'proposed/culture-lossless.png'), canvas.toBuffer('image/png'));
  const budget = require('./lib/project-tools.cjs').mapBudget('culture');
  let result, quality;
  for (const q of [92, 90, 88, 86, 84]) {
    quality = q;
    result = await sharp(Buffer.from(output), { raw: { width: 750, height: 1280, channels: 4 } })
      .jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer();
    if (result.length <= budget) break;
  }
  if (result.length > budget) throw Error('Map export exceeds package budget');
  fs.writeFileSync(path.join(qa, 'proposed/culture-a-v4.jpg'), result);
  const top = createCanvas(750, 280);
  top.getContext('2d').drawImage(canvas, 0, 0);
  fs.writeFileSync(path.join(qa, 'proposed/culture-top.png'), top.toBuffer('image/png'));
  const report = {
    scope:
      'Culture top courtyard scenery added. Original road, near book monument, academy and all rows below 280 protected before JPEG encoding. Other three theme assets protected byte for byte.',
    sourceSha256: sha(sourceBytes),
    resultSha256: sha(result),
    bytes: result.length,
    jpegQuality: quality,
    editedPixelsBeforeEncoding: changed,
    maxEditedRow: maxRow,
    belowTopBandPixelsChangedBeforeEncoding: outside,
    roadPixelsChangedBeforeEncoding: roadChanged,
    solidForegroundPixelsChangedBeforeEncoding: foregroundChanged
  };
  fs.writeFileSync(path.join(qa, 'artwork-checks.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
