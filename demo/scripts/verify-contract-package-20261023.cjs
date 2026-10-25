'use strict';
// Validate extracted source with a temporary database, never a workstation DB.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

(async () => {
  const root = path.resolve(process.argv[2] || path.join(__dirname, '../..'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'source-kit-runtime-'));
  const checks = [];
  let instance;
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'MANIFEST.json'), 'utf8'));
    for (const [relative, digest] of Object.entries(manifest.files)) {
      const filename = path.resolve(root, relative);
      assert(filename.startsWith(root + path.sep), 'manifest path must remain inside the kit');
      assert.equal(
        crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),
        digest,
        relative
      );
    }
    for (const name of [
      'package.json',
      'package-lock.json',
      'tools/check-maintenance.cjs',
      'tools/maintenance-files.json'
    ])
      assert(manifest.files[name], name);
    checks.push({
      name: 'all extracted source hashes and quality entries match',
      passed: true,
      count: Object.keys(manifest.files).length
    });
    const { start } = require(path.join(root, 'demo/server/start.cjs'));
    instance = await start({ port: 0, mode: 'experience', dbPath: path.join(dir, 'kit.sqlite') });
    const base = 'http://127.0.0.1:' + instance.server.address().port;
    async function request(route, method = 'GET', body) {
      const reply = await fetch(base + route, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Quiz-Management': '1' },
        body: body ? JSON.stringify(body) : undefined
      });
      const json = await reply.json();
      assert(reply.ok, route + ' status ' + reply.status);
      return json.data;
    }
    const health = await request('/api/health');
    assert.equal(health.storage, 'sqlite');
    const initial = await request('/api/local/admin/activity/export');
    const bank = JSON.parse(
      fs.readFileSync(path.join(root, 'demo/design/content-intake/current/bank.json'), 'utf8')
    );
    assert.equal(initial.questions.length, bank.questions.length);
    const currentQuestions = (await request('/api/local/admin/questions')).questions;
    const versions = Object.fromEntries(
      currentQuestions.map((question) => [question.id, question.version])
    );
    const imported = {
      ...initial,
      expectedVersion: initial.config.version,
      expectedQuestionVersions: versions,
      questions: initial.questions.map((question) => ({
        ...question,
        expectedVersion: versions[question.id]
      }))
    };
    await request('/api/local/admin/activity/import', 'POST', imported);
    const restored = await request('/api/local/admin/activity/export');
    assert.deepEqual(restored.questions, initial.questions);
    assert.deepEqual(restored.levels, initial.levels);
    checks.push({
      name: 'clean HTTP application roundtrips authored content with version preconditions',
      passed: true,
      questions: initial.questions.length,
      levels: initial.levels.length
    });
    for (const asset of initial.assets)
      if (asset.startsWith('/')) {
        const reply = await fetch(base + asset);
        assert(reply.ok, asset);
        assert((await reply.arrayBuffer()).byteLength > 0);
      }
    for (const route of [
      '/play',
      '/manage',
      ...['red', 'culture', 'industry', 'ecology'].map(
        (theme) => '/native/' + theme + '/miniprogram/pages/game/index.wxml'
      )
    ])
      assert.equal((await fetch(base + route)).status, 200, route);
    const html = await (await fetch(base + '/manage')).text();
    const chunks = [...html.matchAll(/(?:src|href)="(\/management\/assets\/[^"]+)"/g)].map(
      (match) => match[1]
    );
    assert(chunks.length >= 2);
    for (const chunk of chunks) assert.equal((await fetch(base + chunk)).status, 200, chunk);
    checks.push({
      name: 'built management, PC, four clients and local authored media serve correctly',
      passed: true
    });
    const { createBackup, restoreBackup } = require(path.join(root, 'demo/server/maintenance.cjs'));
    const backup = await createBackup(
      path.join(dir, 'kit.sqlite'),
      path.join(dir, 'backup.sqlite')
    );
    const restoredBackup = restoreBackup(
      path.join(dir, 'backup.sqlite'),
      path.join(dir, 'restored.sqlite')
    );
    assert.deepEqual(backup.counts, restoredBackup.counts);
    checks.push({ name: 'extracted maintenance restores matching database counts', passed: true });
    console.log(
      JSON.stringify(
        {
          passed: true,
          checks,
          scope:
            'Extracted source, isolated SQLite and real HTTP. No production, device or DM8 claim.'
        },
        null,
        2
      )
    );
  } finally {
    if (instance) await instance.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
