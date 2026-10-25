'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createApplication}=require('../server/application.cjs');
const creds={username:'transfer-tests',password:'isolated-transfer-tests-only'};
test('one-time source metadata repair fills only absent fields on unchanged originals and never rewrites player history',async t=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),bank=require('../design/content-intake/current/bank.json');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'source-metadata-')),dbPath=path.join(dir,'test.sqlite');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let app=await createApplication({mode:'experience',dbPath,adminCredentials:creds});
 const [original,edited,explicit]=bank.questions.slice(0,3),collections=['users','challenges','completions','ledger','certificates','outbox'];
 await app.store.transaction(async tx=>{
  await tx.delete('meta','source-metadata-v1');
  for(const raw of [original,edited,explicit]){const q=await tx.get('questions',raw.id);for(const k of ['sourceTitle','knowledgePoint','region'])delete q[k];if(raw.id===edited.id)q.title+='人工修改';if(raw.id===explicit.id){q.sourceTitle='';q.knowledgePoint='人工知识点';q.region='人工地区';}await tx.set('questions',q.id,q);}
  for(const collection of collections)await tx.set(collection,'frozen-history',{id:'frozen-history',value:'must remain unchanged'});
 });
 const history=Object.fromEntries(await Promise.all(collections.map(async k=>[k,await app.store.list(k)])));await app.close();
 app=await createApplication({mode:'experience',dbPath,adminCredentials:creds});
 const repaired=await app.store.get('questions',original.id);for(const k of ['sourceTitle','knowledgePoint','region'])assert.equal(repaired[k],original[k]);
 assert(!Object.hasOwn(await app.store.get('questions',edited.id),'sourceTitle'));assert.equal((await app.store.get('questions',explicit.id)).sourceTitle,'');assert.equal((await app.store.get('questions',explicit.id)).knowledgePoint,'人工知识点');
 for(const collection of collections)assert.deepEqual(await app.store.list(collection),history[collection]);await app.close();
 app=await createApplication({mode:'experience',dbPath,adminCredentials:creds});assert.deepEqual(await app.store.get('questions',original.id),repaired);await app.close();
});
async function harness(t,options={}){
 const app=await createApplication({mode:'experience',dbPath:':memory:',adminCredentials:creds,...options});const server=await app.listen();t.after(()=>app.close());const base='http://127.0.0.1:'+server.address().port;
 async function call(method,url,body,token){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,...await r.json()};}
 const admin=(await call('POST','/api/auth/admin',creds)).data.token;
 return {app,call,admin,export:async()=>(await call('GET','/api/admin/activity/export',null,admin)).data,import:body=>call('POST','/api/admin/activity/import',body,admin)};
}
test('complete export contains all content fields and runtime media, with no users, tokens or development questions',async t=>{
 const h=await harness(t,{mode:'test'}),s=await h.export();assert.equal(s.schemaVersion,'activity-3');assert.equal(s.levels.length,16);assert.equal(s.questions.length,240);assert(s.questions.every(q=>q.difficulty&&q.options.length===4&&Number.isInteger(q.answer)));assert.equal(s.questions.filter(q=>q.media).length,3);assert(s.assets.includes('/media/observation.mp4'));
 assert(s.questions.some(q=>q.sourceTitle));assert(!JSON.stringify(s).includes('development-test'));for(const key of ['users','sessions','ledger','certificates','outbox'])assert(!(key in s));
 assert.equal((await h.call('GET','/api/admin/activity/export')).status,401);const player=(await h.call('POST','/api/auth/dev',{name:'隔离测试用户'})).data.token;assert.equal((await h.call('GET','/api/admin/activity/export',null,player)).status,403);assert.equal((await h.call('POST','/api/admin/activity/import',s,player)).status,403);
});
test('export and import into a separate empty-seeded store preserves complete content including disabled entries',async t=>{
 const h=await harness(t),other=await harness(t,{seedBank:{questions:[]}});const s=await h.export();s.questions[0].enabled=false;s.questions[0].difficulty='综合';s.questions[0].media={type:'video',url:'/media/observation.mp4',alt:'图示说明',caption:'图注，含逗号和换行\n下一行',required:true};s.questions[0].sourceIds=['来源甲'];s.questions[0].sourceTitle='资料标题';s.questions[0].knowledgePoint='知识点';s.questions[0].region='湖南';
 const r=await other.import(s);assert.equal(r.status,200,JSON.stringify(r));const restored=await other.export();assert.deepEqual(restored.questions,s.questions);assert.deepEqual(restored.levels,s.levels);for(const key of ['timer','revive','points','certificates','share','themes'])assert.deepEqual(restored.config[key],s.config[key]);assert.deepEqual(restored.assets,s.assets);
 const old=await other.app.store.list('questions');assert.equal((await other.import(restored)).status,200);assert.deepEqual(await other.app.store.list('questions'),old);
});
test('invalid snapshots and duplicate IDs are rejected atomically before any configuration or content writes',async t=>{
 const h=await harness(t),s=await h.export();const original=await h.app.store.list('questions'),cfg=await h.app.store.get('meta','config');
 const cases=[{...s,levels:[null]},{...s,questions:[{...s.questions[0],media:false}]},{...s,questions:[{...s.questions[0],media:[]}]},{...s,schemaVersion:'unknown'},{...s,questions:undefined},{...s,contentMode:'unknown'},{...s,questions:[{...s.questions[0],options:['only']}]},{...s,questions:[s.questions[0],s.questions[0]]},{...s,questions:[{...s.questions[0],themeId:'ecology'}]},{...s,questions:[{...s.questions[0],difficulty:'invalid'}]},{...s,questions:[{...s.questions[0],media:{type:'image',url:'/images/../private.png'}}]}];
 for(const body of cases){assert.equal((await h.import(body)).status,400);assert.deepEqual(await h.app.store.get('meta','config'),cfg);assert.deepEqual(await h.app.store.list('questions'),original);}
});
test('snapshot omissions deactivate content while player awards and the in-flight question stay intact',async t=>{
 const h=await harness(t);const token=(await h.call('POST','/api/auth/dev',{name:'隔离用户'})).data.token;const active=(await h.call('POST','/api/challenges',{levelId:'red-1',requestId:crypto.randomUUID()},token)).data;
 await h.app.store.transaction(async tx=>{await tx.set('ledger','history',{id:'history',userId:'fixed',points:10});await tx.set('certificates','history',{id:'issued-history',title:'历史标题'});});
 const history={ledger:await h.app.store.list('ledger'),certs:await h.app.store.list('certificates'),challenge:await h.app.store.get('challenges',active.id)};
 const s=await h.export(),missing=s.questions.pop();assert.equal((await h.import(s)).status,200);const disabled=await h.app.store.get('questions',missing.id);assert(disabled.deleted&&!disabled.enabled);
 assert.deepEqual(await h.app.store.list('ledger'),history.ledger);assert.deepEqual(await h.app.store.list('certificates'),history.certs);assert.deepEqual(await h.app.store.get('challenges',active.id),history.challenge);
 const exported=await h.export();assert(exported.questions.find(q=>q.id===missing.id).deleted);assert.equal((await h.import(exported)).status,200);assert((await h.app.store.get('questions',missing.id)).deleted);
});
test('legacy config-only activity-2 imports do not remove any questions or source metadata',async t=>{
 const h=await harness(t),s=await h.export(),before=await h.app.store.list('questions');assert.equal((await h.import({schemaVersion:'activity-2',config:s.config,levels:s.levels})).status,200);assert.deepEqual(await h.app.store.list('questions'),before);
});
test('question-only legacy import preserves omitted difficulty and source fields; explicit media and enabled values roundtrip',async t=>{
 const h=await harness(t),s=await h.export(),q=s.questions[0];await h.call('PUT','/api/admin/questions/'+q.id,{difficulty:'综合',enabled:false,sourceTitle:'保留来源'},h.admin);
 const partial={id:q.id,levelId:q.levelId,themeId:q.themeId,title:q.title,options:q.options,answer:q.answer,explanation:q.explanation};const r=await h.call('POST','/api/admin/questions/import',{questions:[partial]},h.admin);assert.equal(r.status,200);const saved=await h.app.store.get('questions',q.id);assert.equal(saved.difficulty,'综合');assert.equal(saved.enabled,false);assert.equal(saved.sourceTitle,'保留来源');
});
