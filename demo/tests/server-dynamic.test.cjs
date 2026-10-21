'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const crypto=require('node:crypto');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createApplication}=require('../server/application.cjs');
const CREDS={username:'dynamic-test-admin',password:'dynamic-tests-only-password'};
const requestId=()=>crypto.randomUUID();
async function harness(t,extra={}){
 let time=Date.parse('2026-10-13T10:00:00+08:00');const app=await createApplication({dbPath:':memory:',mode:'experience',adminCredentials:CREDS,clock:()=>time,...extra});const server=await app.listen();t.after(()=>app.close());
 async function call(method,url,body,token){const response=await fetch(`http://127.0.0.1:${server.address().port}${url}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const raw=await response.text();let value;try{value=JSON.parse(raw);}catch{value=raw;}return{status:response.status,...(typeof value==='object'?value:{raw:value})};}
 const admin=(await call('POST','/api/auth/admin',CREDS)).data.token;
 async function player(name='动态玩家'){return(await call('POST','/api/auth/dev',{name})).data.token;}
 async function cfg(patch){const response=await call('PUT','/api/admin/config',patch,admin);assert.equal(response.status,200,JSON.stringify(response));return response.data;}
 async function begin(token,levelId){const response=await call('POST','/api/challenges',{levelId,requestId:requestId()},token);assert.equal(response.status,200,JSON.stringify(response));return response.data;}
 async function answer(token,c,correct=true,key=requestId()){const raw=await app.store.get('challenges',c.id);const answer=raw.questions[raw.position].answer;return call('POST',`/api/challenges/${c.id}/answer`,{questionId:c.question.id,optionId:correct?answer:(answer+1)%4,requestId:key},token);}
 async function through(token,levelId,leaveLast=false){let c=await begin(token,levelId);for(let n=0;n<c.total;n++){if(leaveLast&&n===c.total-1)return c;const r=await answer(token,c);assert.equal(r.status,200,JSON.stringify(r));c=r.data;if(n<c.total-1){const next=await call('POST',`/api/challenges/${c.id}/advance`,{requestId:requestId()},token);assert.equal(next.status,200);c=next.data;}}assert.equal(c.state,'completed');return c;}
 return{app,call,admin,player,cfg,begin,answer,through,advance:ms=>time+=ms};
}

test('v2 migration keeps the approved default instance; equivalent policy metadata and appearance edits do not approve or invalidate rules',async t=>{
 const h=await harness(t),cfg=(await h.call('GET','/api/admin/config',null,h.admin)).data;
 assert.equal(cfg.schemaVersion,2);assert.equal(cfg.themes.length,4);assert.equal(cfg.points.dailyPointCap,null);assert.equal(cfg.points.capPolicy,'truncate-reward');assert.equal(cfg.revive.failurePolicy,'until-limit');assert.equal(cfg.approval.status,'user-approved');
 const changed=await h.cfg({points:{dailyPointCap:null,capPolicy:'truncate-reward'},revive:{limit:1,failurePolicy:'until-limit'},share:{title:'新分享标题',text:'分享测试文案'},certificates:{title:'新证书抬头'}});assert.equal(changed.approval.status,'user-approved');
 const bad=await h.call('PUT','/api/admin/config',{themes:null},h.admin);assert.equal(bad.status,400);
 const rule=await h.cfg({revive:{limit:2}});assert.equal(rule.approval.status,'unapproved');
 const forged=await h.cfg({approval:{status:'approved'}});assert.equal(forged.approval.status,'unapproved');
});

test('new dynamic theme and arbitrary stable level IDs play configured question counts and issue configured theme and total certificates',async t=>{
 const h=await harness(t),old=(await h.call('GET','/api/admin/config',null,h.admin)).data;
 const config=await h.cfg({themes:[...old.themes.map(theme=>({...theme,enabled:false})),{id:'new-theme',name:'新主题',order:5,enabled:true,certificateName:'原创知识证书',certificateText:'完成新主题学习',description:'动态主题说明'}],certificates:{title:'动态荣誉抬头',totalName:'全部关卡达人',totalText:'完成活动全部挑战',footer:'体验记录'}});
 assert.equal(config.approval.status,'unapproved');
 for(const [index,levelId]of ['intro-learning','practice-learning'].entries()){
  const level=await h.call('POST','/api/admin/levels',{id:levelId,themeId:'new-theme',order:10+index*10,name:`自定义关${index+1}`,difficultyLabel:'原创练习',enabled:true,points:7+index,questionCount:3+index},h.admin);assert.equal(level.status,201);
  for(let q=0;q<4;q++){const id=`CUSTOM-${index}-${q}`;const created=await h.call('POST','/api/admin/questions',{id,levelId,title:`原创测试${q}+1等于多少？`,options:[String(q+1),String(q+2),String(q+3),String(q+4)],answer:0,explanation:'按题目所给数字计算',difficulty:'基础'},h.admin);assert.equal(created.status,201);await h.call('PUT',`/api/admin/questions/${id}`,{enabled:true},h.admin);}
 }
 const token=await h.player();let me=(await h.call('GET','/api/me',null,token)).data;assert.deepEqual(me.progress['new-theme'].levelIds,['intro-learning','practice-learning']);assert.equal(me.progress['new-theme'].total,2);assert.deepEqual(me.progress['new-theme'].nodes,['available','locked']);
 const first=await h.through(token,'intro-learning');assert.equal(first.total,3);assert.equal(first.levelName,'自定义关1');assert.equal(first.themeName,'新主题');assert.equal(first.nextLevelId,'practice-learning');assert.equal(first.result.points,7);assert.equal(first.result.themeComplete,false);
 const last=await h.through(token,'practice-learning');assert.equal(last.total,4);assert.equal(last.themeComplete,true);assert.equal(last.nextLevelId,null);
 const certs=(await h.call('GET','/api/certificates',null,token)).data.certificates;assert.equal(certs.length,2);assert.deepEqual(new Set(certs.map(c=>c.name)),new Set(['原创知识证书','全部关卡达人']));assert.ok(certs.every(c=>c.title==='动态荣誉抬头'&&c.footer==='体验记录'&&c.levelIds.length===2));
 await h.cfg({certificates:{title:'后来更改'}});const svg=await h.call('GET',certs[0].downloadUrl,null,token);assert.ok(svg.raw.includes('动态荣誉抬头'));assert.ok(!svg.raw.includes('后来更改'));
});

test('reordering uses stable IDs; active challenges retain old directory names, rewards, question count, deadlines and certificate requirements',async t=>{
 const h=await harness(t),token=await h.player();const old=await h.begin(token,'red-1');const deadline=old.deadline;
 const update=await h.call('PUT','/api/admin/levels',{levels:[{id:'red-1',order:2,name:'后来更名',points:27,questionCount:5},{id:'red-2',order:1}]},h.admin);assert.equal(update.status,200);
 const cfg=(await h.call('GET','/api/admin/config',null,h.admin)).data;assert.equal(cfg.approval.status,'unapproved');
 const fresh=await h.player('新排序玩家');assert.equal((await h.call('POST','/api/challenges',{levelId:'red-1',requestId:requestId()},fresh)).error.code,'LEVEL_LOCKED');const newFirst=await h.begin(fresh,'red-2');assert.equal(newFirst.levelOrder,1);assert.equal(newFirst.nextLevelId,'red-1');
 await h.call('POST',`/api/challenges/${old.id}/exit`,{requestId:requestId()},token);
 const all=(await h.call('GET','/api/admin/levels',null,h.admin)).data.levels;const disabled=await h.call('PUT','/api/admin/levels',{levels:all.filter(l=>l.themeId==='red').map(l=>({...l,enabled:false}))},h.admin);assert.equal(disabled.status,200);
 const resumed=await h.begin(token,'red-1');assert.equal(resumed.id,old.id);assert.equal(resumed.deadline,deadline);assert.equal(resumed.total,10);assert.equal(resumed.levelName,old.levelName);assert.equal(resumed.levelOrder,1);assert.deepEqual(resumed.certificateRequirements,old.certificateRequirements);
 const done=await h.through(token,'red-1');assert.equal(done.result.points,10);assert.equal(done.total,10);
});

test('daily cap truncates reward atomically across concurrent completions, awards zero without blocking progress and resets on Beijing midnight',async t=>{
 const h=await harness(t);await h.cfg({points:{dailyPointCap:15}});const token=await h.player();const a=await h.through(token,'red-1',true),b=await h.through(token,'culture-1',true);
 const results=await Promise.all([h.answer(token,a),h.answer(token,b)]);assert.ok(results.every(r=>r.status===200&&r.data.state==='completed'));assert.deepEqual(results.map(r=>r.data.result.points).sort((x,y)=>x-y),[5,10]);assert.ok(results.some(r=>r.data.result.dailyCapReached));assert.ok(results.every(r=>r.data.result.requested===10));
 const second=await h.through(token,'red-2');assert.equal(second.result.awarded,0);assert.equal(second.result.requested,15);assert.equal(second.result.dailyCapReached,true);assert.equal(second.result.passed,true);
 let me=(await h.call('GET','/api/me',null,token)).data;assert.equal(me.dailyPoints,15);assert.equal(me.dailyRemaining,0);assert.equal(me.progress.red.nodes[2],'available');
 h.advance(14*3600000+1000);me=(await h.call('GET','/api/me',null,token)).data;assert.equal(me.dailyPoints,0);assert.equal(me.dailyRemaining,15);
 const next=await h.through(token,'red-3');assert.equal(next.result.points,15);assert.equal(next.result.requested,20);assert.equal((await h.app.store.list('ledger')).reduce((sum,item)=>sum+item.points,0),30);
 const replay=await h.through(token,'red-2');assert.equal(replay.result.points,0);assert.equal(replay.result.requested,0);
});

test('rankings report awarded ledger points for the selected period without changing completion order or counting replays',async t=>{
 const h=await harness(t);await h.cfg({points:{dailyPointCap:11}});
 const first=await h.player('先通两关'),second=await h.player('另一玩家');
 await h.through(first,'red-1');await h.through(first,'red-2');await h.through(second,'red-1');
 for(const period of ['day','total']){
  const result=await h.call('GET','/api/rankings?period='+period,null,first);assert.equal(result.status,200);
  assert.deepEqual(result.data.entries.map(row=>[row.name,row.completed,row.points]),[['先通两关',2,11],['另一玩家',1,10]]);
  assert.equal(result.data.own.points,11);
 }
 h.advance(14*3600000+1000);
 assert.equal((await h.call('GET','/api/rankings?period=day',null,first)).data.entries.length,0);
 await h.through(first,'red-3');await h.through(first,'red-3');
 const today=(await h.call('GET','/api/rankings?period=day',null,first)).data;
 const total=(await h.call('GET','/api/rankings?period=total',null,first)).data;
 assert.equal(today.own.points,11);assert.equal(today.own.completed,1);
 assert.equal(total.own.points,22);assert.equal(total.own.completed,3);
 assert.equal(total.own.points,(await h.call('GET','/api/me',null,first)).data.points);
});

test('a zero cap still completes levels, while old in-flight challenges keep their uncapped reward snapshot',async t=>{
 const h=await harness(t),token=await h.player();const old=await h.begin(token,'red-1');await h.cfg({points:{dailyPointCap:0}});
 const done=await h.through(token,'red-1');assert.equal(done.id,old.id);assert.equal(done.result.points,10);assert.equal(done.result.dailyPointCap,null);
 const newLevel=await h.through(token,'red-2');assert.equal(newLevel.result.points,0);assert.equal(newLevel.result.requested,15);assert.equal(newLevel.result.dailyPointCap,0);assert.equal(newLevel.state,'completed');
});

test('two configured revives consume exactly twice, preserve current question and lock after the limit; zero revive locks on first error',async t=>{
 const h=await harness(t);await h.cfg({revive:{limit:2}});const token=await h.player();let c=await h.begin(token,'red-1');const qid=c.question.id;
 for(let count=0;count<2;count++){c=(await h.answer(token,c,false)).data;assert.equal(c.state,'revive');assert.equal(c.feedback.answer,null);const body={evidence:{type:'experience-test',challengeId:c.id},requestId:requestId()};const revived=await h.call('POST',`/api/challenges/${c.id}/revive`,body,token);const repeat=await h.call('POST',`/api/challenges/${c.id}/revive`,body,token);assert.deepEqual(revived.data,repeat.data);c=revived.data;assert.equal(c.reviveCount,count+1);assert.equal(c.revivesRemaining,1-count);assert.equal(c.question.id,qid);}
 c=(await h.answer(token,c,false)).data;assert.equal(c.state,'locked');assert.equal(c.reviveCount,2);assert.equal(c.revivesRemaining,0);
 await h.cfg({revive:{limit:0}});let none=await h.begin(token,'culture-1');none=(await h.answer(token,none,false)).data;assert.equal(none.state,'locked');assert.equal(none.reviveUsed,false);assert.equal(none.reviveCount,0);
});

test('fifth level works without ID suffix parsing; dynamic pool checks, soft delete and restoration preserve stored question history',async t=>{
 const h=await harness(t);const added=await h.call('POST','/api/admin/levels',{id:'red-extra',themeId:'red',order:5,name:'第五关',difficultyLabel:'综合延展',enabled:true,points:33,questionCount:1},h.admin);assert.equal(added.status,201);
 const token=await h.player();for(let i=1;i<=4;i++)await h.through(token,`red-${i}`);
 const noPool=await h.call('POST','/api/challenges',{levelId:'red-extra',requestId:requestId()},token);assert.equal(noPool.error.code,'INSUFFICIENT_QUESTIONS');
 const create=await h.call('POST','/api/admin/questions',{id:'EXTRA-QUESTION',levelId:'red-extra',title:'一次新增关卡需要先完成什么？',options:['配置有效题目','修改玩家积分','跳过所有题目','绕过验证'],answer:0,explanation:'配置有效题库后才能开始',difficulty:'综合'},h.admin);assert.equal(create.status,201);await h.call('PUT','/api/admin/questions/EXTRA-QUESTION',{enabled:true},h.admin);
 const complete=await h.through(token,'red-extra');assert.equal(complete.total,1);assert.equal(complete.result.points,33);assert.equal(complete.themeComplete,true);
 const certs=(await h.call('GET','/api/certificates',null,token)).data.certificates;assert.equal(certs.find(c=>c.themeId==='red').levelIds.length,5);
 assert.equal((await h.call('DELETE','/api/admin/levels/red-extra',{},h.admin)).status,200);assert.ok(await h.app.store.get('questions','EXTRA-QUESTION'));
 const restored=await h.call('PUT','/api/admin/levels/red-extra',{enabled:true},h.admin);assert.equal(restored.status,200);assert.equal(restored.data.deleted,false);assert.equal((await h.through(token,'red-extra')).result.points,0);
});

test('activity import validates atomically, exports dynamic configuration and cannot import approvals or erase history',async t=>{
 const h=await harness(t);const exported=(await h.call('GET','/api/admin/activity/export',null,h.admin)).data;assert.equal(exported.schemaVersion,'activity-2');assert.ok(!('questions' in exported));exported.questions=(await h.call('GET','/api/admin/questions/export',null,h.admin)).data.questions;assert.equal(exported.questions.length,240);
 const before=(await h.app.store.get('meta','config')).version;
 const bad={config:{...exported.config,points:{...exported.config.points,dailyPointCap:20}},levels:exported.levels,questions:[{...exported.questions[0],options:['invalid']}]};assert.equal((await h.call('POST','/api/admin/activity/import',bad,h.admin)).status,400);assert.equal((await h.app.store.get('meta','config')).version,before);
 const approved=await h.call('PUT',`/api/admin/questions/${exported.questions[0].id}`,{enabled:true},h.admin);assert.equal(approved.status,200);
 const good=await h.call('POST','/api/admin/activity/import',{config:{...exported.config,points:{...exported.config.points,dailyPointCap:20},approval:{status:'approved'}},levels:exported.levels,questions:[{...exported.questions[0],approved:true,enabled:true}]},h.admin);assert.equal(good.status,200);assert.equal(good.data.config.approval.status,'unapproved');const q=await h.app.store.get('questions',exported.questions[0].id);assert.equal(q.approved,undefined);assert.equal(q.enabled,true);assert.equal(q.experienceAuthorized,undefined);
 const pool=await h.call('PUT','/api/admin/levels/red-1',{questionCount:30},h.admin);assert.equal(pool.status,200);const token=await h.player();assert.equal((await h.call('POST','/api/challenges',{levelId:'red-1',requestId:requestId()},token)).error.code,'INSUFFICIENT_QUESTIONS');
});

test('production refuses unapproved dynamic rewards or cap, and never returns the experience request cache',async t=>{
 const h=await harness(t,{mode:'production',platformVerifier:async()=>({id:'dynamic-platform-id',name:'正式隔离测试'}),shareVerifier:async()=>true,syncReceiver:async()=>true});const token=(await h.call('POST','/api/auth/platform',{ticket:'test-platform-ticket'})).data.token;
 for(const question of(await h.call('GET','/api/admin/questions?levelId=red-1',null,h.admin)).data.questions)await h.call('PUT',`/api/admin/questions/${question.id}`,{enabled:true},h.admin);
 const approved=await h.begin(token,'red-1');await h.call('POST',`/api/challenges/${approved.id}/exit`,{requestId:requestId()},token);await h.cfg({points:{dailyPointCap:20}});
 const resumed=await h.begin(token,'red-1');assert.equal(resumed.id,approved.id);assert.equal(resumed.rulesVersion,approved.rulesVersion);
 const fresh=await h.call('POST','/api/challenges',{levelId:'culture-1',requestId:requestId()},token);assert.equal(fresh.error.code,'PRODUCTION_NOT_READY');
});

test('legacy transaction migration preserves exact identity, earned ledger and certificate IDs, and restores absolute in-flight deadline only once',async t=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'quiz-v2-migration-'));let app,server;const options={dbPath:path.join(folder,'quiz.sqlite'),mode:'experience',adminCredentials:CREDS};t.after(async()=>{if(app)await app.close();fs.rmSync(folder,{recursive:true,force:true});});
 app=await createApplication(options);server=await app.listen();async function call(method,url,body,token){const response=await fetch(`http://127.0.0.1:${server.address().port}${url}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result.data;}
 const player=await call('POST','/api/auth/dev',{name:'历史用户'});let challenge=await call('POST','/api/challenges',{levelId:'red-1',requestId:requestId()},player.token);
 await app.store.transaction(async tx=>{const cfg=await tx.get('meta','config');delete cfg.schemaVersion;delete cfg.certificates;delete cfg.share;delete cfg.points.dailyPointCap;delete cfg.points.capPolicy;delete cfg.revive.failurePolicy;cfg.themes=cfg.themes.map(({id,name,cover,background,enabled})=>({id,name,cover,background,enabled}));await tx.set('meta','config',cfg);await tx.delete('meta','catalog-v2');const raw=await tx.get('challenges',challenge.id);raw.rules={version:raw.rules.version,seconds:30,points:10,approval:cfg.approval};delete raw.reviveCount;raw.reviveUsed=true;await tx.set('challenges',raw.id,raw);await tx.set('ledger','old-ledger',{id:'old-ledger',userId:player.user.id,points:10,at:Date.now(),mode:'experience'});await tx.set('certificates','old-certificate',{id:'historic-cert-id',key:'old-certificate',userId:player.user.id,themeId:'red',name:'历史证书',issuedAt:Date.now(),day:'2026-10-12',mode:'experience'});});
 const ledger=await app.store.list('ledger');await app.close();app=null;app=await createApplication(options);server=await app.listen();
 const restored=await call('GET',`/api/challenges/${challenge.id}`,null,player.token);assert.equal(restored.deadline,challenge.deadline);assert.equal(restored.total,10);assert.equal(restored.reviveCount,1);assert.equal(restored.reviveLimit,1);assert.equal(restored.levelOrder,1);assert.deepEqual(await app.store.list('ledger'),ledger);
 const certificates=await call('GET','/api/certificates',null,player.token);assert.equal(certificates.certificates[0].id,'historic-cert-id');assert.equal(certificates.certificates[0].levelIds.length,4);assert.equal((await call('GET','/api/me',null,player.token)).user.id,player.user.id);
 const versions=(await app.store.list('catalogReleases')).length;await app.close();app=null;app=await createApplication(options);server=await app.listen();assert.equal((await app.store.list('catalogReleases')).length,versions);assert.deepEqual(await app.store.list('ledger'),ledger);
});


test('activity config roundtrip preserves every question and enabled flag, and cannot restore revoked rule approval',async t=>{
 const h=await harness(t);const exportOne=(await h.call('GET','/api/admin/activity/export',null,h.admin)).data;const before=await h.app.store.list('questions');
 const restored=await h.call('POST','/api/admin/activity/import',exportOne,h.admin);assert.equal(restored.status,200);assert.equal(restored.data.config.approval.status,'user-approved');assert.deepEqual(await h.app.store.list('questions'),before);
 await h.cfg({revive:{limit:2}});const exportTwo=(await h.call('GET','/api/admin/activity/export',null,h.admin)).data;exportTwo.config.approval={status:'user-approved',approvedAt:'forged'};
 const denied=await h.call('POST','/api/admin/activity/import',exportTwo,h.admin);assert.equal(denied.status,200);assert.equal(denied.data.config.approval.status,'unapproved');assert.deepEqual(await h.app.store.list('questions'),before);
});
