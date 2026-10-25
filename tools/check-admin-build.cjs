'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const policy = require('./admin-budget.json');
const root = path.resolve(__dirname, '..');

async function verifyAdminMount() {
  const admin = path.join(root, 'quiz-admin');
  const vite = await import(pathToFileURL(require.resolve('vite', { paths: [admin] })).href);
  const config = await vite.resolveConfig({ root: admin }, 'build');
  if (config.base !== '/management/')
    throw new Error('后台资源须从 /management/ 加载，否则延迟样式无法由现有服务提供');
  return config.base;
}

function inspectAdminBuild(dist) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dist, '.vite/manifest.json'), 'utf8'));
  const entries = Object.keys(manifest).filter((name) => manifest[name].isEntry);
  if (!entries.length) throw new Error('后台构建没有入口，请重新构建');
  const initial = new Set(),
    visited = new Set();
  function visit(name) {
    if (visited.has(name)) return;
    visited.add(name);
    const chunk = manifest[name];
    if (!chunk) throw new Error('后台构建缺少依赖：' + name);
    initial.add(chunk.file);
    for (const stylesheet of chunk.css || []) initial.add(stylesheet);
    for (const imported of chunk.imports || []) visit(imported);
  }
  for (const name of entries) visit(name);
  const all = new Set(
    Object.values(manifest).flatMap((chunk) => [chunk.file, ...(chunk.css || [])])
  );
  const bytes = (file) => {
    const absolute = path.resolve(dist, file);
    if (!absolute.startsWith(path.resolve(dist) + path.sep))
      throw new Error('构建产物越过 dist 目录');
    return fs.statSync(absolute).size;
  };
  const sum = (files, suffix) =>
    [...files]
      .filter((file) => file.endsWith(suffix))
      .reduce((total, file) => total + bytes(file), 0);
  const initialJavaScriptBytes = sum(initial, '.js');
  return {
    date: new Date().toISOString(),
    passed: initialJavaScriptBytes <= policy.maximumInitialJavaScriptBytes,
    policy,
    initialJavaScriptBytes,
    initialCssBytes: sum(initial, '.css'),
    totalJavaScriptBytes: sum(all, '.js'),
    totalCssBytes: sum(all, '.css'),
    initialFiles: [...initial],
    deferredFiles: [...all].filter((file) => !initial.has(file)),
    scope:
      'Static Vite dependency graph and actual build bytes; excludes deferred editor/table/detail chunks. Browser interaction and network behavior require separate validation.'
  };
}
if (require.main === module)
  (async () => {
    await verifyAdminMount();
    const report = inspectAdminBuild(path.join(root, 'quiz-admin/dist'));
    const file = path.join(root, '.rural-quiz-runtime/quality/admin-build-report.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { inspectAdminBuild, verifyAdminMount };
