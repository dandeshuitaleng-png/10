'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createApplication } = require('../server/application.cjs');
const { SQLiteStore } = require('../server/store.cjs');
const { start } = require('../server/start.cjs');
const CREDS = { username: 'test-admin', password: 'isolated-tests-password' };
async function harness(t, extra = {}) {
  let time = Date.parse('2026-10-12T12:00:00+08:00');
  const app = await createApplication({ dbPath: ':memory:', mode: 'experience', adminCredentials: CREDS, clock: () => time, ...extra });
  const server = await app.listen(); const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => app.close());
  async function request(method, url, body, auth = '', headers = {}) {
    const response = await fetch(`${base}${url}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const raw = await response.text(); let value;
    try { value = JSON.parse(raw); } catch { value = raw; }
    return { status: response.status, value, data: value.data, error: value.error, headers: response.headers };
  }
  async function login(name = '测试玩家', deviceId) { const result = await request('POST', '/api/auth/dev', { name, ...(deviceId ? { deviceId } : {}) }); assert.equal(result.status, 200); return result; }
  async function admin() { const result = await request('POST', '/api/auth/admin', CREDS); assert.equal(result.status, 200); return result; }
  async function begin(token, levelId, requestId = crypto.randomUUID()) { const result = await request('POST', '/api/challenges', { levelId, requestId }, token); assert.equal(result.status, 200, JSON.stringify(result.error)); return result.data; }
  async function answer(token, challenge, optionId, requestId = crypto.randomUUID()) { return request('POST', `/api/challenges/${challenge.id}/answer`, { questionId: challenge.question.id, optionId, requestId }, token); }
  async function pass(token, levelId) {
    let challenge = await begin(token, levelId);
    for (let index = 0; index < 10; index++) {
      const raw = await app.store.get('challenges', challenge.id); const correct = raw.questions[raw.position].answer;
      const result = await answer(token, challenge, correct); assert.equal(result.status, 200); challenge = result.data;
      if (index < 9) { const next = await request('POST', `/api/challenges/${challenge.id}/advance`, { requestId: crypto.randomUUID() }, token); assert.equal(next.status, 200); challenge = next.data; }
    }
    assert.equal(challenge.state, 'completed'); return challenge;
  }
  return { app, request, login, admin, begin, answer, pass, setTime: value => { time = value; }, advanceTime: milliseconds => { time += milliseconds; }, now: () => time };
}

test('experience uses all 240 real questions without fabricating approval; server never leaks unanswered answers', async t => {
  const h = await harness(t); const login = await h.login();
  const catalog = await h.request('GET', '/api/catalog');
  assert.equal(catalog.data.levels.length, 16); assert.equal(catalog.data.themes.length, 4);
  assert.ok(catalog.data.levels.every(level => level.availableQuestions === 15 && !('approvedQuestions' in level)));
  const questions = await h.app.store.list('questions'); assert.equal(questions.length, 240);
  assert.ok(questions.every(question => question.enabled && !('approved' in question) && !('reviewStatus' in question)));
  const challenge = await h.begin(login.data.token, 'red-1');
  assert.equal(challenge.total, 10); assert.equal(challenge.position, 0); assert.equal(challenge.countdownSeconds, 30);
  assert.equal(challenge.contentApprovalPending, undefined); assert.ok(!('answer' in challenge.question)); assert.ok(!('questions' in challenge));
  const raw = await h.app.store.get('challenges', challenge.id); assert.equal(new Set(raw.questions.map(question => question.id)).size, 10);
  const other = await h.login('另一位'); assert.equal((await h.request('GET', `/api/challenges/${challenge.id}`, null, other.data.token)).status, 404);
  const denied = await h.request('POST', '/api/challenges', { levelId: 'red-2', requestId: crypto.randomUUID() }, login.data.token); assert.equal(denied.error.code, 'LEVEL_LOCKED');
});

test('all 16 levels award exactly 300 points, four theme certificates and a total certificate, with repeat settlement safe', async t => {
  const h = await harness(t); const login = await h.login('<姓名&>'); const token = login.data.token;
  for (const theme of ['red', 'culture', 'industry', 'ecology']) for (let order = 1; order <= 4; order++) {
    const result = await h.pass(token, `${theme}-${order}`); assert.equal(result.result.points, [10, 15, 20, 30][order - 1]);
    assert.equal(result.result.accuracy, 1);
  }
  const me = await h.request('GET', '/api/me', null, token);
  assert.equal(me.data.points, 300); assert.ok(Object.values(me.data.progress).every(theme => theme.completed === 4));
  const certificates = await h.request('GET', '/api/certificates', null, token); assert.equal(certificates.data.certificates.length, 5);
  assert.equal(certificates.data.certificates.filter(cert => cert.name === '乡村知识闯关王').length, 1);
  const svg = await h.request('GET', certificates.data.certificates[0].downloadUrl, null, token); assert.equal(svg.status, 200); assert.ok(svg.value.includes('&lt;姓名&amp;&gt;')); assert.ok(!svg.value.includes('<姓名&>'));
  const replay = await h.pass(token, 'red-1'); assert.equal(replay.result.points, 0);
  assert.equal((await h.request('GET', '/api/me', null, token)).data.points, 300);
  assert.equal((await h.app.store.list('ledger')).length, 16); assert.equal((await h.app.store.list('outbox')).length, 16); assert.equal((await h.app.store.list('certificates')).length, 5);
  const ranking = await h.request('GET', '/api/rankings?period=total', null, token); assert.equal(ranking.data.entries[0].completed, 16);
  const pending = await h.admin(); const noReceiver = await h.request('POST', '/api/admin/outbox/retry', {}, pending.data.token); assert.equal(noReceiver.error.code, 'SYNC_NOT_CONFIGURED');
});

test('revive retries the same question once, hides its answer, computes first-answer accuracy and locks only the failed level until Beijing midnight', async t => {
  const h = await harness(t); const token = (await h.login()).data.token;
  let challenge = await h.begin(token, 'red-1'); const raw = await h.app.store.get('challenges', challenge.id); const wrong = (raw.questions[0].answer + 1) % 4;
  challenge = (await h.answer(token, challenge, wrong)).data;
  assert.equal(challenge.state, 'revive'); assert.equal(challenge.feedback.answer, null); assert.equal(challenge.feedback.explanation, null);
  const bad = await h.request('POST', `/api/challenges/${challenge.id}/revive`, { evidence: { type: 'experience-test', challengeId: 'wrong' }, requestId: crypto.randomUUID() }, token); assert.equal(bad.error.code, 'SHARE_NOT_VERIFIED');
  const revived = await h.request('POST', `/api/challenges/${challenge.id}/revive`, { evidence: { type: 'experience-test', challengeId: challenge.id }, requestId: crypto.randomUUID() }, token);
  challenge = revived.data; assert.equal(challenge.reviveUsed, true); assert.equal(challenge.question.id, raw.questions[0].id);
  challenge = (await h.answer(token, challenge, wrong)).data;
  assert.equal(challenge.state, 'locked'); assert.equal(challenge.result.passed, false); assert.equal(challenge.result.accuracy, 0);
  assert.equal(challenge.lockedUntil, Date.parse('2026-10-13T00:00:00+08:00'));
  const me = await h.request('GET', '/api/me', null, token); assert.equal(me.data.progress.red.nodes[0], 'today-locked'); assert.equal(me.data.progress.culture.nodes[0], 'available');
  assert.equal((await h.request('POST', '/api/challenges', { levelId: 'red-1', requestId: crypto.randomUUID() }, token)).error.code, 'LEVEL_TODAY_LOCKED');
  await h.begin(token, 'culture-1'); h.setTime(Date.parse('2026-10-13T00:00:01+08:00')); assert.equal((await h.begin(token, 'red-1')).state, 'answering');
});

test('timeout survives mutation races, repeated requests return original response and changed payload conflicts', async t => {
  const h = await harness(t); const token = (await h.login()).data.token; let challenge = await h.begin(token, 'red-1');
  const raw = await h.app.store.get('challenges', challenge.id); h.advanceTime(30000);
  const attempts = await Promise.all([h.answer(token, challenge, raw.questions[0].answer), h.request('GET', `/api/challenges/${challenge.id}`, null, token)]);
  assert.ok(attempts.every(result => result.status === 200 && result.data.state === 'revive'));
  assert.equal((await h.app.store.get('challenges', challenge.id)).answers.length, 1);
  assert.equal((await h.app.store.get('challenges', challenge.id)).answers[0].timeout, true);
  challenge = await h.begin(token, 'culture-1'); const stored = await h.app.store.get('challenges', challenge.id);
  const requestId = crypto.randomUUID(); const first = await h.answer(token, challenge, stored.questions[0].answer, requestId); const repeat = await h.answer(token, challenge, stored.questions[0].answer, requestId);
  assert.deepEqual(repeat.data, first.data);
  const changed = await h.answer(token, challenge, (stored.questions[0].answer + 1) % 4, requestId); assert.equal(changed.error.code, 'IDEMPOTENCY_CONFLICT');
  const race = await Promise.all([h.request('POST', `/api/challenges/${challenge.id}/advance`, { requestId: crypto.randomUUID() }, token), h.request('POST', `/api/challenges/${challenge.id}/advance`, { requestId: crypto.randomUUID() }, token)]);
  assert.deepEqual(race.map(result => result.status).sort(), [200, 409]); assert.equal((await h.app.store.get('challenges', challenge.id)).position, 1);
});

test('exit and server restart preserve player, absolute deadline, rule snapshot and awarded records', async t => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-server-test-')); const dbPath = path.join(folder, 'quiz.sqlite');
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  let time = Date.parse('2026-10-12T10:00:00+08:00');
  let app = await createApplication({ dbPath, mode: 'experience', adminCredentials: CREDS, clock: () => time }); let server = await app.listen();
  async function call(method, pathname, body, token) { const response = await fetch(`http://127.0.0.1:${server.address().port}${pathname}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); const value = await response.json(); assert.equal(response.status, 200, JSON.stringify(value)); return value.data; }
  const login = await call('POST', '/api/auth/dev', { name: '持久用户' }); const token = login.token;
  const challenge = await call('POST', '/api/challenges', { levelId: 'red-1', requestId: crypto.randomUUID() }, token);
  const exited = await call('POST', `/api/challenges/${challenge.id}/exit`, { requestId: crypto.randomUUID() }, token); assert.equal(exited.state, 'exited');
  await app.close(); time += 12000;
  app = await createApplication({ dbPath, mode: 'experience', adminCredentials: CREDS, clock: () => time }); server = await app.listen(); t.after(() => app.close());
  const resumed = await call('POST', '/api/challenges', { levelId: 'red-1', requestId: crypto.randomUUID() }, token); assert.equal(resumed.id, challenge.id); assert.equal(resumed.deadline, challenge.deadline); assert.equal(resumed.state, 'answering');
  const me = await call('GET', '/api/me', null, token); assert.equal(me.user.id, login.user.id); assert.equal(me.activeChallenge.id, challenge.id);
  assert.equal(fs.statSync(dbPath).mode & 0o777, 0o600);
});

