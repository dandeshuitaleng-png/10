'use strict';
// Current four-theme flow detail pass in the isolated native review project.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/theme-flow-20261022');fs.mkdirSync(out,{recursive:true});
async function call(tool,args=[]){return new Promise((resolve,reject)=>{const p=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';p.stdout.on('data',b=>s+=b);p.stderr.on('data',b=>s+=b);const timer=setTimeout(()=>{p.kill();reject(Error(tool+' timeout'));},45000);p.on('close',code=>{clearTimeout(timer);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,500)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,500)));resolve(r.result);});});}
async function evaluate(fn){let r=await call('automation_evaluate',['--fn-source',fn]);for(let i=0;i<6&&r?.result!==undefined;i++)r=r.result;return r;}

const onlyScene=process.argv[2];
const checks=onlyScene?JSON.parse(fs.readFileSync(path.join(out,'native-checks.json'))).checks.filter(c=>c.scene!==onlyScene):[];
function save(){fs.writeFileSync(path.join(out,'native-checks.json'),JSON.stringify({date:new Date().toISOString(),passed:checks.length===28&&checks.every(c=>c.passed),scope:'Actual WeChat renderer, actual host viewport; four themes x home/rules/quiz/revive/locked/result/sound. Browser width checks are separate. No physical iOS/Android or publication acceptance.',checks},null,2)+'\n');}
(async()=>{
 await call('open_project_window',['--window-mode','liteMode']);await call('close_project_window');await call('open_project_window',['--window-mode','liteMode']);
 await call('simulator_screenshot',['--path',path.join(project,'flow-ready.png'),'--optimize','false']);
 await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);
 for(const theme of ['red','culture','industry','ecology'])for(const scene of onlyScene?[onlyScene]:['home','rules','quiz','revive','locked','result','sound']){
  const scenario=['rules','sound'].includes(scene)?'home':scene;
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario='+scenario]);
  const d=await evaluate(`async function(){const p=getCurrentPages().slice(-1)[0];
   if(${JSON.stringify(scene)}==='rules')await p.action({currentTarget:{dataset:{action:'level',id:p.data.levels.find(n=>n.status==='current').id}}});
   if(${JSON.stringify(scene)}==='sound')p.openSoundSettings();
   await new Promise(r=>setTimeout(r,400));
   const selectors=['.game-device','.theme-modal','.modal-inner','.modal-actions','#modal-primary','#modal-secondary','.sound-settings-panel','.sound-switch-hit','.sound-done-button','.sound-mute-button','.quest-theme-mark','.completion-hero','.result-companion','.stat-pair .stat','#footer-primary'],q=wx.createSelectorQuery();
   selectors.forEach(s=>q.selectAll(s).boundingClientRect());const rect=await new Promise(r=>q.exec(rows=>r(Object.fromEntries(selectors.map((s,i)=>[s,rows[i]])))));
   const before=JSON.stringify(p.data.snapshot);if(p.data.route==='result')p.inlineMascotTap();
   const tapPreservesAward=JSON.stringify(p.data.snapshot)===before;
   p._motion.hide();await new Promise(r=>setTimeout(r,80));
   return {theme:p.data.skin.gameId,route:p.data.route,modal:p.data.modal,soundSettingsOpen:p.data.soundSettingsOpen,icon:p.data.content.icon,pose:p.data.pageActorPose,tapPreservesAward,rect};}`);
  assert.equal(d.theme,theme);const issues=[],test=(ok,label)=>{if(!ok)issues.push(label);},r=d.rect,device=r['.game-device'][0];
  for(const v of r['#footer-primary'])test(v.height>=52&&v.bottom<=device.bottom+1,'footer bounds');
  if(['rules','revive','locked'].includes(scene)){
   test(d.modal===scene,'modal state');const m=r['.theme-modal'][0],a=r['.modal-actions'][0],b=r['.modal-inner'][0];
   test(m.left>=device.left-1&&m.right<=device.right+1,'modal horizontal bounds');test(a.top>=b.bottom-1&&a.bottom<=device.bottom+1,'modal actions remain visible and separate');
   test(r['#modal-primary'][0].height>=52,'primary modal target');for(const v of r['#modal-secondary'])test(v.height>=44,'secondary modal target');
  }
  if(scene==='sound'){const a=r['.sound-settings-panel'][0];test(d.soundSettingsOpen&&a.left>=device.left-1&&a.right<=device.right+1&&a.top>=device.top&&a.bottom<=device.bottom+1,'sound sheet bounds');for(const s of ['.sound-switch-hit','.sound-done-button','.sound-mute-button'])for(const v of r[s])test(v.width>=44&&v.height>=44,'sound target');}
  if(scene==='result'){test(d.pose===({red:'drummer',culture:'reader',industry:'scholar',ecology:'lotus'}[theme]),'original contextual result figure');test(d.tapPreservesAward,'figure tap preserves award');test(r['.result-companion'][0].width>0,'result actor frame');}
  const file=theme+'-'+scene+'.png';await call('simulator_screenshot',['--path',path.join(out,file),'--optimize','false']);
  checks.push({theme,scene,...d,screenshot:file,passed:!issues.length,issues});save();console.log((issues.length?'FAIL ':'PASS ')+theme+' '+scene+' '+issues.join('; '));
 }
 assert(checks.every(c=>c.passed));
 await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme=ecology&review=1&controls=0&scenario=home']);
})().catch(e=>{save();console.error(e);process.exitCode=1;});
