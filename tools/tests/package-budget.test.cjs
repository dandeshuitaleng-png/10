'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const {
  inspectPackage,
  packageSummary
} = require('../../rural-culture-miniprogram/tools/lib/mini-program-package.cjs');

test('native compile check fails an oversized package even when both native compilers succeed', (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-package-limit-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.mkdirSync(path.join(project, 'miniprogram'));
  fs.writeFileSync(
    path.join(project, 'project.config.json'),
    JSON.stringify({ miniprogramRoot: 'miniprogram/' })
  );
  fs.writeFileSync(path.join(project, 'miniprogram/index.wxml'), '<view>Package fixture</view>');
  fs.writeFileSync(path.join(project, 'miniprogram/index.wxss'), 'page { color: black; }');
  fs.writeFileSync(path.join(project, 'miniprogram/payload.bin'), Buffer.alloc(2 * 1024 * 1024));
  const script = path.resolve(__dirname, '../../rural-culture-miniprogram/tools/v4-check.cjs');
  const actualRequire = createRequire(script);
  const mod = { exports: {} };
  const load = (name) => {
    if (name === 'node:child_process')
      return { spawnSync: () => ({ status: 0, stdout: '', stderr: '' }) };
    if (name === 'node:fs')
      return {
        ...fs,
        existsSync: (file) => /wcc-exec\/(wcc|wcsc)$/.test(file) || fs.existsSync(file)
      };
    return actualRequire(name);
  };
  load.main = mod;
  const processFixture = {
    argv: [process.execPath, script, project],
    execPath: process.execPath,
    env: {},
    exitCode: 0
  };
  vm.runInNewContext(
    fs.readFileSync(script, 'utf8'),
    {
      require: load,
      module: mod,
      __dirname: path.dirname(script),
      process: processFixture,
      console: { log() {}, error() {} },
      Buffer
    },
    { filename: script }
  );
  const report = JSON.parse(fs.readFileSync(path.join(project, 'qa-v4/compile-report.json')));
  assert.ok(
    report.checks
      .filter((check) => ['wcc', 'wcsc'].includes(check.name))
      .every((check) => check.passed)
  );
  assert.equal(report.mainPackageUnder2MiB, false);
  assert.equal(report.passed, false, 'oversized packages must not be reported as passed');
  assert.equal(processFixture.exitCode, 1);
});

test('package accounting honors explicit includes and each supported ignore rule', (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-pack-options-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  fs.mkdirSync(path.join(project, 'miniprogram/unused'), { recursive: true });
  fs.writeFileSync(
    path.join(project, 'project.config.json'),
    JSON.stringify({
      packOptions: {
        ignore: [
          { type: 'folder', value: './unused/' },
          { type: 'file', value: 'one.png' },
          { type: 'prefix', value: 'skip-' },
          { type: 'suffix', value: '.tmp' }
        ],
        include: [{ type: 'file', value: 'unused/keep.png' }]
      }
    })
  );
  for (const file of [
    'unused/keep.png',
    'unused/omit.png',
    'one.png',
    'skip-a.png',
    'scratch.tmp',
    'main.js'
  ])
    fs.writeFileSync(path.join(project, 'miniprogram', file), '123');
  const info = inspectPackage(project);
  assert.deepEqual(info.packed.map((file) => file.relative).sort(), ['main.js', 'unused/keep.png']);
  assert.equal(packageSummary(info).bytes, 6);
  assert.equal(
    packageSummary(info, { maximumBytes: 10, minimumHeadroomBytes: 5 }).budget.passed,
    false
  );
  assert.equal(
    packageSummary(info, { maximumBytes: 10, minimumHeadroomBytes: 4 }).budget.passed,
    true
  );
});
