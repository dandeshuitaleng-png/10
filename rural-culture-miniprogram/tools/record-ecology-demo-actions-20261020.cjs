'use strict';
// Operates only the disposable native recording project; never submits real-account answers.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),fixture=path.join(workspace,'.rural-quiz-runtime/ecology-demo-video'),qa=path.join(root,'qa/ecology-demo-video-20261020');
assert.equal(require(path.join(fixture,'miniprogram/game-config.js')).mode,'mock');
const bank=require(path.join(fixture,'miniprogram/services-v4/catalog.js')),answers=new Map(bank.questions.map(q=>[q.id,q.answer]));
const events=[],sections=[],raw=path.join(qa,'native-window.mov'),stop=path.join(qa,'native-window.stop'),ready=raw+'.ready.json';let recorder,recordingStart=0,currentSection=null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function save(){fs.writeFileSync(path.join(qa,'actions.json'),JSON.stringify({events,sections},null,2)+'\n');}
function section(name){if(currentSection)end();currentSection={name,start:(Date.now()-recordingStart)/1000};}
function end(){if(!currentSection)return;sections.push({...currentSection,end:(Date.now()-recordingStart)/1000});currentSection=null;save();}
async function call(tool,args=[]){const started=Date.now();return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',fixture,...args]);let out='',err='';const timer=setTimeout(()=>{c.kill();reject(Error(tool+' timed out'));},40000);c.stdout.on('data',b=>out+=b);c.stderr.on('data',b=>err+=b);c.on('close',code=>{clearTimeout(timer);let r;try{r=JSON.parse(out.slice(out.indexOf('{')));}catch{return reject(Error(err||out));}events.push({tool,args,started,ended:Date.now(),ok:r.ok,result:r.result});save();if(code||!r.ok||r.result?.success===false)reject(Error(tool+': '+(r.message||r.result?.error)));else resolve(r.result);});c.on('error',reject);});}
const tap=selector=>call('automation_element_action',['--action',/^#(?:footer|modal)-primary$/.test(selector)?'trigger':'tap','--selector',selector,...(/^#(?:footer|modal)-primary$/.test(selector)?['--type','action','--detail','{}']:[]),'--wait-for-selector',selector]);
const get=(key,selector)=>call('automation_page_action',['--action','getData','--data-path',key,...(selector?['--wait-for-selector',selector]:[])]).then(r=>r.data);
const scroll=y=>call('automation_element_action',['--action','scrollTo','--selector','.panel-body','--x','0','--y',String(y)]);
const load=scenario=>call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?review=1&controls=0&scenario='+scenario]);
async function choose(index){await scroll(index>=2?240:0);await tap('.option[data-index="'+index+'"]');}
async function submit(){await tap('#footer-primary');return get('challenge');}
async function revive(){await tap('#modal-primary');assert.equal(await get('modal'),'share');await sleep(1000);await tap('#modal-primary');assert.equal(await get('modal'),'');}
async function correct(){const c=await get('challenge');assert(answers.has(c.question.id));await choose(answers.get(c.question.id));const next=await submit();assert.equal(next.status,'correct');return next;}
(async()=>{
 await load('home');assert.equal(await get('route','.route-canvas'),'home');
 for(const file of [stop,ready])if(fs.existsSync(file))fs.unlinkSync(file);
 recorder=spawn(path.join(workspace,'.rural-quiz-runtime/record-wechat-window'),[process.argv[2]||'39697',raw,'480',stop]);let stderr='';recorder.stderr.on('data',b=>stderr+=b);recorder.stdout.on('data',b=>process.stdout.write(b));const completion=new Promise(resolve=>recorder.on('close',code=>resolve({code,stderr})));
 for(let i=0;i<150&&!fs.existsSync(ready);i++){if(recorder.exitCode!==null)throw Error(stderr);await sleep(100);}
 assert(fs.existsSync(ready),'Window recorder did not start');recordingStart=JSON.parse(fs.readFileSync(ready)).unixTime*1000;
 section('首页与关卡人物互动');await sleep(1800);await tap('.chapter-mascot');await sleep(2500);const focus=await get('journey.focusTop');await scroll(0);await sleep(2000);await scroll(focus);await sleep(1800);end();console.log('RECORDED 首页互动');
 section('闯关须知与答题');await tap('#footer-primary');assert.equal(await get('modal','.chapter-welcome'),'rules');await sleep(1800);await tap('.modal-actor');await sleep(1700);await tap('#modal-primary');assert.equal(await get('route','.question-title'),'quiz');await sleep(2200);await tap('.quest-companion');await sleep(1500);end();
 section('答错与复活');const first=await get('challenge');const wrong=answers.get(first.question.id)===0?1:0;await choose(wrong);assert.equal((await submit()).status,'revive');await sleep(2000);await tap('.revive-companion');await sleep(2200);await revive();await sleep(1600);end();console.log('RECORDED 复活与爱心回应');
 section('答对与知识解析');await correct();await sleep(2400);await scroll(0);await tap('.quest-companion');await sleep(2000);await scroll(600);await sleep(2200);end();
 // Repeated correct answers remain in the source recording but are removed from the concise edit.
 for(let i=1;i<10;i++){await tap('#footer-primary');await correct();console.log('Completed demo question '+(i+1)+'/10');}
 section('本关完成与下一关人物');await sleep(1400);await tap('#footer-primary');assert.equal(await get('route','.result-companion'),'result');await sleep(1800);await tap('.result-companion');await sleep(2500);await tap('.section-bar .icon-button');assert.equal(await get('route','.route-canvas'),'levels');await sleep(1500);await tap('.route-stop.current .chapter-mascot');await sleep(2300);end();console.log('RECORDED 击鼓庆祝与第二关');
 section('今日锁定与休息');await tap('#footer-primary');assert.equal(await get('modal'),'rules');await tap('#modal-primary');const second=await get('challenge','.question-title');const wrong2=answers.get(second.question.id)===0?1:0;await choose(wrong2);assert.equal((await submit()).status,'revive');end();
 await revive();
 section('今日锁定与锦鲤回应');await choose(wrong2);assert.equal((await submit()).status,'locked');await sleep(1800);await tap('.rest-companion');await sleep(2600);await tap('#modal-primary');await sleep(1800);end();console.log('RECORDED 今日锁定');
 section('我的学习与积分记录');await tap('.activity-shortcut[data-route="profile"]');assert.equal(await get('pageActorPose','.profile-avatar'),'scholar');await sleep(1800);await tap('.profile-avatar');await sleep(2300);await tap('.profile-stats button[data-route="points"]');assert.equal(await get('route'),'points');await sleep(2300);end();
 // Isolated review scenario displays the certificate-after-completion state, not a real certificate issue.
 await load('certificate');assert.equal(await get('pageActorPose','.certificate-companion'),'skater');
 section('学习证书与比耶回应');await sleep(1800);await tap('.certificate-companion');await sleep(2500);await scroll(650);await sleep(2500);end();console.log('RECORDED 学习证书');
 fs.writeFileSync(stop,'stop');const r=await completion;if(r.code)throw Error(r.stderr||'Recorder exited '+r.code);
 fs.writeFileSync(path.join(qa,'recording.json'),JSON.stringify({recordedAt:new Date().toISOString(),raw,windowID:Number(process.argv[2]||39697),windowOnly:true,subtitles:false,overlays:false,audio:false,scope:'Native WeChat simulator recording using independent demo data. Ten questions in chapter 1 completed by actual UI actions; the final certificate uses an isolated review state. Repeated questions and setup waits are trimmed.',sections},null,2)+'\n');console.log(JSON.stringify({raw,sections:sections.length,selectedSeconds:sections.reduce((s,x)=>s+x.end-x.start,0)}));
})().catch(e=>{end();if(recorder)fs.writeFileSync(stop,'stop');fs.writeFileSync(path.join(qa,'recording-error.txt'),e.stack+'\n');console.error(e);process.exitCode=1;});
