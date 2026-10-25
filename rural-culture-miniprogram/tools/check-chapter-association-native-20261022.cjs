'use strict';
// Actual WeChat renderer in isolated, constrained containers. No real player writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/chapter-association-20261022');fs.mkdirSync(out,{recursive:true});
async function call(tool,args=[]){return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';c.stdout.on('data',b=>s+=b);c.stderr.on('data',b=>s+=b);const timer=setTimeout(()=>{c.kill();reject(Error(tool+' timeout'));},45000);c.on('close',code=>{clearTimeout(timer);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,600)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,600)));resolve(r.result);});});}
async function evaluate(fn){let r=await call('automation_evaluate',['--fn-source',fn]);for(let i=0;i<6&&r?.result!==undefined;i++)r=r.result;return r;}
function stage(size){
 for(const dir of ['pages/game','components/game-button','components/mascot-actor'])for(const file of fs.readdirSync(path.join(root,'miniprogram',dir)).filter(x=>x.endsWith('.wxss'))){let s=fs.readFileSync(path.join(root,'miniprogram',dir,file),'utf8').replace(/@media\s*\(max-width:(\d+)px\)/g,(_,n)=>size.w<=Number(n)?'@media(min-width:0px)':'@media(max-width:0px)').replace(/([\d.]+)rpx\b/g,(_,n)=>(Number(n)*size.w/750)+'px').replace(/([\d.]+)v([wh])\b/g,(_,n,a)=>(Number(n)*(a==='w'?size.w:size.h)/100)+'px');if(dir==='pages/game'&&file==='index.wxss')s+='\n.game-device{width:'+size.w+'px!important;height:'+size.h+'px!important;max-width:none!important;margin:0!important;transform-origin:0 0}\n';fs.writeFileSync(path.join(project,'miniprogram',dir,file),s);}
 const info={windowWidth:size.w,windowHeight:size.h,screenWidth:size.w,screenHeight:size.h,statusBarHeight:size.status,safeArea:{bottom:size.h-size.safe}},menu={left:size.w-94,bottom:size.status+38};
 const source=fs.readFileSync(path.join(root,'miniprogram/pages/game/index.js'),'utf8'),from=require('./native-metrics-source.cjs');assert(from.test(source));fs.writeFileSync(path.join(project,'miniprogram/pages/game/index.js'),source.replace(from,'const i='+JSON.stringify(info)+',m=homeLayout.metrics(i,'+JSON.stringify(menu)+',skin.gameId);'));
}

const captureOnly=process.argv.includes('--capture-home');
const checks=captureOnly?JSON.parse(fs.readFileSync(path.join(out,'native-checks.json'))).checks.filter(c=>!c.hostCapture):[];
const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
async function measure(){return evaluate(`async function(){
 const p=getCurrentPages().slice(-1)[0];if(p.data.route!=='home')p.go('home');
 await new Promise(r=>setTimeout(r,250));
 const nodes=p.data.journey.nodes,q=wx.createSelectorQuery();
 q.select('.panel-body').boundingClientRect();
 ['.route-caption','.route-base','.route-node-badge','.chapter-mascot'].forEach(s=>q.selectAll('.route-stop '+s).boundingClientRect());
 const a=await new Promise(r=>q.exec(r));
 let badge=0,actor=0;
 const info=wx.getWindowInfo();
 return {theme:p.data.skin.gameId,viewport:{width:info.windowWidth,height:info.windowHeight},guide:p.data.journey.guideId||nodes[nodes.length-1].id,body:a[0],nodes:nodes.map((n,i)=>({id:n.id,status:n.status,card:a[1][i],base:a[2][i],badge:['completed','locked','today-locked'].includes(n.status)?a[3][badge++]:null,actor:n.showMascot?a[4][actor++]:null}))};
}`);}
function validate(d){const issues=[];
 for(const n of d.nodes){const a=n.card,b=n.base,delta=Math.abs(a.top+a.height/2-b.top-b.height/2),gap=b.left>a.left?b.left-a.right:a.left-b.right;n.centerError=delta;
  if(delta>1)issues.push(n.id+' centers differ '+delta);
  if(gap<5||gap>12)issues.push(n.id+' gap '+gap);
  if(n.badge&&(n.badge.top<b.top-1||n.badge.bottom>b.bottom+1||n.badge.left<b.left-1||n.badge.right>b.right+1))issues.push(n.id+' badge outside podium');
 }
 for(const a of d.nodes)for(const b of d.nodes)if(a.id!==b.id)for(const k of ['card','actor','badge'])if(b[k]&&overlap(a.card,b[k])>.5)issues.push(a.id+' overlaps '+b.id+' '+k);
 const focus=d.nodes.find(n=>n.id===d.guide),body=d.body;
 for(const k of ['card','actor'])if(focus[k]&&(focus[k].top<body.top-1||focus[k].bottom>body.bottom+1))issues.push('focused '+k+' clipped');
 return issues;
}
function save(){fs.writeFileSync(path.join(out,'native-checks.json'),JSON.stringify({date:new Date().toISOString(),passed:checks.every(c=>c.passed),scope:'Actual WeChat renderer, constrained 320x568 / 375x812 / 430x844 containers plus actual host home captures. Home, fourth chapter, today-locked and complete states. Not physical iOS/Android acceptance.',checks},null,2)+'\n');}
(async()=>{try{
 for(const size of captureOnly?[]:[{w:320,h:568,status:20,safe:0},{w:375,h:812,status:44,safe:34},{w:430,h:844,status:59,safe:34}]){
  await call('open_project_window',['--window-mode','liteMode']);await call('close_project_window');stage(size);
  await call('open_project_window',['--window-mode','liteMode']);await call('simulator_screenshot',['--path',path.join(project,'qa-ready.png'),'--optimize','false']);
  await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);
  for(const theme of ['red','culture','industry','ecology'])for(const scenario of ['home','chapter-4','locked','complete']){
   await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario='+scenario]);
   const d=await measure(),issues=validate(d);
   assert.equal(d.theme,theme);if(scenario==='chapter-4')assert.equal(d.guide,theme+'-4');
   if(size.w===375&&(scenario==='home'||scenario==='chapter-4')){d.screenshot=theme+'-'+scenario+'-375.png';await call('simulator_screenshot',['--path',path.join(out,d.screenshot),'--optimize','false','--wait-for-selector','.route-canvas']);}
   checks.push({size,scenario,...d,passed:!issues.length,issues});save();console.log((issues.length?'FAIL ':'PASS ')+theme+' '+scenario+' '+size.w+' '+issues.join('; '));
  }
 }
 }finally{
  for(const dir of ['pages/game','components/game-button','components/mascot-actor'])for(const file of fs.readdirSync(path.join(root,'miniprogram',dir)).filter(x=>x.endsWith('.wxss')))fs.copyFileSync(path.join(root,'miniprogram',dir,file),path.join(project,'miniprogram',dir,file));
  fs.copyFileSync(path.join(root,'miniprogram/pages/game/index.js'),path.join(project,'miniprogram/pages/game/index.js'));await call('simulator_refresh');
 }
 await call('open_project_window',['--window-mode','liteMode']);await call('close_project_window');await call('open_project_window',['--window-mode','liteMode']);
 await call('simulator_screenshot',['--path',path.join(project,'qa-ready.png'),'--optimize','false']);
 await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);
 for(const theme of ['red','culture','industry','ecology']){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario=home']);
  await new Promise(r=>setTimeout(r,4200));
  const d=await measure(),issues=validate(d),screenshot=theme+'-home.png';
  await call('simulator_screenshot',['--path',path.join(out,screenshot),'--optimize','false','--wait-for-selector','.route-canvas']);
  fs.copyFileSync(path.join(out,screenshot),path.join(root,'preview/home-directions-20261021',theme+'-map.png'));
  checks.push({hostCapture:true,scenario:'home',...d,screenshot,passed:!issues.length,issues});save();console.log((issues.length?'FAIL ':'PASS ')+theme+' native host '+issues.join('; '));
 }
 assert(checks.every(c=>c.passed),'chapter association checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
