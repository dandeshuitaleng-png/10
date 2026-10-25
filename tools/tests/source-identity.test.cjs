'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { sourceIdentity } = require('../lib/source-identity.cjs');

function sourceKit(t, files = { 'demo/server/application.cjs': 'original' }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'source-identity-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [name, data] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), data);
  }
  fs.writeFileSync(
    path.join(root, 'MANIFEST.json'),
    JSON.stringify({
      schemaVersion: 2,
      files: Object.fromEntries(Object.keys(files).map((name) => [name, 'archive-hash']))
    })
  );
  return root;
}

test('extracted source kit hashes actual source bytes without a Git checkout', (t) => {
  const root = sourceKit(t);
  const before = sourceIdentity(root);
  assert.equal(before.sourceMode, 'source-kit');
  assert.equal(before.commit, null);
  assert.equal(before.worktreeDirty, null);
  assert.equal(before.sourceFiles, 1);
  fs.writeFileSync(path.join(root, 'demo/server/application.cjs'), 'changed');
  assert.notEqual(sourceIdentity(root).sourceSha256, before.sourceSha256);
});

test('source kit identity rejects manifest traversal and source symlinks', (t) => {
  const root = sourceKit(t);
  const manifest = path.join(root, 'MANIFEST.json');
  fs.writeFileSync(
    manifest,
    JSON.stringify({ schemaVersion: 2, files: { '../outside.cjs': 'x' } })
  );
  assert.throws(() => sourceIdentity(root), /Invalid source path/);
  fs.writeFileSync(
    manifest,
    JSON.stringify({ schemaVersion: 2, files: { 'demo/server/link.cjs': 'x' } })
  );
  fs.symlinkSync('application.cjs', path.join(root, 'demo/server/link.cjs'));
  assert.throws(() => sourceIdentity(root), /symbolic link/);
});

test('source kit fingerprints include imported modules and new tests absent from the archive manifest', (t) => {
  const root = sourceKit(t, {
    'demo/server/application.cjs': "module.exports = require('./added.cjs');"
  });
  const added = path.join(root, 'demo/server/added.cjs');
  fs.writeFileSync(added, 'module.exports = 1;');
  const before = sourceIdentity(root);
  assert.equal(require(path.join(root, 'demo/server/application.cjs')), 1);
  fs.writeFileSync(added, 'module.exports = 999;');
  delete require.cache[require.resolve(added)];
  assert.equal(require(added), 999);
  const changed = sourceIdentity(root);
  assert.notEqual(changed.sourceSha256, before.sourceSha256);
  assert.equal(changed.sourceFiles, 2);
  fs.mkdirSync(path.join(root, 'demo/tests'));
  fs.writeFileSync(
    path.join(root, 'demo/tests/new.test.cjs'),
    "require('node:test')('new', () => {});"
  );
  const withTest = sourceIdentity(root);
  assert.equal(withTest.sourceFiles, 3);
  assert.notEqual(withTest.sourceSha256, changed.sourceSha256);
});

test('source kit discovery skips installed dependencies and live data but rejects unlisted source symlinks', (t) => {
  const root = sourceKit(t);
  const before = sourceIdentity(root);
  fs.mkdirSync(path.join(root, 'demo/server/data'));
  fs.writeFileSync(path.join(root, 'demo/server/data/live.sqlite'), 'private runtime data');
  fs.mkdirSync(path.join(root, 'tools'));
  fs.symlinkSync(path.join(root, 'demo/server'), path.join(root, 'tools/node_modules'), 'dir');
  assert.equal(sourceIdentity(root).sourceSha256, before.sourceSha256);
  fs.symlinkSync('application.cjs', path.join(root, 'demo/server/unlisted.cjs'));
  assert.throws(() => sourceIdentity(root), /symbolic link/);
});
