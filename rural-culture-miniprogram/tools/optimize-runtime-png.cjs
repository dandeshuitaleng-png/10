'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { dependency, workspaceRoot } = require('./lib/project-tools.cjs');
const targets = require('../../tools/project-targets.json');
const { inspectPackage } = require('./lib/mini-program-package.cjs');
const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

async function losslessPng(original) {
  const sharp = dependency('sharp');
  const metadata = await sharp(original).metadata();
  if (metadata.format !== 'png' || (metadata.pages || 1) !== 1)
    throw new Error('只处理单帧 PNG；动画和其他格式须使用各自工具');
  // Explicitly disable palette quantization: some PNG encoder options enable it.
  const candidate = await sharp(original)
    .keepMetadata()
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();
  const [before, after] = await Promise.all([
    sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(candidate).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  ]);
  if (
    before.info.width !== after.info.width ||
    before.info.height !== after.info.height ||
    !before.data.equals(after.data)
  )
    throw new Error('无损校验失败，拒绝替换素材');
  const buffer = candidate.length < original.length ? candidate : original;
  return {
    buffer,
    width: before.info.width,
    height: before.info.height,
    pixelSha256: sha(before.data),
    originalSha256: sha(original),
    optimizedSha256: sha(buffer),
    beforeBytes: original.length,
    afterBytes: buffer.length,
    savedBytes: original.length - buffer.length
  };
}

async function optimizeAsset(relative, write = false) {
  if (!/^assets\/[\w./-]+\.png$/.test(relative) || relative.split('/').includes('..'))
    throw new Error('请指定 assets/ 下的 PNG 相对路径');
  const projects = targets.map((target) => ({
    target,
    inspection: inspectPackage(path.join(workspaceRoot, target.path))
  }));
  const source = path.join(projects[0].inspection.root, relative);
  const original = fs.readFileSync(source);
  const result = await losslessPng(original);
  const destinations = projects
    .map(({ target, inspection }) => ({
      target: target.path,
      file: path.join(inspection.root, relative)
    }))
    .filter(({ file }) => fs.existsSync(file));
  for (const destination of destinations)
    if (sha(fs.readFileSync(destination.file)) !== result.originalSha256)
      throw new Error(`独立工程素材已分叉，拒绝覆盖：${destination.target}/${relative}`);
  if (write && result.savedBytes > 0) {
    for (const destination of destinations) {
      const temporary = destination.file + '.optimizing';
      fs.writeFileSync(temporary, result.buffer, { flag: 'wx' });
      fs.renameSync(temporary, destination.file);
    }
  }
  const { buffer: _buffer, ...evidence } = result;
  return {
    asset: relative,
    ...evidence,
    written: write && result.savedBytes > 0,
    projects: destinations.map((item) => item.target),
    scope:
      'PNG container optimization; dimensions, decoded RGBA and transparency verified identical. Original design source and high-resolution files are unchanged.'
  };
}

if (require.main === module)
  optimizeAsset(process.argv[2] || '', process.argv.includes('--write'))
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
module.exports = { losslessPng, optimizeAsset };
