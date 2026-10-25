'use strict';
// Local ImageGen crop edits are composited behind protected approved foreground.
// Only export/resizing/masks here; no programmatic repainting of the artwork.
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { createCanvas, loadImage } =
  require('./lib/project-tools.cjs').dependency('@napi-rs/canvas');
const sharp = require('./lib/project-tools.cjs').dependency('sharp');
const root = path.resolve(__dirname, '..'),
  qa = path.join(root, 'qa/theme-horizons-20261023');
fs.mkdirSync(qa, { recursive: true });

const preserve = JSON.parse(
  fs.readFileSync(path.join(root, 'design-source/build-inputs/theme-horizons/preserve-specs.json'))
).filter((p) => p.id !== 'red-roof');
const cfg = {
  red: { fadeStart: 180, fadeEnd: 230, roadStart: 164, index: 0 },
  culture: { index: 1 },
  industry: { fadeStart: 145, fadeEnd: 200, roadStart: 132, index: 2 },
  ecology: { fadeStart: 185, fadeEnd: 245, roadStart: 160, index: 3 }
};
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
const cream = (d, i) => {
  const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
  return r > 210 && g > 185 && b > 125 && r - g >= -3 && r - g < 60 && g - b > 15 && g - b < 105;
};
async function read(file, w, h) {
  const im = await loadImage(file),
    c = createCanvas(w || im.width, h || im.height),
    ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0, c.width, c.height);
  return { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
}
function dilate(mask, w, h, radius) {
  const out = new Float32Array(mask);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          if (x + dx < 0 || y + dy < 0 || x + dx >= w || y + dy >= h) continue;
          v = Math.max(v, mask[(y + dy) * w + x + dx]);
        }
      out[y * w + x] = v;
    }
  return out;
}
(async () => {
  fs.mkdirSync(path.join(qa, 'proposed'), { recursive: true });
  const report = {
    scope:
      'Only the top distant scenery of red/industry/ecology is edited. Existing foreground, original road, UI and all rows below 280 are protected before JPEG export. Culture is byte-identical.',
    themes: {}
  };
  for (const [theme, c] of Object.entries(cfg)) {
    const sourceBytes = fs.readFileSync(
        theme === 'culture'
          ? path.join(root, 'miniprogram/assets/journey/culture-a-v4.jpg')
          : path.join(
              root,
              'design-source/build-inputs/theme-horizons/inputs',
              theme + '-current.jpg'
            )
      ),
      source = await read(sourceBytes, 750, 1280),
      output = new Uint8ClampedArray(source.data),
      fg = new Float32Array(750 * 280),
      road = new Float32Array(750 * 280);
    let quality = null,
      edited = 0,
      roadChanged = 0,
      outsideChanged = 0,
      maxEditedRow = -1;
    if (theme !== 'culture') {
      const meta = await sharp(
        path.join(root, 'design-source/theme-horizons-20261023', theme + '-top-edited.png')
      ).metadata();
      if (Math.abs(meta.width / meta.height - 750 / 280) > 0.02)
        throw Error(theme + ' edit aspect ratio mismatch');
      const edit = await read(
        path.join(root, 'design-source/theme-horizons-20261023', theme + '-top-edited.png'),
        750,
        280
      );
      for (const p of preserve.filter((p) => p.theme === theme)) {
        const m = await read(
            path.join(
              root,
              'design-source/build-inputs/theme-horizons/preserve-masks',
              p.id + '.png'
            )
          ),
          [cx, cy, w, h] = p.box;
        for (let y = 0; y < h && cy + y < 280; y++)
          for (let x = 0; x < w; x++) {
            const i = ((y * 2 + 80) * m.w + x * 2 + 80) * 4;
            fg[(cy + y) * 750 + cx + x] = Math.max(fg[(cy + y) * 750 + cx + x], m.data[i] / 255);
          }
      }
      if (theme === 'red') {
        // Preserve only the near tiled roof, not the old mountain/village rectangle.
        const canvas = createCanvas(750, 280),
          ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        const poly = [
          [750, 107],
          [715, 105],
          [708, 101],
          [702, 106],
          [701, 116],
          [704, 125],
          [690, 140],
          [674, 155],
          [651, 172],
          [624, 189],
          [607, 196],
          [606, 208],
          [566, 202],
          [556, 200],
          [555, 207],
          [568, 217],
          [566, 225],
          [566, 280],
          [750, 280]
        ];
        poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
        const d = ctx.getImageData(0, 0, 750, 280).data;
        for (let i = 0; i < fg.length; i++) fg[i] = Math.max(fg[i], d[i * 4 + 3] / 255);
      }
      const protectedFg = dilate(fg, 750, 280, 1);
      let boundary = null;
      const bfile = path.join(root, 'design-source/build-inputs/road-boundaries', theme + '.json');
      if (fs.existsSync(bfile)) boundary = JSON.parse(fs.readFileSync(bfile));
      for (let y = c.roadStart; y < 280; y++)
        for (let x = 0; x < 750; x++) {
          const i = (y * 750 + x) * 4;
          if (
            boundary &&
            boundary.left[y] !== null &&
            x >= boundary.left[y] - 6 &&
            x <= boundary.right[y] + 6
          )
            road[y * 750 + x] = 1;
          if (x > 180 && x < 560 && (cream(source.data, i) || cream(edit.data, i)))
            road[y * 750 + x] = 1;
        }
      const protectedRoad = dilate(road, 750, 280, 2);
      // The first road rows meet the former lake. Exclude blue water from the
      // conservative road margin so it cannot survive as a blue seam in the village.
      if (theme === 'red')
        for (let y = 160; y < 180; y++)
          for (let x = 0; x < 750; x++) {
            const p = y * 750 + x,
              i = p * 4;
            if (source.data[i + 2] > source.data[i] && source.data[i + 1] > source.data[i])
              protectedRoad[p] = 0;
          }
      for (let y = 0; y < 280; y++)
        for (let x = 0; x < 750; x++) {
          const p = y * 750 + x,
            i = p * 4;
          let a =
            (1 - smooth((y - c.fadeStart) / (c.fadeEnd - c.fadeStart))) * (1 - protectedFg[p]);
          if (protectedRoad[p]) a = 0;
          if (a === 0) continue;
          for (let k = 0; k < 3; k++)
            output[i + k] = Math.round(source.data[i + k] * (1 - a) + edit.data[i + k] * a);
        }
      for (let y = 0; y < 1280; y++)
        for (let x = 0; x < 750; x++) {
          const p = y * 750 + x,
            i = p * 4;
          if ([0, 1, 2].some((k) => output[i + k] !== source.data[i + k])) {
            edited++;
            maxEditedRow = Math.max(maxEditedRow, y);
            if (y >= 280) outsideChanged++;
            if (y < 280 && protectedRoad[p]) roadChanged++;
          }
        }
      if (outsideChanged || roadChanged) throw Error(theme + ' protected pixels changed');
    }
    const canvas = createCanvas(750, 1280),
      ctx = canvas.getContext('2d'),
      d = ctx.createImageData(750, 1280);
    d.data.set(output);
    ctx.putImageData(d, 0, 0);
    fs.writeFileSync(
      path.join(qa, 'proposed', theme + '-lossless.png'),
      canvas.toBuffer('image/png')
    );
    let result = sourceBytes;
    if (theme !== 'culture') {
      const budget = require('./lib/project-tools.cjs').mapBudget(theme);
      for (const q of [92, 90, 88, 86, 84]) {
        quality = q;
        result = await sharp(Buffer.from(output), {
          raw: { width: 750, height: 1280, channels: 4 }
        })
          .jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:2:0' })
          .toBuffer();
        if (result.length <= budget) break;
      }
      if (result.length > budget) throw Error(theme + ' exceeds map export budget');
    }
    fs.writeFileSync(path.join(qa, 'proposed', theme + '-a-v4.jpg'), result);
    const thumb = createCanvas(750, 280);
    thumb.getContext('2d').drawImage(canvas, 0, 0, 750, 280, 0, 0, 750, 280);
    fs.writeFileSync(path.join(qa, 'proposed', theme + '-top.png'), thumb.toBuffer('image/png'));
    report.themes[theme] = {
      sourceSha256: sha(sourceBytes),
      resultSha256: sha(result),
      bytes: result.length,
      jpegQuality: quality,
      editedPixelsBeforeEncoding: edited,
      maxEditedRow,
      belowTopBandPixelsChangedBeforeEncoding: outsideChanged,
      roadPixelsChangedBeforeEncoding: roadChanged
    };
  }
  fs.writeFileSync(path.join(qa, 'artwork-checks.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
