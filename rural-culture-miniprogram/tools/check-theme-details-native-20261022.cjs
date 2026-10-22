'use strict';
// Actual native renderer in the disposable review fixture; no account writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/theme-details-20261022');
fs.mkdirSync(out,{recursive:true});
async function call(tool,args=[]){return new Promise((resolve,reject)=>{const p=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';p.stdout.on('data',b=>s+=b);p.stderr.on('data',b=>s+=b);const timer=setTimeout(()=>{p.kill();reject(Error(tool+' timeout'));},45000);p.on('close',code=>{clearTimeout(timer);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,500)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,500)));resolve(r.result);});});}
async function evaluate(fn){let r=await call('automation_evaluate',['--fn-source',fn]);for(let i=0;i<6&&r?.result!==undefined;i++)r=r.result;return r;}
const onlyScene=process.argv[2],existing=path.join(out,'native-checks.json');
const checks=onlyScene&&fs.existsSync(existing)?JSON.parse(fs.readFileSync(existing)).checks.filter(c=>c.scene!==onlyScene):[];
function save(){fs.writeFileSync(path.join(out,'native-checks.json'),JSON.stringify({passed:checks.every(c=>c.passed),scope:'Actual WeChat simulator, disposable review data; host viewport only. Browser responsive geometry and service tests are separate. Physical iPhone/Android not tested.',checks},null,2)+'\n');}
(async()=>{
 await call('open_project_window',['--window-mode','liteMode']);await call('close_project_window');await call('open_project_window',['--window-mode','liteMode']);
 await call('simulator_screenshot',['--path',path.join(project,'theme-details-ready.png'),'--optimize','false']);
 for(const theme of ['red','culture','industry','ecology'])for(const scene of onlyScene?[onlyScene]:['home','quiz','correct','profile','points','ranking-empty','revive','certificate']){
  const query=['profile','points'].includes(scene)?'home&route='+scene:scene;
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario='+query]);
  const data=await evaluate('async function(){const p=getCurrentPages().slice(-1)[0];await new Promise(r=>setTimeout(r,350));if(p.data.challenge?.status==="correct"){p.setData({scrollInto:"answer-feedback"});await new Promise(r=>setTimeout(r,200));}const selectors=[".game-device",".panel-body",".question-title",".option",".answer-feedback",".profile-card",".points-hero",".segmented .tab","#footer-primary"],q=wx.createSelectorQuery();selectors.forEach(s=>q.selectAll(s).boundingClientRect());const rect=await new Promise(r=>q.exec(rows=>r(Object.fromEntries(selectors.map((s,i)=>[s,rows[i]])))));return {theme:p.data.skin.gameId,route:p.data.route,modal:p.data.modal,loading:p.data.loading,rect,certificateReady:!!p.data.certificateImage};}');
  assert.equal(data.theme,theme);assert(!data.loading);
  const device=data.rect['.game-device'][0];assert(device&&device.width>0);
  for(const rect of data.rect['.option'])assert(rect.width>0&&rect.left>=device.left-.5&&rect.right<=device.right+.5);
  for(const rect of data.rect['.segmented .tab'])assert(rect.height>=44);
  for(const rect of data.rect['#footer-primary'])assert(rect.height>=52&&rect.bottom<=device.bottom+.5);
  if(scene==='correct'){const feedback=data.rect['.answer-feedback'][0],body=data.rect['.panel-body'][0];assert(feedback&&feedback.top>=body.top-.5&&feedback.bottom<=body.bottom+.5,'Explanation must be fully visible after scrolling');}
  if(scene==='certificate')assert(data.certificateReady,'Real native certificate image must render');
  const file=theme+'-'+scene+'.png';await call('simulator_screenshot',['--path',path.join(out,file),'--optimize','false']);
  checks.push({theme,scene,...data,screenshot:file,passed:true});save();console.log('PASS '+theme+' '+scene);
 }
 await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme=ecology&review=1&controls=0&scenario=home']);
})().catch(e=>{save();console.error(e);process.exitCode=1;});
