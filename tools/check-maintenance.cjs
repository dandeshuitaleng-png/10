'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const manifest = require('./maintenance-files.json');

(async () => {
  const scripts = manifest.files.filter((file) => file.endsWith('.cjs'));
  if (process.argv.includes('--lint')) {
    const { ESLint } = require('eslint');
    const eslint = new ESLint({ cwd: root, fix: process.argv.includes('--fix') });
    const results = await eslint.lintFiles(scripts);
    if (process.argv.includes('--fix')) await ESLint.outputFixes(results);
    const formatter = await eslint.loadFormatter('stylish');
    const output = formatter.format(results);
    if (output) console.log(output);
    if (results.some((result) => result.errorCount || result.warningCount)) process.exitCode = 1;
    return;
  }
  for (const file of scripts)
    new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
  const python = manifest.files.filter((file) => file.endsWith('.py'));
  if (python.length) {
    const result = spawnSync(
      process.env.RURAL_PYTHON || 'python3',
      [
        '-c',
        'import ast,sys; [ast.parse(open(p,encoding="utf-8").read(),filename=p) for p in sys.argv[1:]]',
        ...python.map((file) => path.join(root, file))
      ],
      { stdio: 'inherit' }
    );
    if (result.status !== 0) throw new Error('Python syntax check failed');
  }
  console.log(
    JSON.stringify({
      passed: true,
      javascript: scripts.length,
      python: python.length,
      scope:
        'Maintained tools syntax only; browser/native/asset-mutating scripts were not executed.'
    })
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
