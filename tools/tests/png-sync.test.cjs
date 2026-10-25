'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { dependency } = require('../../rural-culture-miniprogram/tools/lib/project-tools.cjs');

async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'png-sync-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const original = await dependency('sharp')({
    create: { width: 96, height: 64, channels: 4, background: '#aabbcc' }
  })
    .png({ compressionLevel: 0 })
    .toBuffer();
  const files = ['mother', 'theme'].map((project) => {
    const folder = path.join(root, project);
    fs.mkdirSync(path.join(folder, 'miniprogram/assets'), { recursive: true });
    fs.writeFileSync(
      path.join(folder, 'project.config.json'),
      JSON.stringify({ miniprogramRoot: 'miniprogram/' })
    );
    const file = path.join(folder, 'miniprogram/assets/x.png');
    fs.writeFileSync(file, original);
    return file;
  });
  const script = path.resolve(
    __dirname,
    '../../rural-culture-miniprogram/tools/optimize-runtime-png.cjs'
  );
  const actualRequire = createRequire(script),
    mod = { exports: {} };
  const load = (name) =>
    name === './lib/project-tools.cjs'
      ? { ...actualRequire(name), workspaceRoot: root }
      : name === '../../tools/project-targets.json'
        ? [{ path: 'mother' }, { path: 'theme' }]
        : actualRequire(name);
  vm.runInNewContext(
    fs.readFileSync(script, 'utf8'),
    { require: load, module: mod, process, console, Buffer },
    { filename: script }
  );
  return { root, files, original, optimize: () => mod.exports.optimizeAsset('assets/x.png', true) };
}

for (const phase of ['stage', 'commit'])
  test(`PNG copy synchronization rolls back ${phase} failure and can be retried`, async (t) => {
    const f = await fixture(t);
    let injected = false;
    const method = phase === 'stage' ? 'writeFileSync' : 'renameSync';
    const actual = fs[method];
    t.mock.method(fs, method, function (...args) {
      const target = phase === 'stage' ? String(args[0]) : String(args[1]);
      if (
        !injected &&
        (phase === 'stage'
          ? target.startsWith(path.dirname(f.files[1])) && target !== f.files[1]
          : target === f.files[1])
      ) {
        injected = true;
        throw new Error('injected ' + phase + ' failure');
      }
      return actual.apply(this, args);
    });
    await assert.rejects(f.optimize(), new RegExp('injected ' + phase + ' failure'));
    for (const file of f.files) {
      assert.deepEqual(
        fs.readFileSync(file),
        f.original,
        'all originals survive a failed synchronization'
      );
      assert.deepEqual(
        fs.readdirSync(path.dirname(file)),
        ['x.png'],
        'owned staging files are cleaned'
      );
    }
    assert.equal((await f.optimize()).written, true);
    assert.deepEqual(fs.readFileSync(f.files[0]), fs.readFileSync(f.files[1]));
  });

test('PNG synchronization ignores a legacy temporary file without deleting it', async (t) => {
  const f = await fixture(t);
  const stale = f.files[1] + '.optimizing';
  fs.writeFileSync(stale, 'unowned previous output');
  assert.equal((await f.optimize()).written, true);
  assert.deepEqual(fs.readFileSync(f.files[0]), fs.readFileSync(f.files[1]));
  assert.equal(fs.readFileSync(stale, 'utf8'), 'unowned previous output');
});

test('PNG synchronization retains the original backup if rollback itself fails', async (t) => {
  const f = await fixture(t),
    rename = fs.renameSync;
  t.mock.method(fs, 'renameSync', function (source, destination) {
    if (destination === f.files[1]) throw new Error('injected commit failure');
    if (destination === f.files[0] && path.basename(source) === 'original.png')
      throw new Error('injected rollback failure');
    return rename.call(this, source, destination);
  });
  await assert.rejects(f.optimize(), /回滚失败，原文件备份保留于/);
  const backup = fs
    .readdirSync(path.dirname(f.files[0]))
    .find((name) => name.startsWith('x.png.optimizing-'));
  assert.ok(backup);
  assert.deepEqual(
    fs.readFileSync(path.join(path.dirname(f.files[0]), backup, 'original.png')),
    f.original
  );
  assert.deepEqual(fs.readFileSync(f.files[1]), f.original);
  assert.deepEqual(fs.readdirSync(path.dirname(f.files[1])), ['x.png']);
});
