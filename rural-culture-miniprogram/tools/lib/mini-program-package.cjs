'use strict';
const fs = require('node:fs');
const path = require('node:path');
const budget = require('../../../tools/package-budget.json');

function rules(values = []) {
  return values.map((rule) => {
    if (!['file', 'folder', 'prefix', 'suffix'].includes(rule.type))
      throw new Error(`不支持的包体规则类型：${rule.type}`);
    return {
      ...rule,
      value: String(rule.value || '')
        .replace(/\\/g, '/')
        .replace(/^\.\//, '')
        .replace(/^\//, '')
        .replace(/\/$/, '')
    };
  });
}
function matches(file, rule) {
  if (rule.type === 'folder') return file === rule.value || file.startsWith(rule.value + '/');
  if (rule.type === 'file') return file === rule.value;
  if (rule.type === 'prefix') return file.startsWith(rule.value);
  return file.endsWith(rule.value);
}
function walkFiles(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`小程序资源不允许符号链接：${file}`);
    return entry.isDirectory() ? walkFiles(file) : entry.isFile() ? [file] : [];
  });
}
function inspectPackage(project) {
  project = path.resolve(project);
  const configuration = JSON.parse(
    fs.readFileSync(path.join(project, 'project.config.json'), 'utf8')
  );
  const root = path.resolve(project, configuration.miniprogramRoot || 'miniprogram');
  if (!root.startsWith(project + path.sep)) throw new Error('小程序根目录须位于工程内部');
  const ignored = rules(configuration.packOptions?.ignore);
  const included = rules(configuration.packOptions?.include);
  const files = walkFiles(root).map((absolute) => ({
    absolute,
    relative: path.relative(root, absolute).split(path.sep).join('/'),
    bytes: fs.statSync(absolute).size
  }));
  const packed = files.filter(
    ({ relative }) =>
      included.some((rule) => matches(relative, rule)) ||
      !ignored.some((rule) => matches(relative, rule))
  );
  return { project, root, configuration, files, packed };
}
function packageSummary(inspection, policy = budget) {
  const bytes = inspection.packed.reduce((total, file) => total + file.bytes, 0);
  const headroomBytes = policy.maximumBytes - bytes;
  const withinBudget = bytes < policy.maximumBytes && headroomBytes >= policy.minimumHeadroomBytes;
  return {
    physicalBytes: inspection.files.reduce((total, file) => total + file.bytes, 0),
    physicalFiles: inspection.files.length,
    packedFiles: inspection.packed.length,
    bytes,
    mib: Number((bytes / 1048576).toFixed(3)),
    mainPackageUnder2MiB: bytes < 2 * 1048576,
    budget: { ...policy, headroomBytes, passed: withinBudget },
    excludedFiles: inspection.files
      .filter((file) => !inspection.packed.includes(file))
      .map((file) => file.relative)
  };
}
module.exports = { inspectPackage, packageSummary, budget };
