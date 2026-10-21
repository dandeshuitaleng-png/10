'use strict';
// Native game actions go through registered Developer Tools touch operations.
// Read-only HTTP queries inside wx return server state, never session secrets.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const sharp=require('/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {HandRenderer}=require('../js/ui/hand-renderer'),{createViewport}=require('../js/core/viewport'),{catalogLevel,catalogTheme,catalogLevels}=require('../js/data/catalog'),{identity}=require('./lib/runtime-evidence.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../趣味闯关_V4.1同步验证/微信'),project=root;
fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:63112',answers=new Map(require('../design/content-intake/current/bank.json').questions.map(q=>[q.id,q.answer]));
const checks=[],events=[],screenshots=[];let failure,started=Date.now(),device,catalog,me,renderer,viewport,route={name:'home',params:{}},snapshot=null,beforePoints=0,beforeCompleted=0,mocked=false;
const check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name);};
const sanitize=s=>String(s).replace(/Bearer\s+[\w.~-]+/g,'Bearer [redacted]').replace(/"(?:token|deviceId)"\s*:\s*"[^"]+"/g,'"credential":"[redacted]"');
async function call(tool,args=[]){
 const begun=Date.now();const raw=await new Promise((resolve,reject)=>{const child=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let stdout='',stderr='';const timer=setTimeout(()=>{child.kill('SIGTERM');reject(Error('微信工具调用超时：'+tool));},45000);child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);child.on('error',reject);child.on('close',code=>{clearTimeout(timer);let result;try{result=JSON.parse(stdout.slice(stdout.indexOf('{')));}catch(_){reject(Error(sanitize(stdout+stderr).slice(0,700)));return;}if(code||!result.ok||result.result?.success===false)reject(Error(sanitize(result.message||result.result?.error||tool+' failed')));else resolve(result.result);});});
 events.push({tool,elapsedMs:Date.now()-begun,success:true});return raw;
}
async function evaluate(source,args=[]){const fn=args.length?'function(){return ('+source+')(...'+JSON.stringify(args)+');}':source;const r=await call('automation_evaluate',['--fn-source',fn]);return r.result;}
async function query(url){const result=await evaluate('function(url){return new Promise(resolve=>wx.request({url:url,method:"GET",header:{Authorization:"Bearer "+wx.getStorageSync("quiz:session-token")},success:r=>resolve({status:r.statusCode,data:r.data.data,error:r.data.error}),fail:()=>resolve({status:0})}));}',[base+url]);if(result.status!==200)throw Error('服务端查询失败 '+(result.error?.code||result.status));return result.data;}
async function shot(name){const filename=name+'.png',r=await call('simulator_screenshot',['--path',path.join(out,filename),'--optimize','false']);const stats=await sharp(path.join(out,filename)).stats();check(name+'真实微信截图含内容',r.imageWidth>0&&r.imageHeight>0&&stats.channels.reduce((sum,c)=>sum+c.stdev,0)>60);screenshots.push(filename);}
function view(){const q=snapshot?.question,level=catalogLevel(catalog,snapshot?.levelId),theme=catalogTheme(catalog,snapshot?.themeId);const question=q?{...q,position:snapshot.position+1,total:snapshot.total,themeName:snapshot.themeName||theme?.name,levelName:snapshot.levelName||level?.name,levelOrder:snapshot.levelOrder||level?.displayOrder,difficultyLabel:snapshot.difficultyLabel||level?.difficulty,media:q.media?{...q.media,src:q.media.url}:null}:null;
 const progress=Object.fromEntries(Object.entries(me.progress||{}).map(([id,p])=>[id,{...p,nodes:p.nodes.map(s=>({available:'current',completed:'complete'}[s]||s))}]));
 return {catalog,themeProgress:progress,nodeStates:progress[route.params.themeId]?.nodes,question,challengeState:snapshot?.state,selected:0,reviveLimit:snapshot?.reviveLimit??1,revivesRemaining:snapshot?.revivesRemaining??1,remainingSeconds:snapshot?.deadline?Math.max(0,Math.ceil((snapshot.deadline-Date.now())/1000)):30,countdownTotal:30,feedback:snapshot?.state==='feedback'?{question,...snapshot.feedback}:null,result:snapshot?.result?{...snapshot.result,themeName:snapshot.themeName,levelOrder:snapshot.levelOrder,accuracyPercent:Math.round(snapshot.result.accuracy*100),finalExplanation:snapshot.feedback?.explanation}:null,totalPoints:me.points,certificates:[],hasActiveChallenge:!!me.activeChallenge,mode:'experience',modal:snapshot?.state==='revive'?'revive':null,incorrectSelected:snapshot?.feedback?.selected,canShareCertificate:true,reducedMotion:true,shareReady:true};}