test('player and administrator sessions are separate; role/name injection cannot impersonate players; forbidden cross-origin mutations fail', async t => {
  const h = await harness(t); const first = await h.login('相同名字'); const second = await h.login('相同名字'); assert.notEqual(first.data.user.id, second.data.user.id);
  const deviceId = crypto.randomBytes(24).toString('base64url'); const stable = await h.login('设备用户', deviceId); const resume = await h.login('改昵称', deviceId); assert.equal(stable.data.user.id, resume.data.user.id);
  const injected = await h.request('POST', '/api/auth/dev', { name: '伪管理员', role: 'admin', userId: 'administrator' }); assert.equal(injected.data.user.role, 'player');
  assert.equal((await h.request('GET', '/api/admin/overview', null, first.data.token)).status, 403);
  assert.equal((await h.request('GET', '/api/me')).status, 401);
  const admin = await h.admin(); const cookies = `${first.headers.get('set-cookie').split(';')[0]}; ${admin.headers.get('set-cookie').split(';')[0]}`;
  assert.equal((await h.request('GET', '/api/me', null, '', { Cookie: cookies })).data.user.role, 'player');
  assert.equal((await h.request('GET', '/api/admin/overview', null, '', { Cookie: cookies })).status, 200);
  assert.equal((await h.request('POST', '/api/challenges', { levelId: 'red-1', requestId: crypto.randomUUID() }, '', { Cookie: cookies, Origin: 'https://attacker.invalid' })).status, 403);
  await h.request('POST', '/api/auth/logout', {}, '', { Cookie: cookies }); assert.equal((await h.request('GET', '/api/me', null, first.data.token)).status, 401); assert.equal((await h.request('GET', '/api/admin/overview', null, admin.data.token)).status, 401);
});

