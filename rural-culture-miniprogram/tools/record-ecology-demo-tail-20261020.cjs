'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),project=path.join(workspace,'.rural-quiz-runtime/ecology-demo-video'),qa=path.join(root,'qa/ecology-demo-video-20261020'),raw=path.join(qa,'native-tail.mov'),stop=path.join(qa,'native-tail.stop'),ready=raw+'.ready.json';
const events=[],sections=[];let t0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function call(tool,args){return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let out='',err='';c.stdout.on('data',b=>out+=b);c.stderr.on('data',b=>err+=b);c.on('close',code=>{let r;try{r=JSON.parse(out.slice(out.indexOf('{')));}catch{return reject(Error(err||out));}events.push({at:Date.now(),tool,args,ok:r.ok,result:r.result});fs.writeFileSync(path.join(qa,'tail-actions.json'),JSON.stringify(events,null,2));if(code||!r.ok||r.result?.success===false)reject(Error(r.message||r.result?.error));else resolve(r.result);});});}
const get=(p,selector)=>call('automation_page_action',['--action','getData','--data-path',p,...(selector?['--wait-for-selector',selector]:[])]).then(r=>r.data);
const touch=s=>call('automation_element_action',['--action','trigger','--selector',s,'--type','tap','--detail','{}','--wait-for-selector',s]);
const scroll=y=>call('automation_element_action',['--action','scrollTo','--selector','.panel-body','--x','0','--y',String(y)]);
(async()=>{
 assert.equal(await get('pageActorPose','.profile-avatar'),'scholar');assert.equal(await get('snapshot.progress.completed'),1);
 for(const p of [stop,ready])if(fs.existsSync(p))fs.unlinkSync(p);
 const capture=spawn(path.join(workspace,'.rural-quiz-runtime/record-wechat-window'),['39697',raw,'150',stop,path.join(qa,'tail-window.png')]);let errors='';capture.stdout.on('data',b=>process.stdout.write(b));capture.stderr.on('data',b=>errors+=b);const done=new Promise(r=>capture.on('close',code=>r({code,errors})));
 try{
  for(let i=0;i<150&&!fs.existsSync(ready);i++){if(capture.exitCode!==null)throw Error(errors);await sleep(100);}assert(fs.existsSync(ready));t0=JSON.parse(fs.readFileSync(ready)).unixTime*1000;
  let start=(Date.now()-t0)/1000;await sleep(1400);await touch('.profile-avatar');await sleep(2300);assert.equal(await get('route'),'profile');await touch('.profile-stats button[data-route="points"]');assert.equal(await get('route'),'points');await sleep(2500);sections.push({name:'我的学习与积分记录',start,end:(Date.now()-t0)/1000});console.log('RECORDED 学习与积分');
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?review=1&controls=0&scenario=certificate']);assert.equal(await get('pageActorPose','.certificate-companion'),'skater');
  start=(Date.now()-t0)/1000;await sleep(1600);await touch('.certificate-companion');await sleep(2500);await scroll(600);await sleep(2200);await scroll(0);await sleep(1800);sections.push({name:'学习证书与比耶回应',start,end:(Date.now()-t0)/1000});console.log('RECORDED 证书');
 }finally{fs.writeFileSync(stop,'stop');const result=await done;if(result.code)throw Error(result.errors);}
 fs.writeFileSync(path.join(qa,'tail-recording.json'),JSON.stringify({raw,sections,windowOnly:true,subtitles:false,addedOverlays:false,sourceNote:'Independent native demonstration data. First chapter completed normally; final certificate uses the existing review scenario.'},null,2)+'\n');
})().catch(e=>{if(t0)fs.writeFileSync(stop,'stop');console.error(e);process.exitCode=1;});