function render(){return renderer.render(route,viewport,view());}
async function tap(id){for(let attempt=0;attempt<6;attempt++){
 const targets=render(),t=targets.find(t=>t.id===id);if(t){const x=(t.x+t.w/2)*viewport.scale,y=(t.y+t.h/2)*viewport.scale;await call('automation_game_action',['--action','tap','--x',String(x),'--y',String(y),'--coordinate-space','canvas']);events.at(-1).control=id;return;}
 const semantic=renderer.semanticTargets.find(t=>t.id===id),region=renderer.scrollRegion;if(!semantic||!region)throw Error('实际触摸路径缺少控件 '+id);
 const desired=semantic.y+semantic.h>region.y+region.h?Math.min(180,semantic.y+semantic.h-region.y-region.h+15):Math.max(-180,semantic.y-region.y-15);
 const x=(region.x+region.w*.82)*viewport.scale,startY=(desired>0?region.y+region.h*.78:region.y+region.h*.22)*viewport.scale,endY=startY-desired*viewport.scale;
 await call('automation_game_action',['--action','swipe','--start-x',String(x),'--start-y',String(startY),'--end-x',String(x),'--end-y',String(endY),'--duration','220','--coordinate-space','canvas']);renderer.scrollBy(desired);
 }throw Error('滚动仍不可达 '+id);}
