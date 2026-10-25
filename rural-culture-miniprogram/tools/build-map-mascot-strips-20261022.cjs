'use strict';
// Cache frames of the shipped original-pixel renderer; no new character art.
const fs = require('node:fs'),
  path = require('node:path'),
  { execFileSync } = require('node:child_process');
const { createCanvas, loadImage } =
  require('./lib/project-tools.cjs').dependency('@napi-rs/canvas');
const { rigs } = require('../miniprogram/services-v4/mascot-rig'),
  { geometry, paint, angleAt } = require('../miniprogram/services-v4/mascot-canvas');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'miniprogram/assets/brand/map-motion');
fs.mkdirSync(out, { recursive: true });
const requested = process.argv.slice(2),
  poses = requested.length ? requested : ['welcome', 'celebrate', 'observe', 'think'];
if (poses.some((pose) => !['welcome', 'celebrate', 'observe', 'think'].includes(pose)))
  throw Error('Unknown seasonal pose');
(async () => {
  for (const pose of poses) {
    const rig = rigs[pose],
      image = await loadImage(path.join(root, 'miniprogram', rig.source)),
      w = rig.spriteFrameWidth || 160,
      h = Math.round((w * rig.height) / rig.width),
      count = rig.spriteFrames || 16,
      rows = Math.ceil(count / 16),
      canvas = createCanvas(w * 16, h * rows * 2),
      ctx = canvas.getContext('2d'),
      mesh = geometry(rig);
    // Rasterize at the same origin for every frame; translating the mesh around
    // a large atlas can introduce subpixel edge differences even in fixed feet.
    const frame = createCanvas(w, h),
      fc = frame.getContext('2d');
    fc.scale(w / rig.width, h / rig.height);
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < count; i++) {
        paint(
          fc,
          image,
          rig,
          mesh,
          angleAt(i / (count - 1), rig.gesture.angles, row ? 1 : 0.55, rig.gesture)
        );
        ctx.drawImage(frame, w * (i % 16), h * (row * rows + Math.floor(i / 16)));
      }
    const file = path.join(out, pose + '.png');
    fs.writeFileSync(file, canvas.toBuffer('image/png'));
    execFileSync(process.env.RURAL_PYTHON || 'python3', [
      '-c',
      'from PIL import Image; import sys; p=sys.argv[1]; im=Image.open(p); im.quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(p,optimize=True)',
      file
    ]);
    console.log(
      JSON.stringify({
        pose,
        framesPerAction: count,
        width: w * 16,
        height: h * rows * 2,
        bytes: fs.statSync(file).size
      })
    );
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
