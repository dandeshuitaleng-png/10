'use strict';
// Native Vision supplies foreground masks; every displayed landmark color comes
// from the approved original. No generative painting, cloning or color treatment.
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { createCanvas, loadImage } =
  require('./lib/project-tools.cjs').dependency('@napi-rs/canvas');
const root = path.resolve(__dirname, '..'),
  qa = path.join(root, 'qa/landmark-cutouts-20261023');
fs.mkdirSync(qa, { recursive: true });

const source = path.join(root, 'design-source/build-inputs/landmark-cutouts/original');
const specs = [
  { theme: 'red', id: 'memorial', crop: [0, 80, 220, 215], anchor: [62, 175], scale: 1.15 },
  {
    theme: 'red',
    id: 'rocks',
    crop: [545, 550, 205, 240],
    anchor: [750, 755],
    scale: 1.18,
    padded: true
  },
  { theme: 'culture', id: 'scroll', crop: [0, 0, 235, 160], anchor: [70, 75], scale: 1.12 },
  { theme: 'culture', id: 'bench', crop: [530, 575, 220, 205], anchor: [650, 665], scale: 1.18 },
  { theme: 'industry', id: 'granary', crop: [0, 120, 215, 150], anchor: [68, 200], scale: 1.2 },
  {
    theme: 'industry',
    id: 'tea',
    crop: [510, 595, 240, 245],
    anchor: [750, 810],
    scale: 1.18,
    padded: true
  }
];
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
const roadAt = (road, x, y) => {
  y = Math.round(y);
  return (
    y >= 0 && y < 1280 && road.left[y] !== null && x >= road.left[y] - 12 && x <= road.right[y] + 12
  );
};
const lerp = (data, w, h, x, y, k, channels = 4) => {
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return 0;
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    x2 = Math.min(w - 1, ix + 1),
    y2 = Math.min(h - 1, iy + 1);
  return (
    (data[(iy * w + ix) * channels + k] * (1 - fx) + data[(iy * w + x2) * channels + k] * fx) *
      (1 - fy) +
    (data[(y2 * w + ix) * channels + k] * (1 - fx) + data[(y2 * w + x2) * channels + k] * fx) * fy
  );
};
async function read(file) {
  const im = await loadImage(file),
    c = createCanvas(im.width, im.height),
    ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0);
  return { w: im.width, h: im.height, data: ctx.getImageData(0, 0, im.width, im.height).data };
}
(async () => {
  fs.mkdirSync(path.join(qa, 'proposed'), { recursive: true });
  fs.mkdirSync(path.join(qa, 'cutouts'), { recursive: true });
  const report = {
    method:
      'Foreground-only masks from local Vision; approved source pixels enlarged around fixed object anchors. No background fill, cloning, redraw or color treatment. Road and all other pixels protected before JPEG encoding.',
    themes: {}
  };
  for (const theme of ['red', 'culture', 'industry', 'ecology']) {
    const original = fs.readFileSync(path.join(source, theme + '-a-v4.jpg')),
      input = await read(original),
      output = new Uint8ClampedArray(input.data),
      allAlpha = new Float32Array(750 * 1280);
    const patches = specs.filter((p) => p.theme === theme),
      road = patches.length
        ? JSON.parse(
            fs.readFileSync(
              path.join(root, 'design-source/build-inputs/road-boundaries', theme + '.json')
            )
          )
        : null;
    for (const p of patches) {
      const [cx, cy, w, h] = p.crop,
        m = await read(
          path.join(
            root,
            'design-source/build-inputs/landmark-cutouts',
            p.padded ? 'padded-masks' : 'masks',
            p.id + '.png'
          )
        ),
        pad = p.padded ? 80 : 0,
        mask = new Float32Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const v = lerp(m.data, m.w, m.h, x * 2 + pad, y * 2 + pad, 0) / 255;
          mask[y * w + x] = roadAt(road, x + cx, y + cy) ? 0 : v;
        }
      const cut = createCanvas(w, h),
        cutctx = cut.getContext('2d'),
        cutData = cutctx.createImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x,
            s = ((y + cy) * 750 + x + cx) * 4;
          for (let k = 0; k < 3; k++) cutData.data[i * 4 + k] = input.data[s + k];
          cutData.data[i * 4 + 3] = Math.round(mask[i] * 255);
        }
      cutctx.putImageData(cutData, 0, 0);
      fs.writeFileSync(path.join(qa, 'cutouts', p.id + '.png'), cut.toBuffer('image/png'));
      const destLeft = Math.max(0, Math.floor(p.anchor[0] + (cx - p.anchor[0]) * p.scale) - 1),
        destRight = Math.min(749, Math.ceil(p.anchor[0] + (cx + w - p.anchor[0]) * p.scale) + 1),
        destTop = Math.max(0, Math.floor(p.anchor[1] + (cy - p.anchor[1]) * p.scale) - 1),
        destBottom = Math.min(1279, Math.ceil(p.anchor[1] + (cy + h - p.anchor[1]) * p.scale) + 1);
      for (let y = Math.min(cy, destTop); y <= Math.max(cy + h - 1, destBottom); y++)
        for (let x = Math.min(cx, destLeft); x <= Math.max(cx + w - 1, destRight); x++) {
          if (roadAt(road, x, y)) continue;
          const sx = p.anchor[0] + (x - p.anchor[0]) / p.scale,
            sy = p.anchor[1] + (y - p.anchor[1]) / p.scale;
          const oldA = lerp(mask, w, h, x - cx, y - cy, 0, 1),
            newA = lerp(mask, w, h, sx - cx, sy - cy, 0, 1),
            i = (y * 750 + x) * 4;
          if (oldA === 0 && newA === 0) continue;
          allAlpha[y * 750 + x] = Math.max(oldA, newA);
          for (let k = 0; k < 3; k++) {
            const base = output[i + k];
            output[i + k] = Math.round(
              base * (1 - newA) + lerp(input.data, 750, 1280, sx, sy, k) * newA
            );
          }
        }
    }
    let outsideChanged = 0,
      roadChanged = 0,
      changed = 0;
    for (let i = 0; i < 750 * 1280; i++)
      if ([0, 1, 2].some((k) => output[i * 4 + k] !== input.data[i * 4 + k])) {
        changed++;
        if (allAlpha[i] === 0) outsideChanged++;
        if (road && roadAt(road, i % 750, Math.floor(i / 750))) roadChanged++;
      }
    if (outsideChanged || roadChanged) throw Error(theme + ' protected pixels changed');
    const c = createCanvas(750, 1280),
      ctx = c.getContext('2d'),
      d = ctx.createImageData(750, 1280);
    d.data.set(output);
    ctx.putImageData(d, 0, 0);
    fs.writeFileSync(path.join(qa, 'proposed', theme + '-lossless.png'), c.toBuffer('image/png'));
    const result = patches.length ? c.toBuffer('image/jpeg', 94) : original;
    fs.writeFileSync(path.join(qa, 'proposed', theme + '-a-v4.jpg'), result);
    report.themes[theme] = {
      sourceSha256: hash(original),
      resultSha256: hash(result),
      bytes: result.length,
      patches,
      changedPixels: changed,
      outsideSilhouettesChangedBeforeEncoding: outsideChanged,
      roadPixelsChangedBeforeEncoding: roadChanged
    };
  }
  fs.writeFileSync(path.join(qa, 'artwork-checks.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
