'use strict';
// Isolated real HTTP application and actual built management/native clients.
// Only this QA server substitutes the local-session bridge and backend URL.
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  http = require('node:http'),
  assert = require('node:assert/strict'),
  crypto = require('node:crypto');
const { createApplication } = require('../server/application.cjs'),
  { createWorkspaceStatic } = require('../server/workspace-static.cjs'),
  { staticHandler } = require('../server/start.cjs');
const { chromium } =
  require('../../rural-culture-miniprogram/tools/lib/project-tools.cjs').dependency('playwright');
const root = path.resolve(__dirname, '../..'),
  out = path.join(root, 'rural-culture-miniprogram/qa/contract-local-20261025');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'contract-local-')),
    checks = [],
    errors = [],
    credentials = { username: 'isolated-admin', password: 'contract-local-isolated-password' };
  let server, browser, app;
  try {
    app = await createApplication({
      mode: 'experience',
      dbPath: path.join(dir, 'test.sqlite'),
      adminCredentials: credentials
    });
    const workspace = createWorkspaceStatic(root);
    let adminToken, playerSession, base;
    server = http.createServer((req, res) => {
      if (req.url === '/api/local/session') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data: playerSession }));
        return;
      }
      if (req.url.startsWith('/api/local/admin/')) {
        req.url = req.url.replace('/api/local/admin/', '/api/admin/');
        req.headers.authorization = 'Bearer ' + adminToken;
      }
      if (req.url.startsWith('/api/')) return app.handler(req, res);
      const m =
        /^\/native\/(culture|red|industry|ecology)\/miniprogram\/game-config\.js(?:\?.*)?$/.exec(
          req.url
        );
      if (m) {
        const skin = {
          ...require(path.join(root, 'rural-culture-miniprogram/miniprogram/services-v4/skins.js'))[
            m[1]
          ],
          mode: 'http',
          reviewEnabled: false,
          connection: { apiBase: base, identity: 'local-shared' }
        };
        res.setHeader('Content-Type', 'application/javascript');
        res.end('module.exports=' + JSON.stringify(skin) + ';');
        return;
      }
      if (workspace(req, res)) return;
      staticHandler(req, res);
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    base = 'http://127.0.0.1:' + server.address().port;
    async function api(url, method = 'GET', body, token = adminToken) {
      const r = await fetch(base + url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const j = await r.json();
      assert(r.ok, JSON.stringify(j));
      return j.data;
    }
    adminToken = (await api('/api/auth/admin', 'POST', credentials)).token;
    playerSession = await api('/api/auth/dev', 'POST', { name: '隔离验收读者' });
    browser = await chromium.launch({
      headless: true,
      channel: process.env.RURAL_BROWSER_CHANNEL || undefined
    });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
      page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/manage');
    await page.getByRole('menuitem', { name: '游戏规则' }).click();
    await page.getByTestId('activity-export').waitFor();
    const download = page.waitForEvent('download');
    await page.getByTestId('activity-export').click();
    const file = path.join(dir, 'activity.json');
    await (await download).saveAs(file);
    const exported = JSON.parse(fs.readFileSync(file));
    assert.equal(exported.questions.length, 240);
    assert.equal(exported.questions.filter((q) => q.media).length, 3);
    assert(exported.questions.every((q) => q.difficulty));
    checks.push({
      name: 'built management exports complete 4-theme 16-level 240-question snapshot and media',
      passed: true
    });
    await page.screenshot({ path: path.join(out, '管理端完整活动导出.png'), fullPage: true });

    const custom = {
      ...exported,
      config: {
        ...exported.config,
        certificates: {
          ...exported.config.certificates,
          title: '乡村阅读荣誉证书',
          totalName: '乡村知识闯关王',
          totalText: '完整活动导入配置的总证书正文'
        },
        share: { ...exported.config.share, title: '一起阅读家乡故事' }
      }
    };
    const titleInput = page
      .locator('.el-form-item')
      .filter({ hasText: '证书标题' })
      .getByRole('textbox');
    await titleInput.fill('后台保存的阅读证书');
    await page.getByRole('button', { name: '保存游戏规则', exact: true }).click();
    await page.getByText('规则已保存', { exact: true }).waitFor();
    assert.equal((await api('/api/admin/config')).certificates.title, '后台保存的阅读证书');
    checks.push({
      name: 'management saves configured certificate title to real HTTP backend',
      passed: true
    });
    await page.getByTestId('activity-file').setInputFiles({
      name: '完整活动.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(custom))
    });
    await page.getByRole('button', { name: '校验并导入', exact: true }).click();
    await page.getByText('完整活动已导入，玩家历史记录保留', { exact: true }).waitFor();
    await page.locator('.el-message-box').waitFor({ state: 'hidden' });
    assert.equal(
      (await api('/api/admin/config')).certificates.title,
      custom.config.certificates.title
    );
    checks.push({
      name: 'management imports full snapshot and reloads actual configuration',
      passed: true
    });
    const invalid = { ...custom, questions: [{ ...custom.questions[0], options: ['不完整'] }] },
      version = (await api('/api/admin/config')).version;
    await page.getByTestId('activity-file').setInputFiles({
      name: '错误活动.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(invalid))
    });
    await page.getByRole('button', { name: '校验并导入', exact: true }).click();
    await page.getByText('每题必须恰好4个选项', { exact: true }).waitFor();
    assert.equal((await api('/api/admin/config')).version, version);
    checks.push({
      name: 'UI reports failed import; backend remains atomically unchanged',
      passed: true
    });
    const ledgerBefore = await app.store.list('ledger');
    assert.equal(ledgerBefore.length, 0);
    let answered = 0;
    for (const theme of ['red', 'culture', 'industry', 'ecology'])
      for (let level = 1; level <= 4; level++) {
        let c = await api(
          '/api/challenges',
          'POST',
          { levelId: theme + '-' + level, requestId: crypto.randomUUID() },
          playerSession.token
        );
        assert.equal(c.total, 10);
        const ids = new Set();
        for (let i = 0; i < 10; i++) {
          assert(!('answer' in c.question));
          ids.add(c.question.id);
          const actual = await app.store.get('challenges', c.id),
            answer = actual.questions[actual.position].answer;
          const payload = {
            questionId: c.question.id,
            optionId: answer,
            requestId: crypto.randomUUID()
          };
          c = await api(
            '/api/challenges/' + c.id + '/answer',
            'POST',
            payload,
            playerSession.token
          );
          answered++;
          if (i < 9)
            c = await api(
              '/api/challenges/' + c.id + '/advance',
              'POST',
              { requestId: crypto.randomUUID() },
              playerSession.token
            );
        }
        assert.equal(ids.size, 10);
        assert.equal(c.state, 'completed');
        assert.equal(c.result.points, [10, 15, 20, 30][level - 1]);
      }
    const state = await api('/api/me', 'GET', null, playerSession.token),
      certs = (await api('/api/certificates', 'GET', null, playerSession.token)).certificates;
    assert.equal(state.points, 300);
    assert.equal(certs.length, 5);
    assert(certs.every((c) => c.title === custom.config.certificates.title));
    assert(certs.some((c) => c.name === '乡村知识闯关王'));
    const history = await app.store.list('certificates');
    await api('/api/admin/config', 'PUT', { certificates: { title: '之后修改的标题' } });
    assert.deepEqual(await app.store.list('certificates'), history);
    checks.push({
      name: '160 real answers yield 300 points and 5 configured certificates; later edits preserve issued snapshots',
      passed: true,
      answered,
      points: 300,
      certificates: 5
    });
    const routes = [];
    for (const theme of ['red', 'culture', 'industry', 'ecology']) {
      const native = await context.newPage();
      native.on('pageerror', (e) => errors.push(e.message));
      await native.goto(
        base + '/native/' + theme + '/preview/v4.html#/pages/game/index?route=certificate'
      );
      await native.waitForSelector('.certificate-preview');
      await native.waitForFunction(
        () => window._nativePreview?.page.data.certificateImageLoading === false
      );
      const result = await native.evaluate(() => {
        const p = window._nativePreview.page;
        return {
          theme: p.data.skin.gameId,
          title: p.data.certificate.title,
          image: !!p.data.certificateImage,
          certificates: p.data.certificates.length,
          points: p.data.snapshot.points
        };
      });
      assert.equal(result.title, custom.config.certificates.title);
      assert.equal(result.points, 300);
      assert.equal(result.certificates, 2);
      await native.screenshot({ path: path.join(out, theme + '-配置证书-PC.png') });
      routes.push(result);
      await native.close();
    }
    checks.push({
      name: 'four actual native clients read historical configured title and shared total certificate through real HTTP',
      passed: true,
      clients: routes
    });
    await page.goto(base + '/play');
    await page.waitForSelector('#game');
    await page.waitForFunction(() => document.querySelector('#points')?.textContent === '300');
    await page.screenshot({ path: path.join(out, 'PC系列入口.png'), fullPage: true });
    checks.push({ name: 'PC series entry reads the same 300-point account', passed: true });
    const stable = await api('/api/admin/activity/export');
    const historical = await app.store.list('ledger');
    await api('/api/admin/activity/import', 'POST', stable);
    assert.deepEqual(await app.store.list('ledger'), historical);
    assert.deepEqual(await app.store.list('certificates'), history);
    checks.push({
      name: 'complete snapshot reimport preserves all 16 ledger entries and 5 issued certificates',
      passed: true
    });
    assert.equal(errors.length, 0);
    fs.writeFileSync(
      path.join(out, '浏览器与全系列检查.json'),
      JSON.stringify(
        {
          passed: true,
          checks,
          errors,
          scope:
            'Isolated Node/SQLite real HTTP, built Vue UI and actual native browser adapter; 160 server answers; no client platform/DM8/TongRDS/physical-device claims.'
        },
        null,
        2
      ) + '\n'
    );
    console.log(
      'PASS ' + checks.length + ' end-to-end groups, 160 answers, 300 points, 5 certificates'
    );
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((r) => server.close(r));
    if (app) await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
