'use strict';
// Isolated real browser + HTTP + SQLite verification. Answers come from the
// source fixture in this test process; the player never receives an answer bank.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {start}=require('../server/start.cjs');
const {identity}=require('./lib/runtime-evidence.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'design/full-development/evidence');
fs.mkdirSync(out,{recursive:true});
const bank=JSON.parse(fs.readFileSync(path.join(root,'design/content-intake/current/bank.json'),'utf8'));
const answers=new Map(bank.questions.map(q=>[q.id,q.answer]));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'quiz-full-game-')),checks=[],errors=[],screenshots=[];
const adminCredentials={username:'verify-admin',password:crypto.randomBytes(24).toString('base64url')};
let instance,browser,page,base,context,failure;
function check(name,pass){checks.push({name,pass:!!pass});if(!pass)throw Error(name);}
async function ready(p=page){await p.waitForFunction(()=>window.app?.readyRemote&&!app.busy);await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function go(p=page){await p.goto(base+'/web/play.html');await ready(p);await p.waitForFunction(()=>app.router.current.name==='home');}
async function shot(name){await page.locator('.stage').screenshot({path:path.join(out,name+'.png')});screenshots.push(name+'.png');}
async function tap(id){
  for(let n=0;n<20;n++){
    await page.waitForTimeout(35);
    const metrics=await page.evaluate(id=>({t:app.input.targets.find(t=>t.id===id),s:app.viewport.scale,region:app.renderer.scrollRegion}),id),canvas=await page.locator('canvas').boundingBox();
    if(metrics.t){check(id+'操作可达',!metrics.t.disabled);await page.mouse.click(canvas.x+(metrics.t.x+metrics.t.w/2)*metrics.s,canvas.y+(metrics.t.y+metrics.t.h/2)*metrics.s);await page.waitForTimeout(35);return;}
    if(!metrics.region)throw Error('控件不可达：'+id);
    const r=metrics.region;await page.mouse.move(canvas.x+(r.x+r.w*.9)*metrics.s,canvas.y+(r.y+r.h*.7)*metrics.s);await page.mouse.wheel(0,110);await page.waitForTimeout(40);
  }
  throw Error('滚动后控件仍不可达：'+id);
}
async function geometry(name){const m=await page.evaluate(()=>({v:app.viewport,targets:app.input.targets}));check(name+'操作尺寸与安全区',m.targets.every(t=>t.w*m.v.scale>=43.99&&t.h*m.v.scale>=43.99&&t.y>=m.v.top-1&&t.y+t.h<=m.v.bottom+1));}
async function answerCurrent(wrong=false){
  const q=await page.evaluate(()=>app.online.question);check('玩家当前题不含答案/解析',!('answer'in q)&&!('explanation'in q));
  const answer=answers.get(q.id);check('题目属于真实源库',Number.isInteger(answer));
  await tap('option-'+(wrong?(answer+1)%4:answer));await tap('confirm');await ready();
  return q.id;
}
async function finish(){const ids=[];for(let i=0;i<10;i++){ids.push(await answerCurrent());const s=await page.evaluate(()=>app.online.state);if(i<9){check('答对进入解析',s==='feedback');await tap('confirm');await ready();check('下一题计时从服务器开始',await page.evaluate(()=>app.online.state==='answering'&&app.viewState().remainingSeconds>0));}else check('第十题进入服务端通关结果',s==='completed');}check('十题无重复',new Set(ids).size===10);await ready();}
async function api(p,url,body,method=body===undefined?'GET':'POST'){const r=await p.request.fetch(base+url,{method,data:body});const d=await r.json();return {status:r.status(),...d};}
async function adminView(p,name){await p.locator('[data-view="'+name+'"]').click();await p.waitForFunction(()=>document.querySelector('#loading').hidden);check('后台'+name+'无错误',await p.locator('#global-error').isHidden());}
async function adminSubmit(p,form){await p.locator(form+' button[type=submit]').click();await p.waitForFunction(selector=>document.querySelector(selector+' button[type=submit]').disabled===false,form);}
async function verifyAdmin(p){
  await p.setViewportSize({width:1366,height:900});await adminView(p,'questions');
  check('全部240源题待审核',(await api(p,'/api/admin/questions')).data.questions.every(q=>!q.approved&&!q.enabled));
  await p.locator('#new-question').click();const f=p.locator('#question-form');
  await f.locator('[name=id]').fill('TEST-UI-QUESTION');await f.locator('[name=title]').fill('隔离测试题：1加1等于多少？');
  await f.locator('[name=explanation]').fill('隔离测试内容，验证管理操作后删除。1+1=2。');
  for(let i=0;i<4;i++)await f.locator('[name=option-'+i+']').fill(String(i+1));await f.locator('[name=answer][value="1"]').check();
  await adminSubmit(p,'#question-form');await p.locator('#question-dialog').waitFor({state:'hidden'});
  await p.locator('#question-filters [name=search]').fill('TEST-UI-QUESTION');await adminSubmit(p,'#question-filters');
  const row=p.locator('[data-question="TEST-UI-QUESTION"]');await row.waitFor();await row.getByRole('button',{name:'审核',exact:true}).click();
  await p.locator('#review-form [name=note]').fill('仅隔离数据库的管理流程验证，不是正式题库审核。');await p.locator('#review-form [name=enabled]').check();
  await adminSubmit(p,'#review-form');await p.locator('#review-dialog').waitFor({state:'hidden'});
  let q=(await api(p,'/api/admin/questions/TEST-UI-QUESTION')).data;check('真实新增审核启用',q.approved&&q.enabled&&q.answer===1);
  await row.getByRole('button',{name:'编辑',exact:true}).click();await f.locator('[name=title]').fill('隔离测试题已修改：1加1等于多少？');await adminSubmit(p,'#question-form');await p.locator('#question-dialog').waitFor({state:'hidden'});
  q=(await api(p,'/api/admin/questions/TEST-UI-QUESTION')).data;check('真实编辑撤销旧审核',!q.approved&&!q.enabled);
  const exportEvent=p.waitForEvent('download');await p.locator('#export-questions').click();const exported=await exportEvent,exportFile=path.join(temp,'ui-export.json');await exported.saveAs(exportFile);
  check('UI导出保留原题和修改记录',JSON.parse(fs.readFileSync(exportFile)).questions.length===241);
  await row.getByRole('button',{name:'删除',exact:true}).click();await p.locator('#confirm-accept').click();await p.locator('#confirm-dialog').waitFor({state:'hidden'});
  const sample={...bank.questions[0],id:'TEST-IMPORT-UI',title:'隔离导入测试题',approved:true,enabled:true};
  await p.locator('#import-questions').click();await p.locator('#import-form [name=file]').setInputFiles({name:'isolated.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({questions:[sample]}))});
  await adminSubmit(p,'#import-form');await p.locator('#import-dialog').waitFor({state:'hidden'});q=(await api(p,'/api/admin/questions/TEST-IMPORT-UI')).data;check('UI导入不能携带审核批准',!q.approved&&!q.enabled);
  await p.locator('#question-filters [name=search]').fill('TEST-IMPORT-UI');await adminSubmit(p,'#question-filters');await p.locator('[data-question="TEST-IMPORT-UI"]').getByRole('button',{name:'删除',exact:true}).click();await p.locator('#confirm-accept').click();await p.locator('#confirm-dialog').waitFor({state:'hidden'});
  await p.screenshot({path:path.join(out,'admin-questions-desktop.png'),fullPage:true});screenshots.push('admin-questions-desktop.png');
  await adminView(p,'levels');await p.locator('[data-level="red-1"] [name=name]').fill('红色故事启程');await adminSubmit(p,'form[data-theme="red"]');check('关卡名称已存储',(await api(p,'/api/admin/levels/red-1')).data.name==='红色故事启程');
  await adminView(p,'basic');check('空封面预留稳定预览空间',await p.locator('#basic-preview').evaluate(el=>el.getBoundingClientRect().height===144));await p.locator('#basic-form [name=name]').fill('乡村知识之旅');await p.locator('#basic-form > .form-grid [name=cover]').fill('/images/v2-style03/wetland-observation.jpg');await p.locator('#theme-configs [data-theme="culture"] [name=enabled]').uncheck();await adminSubmit(p,'#basic-form');
  await go();check('后台主题停用实际影响玩家入口',await page.evaluate(()=>app.catalog.config.name==='乡村知识之旅'&&app.configuredImages.cover&&!app.input.targets.some(t=>t.id==='theme-culture')));
  await tap('theme-red');await tap('level-1');check('后台关卡名进入玩家准备页',await page.evaluate(()=>app.catalog.levels.find(l=>l.id==='red-1').name==='红色故事启程'));await tap('back');await tap('back');
  await p.locator('#theme-configs [data-theme="culture"] [name=enabled]').check();await p.locator('#basic-form [name=name]').fill('趣味闯关');await p.locator('#basic-form > .form-grid [name=cover]').fill('');await adminSubmit(p,'#basic-form');
  await adminView(p,'revive');await p.locator('#revive-form [name=shareText]').fill('隔离分享配置验证');await adminSubmit(p,'#revive-form');check('复活文案保存',(await api(p,'/api/admin/config')).data.revive.shareText==='隔离分享配置验证');
  await adminView(p,'points');await p.locator('#points-form [name=seconds]').fill('30');await adminSubmit(p,'#points-form');check('恢复初始值不自动重新批准目录变更',(await api(p,'/api/admin/config')).data.approval.status==='unapproved');
  await adminView(p,'operations');check('缺少同步端时不允许伪同步',await p.locator('#retry-sync').isDisabled());check('操作有审计记录',(await api(p,'/api/admin/audit')).data.entries.length>=10);
  for(const [width,height]of [[1366,900],[375,812],[320,568]]){await p.setViewportSize({width,height});await adminView(p,'overview');check(width+'后台无页面横溢出',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const name='admin-overview-'+width+'.png';await p.screenshot({path:path.join(out,name),fullPage:true});screenshots.push(name);}
  await p.locator('#logout').click();await p.locator('#login-screen').waitFor({state:'visible'});check('后台退出保留玩家300分',(await api(page,'/api/me')).data.points===300);
}
(async()=>{
  try {
    instance=await start({port:0,dbPath:path.join(temp,'quiz.sqlite'),credentialPath:path.join(temp,'credentials.json'),adminCredentials,mode:'experience'});
    base='http://127.0.0.1:'+instance.server.address().port;
    browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
    context=await browser.newContext({viewport:{width:375,height:812}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await go();await geometry('首页');await shot('home-375');
    check('全部四主题16关题库可体验',await page.evaluate(()=>app.catalog.levels.length===16&&app.catalog.levels.every(l=>l.availableQuestions>=10)));
    check('源库审核未伪造通过',bank.questions.every(q=>q.enabled===false));
    for(const themeId of ['red','culture','industry','ecology']){
      await tap('theme-'+themeId);await tap('level-1');await shot(themeId+'-ready');await tap('ready-start');await ready();
      for(let order=1;order<=4;order++){
        check('开始正确关卡 '+themeId+'-'+order,await page.evaluate(id=>app.online.levelId===id,themeId+'-'+order));
        if(order===1){await geometry('答题页');await shot(themeId+'-quiz');}
        await finish();check('服务端进度更新 '+themeId+'-'+order,await page.evaluate(({themeId,order})=>app.themeProgress[themeId].completed>=order,{themeId,order}));
        if(order===1||order===4)await shot(themeId+'-result-'+order);
        await tap('next');
        if(order<4){check('下一关准备页',await page.evaluate(()=>app.router.current.name==='level-ready'));await tap('ready-start');await ready();}
        else {await ready();check('主题四关后查看已获得主题证书',await page.evaluate(themeId=>app.router.current.name==='certificates'&&app.certificates.some(c=>c.themeId===themeId),themeId));await shot(themeId+'-complete-certificates');await tap('certificates-back');}
      }
      check('一次返回首页',await page.evaluate(()=>app.router.current.name==='home'));
    }
    check('16关合计300积分',await page.evaluate(()=>app.me.points===300));await shot('all-completed-home');
    await page.reload();await ready();check('刷新后服务器恢复全部进度积分',await page.evaluate(()=>app.me.points===300&&Object.values(app.themeProgress).every(p=>p.completed===4)));
    await tap('ranking');await ready();await shot('rankings-day');check('榜单真实16关',await page.evaluate(()=>app.rankings.entries.some(e=>e.isMe&&e.completedLevels===16&&e.accuracy===1)));
    await tap('ranking-total');await ready();check('总榜可切换',await page.evaluate(()=>app.rankings.period==='total'));await tap('ranking-back');
    await tap('certificates');await ready();check('四主题与总证书全发放',await page.evaluate(()=>app.certificates.length===5));await shot('certificates-375');
    const cert=await page.evaluate(()=>app.certificates[0]);const download=page.waitForEvent('download');await tap('certificate-'+cert.id);const saved=await download;await saved.saveAs(path.join(out,'verified-certificate.svg'));check('证书内容来自该账号',fs.readFileSync(path.join(out,'verified-certificate.svg'),'utf8').includes('乡村探索者'));await tap('certificates-back');
    // Replaying an already completed level uses real answers and never awards again.
    await tap('theme-red');await tap('level-1');await tap('ready-start');await ready();await finish();check('重玩不重复积分',await page.evaluate(()=>app.online.result.points===0&&app.me.points===300));await tap('next');await tap('back');await tap('back');
    // Player and administrator sessions must coexist; CRUD works through the UI.
    const admin=await context.newPage();admin.on('pageerror',e=>errors.push(e.message));await admin.goto(base+'/web/admin.html');
    if(await admin.locator('input[name="username"]').count()){
      await admin.locator('input[name="username"]').fill(adminCredentials.username);await admin.locator('input[name="password"]').fill(adminCredentials.password);await admin.locator('button[type="submit"]').first().click();
      await admin.waitForFunction(()=>document.querySelector('#admin-screen')?.hidden===false);
    } else {await api(admin,'/api/auth/admin',adminCredentials);await admin.reload();}
    check('管理登录不影响玩家会话',(await api(page,'/api/me')).data?.points===300);
    const overview=await api(admin,'/api/admin/overview');check('五管理模块真实可读',overview.data?.modules.length===5);await admin.screenshot({path:path.join(out,'admin-overview.png'),fullPage:true});screenshots.push('admin-overview.png');
    await verifyAdmin(admin);await admin.close();
    for(const [width,height]of [[320,568],[375,812],[414,896],[430,932],[1024,768]]){
      await page.setViewportSize({width,height});await go();await geometry(width+'首页');await shot('home-'+width);
      await tap('ranking');await ready();await geometry(width+'排行榜');await shot('ranking-'+width);await tap('ranking-back');
      await tap('certificates');await ready();await geometry(width+'证书');await shot('certificates-'+width);await tap('certificates-back');
      await tap('settings');await geometry(width+'设置');await shot('settings-'+width);await tap('toggle-sound');check('音效开关实际变化',await page.evaluate(()=>app.soundEnabled===false));await tap('toggle-sound');await tap('settings-back');
    }
    await tap('settings');await tap('toggle-motion');await page.reload();await ready();check('减少动画设置跨刷新保存',await page.evaluate(()=>app.reducedMotion));
    await tap('theme-red');await tap('level-1');await tap('ready-start');await ready();
    const current=await page.evaluate(()=>app.online.question),correct=answers.get(current.id);await page.locator('[data-quiz-id="option-'+correct+'"]').focus();await page.keyboard.press('Enter');check('键盘选择正确选项',await page.evaluate(i=>app.selected===i,correct));
    await context.setOffline(true);await tap('confirm');await page.waitForFunction(()=>!!app.connectionError&&!app.busy);await shot('offline-retry');await context.setOffline(false);await page.locator('#connection-notice button').click();await ready();check('断网重试恢复一次作答',await page.evaluate(()=>app.online.state==='feedback'));
    await tap('confirm');await ready();let dropped=false;await page.route('**/api/challenges/*/answer',async route=>{if(dropped){await route.continue();return;}dropped=true;await route.fetch();await route.abort('failed');});
    const committed=await page.evaluate(()=>app.online.question),selected=answers.get(committed.id);await tap('option-'+selected);await tap('confirm');await page.waitForFunction(()=>!!app.connectionError&&!app.busy);await page.locator('#connection-notice button').click();await ready();
    check('提交成功响应丢失后重试不重复计次',(await instance.app.store.get('challenges',await page.evaluate(()=>app.online.id))).answers.length===2);await page.unroute('**/api/challenges/*/answer');
    await context.clearCookies();await page.reload();await ready();check('会话失效通过本机凭据恢复300分',await page.evaluate(()=>app.me.points===300));
    await api(page,'/api/auth/logout',{scope:'player'});await tap('ranking');await page.waitForFunction(()=>app.router.current.name==='error'&&!app.busy);await shot('session-expired');
    await page.locator('#connection-notice button').click();await ready();check('游戏运行中会话失效单次重试恢复同一进度',await page.evaluate(()=>app.router.current.name==='home'&&app.me.points===300&&app.readyRemote&&app.toastUntil===0));await shot('session-restored');
    // Isolated new player: real wrong -> explicit test revival -> wrong -> daily lock.
    const failContext=await browser.newContext({viewport:{width:320,height:568}});const original=page;page=await failContext.newPage();page.on('pageerror',e=>errors.push(e.message));await go();await tap('theme-ecology');await tap('level-1');await tap('ready-start');await ready();await answerCurrent(true);
    check('首错进入复活且不泄露答案',await page.evaluate(()=>app.online.state==='revive'&&app.online.feedback.answer===null));await geometry('320复活弹窗');await shot('revive-320');await tap('revive-share');await page.locator('#test-revive').click();await ready();check('一次测试复活恢复原题',await page.evaluate(()=>app.online.state==='answering'&&app.online.reviveUsed));await answerCurrent(true);
    check('第二错仅当前关今日锁定',await page.evaluate(()=>app.online.state==='locked'&&app.themeProgress.ecology.nodes[0]==='today-locked'&&app.themeProgress.red.nodes[0]==='current'));await shot('locked-320');await tap('locked-back');await tap('back');await tap('theme-red');await tap('level-1');await tap('ready-start');await ready();
    const active=await page.evaluate(()=>({id:app.online.id,deadline:app.online.deadline,question:app.online.question.id}));await tap('quiz-exit');await tap('exit-confirm');await ready();await page.reload();await ready();await tap('practice');await ready();
    check('退出刷新后恢复原题与原截止时间',await page.evaluate(expected=>app.online.id===expected.id&&app.online.question.id===expected.question&&app.online.deadline===expected.deadline&&app.online.state==='answering',active));await shot('restored-320');
    await failContext.close();page=original;
    check('运行无浏览器异常',errors.length===0);
  } catch(e) {failure=e.stack;try{await shot('failure')}catch(_){} }
  finally {
    if(browser)await browser.close();if(instance)await instance.close();fs.rmSync(temp,{recursive:true,force:true});
    const report={date:new Date().toISOString(),...identity(),passed:!failure,checks,errors,failure,screenshots,scope:'真实HTTP + SQLite + Chrome操作；四主题16关160题、300分、5证书、重玩、双会话、响应式、一次复活与日锁、退出恢复。答案由测试进程读取源库，不注入客户端。未替代微信真机或目标玩家质量验收。'};
    fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({passed:report.passed,checks:checks.length,screenshots:screenshots.length,failure}));if(failure)process.exitCode=1;
  }
})();
