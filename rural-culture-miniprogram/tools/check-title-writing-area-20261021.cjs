'use strict';
// Native text boxes are checked against the ribbon's central writing face,
// rather than the bounds of leaves, water, book/flag decorations or ribbon tails.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/home-designs-20261021');
const {artBounds,titleFaces,titleType}=require('../miniprogram/services-v4/home-layout');
const checks=[];
async function call(tool,args=[]){return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';c.stdout.on('data',b=>s+=b);c.stderr.on('data',b=>s+=b);const timer=setTimeout(()=>{c.kill();reject(Error(tool+' timeout'));},45000);c.on('close',code=>{clearTimeout(timer);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,600)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,600)));resolve(r.result);});});}
async function evaluate(fn){let r=await call('automation_evaluate',['--fn-source',fn]);for(let i=0;i<6&&r?.result!==undefined;i++)r=r.result;return r;}
const styleDirs=['pages/game','components/game-button','components/mascot-actor'];
function stage(size){
 for(const dir of styleDirs)for(const file of fs.readdirSync(path.join(root,'miniprogram',dir)).filter(x=>x.endsWith('.wxss'))){let s=fs.readFileSync(path.join(root,'miniprogram',dir,file),'utf8').replace(/@media\s*\(max-width:(\d+)px\)/g,(_,n)=>size.w<=Number(n)?'@media(min-width:0px)':'@media(max-width:0px)').replace(/([\d.]+)rpx\b/g,(_,n)=>(Number(n)*size.w/750)+'px').replace(/([\d.]+)v([wh])\b/g,(_,n,a)=>(Number(n)*(a==='w'?size.w:size.h)/100)+'px');if(dir==='pages/game'&&file==='index.wxss')s+='\n.game-device{width:'+size.w+'px!important;height:'+size.h+'px!important;max-width:none!important;margin:0!important;transform-origin:0 0}\n';fs.writeFileSync(path.join(project,'miniprogram',dir,file),s);}
 const info={windowWidth:size.w,windowHeight:size.h,screenWidth:size.w,screenHeight:size.h,statusBarHeight:size.status,safeArea:{bottom:size.h-size.safe}},menu={left:size.w-94,bottom:size.status+38};
 const source=fs.readFileSync(path.join(root,'miniprogram/pages/game/index.js'),'utf8'),from=require('./native-metrics-source.cjs');assert(from.test(source));fs.writeFileSync(path.join(project,'miniprogram/pages/game/index.js'),source.replace(from,'const i='+JSON.stringify(info)+',m=homeLayout.metrics(i,'+JSON.stringify(menu)+',skin.gameId);'));
}
function save(){fs.writeFileSync(path.join(out,'title-writing-area-checks.json'),JSON.stringify({date:new Date().toISOString(),passed:checks.every(c=>c.passed),scope:'Actual WeChat renderer in isolated 320x568, 375x812 and 430x844 CSS-pixel containers. Label line boxes and conservative four-character glyph envelope checked against the central writing face; source artwork unchanged. No physical phone/browser acceptance.',checks},null,2)+'\n');}
(async()=>{try{
 for(const size of [{w:320,h:568,status:20,safe:0},{w:375,h:812,status:44,safe:34},{w:430,h:844,status:59,safe:34}]){
  await call('open_project_window',['--window-mode','liteMode']);await call('close_project_window');stage(size);await call('open_project_window',['--window-mode','liteMode']);
  await call('simulator_screenshot',['--path',path.join(project,'qa-ready.png'),'--optimize','false']);
  await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);
  for(const theme of ['ecology','red','culture','industry'])for(const context of ['home','heading','modal']){
   await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario='+(context==='heading'?'quiz':'home')]);
   if(context==='modal')await call('automation_element_action',['--action','trigger','--selector','#footer-primary','--type','action','--detail','{}','--wait','0.3']);
   const selector=context==='home'?'.home-title-label .activity-title':context==='heading'?'.theme-heading .h1':'.modal-decoration .modal-game-name',img=context==='home'?'.title-art-window .activity-title-art':context==='heading'?'.theme-heading-art':'.modal-heading-art';
   const d=await evaluate('async function(){await new Promise(r=>setTimeout(r,180));const p=getCurrentPages().slice(-1)[0],q=wx.createSelectorQuery();q.select('+JSON.stringify(selector)+').boundingClientRect();q.select('+JSON.stringify(img)+').boundingClientRect();return {theme:p.data.skin.gameId,name:p.data.skin.name,route:p.data.route,modal:p.data.modal,header:p.data.header,art:p.data.titleArt,rect:await new Promise(r=>q.exec(r))};}');
   const issues=[],[label,image]=d.rect,b=artBounds[theme],face=titleFaces[theme],type=titleType[context];let area,glyph;
   if(!label||!image||!label.height||!image.height)issues.push('missing native text or image');else{
    const fit=Math.min(image.width/b.width,image.height/b.height),cx=image.left+image.width/2,cy=image.top+(image.height-b.height*fit)/2+face.centerY*fit;
    area={left:cx-face.width*fit/2,right:cx+face.width*fit/2,top:cy-face.height*fit/2,bottom:cy+face.height*fit/2};
    // Native text rectangles include line leading; preserve that full rectangle
    // vertically, and use the full em square plus tracking for each CJK glyph.
    glyph={left:label.left+label.width/2-d.name.length*(type.font+1)/2,right:label.left+label.width/2+d.name.length*(type.font+1)/2,top:label.top,bottom:label.bottom};
    if(Math.abs(label.height-type.line)>.6)issues.push('stale or overridden line height');
    if(glyph.left<area.left-.5||glyph.right>area.right+.5||glyph.top<area.top-1||glyph.bottom>area.bottom+1)issues.push('title exceeds central writing area');
    if(context==='home'&&image.top<size.status-1)issues.push('artwork reaches status area');
   }
   if(d.theme!==theme||(context==='modal'?d.modal!=='rules':d.route!==(context==='home'?'home':'quiz')))issues.push('wrong page state');
   let screenshot;if(size.w===375){screenshot='compact-title-'+theme+'-'+context+'.png';await call('simulator_screenshot',['--path',path.join(out,screenshot),'--optimize','false','--wait-for-selector',selector]);}
   checks.push({size,theme,context,passed:!issues.length,issues,label,image,writingArea:area,glyphEnvelope:glyph,screenshot});save();console.log((issues.length?'FAIL ':'PASS ')+theme+' '+context+' '+size.w+' '+issues.join('; '));
  }
 }
 }finally{
  for(const dir of styleDirs)for(const file of fs.readdirSync(path.join(root,'miniprogram',dir)).filter(x=>x.endsWith('.wxss')))fs.copyFileSync(path.join(root,'miniprogram',dir,file),path.join(project,'miniprogram',dir,file));
  fs.copyFileSync(path.join(root,'miniprogram/pages/game/index.js'),path.join(project,'miniprogram/pages/game/index.js'));await call('simulator_refresh');
 }
 if(checks.length!==36||checks.some(c=>!c.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
