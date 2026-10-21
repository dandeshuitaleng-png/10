'use strict';
// Capture the host simulator at its actual native size, after constrained QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/home-designs-20261021'),images=path.join(root,'preview/home-directions-20261021');
fs.mkdirSync(images,{recursive:true});
async function call(tool,args=[]){return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';c.stdout.on('data',b=>s+=b);c.stderr.on('data',b=>s+=b);const t=setTimeout(()=>{c.kill();reject(Error(tool+' timeout'));},45000);c.on('close',code=>{clearTimeout(t);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,600)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,600)));resolve(r.result);});});}
(async()=>{
 const file=path.join(out,'native-checks.json'),report=JSON.parse(fs.readFileSync(file));
 // Safe-area padding belongs to the footer background; measure its button target.
 // Re-evaluate that assertion from the stored native rectangles, without altering them.
 for(const c of report.checks.filter(c=>c.rect)){
  const b=c.rect['#footer-primary'][0];
  c.issues=c.issues.filter(s=>s!=='footer safe and touchable');
  if(!(b.bottom<=c.size.h-c.size.safe+1&&b.height>=44))c.issues.push('footer safe and touchable');
  c.passed=!c.issues.length;
  if(c.size.w===375&&c.screenshot&&!c.screenshot.includes('-375-container')){
   const previous=path.join(out,c.screenshot),next=c.screenshot.replace('.png','-375-container.png');
   if(fs.existsSync(previous))fs.renameSync(previous,path.join(out,next));c.screenshot=next;
  }
 }
 report.passed=report.checks.every(c=>c.passed);report.safeAreaAssertion='Primary button bottom is above the system safe area; footer background includes its own safe padding.';
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');assert(report.passed,'native geometry/navigation checks must pass');assert.equal(report.checks.length,13);
 if(!process.argv.includes('--reuse-window')){
  await call('open_project_window',['--window-mode','liteMode']);await call('close_project_window');await call('open_project_window',['--window-mode','liteMode']);
  await call('simulator_screenshot',['--path',path.join(out,'capture-ready.png'),'--optimize','false']);
  try{await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);}catch(e){if(!/waitForAutomatorReady|waiting for automator/.test(e.message))throw e;await call('simulator_screenshot',['--path',path.join(out,'capture-ready.png'),'--optimize','false']);await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);}
 }
 const designs=['map'];
 const captures=[];
 for(const design of designs)for(const theme of ['ecology','red','culture','industry']){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario=home&homeDesign='+design]);
  // Let the first-visit scroll hint dismiss naturally before the still image.
  await new Promise(resolve=>setTimeout(resolve,4200));
  const name=theme+'-'+design+'.png';await call('simulator_screenshot',['--path',path.join(out,name),'--optimize','false','--wait-for-selector','.route-canvas']);
  fs.copyFileSync(path.join(out,name),path.join(images,name));const b=fs.readFileSync(path.join(out,name));captures.push({theme,design,file:name,width:b.readUInt32BE(16),height:b.readUInt32BE(20)});console.log('CAPTURE '+theme+' '+design);
 }
 fs.writeFileSync(path.join(out,'review-captures.json'),JSON.stringify({scope:'Actual native host simulator, original window geometry restored; not constrained-container captures or physical phone tests.',captures},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
