'use strict';
// Rasterize installed Lucide source glyphs; WeChat ships PNGs without a runtime dependency.
const fs = require('node:fs'),
  path = require('node:path');
const tools = require('./lib/project-tools.cjs');
const lucide = tools.dependency('lucide'),
  sharp = tools.dependency('sharp');
const root = path.resolve(__dirname, '..'),
  dest = path.join(root, 'miniprogram/assets/icons'),
  source = path.join(root, 'design-source/ui-icons-20261022');
const glyphs = {
  back: 'ChevronLeft',
  next: 'ChevronRight',
  book: 'BookOpen',
  certificate: 'FileBadge',
  check: 'Check',
  clock: 'Clock3',
  close: 'X',
  flag: 'Flag',
  info: 'Info',
  leaf: 'Leaf',
  lock: 'LockKeyhole',
  play: 'Play',
  points: 'Trophy',
  rank: 'ChartColumnIncreasing',
  refresh: 'RefreshCw',
  settings: 'Settings',
  share: 'Share2',
  'sound-on': 'Volume2',
  'sound-off': 'VolumeX',
  wheat: 'Wheat',
  music: 'Music2',
  effects: 'AudioLines'
};
const aliases = {
  points: 'points-ui',
  rank: 'rank-ui',
  certificate: 'certificate-ui',
  book: 'book-ui'
};
const escape = (s) => String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
(async () => {
  fs.mkdirSync(source, { recursive: true });
  fs.mkdirSync(path.join(source, 'before'), { recursive: true });
  const records = [];
  for (const [name, glyph] of Object.entries(glyphs)) {
    if (!lucide[glyph]) throw Error('Missing library glyph ' + glyph);
    const nodes = lucide[glyph]
      .map(
        ([tag, attrs]) =>
          '<' +
          tag +
          ' ' +
          Object.entries(attrs)
            .map(([k, v]) => k + '="' + escape(v) + '"')
            .join(' ') +
          '/>'
      )
      .join('');
    for (const [suffix, color] of [
      ['', '#5B5748'],
      ['-white', '#FFFFFF']
    ]) {
      const file = name + suffix + '.png',
        existing = path.join(dest, file),
        backup = path.join(source, 'before', file);
      if (fs.existsSync(existing) && !fs.existsSync(backup)) fs.copyFileSync(existing, backup);
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="' +
        color +
        '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        nodes +
        '</svg>';
      fs.writeFileSync(path.join(source, name + suffix + '.svg'), svg);
      await sharp(Buffer.from(svg)).png({ palette: true, effort: 10 }).toFile(existing);
      if (!suffix && aliases[name])
        fs.copyFileSync(existing, path.join(dest, aliases[name] + '.png'));
    }
    records.push({
      name,
      glyph,
      stroke: 1.8,
      viewBox: 24,
      raster: 72,
      alias: aliases[name] || null
    });
  }
  fs.copyFileSync(tools.packageFile('lucide', 'LICENSE'), path.join(source, 'LICENSE.txt'));
  fs.copyFileSync(path.join(source, 'LICENSE.txt'), path.join(dest, 'LUCIDE-LICENSE.txt'));
  fs.writeFileSync(
    path.join(source, 'manifest.json'),
    JSON.stringify(
      {
        library: 'lucide',
        version: JSON.parse(fs.readFileSync(tools.packageFile('lucide', 'package.json'), 'utf8'))
          .version,
        source: 'https://lucide.dev',
        roles: { auxiliary: 16, regular: 20, entry: 24 },
        records
      },
      null,
      2
    ) + '\n'
  );
  console.log(
    JSON.stringify({ passed: true, glyphs: records.length, stroke: 1.8, roles: [16, 20, 24] })
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
