'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const {
  loopbackBase,
  dependency,
  packageFile,
  mapBudget
} = require('../../rural-culture-miniprogram/tools/lib/project-tools.cjs');
const { exportFiles } = require('../../demo/scripts/export-local-activity.cjs');
const root = path.resolve(__dirname, '../..');
const fixture = () => ({
  schemaVersion: 'activity-3',
  contentMode: 'snapshot',
  config: { timer: { seconds: 30 } },
  levels: [
    { id: 'red-1', themeId: 'red', name: '基础认知', order: 1, points: 10, questionCount: 10 }
  ],
  questions: [
    {
      id: 'q',
      themeId: 'red',
      levelId: 'red-1',
      title: '题干',
      options: ['甲', '乙', '丙', '丁'],
      answer: 0,
      explanation: '解析'
    }
  ]
});

test('maintenance address settings accept loopback and reject external origins, credentials and paths', () => {
  assert.equal(loopbackBase('http://localhost:6500', ''), 'http://localhost:6500');
  for (const value of [
    'https://example.com',
    'http://name:password@localhost:1',
    'file:///tmp/a',
    'http://127.0.0.1/a',
    'http://127.0.0.1?token=x'
  ])
    assert.throws(() => loopbackBase(value, ''));
});

test('tool dependencies resolve from the locked tool package and preserve license metadata', () => {
  assert.equal(typeof dependency('sharp'), 'function');
  assert.ok(fs.readFileSync(packageFile('lucide', 'LICENSE'), 'utf8').includes('ISC License'));
  assert.equal(typeof dependency('@napi-rs/canvas').createCanvas, 'function');
  assert.equal(typeof dependency('playwright').chromium.launch, 'function');
});

test('five gallery images and all versioned design inputs exist with matching fingerprints', () => {
  const gallery = path.join(root, 'rural-culture-miniprogram/preview/美术精修-20261022.html');
  const html = fs.readFileSync(gallery, 'utf8');
  const images = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)];
  assert.equal(images.length, 5);
  for (const [, file] of images) assert.ok(fs.existsSync(path.join(path.dirname(gallery), file)));
  assert.ok(!html.includes('winter-motion-before') && !html.includes('data-scene'));
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(root, 'rural-culture-miniprogram/design-source/build-inputs/manifest.json'),
      'utf8'
    )
  );
  assert.equal(manifest.files.length, 29);
  for (const entry of manifest.files)
    assert.equal(
      crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(root, 'rural-culture-miniprogram', entry.path)))
        .digest('hex'),
      entry.sha256
    );
});

test('map export budget follows the currently packed independent projects', () => {
  for (const theme of ['red', 'culture', 'industry', 'ecology'])
    assert.ok(mapBudget(theme) > 0 && mapBudget(theme) <= 240 * 1024);
});

test('activity export provides lossless JSON and blocks all CSV output when a formula cell occurs', async () => {
  const normal = await exportFiles(fixture());
  assert.ok(normal['题库完整字段.csv'] && normal['关卡配置.csv']);
  for (const mutate of [
    (value) => {
      value.questions[0].title = '=1+1';
    },
    (value) => {
      value.levels[0].name = '@SUM(A1)';
    }
  ]) {
    const input = fixture();
    mutate(input);
    const exported = await exportFiles(input);
    assert.deepEqual(JSON.parse(exported['完整活动.json']), input);
    assert.ok(exported['CSV导出说明.txt']);
    assert.ok(!Object.keys(exported).some((name) => name.endsWith('.csv')));
  }
});

test('authoritative API documentation describes both version preconditions and conflict behavior', () => {
  const api = fs.readFileSync(path.join(root, 'demo/docs/full-development/API.md'), 'utf8');
  for (const token of ['expectedVersion', 'expectedQuestionVersions', 'VERSION_CONFLICT', '409'])
    assert.ok(api.includes(token));
});

test('source kit includes quality entries and built admin while excluding tracked private fixtures', (t) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'source-kit-test-'));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', folder]);
  const required = [
    'package.json',
    'package-lock.json',
    '.node-version',
    'eslint.config.cjs',
    '.prettierrc.json',
    'tools/quality-format.cjs',
    'tools/quality-files.json',
    'tools/check-maintenance.cjs'
  ];
  for (const name of required) {
    const file = path.join(folder, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'fixture');
  }
  fs.writeFileSync(
    path.join(folder, 'tools/maintenance-files.json'),
    JSON.stringify({ files: [] })
  );
  for (const name of [
    '.env',
    '.admin-credentials.json',
    'records.sqlite-wal',
    'project.private.config.json'
  ])
    fs.writeFileSync(path.join(folder, name), 'private-test-fixture');
  fs.mkdirSync(path.join(folder, 'quiz-admin/dist'), { recursive: true });
  fs.writeFileSync(path.join(folder, 'quiz-admin/dist/index.html'), 'built-fixture');
  execFileSync('git', ['-C', folder, 'add', '-f', '.']);
  const code =
    'import importlib.util,sys,json,zipfile,pathlib; s=importlib.util.spec_from_file_location("kit",sys.argv[1]); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); p=pathlib.Path(sys.argv[2]); out=p/"kit.zip"; m.build(p,out); z=zipfile.ZipFile(out); print(json.dumps(z.namelist())); z.close()';
  const entries = JSON.parse(
    execFileSync(
      process.env.RURAL_PYTHON || 'python3',
      ['-c', code, path.join(root, 'demo/scripts/package-contract-local-20261023.py'), folder],
      { encoding: 'utf8' }
    )
  );
  assert.ok(
    entries.includes('tools/check-maintenance.cjs') &&
      entries.includes('package-lock.json') &&
      entries.includes('quiz-admin/dist/index.html')
  );
  for (const name of [
    '.env',
    '.admin-credentials.json',
    'records.sqlite-wal',
    'project.private.config.json'
  ])
    assert.ok(!entries.includes(name));
  const before = fs.readFileSync(path.join(folder, 'kit.zip'));
  assert.throws(() =>
    execFileSync(
      process.env.RURAL_PYTHON || 'python3',
      ['-c', code, path.join(root, 'demo/scripts/package-contract-local-20261023.py'), folder],
      { stdio: 'pipe' }
    )
  );
  assert.deepEqual(fs.readFileSync(path.join(folder, 'kit.zip')), before);
});