test('admin import is atomic, valid questions need no review, edits preserve enabled state and active questions keep their version', async t => {
  const h = await harness(t); const admin = (await h.admin()).data.token; const token = (await h.login()).data.token;
  const all = (await h.request('GET', '/api/admin/questions', null, admin)).data.questions;
  const sample = { ...all[0], id: 'new-review-question' };
  const invalidImport = await h.request('POST', '/api/admin/questions/import', { questions: [sample, { ...sample, id: 'bad', options: ['only'] }] }, admin); assert.equal(invalidImport.status, 400); assert.equal(await h.app.store.get('questions', sample.id), null);
  const imported = await h.request('POST', '/api/admin/questions/import', { questions: [sample] }, admin); assert.equal(imported.data.imported, 1);
  assert.equal((await h.request('POST', `/api/admin/questions/${sample.id}/review`, { approved: true, enabled: true }, admin)).status,404);
  const saved=(await h.request('GET', `/api/admin/questions/${sample.id}`,null,admin)).data;assert.equal(saved.enabled,true);assert.equal(saved.reviewStatus,undefined);
  const challenge = await h.begin(token, 'red-1'); const raw = await h.app.store.get('challenges', challenge.id); const current = raw.questions[0];
  const changed = await h.request('PUT', `/api/admin/questions/${current.id}`, { ...current, answer: (current.answer + 1) % 4 }, admin); assert.equal(changed.data.approved, undefined); assert.equal(changed.data.enabled, true); assert.equal(changed.data.reviewStatus, undefined);
  const result = await h.answer(token, challenge, current.answer); assert.equal(result.data.feedback.right, true);
  const unsafe = await h.request('PUT', `/api/admin/questions/${sample.id}`, { ...sample, media: { type: 'image', url: 'javascript:alert(1)' } }, admin); assert.equal(unsafe.error.code, 'INVALID_MEDIA');
  const badPoints = await h.request('PUT', '/api/admin/config', { points: { byLevel: [-1, 2, 3, 4] } }, admin); assert.equal(badPoints.error.code, 'INVALID_INPUT');
  const timer = await h.request('PUT', '/api/admin/config', { timer: { seconds: 45 } }, admin); assert.equal(timer.data.approval.status, 'unapproved');
  const disabled = await h.request('PUT', '/api/admin/levels/red-1', { enabled: false }, admin); assert.equal(disabled.error.code, 'LEVEL_DEPENDENCY');
  const audit = await h.request('GET', '/api/admin/audit', null, admin); assert.ok(audit.data.entries.some(item => item.action === 'question.update')); assert.ok(!JSON.stringify(audit.data).includes(CREDS.password));
});

