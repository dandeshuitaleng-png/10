'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const {
  inspectPackage,
  packageSummary,
  budget: packagePolicy
} = require('./mini-program-package.cjs');

const projectRoot = path.resolve(__dirname, '../..');
const workspaceRoot = path.dirname(projectRoot);

function dependencyPath(name) {
  const roots = [
    process.env.CODEX_UI_DEPENDENCIES,
    path.join(projectRoot, 'tools'),
    workspaceRoot
  ].filter(Boolean);
  for (const root of roots) {
    try {
      return createRequire(path.join(path.resolve(root), '__tool_loader.cjs')).resolve(name);
    } catch (error) {
      if (!['MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'].includes(error.code)) throw error;
    }
  }
  throw new Error(`缺少工具依赖 ${name}，请执行 npm ci --prefix rural-culture-miniprogram/tools`);
}

function dependency(name) {
  return require(dependencyPath(name));
}

function packageFile(name, filename) {
  let folder = path.dirname(dependencyPath(name));
  while (path.dirname(folder) !== folder) {
    const manifest = path.join(folder, 'package.json');
    if (fs.existsSync(manifest) && JSON.parse(fs.readFileSync(manifest, 'utf8')).name === name) {
      const result = path.resolve(folder, filename);
      if (!result.startsWith(folder + path.sep)) throw new Error('包内文件路径不正确');
      return result;
    }
    folder = path.dirname(folder);
  }
  throw new Error(`无法定位 ${name} 的包目录`);
}

function loopbackBase(value, fallback) {
  const url = new URL(value || fallback);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error('检查地址须为不含凭据和路径的本机 HTTP/HTTPS 地址');
  }
  return url.origin;
}

function reviewBase() {
  return loopbackBase(process.env.RURAL_PREVIEW_BASE, 'http://127.0.0.1:6499');
}

function wechatCli() {
  return process.env.WECHATIDE_CLI || 'wechatide';
}

function reviewProject(theme) {
  const base = path.resolve(
    process.env.RURAL_REVIEW_PROJECT ||
      path.join(workspaceRoot, '.rural-quiz-runtime/art-refinement-review-20261022')
  );
  const file = path.join(base, 'miniprogram/game-config.js');
  if (!fs.existsSync(file))
    throw new Error('请先运行 prepare-art-refinement-review-20261022.cjs 创建隔离评审工程');
  const config = require(file);
  if (config.mode !== 'mock' || !config.reviewEnabled)
    throw new Error('原生检查只能使用隔离评审工程，不能操作正式连接');
  if (!theme) return base;
  if (!['red', 'culture', 'industry', 'ecology'].includes(theme)) throw new Error('未知评审主题');
  const target = path.join(workspaceRoot, '.rural-quiz-runtime', 'maintenance-review-' + theme);
  const existing = path.join(target, 'miniprogram/game-config.js');
  if (fs.existsSync(existing) && require(existing).mode !== 'mock')
    throw new Error('拒绝覆盖非评审工程');
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(path.join(base, 'miniprogram'), path.join(target, 'miniprogram'), { recursive: true });
  const skin = require(path.join(base, 'miniprogram/services-v4/skins.js'))[theme];
  fs.writeFileSync(
    existing,
    'module.exports=' + JSON.stringify({ ...skin, mode: 'mock', reviewEnabled: true }) + ';\n'
  );
  const project = JSON.parse(fs.readFileSync(path.join(base, 'project.config.json'), 'utf8'));
  project.projectname = 'maintenance-review-' + theme;
  fs.writeFileSync(
    path.join(target, 'project.config.json'),
    JSON.stringify(project, null, 2) + '\n'
  );
  return target;
}

function nativeCall({ project, tool, args = [] }) {
  return new Promise((resolve, reject) => {
    for (let index = 0; index < args.length - 1; index++)
      if (args[index] === '--path')
        fs.mkdirSync(path.dirname(args[index + 1]), { recursive: true });
    const child = spawn(wechatCli(), [
      '-c',
      process.env.WECHATIDE_CLIENT || 'Codex',
      tool,
      '--project',
      project,
      ...args
    ]);
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(tool + ' timeout'));
    }, 45000);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      let reply;
      try {
        reply = JSON.parse(output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1));
      } catch {
        return reject(new Error(tool + ' 未返回有效 JSON'));
      }
      if (
        tool === 'close_project_window' &&
        (reply.code === 'CLOSE_PROJECT_WINDOW_FAILED' ||
          reply.detail?.rawResult?.code === 'CLOSE_PROJECT_WINDOW_FAILED')
      )
        return resolve({ alreadyClosed: true });
      if (code || !reply.ok || reply.result?.success === false)
        return reject(new Error(reply.code || reply.errorType || tool + ' failed'));
      resolve(reply.result);
    });
  });
}

function registerReviewFont(fonts) {
  if (process.env.RURAL_REVIEW_FONT)
    fonts.registerFromPath(process.env.RURAL_REVIEW_FONT, 'Review CJK');
  // No platform-specific font is required. Font-exact boards require an explicit
  // font file; ordinary inspection may use the platform's existing fallback.
}

function mapBudget(theme) {
  const names = { red: '十步芳草', culture: '千年文脉', industry: '金色产业', ecology: '青山绿水' };
  if (!names[theme]) throw new Error('未知主题');
  const project = path.join(workspaceRoot, '交付/微信小程序四套', names[theme]);
  const inspection = inspectPackage(project),
    summary = packageSummary(inspection);
  const currentMap = inspection.packed.find(
    (file) => file.relative === `assets/journey/${theme}-a-v4.jpg`
  );
  if (!currentMap) throw new Error('当前工程未打包对应地图');
  const budget = Math.min(
    240 * 1024,
    packagePolicy.maximumBytes -
      summary.bytes +
      currentMap.bytes -
      packagePolicy.minimumHeadroomBytes
  );
  if (budget <= 0) throw new Error('当前主包没有可用地图预算，请先检查包体');
  return budget;
}

module.exports = {
  dependencyPath,
  dependency,
  packageFile,
  loopbackBase,
  reviewBase,
  wechatCli,
  nativeCall,
  reviewProject,
  registerReviewFont,
  mapBudget,
  projectRoot,
  workspaceRoot
};