async function refresh(){me=await query('/api/me');if(snapshot)snapshot=await query('/api/challenges/'+encodeURIComponent(snapshot.id));}
(async()=>{try{
 await call('simulator_refresh');
 device=await evaluate('function(){return {window:wx.getWindowInfo(),capsule:wx.getMenuButtonBoundingClientRect?wx.getMenuButtonBoundingClientRect():null};}');viewport=createViewport(device.window,device.capsule);
 const ctx=new Proxy({font:'16px sans-serif',createRadialGradient(){return{addColorStop(){}};},createLinearGradient(){return{addColorStop(){}};},measureText(s){const size=Number(this.font.match(/([\d.]+)px/)?.[1]||16);return{width:Array.from(String(s)).reduce((n,c)=>n+size*(/[\u2e80-\u9fff\uff00-\uffef]/u.test(c)?1:c===' '?.3:.56),0)};}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});renderer=new HandRenderer(ctx);
 catalog=await query('/api/catalog');me=await query('/api/me');check('原默认四主题16关与正式规则保持',catalog.themes.length===4&&catalog.levels.length===16&&catalog.config.timer.seconds===30&&catalog.config.revive.limit===1&&catalog.config.points.dailyPointCap===null);check('候选账号无在途挑战，未清除存档',!me.activeChallenge);
 beforePoints=me.points;beforeCompleted=me.progress.red.completed;fs.writeFileSync(path.join(out,'progress-before.json'),JSON.stringify({points:beforePoints,completed:beforeCompleted,activeChallenge:me.activeChallenge?.id||null},null,2));
 await shot('01-native-home');await tap('practice');route={name:'themes',params:{}};await shot('02-native-themes');await tap('theme-red');route={name:'map',params:{themeId:'red'}};
 // Use observed screenshot positions for the first map transition; map art
 // cropping is intentionally not approximated by this measurement helper.
 await shot('04-native-red-map');await tap('level-1');route={name:'level-ready',params:{themeId:'red',levelId:'red-1'}};await shot('05-native-red-ready');await tap('ready-start');
 me=await query('/api/me');snapshot=me.activeChallenge;check('真实微信触摸创建红色第一关',snapshot?.levelId==='red-1'&&snapshot.total===10);route={name:'quiz',params:{themeId:'red',levelId:'red-1'}};await shot('06-native-quiz');
 
 // The native confirmation is mocked only in this experience test. The share
 // action, remaining-revive qualification and resume are still real server flows.
 await call('automation_wx_api',['--action','mock','--method','showModal','--result',JSON.stringify({confirm:true,cancel:false})]);mocked=true;
 check('first unanswered question does not leak answer',!('answer'in snapshot.question));
 const firstId=snapshot.question.id,correct=answers.get(firstId);check('question belongs to authorized source',Number.isInteger(correct));
 await tap('option-'+((correct+1)%snapshot.question.options.length));await shot('07-native-selected');await tap('confirm');await refresh();
 check('native wrong answer enters backend revival without leaking answer',snapshot.state==='revive'&&snapshot.feedback.answer==null);await shot('08-native-revive');
 await tap('revive-share');await refresh();check('native experience revival resumes same question and consumes allowance',snapshot.state==='answering'&&snapshot.question.id===firstId&&snapshot.revivesRemaining===0);await shot('09-native-resumed');
 await call('automation_wx_api',['--action','restore','--method','showModal']);mocked=false;
 for(let i=0;i<snapshot.total;i++){
  check('当前题无答案与未答解析',!('answer'in snapshot.question)&&!('explanation'in snapshot.question));const answer=answers.get(snapshot.question.id);check('题目属于授权源库',Number.isInteger(answer));
  await tap('option-'+answer);await tap('confirm');await refresh();check('真实微信作答反馈正确',snapshot.feedback?.right===true&&['feedback','completed'].includes(snapshot.state));
  if(i===0)await shot('10-native-correct');
  if(i<snapshot.total-1){await tap('confirm');await refresh();check('下一题题号及原服务端计时有效',snapshot.position===i+1&&snapshot.state==='answering'&&snapshot.deadline>Date.now());}
  console.log('微信真实答题 '+(i+1)+' / '+snapshot.total);
 }
 route={name:'result',params:{themeId:'red',levelId:'red-1'}};await shot('11-native-result');check('10题微信真实通关只入账10分',snapshot.state==='completed'&&snapshot.result.points===10&&me.points===beforePoints+10&&me.progress.red.completed===beforeCompleted+1);check('正确率来自首次作答，复活未改写首次正确率',snapshot.result.accuracy===.9);
 await call('simulator_refresh');snapshot=null;route={name:'home',params:{}};await refresh();await shot('12-native-home-restored');check('刷新后积分和关卡进度恢复',me.points===beforePoints+10&&me.progress.red.completed===beforeCompleted+1);fs.writeFileSync(path.join(out,'progress-after.json'),JSON.stringify({points:me.points,completed:me.progress.red.completed,activeChallenge:me.activeChallenge?.id||null},null,2));
 const consoleResult=await call('get_simulator_console',['--command','grep -i "\\[error\\]"']);fs.writeFileSync(path.join(out,'console-errors.json'),JSON.stringify(consoleResult,null,2));events.push({tool:'console review',hasMatchedLogs:!!String(consoleResult).trim()});
}catch(e){failure=sanitize(e.message);try{await shot('native-failure');}catch(_){}}finally{
 if(mocked){try{await call('automation_wx_api',['--action','restore','--method','showModal']);}catch(_){events.push({tool:'restore showModal',success:false});}}
 const report={date:new Date().toISOString(),...identity(),status:failure?'failed':'partial',passed:!failure,visualAcceptance:'requires-current-screenshot-review',all16LevelsVerified:false,physicalDeviceVerified:false,scope:'V4.1原工程、原AppID、本机体验API。保留原存档，真实画布触摸、后端判题、体验复活、第一章10题、积分与刷新恢复。体验确认框仅在测试时mock showModal(confirm=true)，恢复后保留原API；不代表正式分享验证，不是真机或全关卡验收。',checks,events,screenshots,failure:failure||null,elapsedSeconds:Math.round((Date.now()-started)/1000),device,limitations:['仅模拟器，未替代iOS/Android真机','触摸坐标辅助器依据当前服务端视图、原布局及字体近似；结果必须由真实服务端反馈验证','体验复活确认框采用明确mock；正式分享完成验证未测','原生视频、相册保存未在此流程验证']};fs.writeFileSync(path.join(out,'runtime-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,status:report.status,checks:checks.length,screenshots:screenshots.length,failure:report.failure}));if(failure)process.exitCode=1;
}})();