test('production uses enabled source content, blocks development identity, missing integrations and test-share evidence', async t => {
  const h = await harness(t, { mode: 'production', platformVerifier: async ticket => ({ id: ticket, name: '正式测试身份' }), shareVerifier: async () => false, syncReceiver: async () => true });
  assert.equal((await h.request('POST', '/api/auth/dev', { name: '不能开发登录' })).error.code, 'DEV_LOGIN_DISABLED');
  const login = await h.request('POST', '/api/auth/platform', { ticket: 'test-provider-ticket' }); assert.equal(login.status, 200); const token = login.data.token;
  assert.equal((await h.request('GET','/api/catalog')).data.levels.find(l=>l.id==='red-1').availableQuestions,15);
  const admin = (await h.admin()).data.token; const pool = (await h.request('GET', '/api/admin/questions?levelId=red-1', null, admin)).data.questions;
  for (const question of pool) await h.request('PUT', `/api/admin/questions/${question.id}`, { enabled: true }, admin);
  let challenge = await h.begin(token, 'red-1'); const raw = await h.app.store.get('challenges', challenge.id); challenge = (await h.answer(token, challenge, (raw.questions[0].answer + 1) % 4)).data;
  const revive = await h.request('POST', `/api/challenges/${challenge.id}/revive`, { evidence: { type: 'experience-test', challengeId: challenge.id }, requestId: crypto.randomUUID() }, token); assert.equal(revive.error.code, 'SHARE_NOT_VERIFIED'); assert.equal((await h.app.store.get('challenges', challenge.id)).reviveUsed, false);
  await h.request('PUT', '/api/admin/config', { timer: { seconds: 45 } }, admin);
  assert.equal((await h.request('POST', '/api/challenges', { levelId: 'culture-1', requestId: crypto.randomUUID() }, token)).error.code, 'PRODUCTION_NOT_READY');
});

