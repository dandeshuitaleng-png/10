'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { sourceIdentity } = require('./lib/source-identity.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.rural-quiz-runtime/quality');

fs.mkdirSync(output, { recursive: true });
const before = sourceIdentity(root);
const tests = [
  ...fs
    .readdirSync(path.join(root, 'demo/tests'))
    .filter((file) => file.endsWith('.test.cjs'))
    .map((file) => 'demo/tests/' + file),
  ...fs
    .readdirSync(path.join(root, 'quiz-admin/tests'))
    .filter((file) => file.endsWith('.test.js'))
    .map((file) => 'quiz-admin/tests/' + file),
  ...fs
    .readdirSync(path.join(root, 'rural-culture-miniprogram/tests'))
    .filter((file) => file.endsWith('.test.cjs'))
    .map((file) => 'rural-culture-miniprogram/tests/' + file),
  'rural-culture-miniprogram/tests/v4-page.cjs',
  'rural-culture-miniprogram/tests/v4-services.cjs'
].sort();
const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=junit',
    '--test-reporter-destination=' + path.join(output, 'regression.xml'),
    ...tests
  ],
  { cwd: root, stdio: 'inherit' }
);
const after = sourceIdentity(root);
const passed = result.status === 0 && before.sourceSha256 === after.sourceSha256;
const report = {
  date: new Date().toISOString(),
  passed,
  testFiles: tests.length,
  exitCode: result.status,
  signal: result.signal,
  before,
  after,
  error: result.error?.message,
  scope:
    'Actual Node regression execution with JUnit output and source identity before/after. Not visual, device or production acceptance.'
};
fs.writeFileSync(
  path.join(output, 'regression-result.json'),
  JSON.stringify(report, null, 2) + '\n'
);
if (!passed)
  console.error('回归失败或运行期间源码发生变化，请查看 regression-result.json 和 regression.xml');
process.exitCode = passed ? 0 : 1;
