'use strict';
// Disposable native review fixture only. Does not connect to or alter real accounts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/home-designs-20261021');
async function call(tool,args=[]){return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';c.stdout.on('data',b=>s+=b);c.stderr.on('data',b=>s+=b);const timer=setTimeout(()=>{c.kill();reject(Error(tool+' timeout'));},45000);c.on('close',code=>{clearTimeout(timer);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,500)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,500)));resolve(r.result);});});}
async function evaluate(fn){let r=await call('automation_evaluate',['--fn-source',fn]);for(let i=0;i<6&&r?.result!==undefined;i++)r=r.result;return r;}
(async()=>{
 const checks=[];
 for(const theme of ['ecology','red','culture','industry'])for(const scenario of ['chapter-2','locked','certificate']){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario='+scenario+'&homeDesign=guide']);
  const r=await evaluate('async function(){const p=getCurrentPages().slice(-1)[0];p.go("home");await new Promise(r=>setTimeout(r,250));return {theme:p.data.skin.gameId,design:p.data.homeDesign,nodes:p.data.journey.nodes.map(n=>({id:n.id,status:n.status,featured:n.featured,showMascot:n.showMascot,pose:n.pose})),footer:p.data.footerPrimary,certificate:!!p.data.certificate};}');
  assert.equal(r.design,'guide');assert.equal(r.theme,theme);assert(r.nodes.every(n=>n.showMascot===(n.status!=='locked')));assert.equal(r.nodes.filter(n=>n.featured).length,1);
  if(scenario==='chapter-2'){assert.equal(r.nodes[0].status,'completed');assert.equal(r.nodes[1].status,'current');assert.equal(r.nodes[1].pose,'observe');}
  if(scenario==='locked'){assert(r.nodes.some(n=>n.status==='today-locked'&&n.featured&&n.showMascot));assert(r.footer.includes('锁定'));}
  if(scenario==='certificate'){assert(r.nodes.every(n=>n.status==='completed'));assert(r.certificate);assert(r.footer.includes('证书'));}
  if(theme==='ecology'){const file='b-state-'+scenario+'.png';await call('simulator_screenshot',['--path',path.join(out,file),'--optimize','false','--wait-for-selector','.chapter-feature']);r.screenshot=file;}
  checks.push({theme,scenario,passed:true,result:r});console.log('PASS '+theme+' '+scenario);
 }
 for(const scenario of ['empty','failure','ranking-empty']){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme=ecology&review=1&controls=0&scenario='+scenario+'&homeDesign=guide']);
  const r=await evaluate('function(){const p=getCurrentPages().slice(-1)[0];return {route:p.data.route,levels:p.data.levels.length,error:p.data.error,rows:p.data.ranking.rows.length};}');
  if(scenario==='empty')assert.equal(r.levels,0);if(scenario==='failure')assert(r.error);if(scenario==='ranking-empty')assert.equal(r.rows,0);checks.push({scenario,passed:true,result:r});console.log('PASS '+scenario);
 }
 await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme=ecology&review=1&controls=0&scenario=home&homeDesign=guide']);
 const lifecycle=await evaluate('function(){const p=getCurrentPages().slice(-1)[0],id=p.data.journey.guideId;p.mascotTap({currentTarget:{dataset:{id}}});const responding=p.data.motion.respondingId;p.onHide();const hidden=p.data.motion.playingId;p.onShow();return {responding,expected:id,hidden,foreground:p._foreground};}');assert.equal(lifecycle.responding,lifecycle.expected);assert.equal(lifecycle.hidden,'');assert(lifecycle.foreground);checks.push({scenario:'mascot reaction and background pause',passed:true,result:lifecycle});
 fs.writeFileSync(path.join(out,'b-state-checks.json'),JSON.stringify({date:new Date().toISOString(),passed:true,scope:'Actual native Page with isolated review data. Failure scenario is a review error, not a measured physical network disconnection. Repeated presses/cancellation are covered separately by controller/component tests. No physical phone evidence.',checks},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