test('transaction failure rolls back every entity and configured outbox delivery is retryable with stable event IDs', async t => {
  const store = new SQLiteStore(':memory:'); t.after(() => store.close());
  await assert.rejects(store.transaction(async tx => { await tx.set('ledger', 'x', { points: 10 }); await tx.set('completions', 'x', { passed: true }); throw new Error('forced failure'); }));
  assert.equal(await store.get('ledger', 'x'), null); assert.equal(await store.get('completions', 'x'), null);
  let accept = false; const seen = []; const h = await harness(t, { syncReceiver: async event => { seen.push(event.id); return accept; } }); const token = (await h.login()).data.token; await h.pass(token, 'red-1'); const admin = (await h.admin()).data.token;
  assert.deepEqual((await h.request('POST', '/api/admin/outbox/retry', {}, admin)).data, { delivered: 0, failed: 1 }); accept = true;
  assert.deepEqual((await h.request('POST', '/api/admin/outbox/retry', {}, admin)).data, { delivered: 1, failed: 0 });
  assert.equal(seen[0], seen[1]); assert.equal((await h.app.store.list('outbox'))[0].attempts, 2);
  assert.deepEqual((await h.request('POST', '/api/admin/outbox/retry', {}, admin)).data, { delivered: 0, failed: 0 });
});

test('HTTP static service permits only player assets and never exposes server credentials, data, source bank or filesystem traversal', async t => {
  const instance = await start({ port: 0, dbPath: ':memory:', mode: 'experience', adminCredentials: CREDS }); t.after(() => instance.close());
  const base = `http://127.0.0.1:${instance.server.address().port}`;
  assert.equal((await fetch(`${base}/`)).status, 200);
  for (const pathname of ['/server/application.cjs', '/server/data/quiz.sqlite', '/server/data/.admin-credentials.json', '/design/content-intake/current/bank.json', '/package.json', '/web/../../server/application.cjs']) assert.equal((await fetch(`${base}${pathname}`)).status, 404);
  assert.equal((await fetch(`${base}/images/v2-style03/wetland-observation.jpg`)).status, 200);
});

test('admin-only logout keeps player alive; generated experience credentials restore saved progress after expiry', async t => {
  const h=await harness(t),player=await h.login(),admin=await h.admin();
  await h.pass(player.data.token,'red-1');
  const cookies=`${player.headers.get('set-cookie').split(';')[0]}; ${admin.headers.get('set-cookie').split(';')[0]}`;
  const logout=await h.request('POST','/api/auth/logout',{scope:'admin'},'',{Cookie:cookies});
  assert.ok(!logout.headers.get('set-cookie').includes('quiz_session='));
  assert.equal((await h.request('GET','/api/me',null,player.data.token)).data.points,10);
  assert.equal((await h.request('GET','/api/admin/overview',null,admin.data.token)).status,401);
  h.advanceTime(8*86400000);
  assert.equal((await h.request('GET','/api/me',null,player.data.token)).status,401);
  assert.ok(player.data.deviceId.length>=24);
  const restored=await h.login('恢复玩家',player.data.deviceId);
  assert.equal(restored.data.user.id,player.data.user.id);
  assert.equal((await h.request('GET','/api/me',null,restored.data.token)).data.points,10);
});

test('original teaching media preserve explicit source labels without a question-review gate',async t=>{
  const h=await harness(t);
  for(const id of ['HN-ECOLOGY-1-09','HN-ECOLOGY-2-04','HN-ECOLOGY-3-05']){
    const q=await h.app.store.get('questions',id);
    assert.ok(q.media?.url);assert.equal(q.approved,undefined);assert.equal(q.enabled,true);
    assert.ok(q.media.caption.includes('非'));
  }
});

