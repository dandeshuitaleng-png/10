'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const prettier = require('prettier');
const files = require('./quality-files.json');
const root = path.resolve(__dirname, '..');

(async () => {
  const write = process.argv.includes('--write');
  let different = 0;
  for (const file of files) {
    const absolute = path.join(root, file);
    const original = await fs.readFile(absolute, 'utf8');
    const config = await prettier.resolveConfig(absolute);
    const formatted = await prettier.format(original, { ...config, filepath: absolute });
    if (formatted === original) continue;
    different++;
    if (write) await fs.writeFile(absolute, formatted);
    else console.error(`Format differs: ${file}`);
  }
  console.log(
    `${files.length} maintained files checked; ${different} ${write ? 'formatted' : 'differ'}`
  );
  if (!write && different) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
