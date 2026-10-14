const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,process.env.CONTENT_EVIDENCE_DIR||'design/content-intake/current/evidence');
const checks=[],errors=[],shots=[];let p,b,failure;
function check(name,value){checks.push({name,passed:!!value});if(!value)throw Error(name);}
async function settle(){await p.waitForTimeout(60);}
async function shot(name){await p.locator('canvas').screenshot({path:path.join(out,name+'.png')});shots.push(name+'.png');}
async function tap(id){
  await p.locator('canvas').scrollIntoViewIfNeeded();
  for(let n=0;n<14;n++){
    const g=await p.evaluate(id=>({target:contentPreviewApp.input.targets.find(t=>t.id===id),scale:contentPreviewApp.viewport.scale,region:contentPreviewApp.renderer.scrollRegion}),id);
    const c=await p.locator('canvas').boundingBox();
    if(g.target){await p.mouse.click(c.x+(g.target.x+g.target.w/2)*g.scale,c.y+(g.target.y+g.target.h/2)*g.scale);await settle();return;}
    if(!g.region)throw Error('Missing target '+id);
    const x=c.x+(g.region.x+g.region.w*.85)*g.scale,y=c.y+(g.region.y+g.region.h*.8)*g.scale;
    await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y-g.region.h*.6*g.scale,{steps:8});await p.mouse.up();await settle();
  }
  throw Error('Unreachable target '+id);
}
(async()=>{fs.mkdirSync(out,{recursive:true});try{
  b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});p=await b.newPage({viewport:{width:375,height:812},deviceScaleFactor:1});p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:63003/design/content-intake/current/index.html');await p.waitForFunction(()=>window.contentPreviewApp?.challenge);await settle();
  const ids=await p.locator('#level option').evaluateAll(nodes=>nodes.map(n=>n.value));check('16关可切换',ids.length===16);
  for(const id of ids){
    await p.selectOption('#level',id);await p.waitForFunction(id=>window.contentPreviewApp?.challenge?.level.id===id&&!document.getElementById('level').disabled,id);await settle();await shot(id+'-start');
    const progress=await p.evaluate(()=>JSON.stringify(contentPreviewApp.themeProgress));
    check(id+'只抽本关且十题不重复',await p.evaluate(id=>{const qs=contentPreviewApp.challenge.questions;return qs.length===10&&new Set(qs.map(q=>q.id)).size===10&&qs.every(q=>q.levelId===id)&&contentPreviewApp.challenge.question.practice},id));
    for(let n=0;n<10;n++){
      const answer=await p.evaluate(()=>contentPreviewApp.challenge.questions[contentPreviewApp.challenge.position].answer);
      await tap('option-'+answer);await tap('confirm');
      if(n<9){check(id+'第'+(n+1)+'题显示解析',await p.evaluate(()=>!!contentPreviewApp.feedback?.explanation));await tap('confirm');}
    }
    check(id+'十题作答完成',await p.evaluate(()=>contentPreviewApp.router.current.name==='result'&&contentPreviewApp.challenge.correct===10&&contentPreviewApp.challenge.attempts===10));
    check(id+'不写正式进度或积分',await p.evaluate(progress=>JSON.stringify(contentPreviewApp.themeProgress)===progress&&contentPreviewApp.challenge.result.points===null,progress));
    await shot(id+'-result');await tap('next');check(id+'返回所属主题',await p.evaluate(id=>contentPreviewApp.router.current.name==='map'&&contentPreviewApp.router.current.params.themeId===id.split('-')[0],id));await tap('back');check(id+'再返回一次到首页',await p.evaluate(()=>contentPreviewApp.router.current.name==='home'&&contentPreviewApp.router.history.length===0));
  }
  // All real question text/choices: rendering-only snapshots, never formal progress.
  for(const [width,height] of [[320,568],[375,812],[414,896],[430,932]]){
    await p.setViewportSize({width,height});await settle();
    const result=await p.evaluate(async()=>{
      const bank=await (await fetch('bank.json')).json(),app=contentPreviewApp;app.pause();
      const {questionView}=quizRequire('/js/core/question');const failures=[];
      for(const q of bank.questions){
        app.renderer.render({name:'quiz',params:{themeId:q.themeId,practice:true}},app.viewport,{images:app.resources.images,question:questionView(q,{position:1,total:10,levelOrder:q.levelOrder,difficultyLabel:q.difficultyLabel,themeName:q.themeName,practice:true}),selected:null});
        const g=app.renderer.layout.quiz,v=app.viewport;
        if(g.options.length!==4||!g.options.every((o,i)=>!i||o.y>=g.options[i-1].y+g.options[i-1].h)||!(g.scrollMax>0||Math.max(g.title.y+g.title.h,...g.options.map(o=>o.y+o.h))<=g.region.y+g.region.h+.1)||!app.renderer.targets.every(t=>t.w*v.scale>=44&&t.h*v.scale>=44&&t.y>=v.top&&t.y+t.h<=v.bottom+.1))failures.push(q.id);
      }
      const longest=bank.questions.reduce((best,q)=>q.title.length+q.options.join('').length>best.title.length+best.options.join('').length?q:best);
      app.renderer.render({name:'quiz',params:{themeId:longest.themeId,practice:true}},app.viewport,{images:app.resources.images,question:questionView(longest,{position:1,total:10,levelOrder:longest.levelOrder,difficultyLabel:longest.difficultyLabel,themeName:longest.themeName,practice:true}),selected:null});
      return {count:bank.questions.length,failures,longestId:longest.id};
    });
    check(width+'px全部240题真实文字可见或可滚动且热区达标',result.count===240&&result.failures.length===0);await shot('longest-'+width);await p.evaluate(()=>contentPreviewApp.resume());
  }
  await p.setViewportSize({width:375,height:812});await p.selectOption('#level','red-1');await p.waitForFunction(()=>contentPreviewApp.challenge?.level.id==='red-1'&&!document.getElementById('level').disabled);
  const wrong=await p.evaluate(()=>(contentPreviewApp.challenge.questions[0].answer+1)%4);await tap('option-'+wrong);await tap('confirm');await shot('wrong-disabled');
  check('真实内容答错且复活禁用',await p.evaluate(()=>contentPreviewApp.challenge.state==='revive'&&contentPreviewApp.input.targets.find(t=>t.id==='revive-share').disabled));await tap('revive-back');check('错误返回当前主题地图',await p.evaluate(()=>contentPreviewApp.router.current.params.themeId==='red'));
  check('浏览器无异常',errors.length===0);
}catch(e){failure=e.stack;try{await shot('failure');}catch(_){}}finally{if(b)await b.close();const report={checkedAt:new Date().toISOString(),passed:!failure,checks,errors,failure,screenshots:shots,scope:'Independent pending-content preview; 16 actual randomized ten-question runs, 240 actual text layouts across four sizes. Answers read solely to drive pointer checks; no formal progress or scoring.',wechatSimulator:'not_tested_for_content_preview',realDevices:'not_tested'};fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks:checks.length,screenshots:shots.length,failure}));if(failure)process.exitCode=1;}})();
