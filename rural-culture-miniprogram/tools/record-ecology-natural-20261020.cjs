'use strict';
// Window-only native capture. Actions and their real timings are retained for an edit
// that cuts waits rather than uniformly speeding up character animations.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),fixture=path.join(workspace,'.rural-quiz-runtime/ecology-demo-video'),qa=path.join(root,'qa/ecology-natural-video-20261020');
const bank=require(path.join(fixture,'miniprogram/services-v4/catalog.js')),answers=new Map(bank.questions.map(q=>[q.id,q.answer]));
const events=[],sections=[],raw=path.join(qa,'native.mov'),stop=path.join(qa,'native.stop');let origin=0,active,recorder,done;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const time=()=>origin?(Date.now()-origin)/1000:0;
function save(){fs.writeFileSync(path.join(qa,'actions.json'),JSON.stringify({events,sections},null,2)+'\n');}
function begin(name){end();active={name,start:time()};}
function end(){if(active){sections.push({...active,end:time()});active=null;save();}}
async function call(tool,args=[],note=''){
 const started=time();return new Promise((resolve,reject)=>{
  const p=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',fixture,...args]);let output='',errors='';const timer=setTimeout(()=>{p.kill();reject(Error(tool+' timeout'));},40000);
  p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>errors+=b);p.on('error',reject);p.on('close',code=>{
   clearTimeout(timer);let reply;try{reply=JSON.parse(output.slice(output.indexOf('{')));}catch{return reject(Error(errors||output));}
   events.push({tool,args,note,start:started,end:time(),ok:reply.ok,result:reply.result});save();
   if(code||!reply.ok||reply.result?.success===false)return reject(Error(reply.message||reply.result?.error));resolve(reply.result);
  });
 });
}
const get=key=>call('automation_page_action',['--action','getData','--data-path',key]).then(r=>r.data);
const tap=(selector,note='')=>call('automation_element_action',['--action','trigger','--selector',selector,'--type',/^#(?:footer|modal)-/.test(selector)?'action':'tap','--detail','{}','--wait-for-selector',selector],note);
const scroll=(y,note='')=>call('automation_element_action',['--action','scrollTo','--selector','.panel-body','--x','0','--y',String(y)],note);
const load=scenario=>call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?review=1&controls=0&scenario='+scenario]);
async function choose(index){await scroll(index>=2?240:0);await tap('.option[data-index="'+index+'"]','select');}
async function answer(index){await choose(index);await sleep(380);await tap('#footer-primary','submit');}
(async()=>{
 assert.equal(require(path.join(fixture,'miniprogram/game-config.js')).mode,'mock');
 assert.equal(await get('route'),'home');const focus=await get('journey.focusTop');assert(await get('shareCoverImage'));
 recorder=spawn(path.join(workspace,'.rural-quiz-runtime/record-wechat-window'),[process.argv[2]||'40003',raw,'480',stop,path.join(qa,'window.png')]);let errors='';recorder.stdout.on('data',b=>process.stdout.write(b));recorder.stderr.on('data',b=>errors+=b);done=new Promise(resolve=>recorder.on('close',code=>resolve({code,errors})));
 const ready=raw+'.ready.json';for(let i=0;i<150&&!fs.existsSync(ready);i++){if(recorder.exitCode!==null)throw Error(errors);await sleep(100);}assert(fs.existsSync(ready));origin=JSON.parse(fs.readFileSync(ready)).unixTime*1000;
 begin('home');await sleep(600);await tap('.route-stop.current .chapter-mascot','actor');await sleep(1350);await scroll(0,'map-up');await sleep(500);await scroll(focus,'map-focus');await sleep(500);end();console.log('RECORDED home');
 begin('rules');await tap('#footer-primary','open-rules');assert.equal(await get('modal'),'rules');await sleep(650);await tap('.modal-actor','actor');await sleep(1000);await tap('#modal-primary','start');assert.equal(await get('route'),'quiz');await sleep(650);end();console.log('RECORDED rules');
 begin('question');await tap('.quest-companion','actor');await sleep(1100);const first=await get('challenge'),correct=answers.get(first.question.id);await answer(correct===0?1:0);assert.equal(await get('modal'),'revive');await sleep(400);end();
 begin('revive');await tap('.revive-companion','actor');await sleep(1350);await tap('#modal-primary','open-share');assert.equal(await get('modal'),'share');await sleep(900);end();
 begin('share');await sleep(600);await tap('#modal-primary','continue');assert.equal(await get('modal'),'');await sleep(450);end();console.log('RECORDED new share cover');
 begin('correct');await answer(correct);assert.equal((await get('challenge')).status,'correct');await sleep(800);await scroll(0);await tap('.quest-companion','actor');await sleep(1000);await scroll(650,'explanation');await sleep(750);end();
 // Repeated questions remain in the raw evidence, outside every selected scene.
 for(let i=1;i<10;i++){await tap('#footer-primary');const c=await get('challenge');await answer(answers.get(c.question.id));assert.equal((await get('challenge')).status,'correct');console.log('Answered '+(i+1)+'/10');}
 begin('result');await tap('#footer-primary','result');assert.equal(await get('route'),'result');await sleep(600);await tap('.result-companion','actor');await sleep(1350);end();
 begin('next-map');await tap('.section-bar .icon-button','map');assert.equal(await get('route'),'levels');await sleep(500);await tap('.route-stop.current .chapter-mascot','actor');await sleep(1400);end();console.log('RECORDED chapter completion');
 begin('profile');await tap('.activity-shortcut[data-route="profile"]','profile');assert.equal(await get('pageActorPose'),'scholar');await sleep(500);await tap('.profile-avatar','actor');await sleep(1400);end();
 begin('points');await tap('.profile-stats button[data-route="points"]','points');assert.equal(await get('route'),'points');await sleep(1100);await tap('.points-avatar','actor');await sleep(900);end();console.log('RECORDED profile and points');
 await load('certificate');assert.equal(await get('pageActorPose'),'skater');
 begin('certificate');await sleep(550);await tap('.certificate-companion','actor');await sleep(1400);await scroll(600,'certificate-detail');await sleep(1200);await scroll(0,'certificate-top');await sleep(900);end();
 fs.writeFileSync(stop,'stop');const r=await done;if(r.code)throw Error(r.errors);
 fs.writeFileSync(path.join(qa,'recording.json'),JSON.stringify({raw,windowID:Number(process.argv[2]||40003),windowOnly:true,subtitles:false,audio:false,sections,source:'Current native mini-program with isolated recording data. First chapter completed by actual UI answers. Final certificate uses a review state. No real-account writes.'},null,2)+'\n');console.log('RECORDING_COMPLETE '+sections.reduce((s,x)=>s+x.end-x.start,0).toFixed(2)+' selected seconds');
})().catch(async e=>{end();if(recorder){fs.writeFileSync(stop,'stop');await done;}fs.writeFileSync(path.join(qa,'error.txt'),e.stack+'\n');console.error(e);process.exitCode=1;});
