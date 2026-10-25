'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const targets = require('../project-targets.json');

function validName(name) {
  if (
    typeof name !== 'string' ||
    !name ||
    path.isAbsolute(name) ||
    name.includes('\\') ||
    name.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('Invalid source path: ' + name);
  return name;
}

function sourceFile(root, name) {
  let file = root;
  for (const part of name.split('/')) {
    file = path.join(file, part);
    if (fs.lstatSync(file).isSymbolicLink())
      throw new Error('Source contains a symbolic link: ' + name);
  }
  if (!fs.statSync(file).isFile()) throw new Error('Source is not a file: ' + name);
  return file;
}

function sourceIdentity(folder) {
  const root = fs.realpathSync(folder);
  const git = (args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  let checkout = false;
  try {
    checkout = fs.realpathSync(git(['rev-parse', '--show-toplevel']).trim()) === root;
  } catch {}
  let names;
  if (checkout) {
    names = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
      .split('\0')
      .filter(Boolean);
  } else {
    const manifestFile = path.join(root, 'MANIFEST.json');
    if (!fs.existsSync(manifestFile))
      throw new Error('Source identity requires a Git checkout or a source kit with MANIFEST.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    if (
      manifest.schemaVersion !== 2 ||
      !manifest.files ||
      Array.isArray(manifest.files) ||
      typeof manifest.files !== 'object'
    )
      throw new Error('Unsupported source kit manifest');
    names = Object.keys(manifest.files);
  }
  names.forEach(validName);
  const prefixes = [
    'demo/server/',
    'demo/js/',
    'demo/web/',
    'demo/tests/',
    'quiz-admin/src/',
    'quiz-admin/tests/',
    'tools/',
    'rural-culture-miniprogram/tools/',
    'rural-culture-miniprogram/tests/',
    ...targets.map((target) => target.path + '/miniprogram/')
  ];
  const files = [...new Set(names)]
    .filter(
      (file) =>
        file &&
        (prefixes.some((prefix) => file.startsWith(prefix)) ||
          [
            'package.json',
            'package-lock.json',
            'eslint.config.cjs',
            '.prettierrc.json',
            '.node-version',
            '.github/workflows/quality.yml',
            'quiz-admin/package.json',
            'quiz-admin/package-lock.json',
            'quiz-admin/vite.config.js',
            'demo/design/content-intake/current/bank.json',
            ...targets.map((target) => target.path + '/project.config.json')
          ].includes(file))
    )
    .sort();
  if (!files.length) throw new Error('No source files found for regression identity');
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(file + '\0');
    hash.update(fs.readFileSync(sourceFile(root, file)));
  }
  return {
    sourceMode: checkout ? 'git' : 'source-kit',
    commit: checkout ? git(['rev-parse', 'HEAD']).trim() : null,
    worktreeDirty: checkout ? !!git(['status', '--porcelain']).trim() : null,
    sourceSha256: hash.digest('hex'),
    sourceFiles: files.length
  };
}

module.exports = { sourceIdentity };
