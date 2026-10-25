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
