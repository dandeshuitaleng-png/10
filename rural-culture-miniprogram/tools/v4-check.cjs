'use strict';
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const project = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const configFile = path.join(project, 'project.config.json');
const configuration = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const root = path.resolve(project, configuration.miniprogramRoot || 'miniprogram');
const output = path.resolve(project, 'qa-v4'); fs.mkdirSync(output, { recursive: true });
const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const all = files(root), errors = [], checks = [];
for (const file of all) {
  if (file.endsWith('.json')) { try { JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { errors.push(path.relative(root, file) + ': ' + error.message); } }
  if (file.endsWith('.js')) { const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }); if (result.status !== 0) errors.push(result.stderr || result.stdout || String(result.error)); }
}
checks.push({ name: 'JSON and JavaScript syntax', passed: errors.length === 0, fileCount: all.length });
const bins = '/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec';
for (const [extension, compiler] of [['.wxml', 'wcc'], ['.wxss', 'wcsc']]) {
  const group = all.filter(file => file.endsWith(extension)).map(file => path.relative(root, file));
  if (!group.length) { errors.push('No ' + extension + ' files'); continue; }
  const executable = path.join(bins, compiler);
  if (!fs.existsSync(executable)) { errors.push('WeChat compiler unavailable: ' + compiler); checks.push({ name: compiler, passed: false, unavailable: true }); continue; }
  const result = spawnSync(executable, ['-o', path.join(output, 'compiled-' + compiler + '.js'), ...group], { cwd: root, encoding: 'utf8' });
  const passed = result.status === 0; checks.push({ name: compiler, passed, fileCount: group.length, exitCode: result.status });
  if (!passed) errors.push(result.stderr || result.stdout || String(result.error));
}
const ignored = (configuration.packOptions?.ignore || []).map(rule => ({ ...rule, value: String(rule.value || '').replace(/^\.\//, '').replace(/^\//, '').replace(/\/$/, '') }));
const included = (configuration.packOptions?.include || []).map(rule => ({ ...rule, value: String(rule.value || '').replace(/^\.\//, '').replace(/^\//, '').replace(/\/$/, '') }));
const matches = (relative, rule) => rule.type === 'folder' ? relative === rule.value || relative.startsWith(rule.value + '/') : rule.type === 'file' ? relative === rule.value : rule.type === 'suffix' ? relative.endsWith(rule.value) : rule.type === 'prefix' ? relative.startsWith(rule.value) : false;
const packed = all.filter(file => { const relative = path.relative(root, file).split(path.sep).join('/'); return included.some(rule => matches(relative, rule)) || !ignored.some(rule => matches(relative, rule)); });
const physicalBytes = all.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const bytes = packed.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const report = { date: new Date().toISOString(), project, miniprogramRoot: root, passed: errors.length === 0, evidenceScope: 'JSON/JS static syntax plus native WXML/WXSS compiler; effective package bytes follow packOptions file/folder/prefix/suffix excludes; not runtime, device, backend or upload acceptance', checks, physicalBytes, physicalFiles: all.length, packedFiles: packed.length, bytes, mib: Number((bytes / 1048576).toFixed(3)), mainPackageUnder2MiB: bytes < 2 * 1048576, excludedFiles: all.filter(file => !packed.includes(file)).map(file => path.relative(root, file)), errors };
fs.writeFileSync(path.join(output, 'compile-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2)); if (errors.length) process.exitCode = 1;
module.exports = report;
