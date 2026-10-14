'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {createApplication}=require('../server/application.cjs'),{identity}=require('./lib/runtime-evidence.cjs');
const out=path.resolve(__dirname,'../design/full-development/evidence/performance-report.json'),folder=fs.mkdtempSync(path.join(os.tmpdir(),'quiz-concurrency-'));
const users=24,checks=[],latencies=[];let app,server,requests=0,failures=0,failed;
const check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name);};
async function call(url,body,token){const started=performance.now();requests++;try{
  const response=await fetch('http://127.0.0.1:'+server.address().port+url,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)}),json=await response.json();
  if(!response.ok)throw Error(json.error?.code||'REQUEST_FAILED');return json.data;
}catch(e){failures++;throw e;}finally{latencies.push(performance.now()-started);}}
(async()=>{const begun=performance.now();try{
  app=await createApplication({mode:'experience',dbPath:path.join(folder,'quiz.sqlite'),adminCredentials:{username:'concurrency-test',password:crypto.randomBytes(24).toString('base64url')}});server=await app.listen();
  const players=await Promise.all(Array.from({length:users},(_,i)=>call('/api/auth/dev',{name:'隔离并发账号'+(i+1)})));
  const challenges=await Promise.all(players.map(p=>call('/api/challenges',{levelId:'red-1',requestId:crypto.randomUUID()},p.token))),lastSubmissions=[];
  for(let position=0;position<10;position++){
    await Promise.all(players.map(async(p,i)=>{
      const c=challenges[i],raw=await app.store.get('challenges',c.id),payload={questionId:c.question.id,optionId:raw.questions[raw.position].answer,requestId:crypto.randomUUID()};
      if(position===9)lastSubmissions[i]=payload;
      challenges[i]=await call('/api/challenges/'+c.id+'/answer',payload,p.token);
      if(position<9)challenges[i]=await call('/api/challenges/'+c.id+'/advance',{requestId:crypto.randomUUID()},p.token);
    }));
  }
  check('24账号同时完成真实10题且各得10分',challenges.every(c=>c.state==='completed'&&c.result.points===10));
  await Promise.all(players.map((p,i)=>call('/api/challenges/'+challenges[i].id+'/answer',lastSubmissions[i],p.token)));
  const me=await Promise.all(players.map(p=>call('/api/me',undefined,p.token)));
  check('重复末题不重复结算且各账号进度隔离',me.every(p=>p.points===10&&p.progress.red.completed===1&&p.progress.culture.completed===0));
  const ledger=await app.store.list('ledger'),completed=await app.store.list('completions');check('仅24条积分与通关记录',ledger.length===users&&completed.length===users&&ledger.reduce((n,r)=>n+r.points,0)===users*10);
  const ranks=await call('/api/rankings?period=total',undefined,players[0].token);check('总榜反映24个独立身份',ranks.entries.length===users&&ranks.entries.every(r=>r.completed===1&&r.accuracy===1));
  check('本组请求全部成功',failures===0);
}catch(e){failed=e.message;}finally{
  if(app)await app.close();fs.rmSync(folder,{recursive:true,force:true});latencies.sort((a,b)=>a-b);
  const percentile=n=>Math.round((latencies[Math.min(latencies.length-1,Math.ceil(latencies.length*n)-1)]||0)*100)/100;
  const report={date:new Date().toISOString(),...identity(),passed:!failed,checks,failure:failed||null,environment:{node:process.version,platform:process.platform,architecture:process.arch,storage:'SQLite WAL',host:'loopback'},concurrentAccounts:users,requests,failures,latencyMs:{p50:percentile(.5),p95:percentile(.95),max:latencies.at(-1)||0},elapsedSeconds:Math.round((performance.now()-begun)/10)/100,scope:'单进程本机HTTP与SQLite基线，24账号同时进行10题，每题分轮提交与下一题；含重复末题、积分/身份隔离和榜单。不是持续负载、生产容量、手机帧率或DM8/TongRDS验收。'};
  fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,accounts:users,requests,failures,p95:report.latencyMs.p95}));if(failed)process.exitCode=1;
}})();
