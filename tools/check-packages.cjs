'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  inspectPackage,
  packageSummary
} = require('../rural-culture-miniprogram/tools/lib/mini-program-package.cjs');
const targets = require('./project-targets.json');
const root = path.resolve(__dirname, '..');

function checkPackages(native = false) {
  const inspections = targets.map((target) => ({
    target,
    inspection: inspectPackage(path.join(root, target.path))
  }));
  const source = inspections[0].inspection;
  const isShared = (relative) =>
    /^(pages\/game|components|services-v4)\//.test(relative) &&
    relative !== 'services-v4/catalog.js';
  const shared = source.files.filter(({ relative }) => isShared(relative));
  const projects = inspections.map(({ target, inspection }) => {
    const summary = packageSummary(inspection);
    const differences = [];
    if (target.id !== 'mother') {
      const expected = new Set(shared.map((file) => file.relative));
      for (const file of shared) {
        const destination = path.join(inspection.root, file.relative);
        if (
          !fs.existsSync(destination) ||
          !fs.readFileSync(file.absolute).equals(fs.readFileSync(destination))
        )
          differences.push(file.relative);
      }
      for (const file of inspection.files)
        if (isShared(file.relative) && !expected.has(file.relative))
          differences.push(file.relative);
    }
    let compiled = null;
    if (native) {
      try {
        compiled = JSON.parse(
          execFileSync(
            process.execPath,
            [path.join(root, 'rural-culture-miniprogram/tools/v4-check.cjs'), inspection.project],
            { encoding: 'utf8', maxBuffer: 2e6 }
          )
        );
      } catch (error) {
        compiled = { passed: false, error: error.stderr?.toString() || error.message };
      }
    }
    return {
      id: target.id,
      project: target.path,
      bytes: summary.bytes,
      mib: summary.mib,
      budget: summary.budget,
      sharedFiles: shared.length,
      differences,
      nativeCompilation: compiled,
      passed: summary.budget.passed && differences.length === 0 && (!native || compiled.passed)
    };
  });
  return {
    date: new Date().toISOString(),
    passed: projects.every((project) => project.passed),
    scope: native
      ? 'Five native compiler runs, shared-source consistency and internal budgets; no physical device or upload acceptance.'
      : 'Five package inventories, shared-source consistency and internal budgets only; no native compilation, device or upload acceptance.',
    projects
  };
}
if (require.main === module) {
  const native = process.argv.includes('--native');
  const report = checkPackages(native);
  const output = path.join(
    root,
    '.rural-quiz-runtime/quality',
    native ? 'native-package-report.json' : 'package-report.json'
  );
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
module.exports = { checkPackages };
