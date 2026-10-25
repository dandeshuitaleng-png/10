'use strict';
// A 320x568 constrained container in the real renderer; not a physical phone.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/art-refinement-review-20261022'),out=path.join(root,'qa/art-refinement-20261022');
async function rawCall(tool,args=[]){return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';c.stdout.on('data',b=>s+=b);c.stderr.on('data',b=>s+=b);const timer=setTimeout(()=>{c.kill();reject(Error(tool+' timeout'));},45000);c.on('close',code=>{clearTimeout(timer);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,500)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,500)));resolve(r.result);});});}
async function call(tool,args=[]){for(let attempt=0;attempt<3;attempt++){try{return await rawCall(tool,args);}catch(e){if(attempt===2||!/network socket|ECONNRESET|ETIMEDOUT|TLS/i.test(e.message))throw e;await new Promise(r=>setTimeout(r,1000));}}}
async function evaluate(fn){let r=await call('automation_evaluate',['--fn-source',fn]);for(let i=0;i<6&&r?.result!==undefined;i++)r=r.result;return r;}
const dirs=['pages/game','components/game-button','components/mascot-actor'];
function stage(){
 for(const dir of dirs)for(const file of fs.readdirSync(path.join(root,'miniprogram',dir)).filter(x=>x.endsWith('.wxss'))){let s=fs.readFileSync(path.join(root,'miniprogram',dir,file),'utf8').replace(/@media\s*\(max-width:(\d+)px\)/g,(_,n)=>320<=Number(n)?'@media(min-width:0px)':'@media(max-width:0px)').replace(/([\d.]+)rpx\b/g,(_,n)=>(Number(n)*320/750)+'px').replace(/([\d.]+)v([wh])\b/g,(_,n,a)=>(Number(n)*(a==='w'?320:568)/100)+'px');if(dir==='pages/game'&&file==='index.wxss')s+='\n.game-device{width:320px!important;height:568px!important;max-width:none!important;margin:0!important}\n';fs.writeFileSync(path.join(project,'miniprogram',dir,file),s);}
 const from='const i=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync(),m=homeLayout.metrics(i,wx.getMenuButtonBoundingClientRect?wx.getMenuButtonBoundingClientRect():null,skin.gameId);',source=fs.readFileSync(path.join(root,'miniprogram/pages/game/index.js'),'utf8');assert(source.includes(from));
 fs.writeFileSync(path.join(project,'miniprogram/pages/game/index.js'),source.replace(from,'const i={windowWidth:320,windowHeight:568,screenWidth:320,screenHeight:568,statusBarHeight:20,safeArea:{bottom:568}},m=homeLayout.metrics(i,{left:226,bottom:58},skin.gameId);'));
}
const checks=[];
(async()=>{try{
 await call('close_project_window');stage();await call('open_project_window',['--window-mode','liteMode']);await call('simulator_screenshot',['--path',path.join(project,'small-ready.png'),'--optimize','false']);await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);
 for(const theme of ['red','culture','industry','ecology']){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario=long']);
  const d=await evaluate('async function(){const p=getCurrentPages().slice(-1)[0];await new Promise(r=>setTimeout(r,400));const selectors=[".game-device",".panel-body",".question-title",".option",".option-text","#footer-primary"],q=wx.createSelectorQuery();selectors.forEach(s=>q.selectAll(s).boundingClientRect());const rect=await new Promise(r=>q.exec(rows=>r(Object.fromEntries(selectors.map((s,i)=>[s,rows[i]])))));return {theme:p.data.skin.gameId,small:p.data.smallScreen,rect};}');
  const body=d.rect['.panel-body'][0],first=d.rect['.option'][0],text=d.rect['.option-text'][0],button=d.rect['#footer-primary'][0],issues=[];
  if(d.theme!==theme||!d.small)issues.push('theme/container state');
  if(text.top<body.top-.5||text.bottom>body.bottom+.5)issues.push('first answer text not fully visible');
  if(first.height<44||button.height<52||button.bottom>568.5)issues.push('touch target/footer bounds');
  const screenshot=theme+'-long-320-native.png';await call('simulator_screenshot',['--path',path.join(out,screenshot),'--optimize','false']);checks.push({...d,firstAnswerVisible:Math.max(0,Math.min(first.bottom,body.bottom)-Math.max(first.top,body.top)),screenshot,passed:!issues.length,issues});console.log((issues.length?'FAIL ':'PASS ')+theme+' small long '+issues.join('; '));
 }
}finally{
 for(const dir of dirs)for(const file of fs.readdirSync(path.join(root,'miniprogram',dir)).filter(x=>x.endsWith('.wxss')))fs.copyFileSync(path.join(root,'miniprogram',dir,file),path.join(project,'miniprogram',dir,file));fs.copyFileSync(path.join(root,'miniprogram/pages/game/index.js'),path.join(project,'miniprogram/pages/game/index.js'));
 await call('simulator_refresh');
 fs.writeFileSync(path.join(out,'native-small-checks.json'),JSON.stringify({passed:checks.length===4&&checks.every(c=>c.passed),scope:'Actual WeChat renderer in a 320x568 constrained CSS container with media queries and logical window metrics matched; not a physical device.',checks},null,2)+'\n');
}
assert(checks.length===4&&checks.every(c=>c.passed));})().catch(e=>{console.error(e);process.exitCode=1;});
