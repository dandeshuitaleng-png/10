'use strict';
// Disposable native review fixture only. Does not connect to or alter real accounts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/home-designs-20261021');
async function call(tool,args=[]){return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';c.stdout.on('data',b=>s+=b);c.stderr.on('data',b=>s+=b);const timer=setTimeout(()=>{c.kill();reject(Error(tool+' timeout'));},45000);c.on('close',code=>{clearTimeout(timer);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,500)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,500)));resolve(r.result);});});}
async function evaluate(fn){let r=await call('automation_evaluate',['--fn-source',fn]);for(let i=0;i<6&&r?.result!==undefined;i++)r=r.result;return r;}
(async()=>{
 const checks=[];
 if(!process.argv.includes('--reuse-window')){await call('open_project_window',['--window-mode','liteMode']);await call('close_project_window');await call('open_project_window',['--window-mode','liteMode']);}
 await call('simulator_screenshot',['--path',path.join(project,'click-ready.png'),'--optimize','false']);
 await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);
 for(const [scenario,index] of [['home',0],['chapter-2',1],['chapter-3',2],['chapter-4',3]]){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme=ecology&review=1&controls=0&scenario='+scenario]);
  const r=await evaluate('async function(){const p=getCurrentPages().slice(-1)[0];if(p.data.route!=="home")p.go("home");await new Promise(r=>setTimeout(r,700));p.focusMap();await new Promise(r=>setTimeout(r,100));const n=p.data.journey.nodes['+index+'],c=p.selectComponent("#map-actor-"+n.id),before=JSON.stringify(p.data.snapshot);for(let i=0;i<100;i++)p.mascotTap({currentTarget:{dataset:{id:n.id}}});await new Promise(r=>setTimeout(r,80));const result={id:n.id,pose:n.pose,ready:c.data.canvasReady,responding:p.data.motion.respondingId,touches:p.data.motion.touchSequence,unchanged:before===JSON.stringify(p.data.snapshot),active:c._animator.state().active};p.onHide();await new Promise(r=>setTimeout(r,80));result.hidden=p.data.motion.playingId;result.canvasStopped=!c._animator.state().active;p.onShow();return result;}');
  assert(r.ready&&r.active&&r.unchanged&&r.canvasStopped,JSON.stringify(r));assert.equal(r.responding,r.id);assert.equal(r.touches,100);assert.equal(r.hidden,'');checks.push({scenario,passed:true,result:r});console.log('PASS click canvas '+r.pose);
 }
 for(const theme of ['red','culture','industry','ecology']){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario=home']);
  const r=await evaluate('async function(){const p=getCurrentPages().slice(-1)[0];await new Promise(r=>setTimeout(r,700));p.focusMap();await new Promise(r=>setTimeout(r,100));const id=p.data.journey.guideId,c=p.selectComponent("#map-actor-"+id);p.mascotTap({currentTarget:{dataset:{id}}});await new Promise(r=>setTimeout(r,100));return {theme:p.data.skin.gameId,ready:c.data.canvasReady,responding:p.data.motion.respondingId,id};}');assert(r.ready);assert.equal(r.responding,r.id);assert.equal(r.theme,theme);checks.push({theme,passed:true,result:r});console.log('PASS theme click '+theme);
 }
 const before=await evaluate('function(){return getCurrentPages().slice(-1)[0].data.motion.touchSequence;}');
 await call('automation_element_action',['--action','trigger','--selector','.route-stop.current .chapter-mascot','--type','tap','--detail','{}','--wait-for-selector','.chapter-mascot','--wait','0.1']);
 const after=await evaluate('function(){return getCurrentPages().slice(-1)[0].data.motion.touchSequence;}');assert.equal(after,before+1);checks.push({scenario:'native WXML tap binding',passed:true,before,after});
 fs.writeFileSync(path.join(out,'click-motion-native-checks.json'),JSON.stringify({date:new Date().toISOString(),passed:true,scope:'Actual native Page/Canvas 2D in disposable project: four seasons, four themes, 100 Page-handler taps per season, original snapshot preserved, background cancels Canvas frame loop. Not physical phone touch/performance acceptance.',checks},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
