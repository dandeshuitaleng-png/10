'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {createApplication}=require('../server/application.cjs'),{createBackup,restoreBackup}=require('../server/maintenance.cjs');
const {identity}=require('./lib/runtime-evidence.cjs');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'quiz-recovery-drill-')),out=path.resolve(__dirname,'../design/full-development/evidence/operations-report.json');
const creds={username:'recovery-test',password:crypto.randomBytes(24).toString('base64url')},checks=[];let app,server,failed;
const check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name);};
async function call(url,body,token){const r=await fetch('http://127.0.0.1:'+server.address().port+url,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)}),json=await r.json();if(!r.ok)throw Error(json.error?.code||'REQUEST_FAILED');return json.data;}
async function pass(token,levelId){let c=await call('/api/challenges',{levelId,requestId:crypto.randomUUID()},token);for(let n=0;n<10;n++){const raw=await app.store.get('challenges',c.id);c=await call('/api/challenges/'+c.id+'/answer',{questionId:c.question.id,optionId:raw.questions[raw.position].answer,requestId:crypto.randomUUID()},token);if(n<9)c=await call('/api/challenges/'+c.id+'/advance',{requestId:crypto.randomUUID()},token);}return c;}
(async()=>{try{
  const source=path.join(folder,'source.sqlite'),snapshot=path.join(folder,'backup.sqlite'),recovered=path.join(folder,'recovered.sqlite');
  const clock=()=>Date.parse('2026-10-12T12:00:00+08:00');
  app=await createApplication({dbPath:source,adminCredentials:creds,mode:'experience',clock});server=await app.listen();const token=(await call('/api/auth/dev',{name:'隔离恢复演练'},undefined)).token;
  for(let n=1;n<=4;n++)await pass(token,'red-'+n);
  const active=await call('/api/challenges',{levelId:'culture-1',requestId:crypto.randomUUID()},token);
  const before=await call('/api/me',undefined,token),certificates=await call('/api/certificates',undefined,token);check('备份前真实完成4关75分1证书',before.points===75&&before.progress.red.completed===4&&certificates.certificates.length===1);
  const backup=await createBackup(source,snapshot);check('运行中一致备份通过完整性检查',backup.integrity==='ok');
  await pass(token,'culture-1');check('备份后新成绩进入源数据库',(await call('/api/me',undefined,token)).points===85);
  const restored=restoreBackup(snapshot,recovered);check('恢复校验哈希与结构一致',restored.sha256===backup.sha256);
  await app.close();app=null;
  app=await createApplication({dbPath:recovered,adminCredentials:creds,mode:'experience',clock});server=await app.listen();
  const me=await call('/api/me',undefined,token),certs=await call('/api/certificates',undefined,token);check('恢复后原会话与已通关记录可用',me.points===75&&me.progress.red.completed===4&&certs.certificates.length===1);
  const resumed=await call('/api/challenges/'+active.id,undefined,token);check('恢复后保留原题与截止时间',resumed.question.id===active.question.id&&resumed.deadline===active.deadline&&resumed.reviveUsed===active.reviveUsed);
  let blocked=false;try{restoreBackup(snapshot,recovered);}catch(e){blocked=e.message==='DESTINATION_EXISTS';}check('恢复不覆盖现有运行数据库',blocked);
}catch(e){failed=e.message;}finally{
  if(app)await app.close();fs.rmSync(folder,{recursive:true,force:true});fs.mkdirSync(path.dirname(out),{recursive:true});
  const report={date:new Date().toISOString(),...identity(),passed:!failed,checks,failure:failed||null,scope:'隔离游戏真实HTTP完成4关、75分、1证书与活动挑战；运行中SQLite备份、源库继续计分、恢复后重新启动验证原会话/进度/证书/题目截止时间。临时数据库与凭据已清理；不是DM8/TongRDS验收。'};
  fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks:checks.length,failure:report.failure}));if(failed)process.exitCode=1;
}})();
