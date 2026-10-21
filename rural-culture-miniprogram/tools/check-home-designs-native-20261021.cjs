'use strict';
// Constrained native containers in an isolated review project. No real player writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/home-designs-20261021');fs.mkdirSync(out,{recursive:true});
const widths=process.argv.slice(2).map(Number).filter(n=>n>0),designs=['map'];
const previous=(widths.length||designs.length===1)&&fs.existsSync(path.join(out,'native-checks.json'))?JSON.parse(fs.readFileSync(path.join(out,'native-checks.json'))).checks.filter(c=>c.design==='map'):[];
const checks=previous.filter(c=>c.size?!(designs.includes(c.design)&&(!widths.length||widths.includes(c.size.w))):!designs.includes(c.design));
async function call(tool,args=[]){return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';c.stdout.on('data',b=>s+=b);c.stderr.on('data',b=>s+=b);const timer=setTimeout(()=>{c.kill();reject(Error(tool+' timeout'));},45000);c.on('close',code=>{clearTimeout(timer);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,600)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,600)));resolve(r.result);});});}
async function evaluate(fn){let r=await call('automation_evaluate',['--fn-source',fn]);for(let i=0;i<6&&r?.result!==undefined;i++)r=r.result;return r;}
function stage(size){
 for(const dir of ['pages/game','components/game-button','components/mascot-actor'])for(const file of fs.readdirSync(path.join(root,'miniprogram',dir)).filter(x=>x.endsWith('.wxss'))){let s=fs.readFileSync(path.join(root,'miniprogram',dir,file),'utf8').replace(/@media\s*\(max-width:(\d+)px\)/g,(_,n)=>size.w<=Number(n)?'@media(min-width:0px)':'@media(max-width:0px)').replace(/([\d.]+)rpx\b/g,(_,n)=>(Number(n)*size.w/750)+'px').replace(/([\d.]+)v([wh])\b/g,(_,n,a)=>(Number(n)*(a==='w'?size.w:size.h)/100)+'px');if(dir==='pages/game'&&file==='index.wxss')s+='\n.game-device{width:'+size.w+'px!important;height:'+size.h+'px!important;max-width:none!important;margin:0!important;transform-origin:0 0}\n';fs.writeFileSync(path.join(project,'miniprogram',dir,file),s);}
 const info={windowWidth:size.w,windowHeight:size.h,screenWidth:size.w,screenHeight:size.h,statusBarHeight:size.status,safeArea:{bottom:size.h-size.safe}},menu={left:size.w-94,bottom:size.status+38};
 const source=fs.readFileSync(path.join(root,'miniprogram/pages/game/index.js'),'utf8'),from='const i=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync(),m=homeLayout.metrics(i,wx.getMenuButtonBoundingClientRect?wx.getMenuButtonBoundingClientRect():null,skin.gameId);';assert(source.includes(from));fs.writeFileSync(path.join(project,'miniprogram/pages/game/index.js'),source.replace(from,'const i='+JSON.stringify(info)+',m=homeLayout.metrics(i,'+JSON.stringify(menu)+',skin.gameId);'));
}
const selectors=['.game-device','.activity-header','.title-art-window','.home-title-label','.home-guide-card','.home-guide-avatar','.home-guide-chapter','.activity-shortcut','.panel-body','.route-canvas','.route-stop.current .route-caption','.route-stop.current .chapter-mascot','.chapter-active .chapter-open','.chapter-active .chapter-mascot','.chapter-card','.chapter-card-title','.chapter-card-state','.chapter-art-window','.chapter-card-reward','.chapter-progress-stamp','.route-scene','.route-base','.panel-footer','#footer-primary'];
async function measure(){return evaluate('async function(){const p=getCurrentPages().slice(-1)[0];await new Promise(r=>setTimeout(r,160));const selectors='+JSON.stringify(selectors)+',q=wx.createSelectorQuery();selectors.forEach(s=>q.selectAll(s).boundingClientRect());const rect=await new Promise(r=>q.exec(rows=>r(Object.fromEntries(selectors.map((s,i)=>[s,rows[i]])))));return {design:p.data.homeDesign,theme:p.data.skin.gameId,mapWidth:p.data.mapWidth,mapViewport:p.data.mapViewport,scroll:p.data.mapScrollTop,rect};}');}
function save(){fs.writeFileSync(path.join(out,'native-checks.json'),JSON.stringify({date:new Date().toISOString(),passed:checks.every(c=>c.passed),scope:'Actual WeChat renderer with constrained 320x568, 375x812 and 430x844 CSS-pixel containers. Approved A only, themed landmarks and podiums, spring/summer/autumn/winter order and local-hand motion. 430 height stays within the host simulator viewport to avoid offscreen component culling; not a 430x932 device test. No physical iOS/Android acceptance and no real player data.',checks},null,2)+'\n');}
(async()=>{try{
 for(const size of [{w:320,h:568,status:20,safe:0},{w:375,h:812,status:44,safe:34},{w:430,h:844,status:59,safe:34}]){
  if(widths.length&&!widths.includes(size.w))continue;
  // Reopen this disposable window after a geometry change. Hot refresh may leave
  // the automator attached to an obsolete Page even though rendering succeeded.
  await call('open_project_window',['--window-mode','liteMode']);
  await call('close_project_window');stage(size);
  await call('open_project_window',['--window-mode','liteMode']);
  await call('simulator_screenshot',['--path',path.join(project,'qa-ready.png'),'--optimize','false']);
  try{await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);}catch(e){if(!/waitForAutomatorReady|waiting for automator/.test(e.message))throw e;await call('simulator_screenshot',['--path',path.join(project,'qa-ready.png'),'--optimize','false']);await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);}
  for(const design of designs)for(const theme of ['ecology','red','culture','industry']){
   await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario=home&homeDesign='+design]);
   const d=await measure(),issues=[],test=(ok,label)=>{if(!ok)issues.push(label);},r=d.rect,body=r['.panel-body'][0],header=r['.activity-header'][0],title=r['.title-art-window'][0],label=r['.home-title-label'][0],caption=r[design==='guide'?'.chapter-active .chapter-open':'.route-stop.current .route-caption'][0],mascot=r[design==='guide'?'.chapter-active .chapter-mascot':'.route-stop.current .chapter-mascot'][0];
   test(d.design===design&&d.theme===theme,'review selects requested direction and theme');
   test(title.top>=size.status&&title.bottom<=header.bottom&&Math.abs(title.left+title.width/2-size.w/2)<1,'title safely centered');
   test(label.top>=title.top-5&&label.bottom<=title.bottom+5,'title lettering stays inside front face');
   test(r['.activity-shortcut'].length===3&&r['.activity-shortcut'].every(b=>b.height>=44&&b.left>=0&&b.right<=size.w+.5),'three accessible shortcuts');
   test(Math.abs(body.height-d.mapViewport)<1.5&&Math.abs(r['.route-canvas'][0].width-d.mapWidth)<1.5,'body/canvas physical geometry matches layout metrics');
   test(caption.left>=body.left-1&&caption.right<=body.right+1&&caption.top>=body.top-1&&caption.bottom<=body.bottom+1,'current caption visible within map');
   test(mascot.top>=body.top-1&&mascot.bottom<=body.bottom+1,'current mascot visible within map');
   test(r['#footer-primary'][0].bottom<=size.h-size.safe+1&&r['#footer-primary'][0].height>=44,'footer safe and touchable');
   if(design==='guide'){test(!r['.home-guide-card'].length&&!r['.home-guide-avatar'].length,'no repeated header portrait');test(!r['.route-scene'].length&&!r['.route-base'].length,'B excludes a full landscape route and circular podiums');test(r['.chapter-card'].length===4,'all catalog chapters displayed');const cards=r['.chapter-card'];test(cards.every(c=>Math.abs(c.width-cards[0].width)<.5&&Math.abs(c.height-cards[0].height)<.5),'all chapters have equal dimensions');test(r['.chapter-progress-stamp'].length===cards.length,'progress stamps follow real catalog');test(r['.chapter-card-title'].every((t,i)=>t.left>=cards[i].left&&t.right<=cards[i].right&&t.bottom<=r['.chapter-card-state'][i].top),'chapter type remains within its card');test(r['.chapter-art-window'].length===cards.length&&r['.chapter-art-window'].every((a,i)=>a.bottom<=r['.chapter-card-title'][i].top&&a.left>=cards[i].left&&a.right<=cards[i].right),'picture windows remain above readable captions');test(r['.chapter-card-state'].every((t,i)=>t.bottom<=r['.chapter-card-reward'][i].top),'status and reward never overlap');}
   if(size.w===375){const filename=theme+'-'+design+'-375-container.png';await call('simulator_screenshot',['--path',path.join(out,filename),'--optimize','false','--wait-for-selector','.route-canvas']);d.screenshot=filename;}
   checks.push({size,...d,passed:!issues.length,issues});save();console.log((issues.length?'FAIL ':'PASS ')+theme+' '+design+' '+size.w+' '+issues.join('; '));
  }
 }
 // Each direction keeps navigation and the primary interaction on the actual Page.
 for(const design of designs){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme=ecology&review=1&controls=0&scenario=home&homeDesign='+design]);
  await call('automation_element_action',['--action','trigger','--selector','#footer-primary','--type','action','--detail','{}','--wait-for-selector','.route-canvas','--wait','0.3']);
  const d=await evaluate('function(){const p=getCurrentPages().slice(-1)[0];const modal=p.data.modal;p.action({currentTarget:{dataset:{action:"close"}}});p.go("profile");const route=p.data.route;p.go("home");return {modal,route,returned:p.data.route,design:p.data.homeDesign};}');
  const passed=d.modal==='rules'&&d.route==='profile'&&d.returned==='home'&&d.design===design;checks.push({design,state:'navigation',passed,result:d});save();console.log((passed?'PASS ':'FAIL ')+design+' navigation');
 }
 }finally{
  for(const dir of ['pages/game','components/game-button','components/mascot-actor'])for(const file of fs.readdirSync(path.join(root,'miniprogram',dir)).filter(x=>x.endsWith('.wxss')))fs.copyFileSync(path.join(root,'miniprogram',dir,file),path.join(project,'miniprogram',dir,file));
  fs.copyFileSync(path.join(root,'miniprogram/pages/game/index.js'),path.join(project,'miniprogram/pages/game/index.js'));await call('simulator_refresh');
 }
 if(checks.some(c=>!c.passed))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
