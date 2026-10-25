'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..'),
  out = path.join(root, 'qa/art-refinement-20261022');
fs.mkdirSync(out, { recursive: true });
const projects = [
    root,
    ...['十步芳草', '千年文脉', '金色产业', '青山绿水'].map((n) =>
      path.resolve(root, '../交付/微信小程序四套', n)
    )
  ],
  checks = [];
for (const project of projects) {
  execFileSync(process.execPath, [path.join(__dirname, 'v4-check.cjs'), project], {
    stdio: 'pipe'
  });
  const r = JSON.parse(fs.readFileSync(path.join(project, 'qa-v4/compile-report.json')));
  checks.push({ name: path.basename(project), ...r });
  console.log(path.basename(project) + ' ' + r.passed + ' ' + r.mib + ' MiB');
}
fs.writeFileSync(
  path.join(out, 'compile-checks.json'),
  JSON.stringify(
    { passed: checks.every((c) => c.passed && c.mainPackageUnder2MiB), checks },
    null,
    2
  ) + '\n'
);
if (checks.some((c) => !c.passed || !c.mainPackageUnder2MiB)) process.exitCode = 1;
