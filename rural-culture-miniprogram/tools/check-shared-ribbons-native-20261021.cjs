'use strict';
// Read-only rendering checks against the isolated review fixture, after host captures.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/home-designs-20261021');
async function call(tool,args=[]){return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';c.stdout.on('data',b=>s+=b);c.stderr.on('data',b=>s+=b);const t=setTimeout(()=>{c.kill();reject(Error(tool+' timeout'));},45000);c.on('close',code=>{clearTimeout(t);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,600)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,600)));resolve(r.result);});});}
(async()=>{
 const checks=[];
 for(const theme of ['red','culture'])for(const scenario of ['quiz','home']){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario='+scenario+'&homeDesign=map']);
  if(scenario==='home')await call('automation_element_action',['--action','trigger','--selector','#footer-primary','--type','action','--detail','{}','--wait','0.3']);
  const modal=scenario==='home',selector=modal?'.modal-decoration .modal-game-name':'.theme-heading .h1';
  let r=await call('automation_evaluate',['--fn-source','async function(){await new Promise(r=>setTimeout(r,250));const p=getCurrentPages().slice(-1)[0],q=wx.createSelectorQuery();q.select('+JSON.stringify(selector)+').boundingClientRect();q.select('+JSON.stringify(modal?'.modal-decoration':'.theme-heading')+').boundingClientRect();return {route:p.data.route,modal:p.data.modal,header:p.data.header,rect:await new Promise(r=>q.exec(r))};}']);
  for(let i=0;i<6&&r?.result!==undefined;i++)r=r.result;
  assert(r.header.endsWith('/'+theme+'/banner-themed-v3.png'));
  assert(modal?r.modal==='rules':r.route==='quiz');
  const [label,frame]=r.rect;assert(label&&frame);assert(label.top>=frame.top&&label.bottom<=frame.bottom&&label.left>=frame.left&&label.right<=frame.right);
  const file='shared-ribbon-'+theme+'-'+(modal?'rules':'quiz')+'.png';
  await call('simulator_screenshot',['--path',path.join(out,file),'--optimize','false','--wait-for-selector',selector]);
  checks.push({theme,scenario:modal?'rules':'quiz',passed:true,result:r,screenshot:file});console.log('PASS '+theme+' '+(modal?'rules':'quiz'));
 }
 fs.writeFileSync(path.join(out,'shared-ribbon-checks.json'),JSON.stringify({date:new Date().toISOString(),passed:true,scope:'Actual host simulator, isolated review fixture. Source and label/frame rectangle checks plus screenshot inspection; not physical-device acceptance.',checks},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
