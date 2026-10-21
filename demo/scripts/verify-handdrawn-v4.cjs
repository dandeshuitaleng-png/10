'use strict';
// UI snapshots and a real HTTP challenge use a temporary database. No existing
// player data, question approvals or production configuration are changed.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {start}=require('../server/start.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'design/handdrawn-v4/evidence');fs.mkdirSync(out,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'handdrawn-v4-')),checks=[],errors=[],screenshots=[];
const bank=JSON.parse(fs.readFileSync(path.join(root,'design/content-intake/current/bank.json'),'utf8'));
const answers=new Map(bank.questions.map(q=>[q.id,q.answer]));
let instance,browser,page,failure;
function check(name,value){checks.push({name,pass:!!value});if(!value)throw Error(name);}
async function ready(){await page.waitForFunction(()=>window.app?.readyRemote&&!app.busy);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function tap(id){
 for(let n=0;n<30;n++){
  await page.waitForTimeout(30);const m=await page.evaluate(id=>({t:app.input.targets.find(t=>t.id===id),s:app.viewport.scale,r:app.renderer.scrollRegion}),id),b=await page.locator('canvas').boundingBox();
  if(m.t){check(id+' enabled',!m.t.disabled);await page.mouse.click(b.x+(m.t.x+m.t.w/2)*m.s,b.y+(m.t.y+m.t.h/2)*m.s);if(id!=='revive-share')await ready();return;}
  if(!m.r)throw Error('unreachable '+id);await page.mouse.move(b.x+(m.r.x+m.r.w*.8)*m.s,b.y+(m.r.y+m.r.h*.6)*m.s);await page.mouse.wheel(0,90);
 }
 throw Error('unreachable after scrolling '+id);
}
async function shot(name){const file=path.join(out,name+'.png');await page.locator('.stage').screenshot({path:file});const stats=await sharp(file).stats();check(name+' contains rendered content',stats.channels.reduce((s,c)=>s+c.stdev,0)>6);screenshots.push(name+'.png');}
async function geometry(name){const m=await page.evaluate(()=>({v:app.viewport,ts:app.input.targets,l:app.renderer.layout}));check(name+' 44px tap areas and native safe bounds',m.ts.every(t=>t.w*m.v.scale>=43.99&&t.h*m.v.scale>=43.99&&t.x>=0&&t.x+t.w<=375+.01&&t.y>=m.v.top-.01&&t.y+t.h<=m.v.bottom+.01));if(m.l.quiz)check(name+' 20px margins and uniform option heights',Math.abs(m.l.quiz.title.x*m.v.scale-20)<.01&&new Set(m.l.quiz.options.map(o=>o.h)).size===1);}
async function answer(wrong=false){const q=await page.evaluate(()=>app.online.question),correct=answers.get(q.id);check('source question found only in test process',Number.isInteger(correct));await tap('option-'+(wrong?(correct+1)%q.options.length:correct));await tap('confirm');}
(async()=>{
 try{
  instance=await start({port:0,dbPath:path.join(temp,'quiz.sqlite'),credentialPath:path.join(temp,'credentials.json'),adminCredentials:{username:'ui-test',password:crypto.randomBytes(24).toString('base64url')},mode:'experience'});
  const base='http://127.0.0.1:'+instance.server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  page=await browser.newPage({viewport:{width:375,height:812}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/web/play.html');await ready();await page.waitForFunction(()=>app.resources.images['hand-home']&&['back','clock','points','rank','selected','check','cross'].every(k=>app.resources.images['hand-'+k]));
  check('approved illustration and all exact icons loaded',await page.evaluate(()=>app.resources.images['hand-home'].width===1536));
  await geometry('home375');await shot('01-home-375');
  await tap('home-points');check('points opens actual balance',await page.evaluate(()=>app.router.current.name==='points'&&app.renderer.layout.points.totalPoints===app.me.points));await tap('points-settings');check('existing sound settings reachable',await page.evaluate(()=>app.router.current.name==='settings'));await tap('settings-back');await tap('back');
  await tap('home-ranking');check('ranking reads real endpoint',await page.evaluate(()=>app.router.current.name==='ranking'&&app.rankings.period==='day'));await tap('ranking-back');
  await tap('practice');check('main action opens configured themes',await page.evaluate(()=>app.router.current.name==='themes'&&app.renderer.layout.themes.total===app.catalog.themes.filter(t=>t.enabled!==false).length));await shot('02-themes-navigation');
  await tap('theme-culture');await tap('level-1');await tap('ready-start');await ready();
  check('server supplies question without correct answer',await page.evaluate(()=>app.online.state==='answering'&&!Object.hasOwn(app.online.question,'answer')));
  await geometry('quiz375');await shot('03-quiz-default-real');
  const correct=answers.get(await page.evaluate(()=>app.online.question.id));await tap('option-'+correct);check('selection does not judge locally',await page.evaluate(()=>app.online.state==='answering'&&!app.feedback&&app.selected!=null));await shot('04-quiz-selected-real');
  await tap('confirm');check('server correct feedback',await page.evaluate(()=>app.online.state==='feedback'&&app.feedback.right));await shot('05-quiz-correct-real');
  await tap('confirm');await answer(true);check('wrong enters authoritative revive without leaking answer',await page.evaluate(()=>app.online.state==='revive'&&app.online.feedback.answer==null&&app.renderer.layout.revive.answerRevealed===false));await geometry('revive375');await shot('06-revive-real');
  await tap('revive-share');await page.locator('#test-revive').click();await ready();check('test revival resumes same server challenge',await page.evaluate(()=>app.online.state==='answering'&&app.online.reviveUsed));
  await answer();while(await page.evaluate(()=>app.online.state!=='completed')){await tap('confirm');await answer();}
  check('whole chapter settles real progress and points',await page.evaluate(()=>app.me.progress.culture.completed===1&&app.me.points===10&&app.online.result.passed));await shot('07-result-existing-flow');
  await page.reload();await ready();check('reload recovers saved progress',await page.evaluate(()=>app.me.points===10&&app.themeProgress.culture.completed===1));
  for(const [w,h]of[[320,568],[375,812],[430,932]]){await page.setViewportSize({width:w,height:h});await ready();await geometry('home'+w);await shot('home-'+w);check('primary visible '+w,await page.evaluate(()=>{const l=app.renderer.layout.home.primary,v=app.viewport;return Math.abs(l.x*v.scale-20)<.01&&l.y+l.h<=v.bottom;}));}
  // Deterministic design stress cases use the real renderer, not the real
  // challenge state. The report distinguishes these from the HTTP flow above.
  await page.evaluate(()=>{app.pause();window.drawFixture=async({width,height,kind,scroll=0})=>{
   const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),{HandRenderer}=quizRequire('/js/ui/hand-renderer.js'),{createViewport}=quizRequire('/js/core/viewport.js');
   const v=createViewport({windowWidth:width,windowHeight:height,pixelRatio:2,statusBarHeight:44,safeArea:{top:44,bottom:height-34}});canvas.width=width*2;canvas.height=height*2;ctx.setTransform(v.scale*2,0,0,v.scale*2,0,0);
   const q={id:'design-example',themeName:'千年文脉',levelName:'乡土记忆',levelOrder:1,position:3,total:10,title:'湖南桃花源文化与哪位作家的作品密切相关？',options:['沈从文','范仲淹','陶渊明','雷锋']};
   const view={...app.viewState(),question:q,hasActiveChallenge:false,modal:null,exitRequested:false,connectionError:null,feedback:null,selected:null,challengeState:'answering',remainingSeconds:22,images:app.resources.images,toast:null};
   if(kind==='selected')view.selected=2;
   if(kind==='correct')view.feedback={question:q,selected:2,answer:2,right:true,explanation:'桃花源文化与陶渊明的《桃花源记》等作品相关。'};
   if(kind==='wrong'){view.modal='revive';view.incorrectSelected=1;}
   if(kind==='long'){q.title=q.title.repeat(3);q.options=['通过分类收集垃圾、减少一次性用品，保护乡村河流和自然环境','把游玩垃圾带走并投放到附近的分类收集点','在河边种植适宜当地生态环境的本地植物','参加乡村河流清洁与环境保护的公益活动'];}
   if(kind==='media'){q.media={type:'image',src:'fixture',caption:'教学配图'};view.mediaImage=app.resources.images['hand-home'];}
   const r=new HandRenderer(ctx),route={name:kind==='home'?'home':'quiz',params:{themeId:'culture'}};r.render(route,v,view);if(scroll){r.scrollBy(scroll);r.render(route,v,view);}return{layout:r.layout,targets:r.targets,viewport:v,scrollMax:r.scrollMax};
  };});
  for(const [w,h]of[[320,740],[375,812],[430,932]])for(const kind of ['home','default','selected','correct','wrong','long','media']){
   await page.setViewportSize({width:w,height:h});await page.waitForTimeout(100);const m=await page.evaluate(args=>drawFixture(args),{width:w,height:h,kind});
   check('fixture '+kind+' '+w+' safe targets',m.targets.every(t=>t.x>=0&&t.x+t.w<=375+.01&&t.y>=m.viewport.top-.01&&t.y+t.h<=m.viewport.bottom+.01));
   await shot('fixture-'+kind+'-'+w);
   if(['long','media'].includes(kind)&&m.scrollMax){const end=await page.evaluate(args=>drawFixture(args),{width:w,height:h,kind,scroll:1e6});check('fixture '+kind+' '+w+' final option unobscured',end.layout.quiz.options.at(-1).y+end.layout.quiz.options.at(-1).h<=end.layout.quiz.region.y+end.layout.quiz.region.h+.01);await shot('fixture-'+kind+'-'+w+'-scrolled');}
  }
  check('no uncaught browser errors',errors.length===0);
 }catch(e){failure=e.stack;try{await shot('failure');}catch(_){}}
 finally{if(browser)await browser.close();if(instance)await instance.close();fs.rmSync(temp,{recursive:true,force:true});const report={date:new Date().toISOString(),passed:!failure,checks,errors,failure,screenshots,scope:'Approved home and quiz UI: real local HTTP/SQLite full-chapter flow, revival, score, saved recovery; separately marked renderer fixtures for 320/375/430, long text, media and states. Does not validate WeChat devices or publication.'};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:checks.length,screenshots:screenshots.length,failure}));if(failure)process.exitCode=1;}
})();
