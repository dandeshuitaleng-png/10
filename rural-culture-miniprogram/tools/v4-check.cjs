'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { inspectPackage, packageSummary } = require('./lib/mini-program-package.cjs');

function checkProject(project) {
  const inspection = inspectPackage(project);
  const output = path.join(inspection.project, 'qa-v4');
  fs.mkdirSync(output, { recursive: true });
  const errors = [],
    checks = [];
  for (const { absolute, relative } of inspection.files) {
    if (absolute.endsWith('.json')) {
      try {
        JSON.parse(fs.readFileSync(absolute, 'utf8'));
      } catch (error) {
        errors.push(relative + ': ' + error.message);
      }
    }
    if (absolute.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8' });
      if (result.status !== 0) errors.push(result.stderr || result.stdout || String(result.error));
    }
  }
  checks.push({
    name: 'JSON and JavaScript syntax',
    passed: errors.length === 0,
    fileCount: inspection.files.length
  });
  const bins =
    process.env.WECHAT_COMPILER_ROOT ||
    '/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec';
  for (const [extension, compiler] of [
    ['.wxml', 'wcc'],
    ['.wxss', 'wcsc']
  ]) {
    const group = inspection.files
      .filter((file) => file.relative.endsWith(extension))
      .map((file) => file.relative);
    if (!group.length) {
      errors.push('No ' + extension + ' files');
      continue;
    }
    const executable = path.join(bins, compiler);
    if (!fs.existsSync(executable)) {
      errors.push('WeChat compiler unavailable: ' + compiler);
      checks.push({ name: compiler, passed: false, unavailable: true });
      continue;
    }
    const result = spawnSync(
      executable,
      ['-o', path.join(output, 'compiled-' + compiler + '.js'), ...group],
      { cwd: inspection.root, encoding: 'utf8' }
    );
    checks.push({
      name: compiler,
      passed: result.status === 0,
      fileCount: group.length,
      exitCode: result.status
    });
    if (result.status !== 0) errors.push(result.stderr || result.stdout || String(result.error));
  }
  const summary = packageSummary(inspection);
  checks.push({ name: 'Engineering package budget and headroom', passed: summary.budget.passed });
  if (!summary.budget.passed)
    errors.push(
      `工程包体预算不满足：${summary.bytes}字节，余量${summary.budget.headroomBytes}字节，要求至少保留${summary.budget.minimumHeadroomBytes}字节`
    );
  const report = {
    date: new Date().toISOString(),
    project: inspection.project,
    miniprogramRoot: inspection.root,
    passed: errors.length === 0,
    evidenceScope:
      'JSON/JS syntax, native WXML/WXSS compilation and internal package budget. Not device, deployed backend, WeChat upload size or contract numerical limits.',
    checks,
    ...summary,
    errors
  };
  fs.writeFileSync(
    path.join(output, 'compile-report.json'),
    JSON.stringify(report, null, 2) + '\n'
  );
  return report;
}
if (require.main === module) {
  const report = checkProject(process.argv[2] || path.join(__dirname, '..'));
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
module.exports = { checkProject };