test('GET me does not present a second-timeout locked challenge as resumable',async t=>{
  const h=await harness(t),token=(await h.login()).data.token;
  let challenge=await h.begin(token,'red-1');h.advanceTime(30000);
  challenge=(await h.request('GET',`/api/challenges/${challenge.id}`,null,token)).data;
  await h.request('POST',`/api/challenges/${challenge.id}/revive`,{evidence:{type:'experience-test',challengeId:challenge.id},requestId:crypto.randomUUID()},token);
  h.advanceTime(30000);const me=(await h.request('GET','/api/me',null,token)).data;
  assert.equal(me.activeChallenge,null);assert.deepEqual(me.activeChallenges,[]);assert.equal(me.progress.red.nodes[0],'today-locked');
});

test('production never reuses a request result created in experience for the same verified identity',async t=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'quiz-mode-isolation-'));let app,server;
  t.after(async()=>{if(app)await app.close();fs.rmSync(folder,{recursive:true,force:true});});
  const options={dbPath:path.join(folder,'quiz.sqlite'),adminCredentials:CREDS,platformVerifier:async()=>({id:'same-platform-id',name:'隔离身份'}),shareVerifier:async()=>true,syncReceiver:async()=>true};
  async function call(url,body,token){const r=await fetch(`http://127.0.0.1:${server.address().port}`+url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,...(await r.json())};}
  app=await createApplication({...options,mode:'experience'});server=await app.listen();
  const player=await call('/api/auth/platform',{ticket:'isolated-experience-ticket'}),request={levelId:'red-1',requestId:'same-client-request'};
  const experience=await call('/api/challenges',request,player.data.token);assert.equal(experience.data.mode,'experience');
  await app.close();app=null;app=await createApplication({...options,mode:'production'});server=await app.listen();
  const production=await call('/api/auth/platform',{ticket:'isolated-production-ticket'});
  const result=await call('/api/challenges',request,production.data.token);
  assert.equal(result.status,200);assert.equal(result.data.mode,'production');assert.notEqual(result.data.id,experience.data.id);
});


test('removing question review migrates pending content once without changing play history or explicitly disabled/deleted questions',async t=>{
 const h=await harness(t),token=(await h.login()).data.token;await h.begin(token,'red-1');
 const all=await h.app.store.list('questions'),pending=all[0],disabled=all[1],deleted=all[2];
 await h.app.store.set('questions',pending.id,{...pending,enabled:false,approved:false,reviewStatus:'pending',reviewNote:'旧审核字段'});
 await h.app.store.set('questions',disabled.id,{...disabled,enabled:false,approved:true,reviewStatus:'approved'});
 await h.app.store.set('questions',deleted.id,{...deleted,enabled:false,deleted:true,reviewStatus:'pending'});
 await h.app.store.delete('meta','questions-no-review-v1');
 const collections=['users','challenges','completions','ledger','certificates'];const before=await Promise.all(collections.map(key=>h.app.store.list(key)));
 // Re-initialization against the same store performs startup migration; this object owns no extra listener.
 await createApplication({store:h.app.store,mode:'experience',adminCredentials:CREDS});
 const after=await Promise.all(collections.map(key=>h.app.store.list(key)));assert.deepEqual(after,before);
 const q=await h.app.store.get('questions',pending.id);assert.equal(q.enabled,true);assert.equal(q.version,pending.version);assert.equal(q.title,pending.title);assert.equal(q.answer,pending.answer);assert.equal(q.reviewStatus,undefined);assert.equal(q.approved,undefined);
 assert.equal((await h.app.store.get('questions',disabled.id)).enabled,false);assert.equal((await h.app.store.get('questions',deleted.id)).deleted,true);assert.equal((await h.app.store.list('questions')).length,all.length);
 const marker=await h.app.store.get('meta','questions-no-review-v1');await createApplication({store:h.app.store,mode:'experience',adminCredentials:CREDS});assert.deepEqual(await h.app.store.get('meta','questions-no-review-v1'),marker);
});
