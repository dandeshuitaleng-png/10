'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {start}=require('../server/start.cjs');
const {identity}=require('./lib/runtime-evidence.cjs');
const bank=require('../design/content-intake/current/bank.json'),out=path.resolve(__dirname,'../design/full-development/evidence');
const questions=bank.questions.filter(q=>Number(q.id.split('-').pop())<=10),answers=new Map(questions.map(q=>[q.id,q.answer]));
const checks=[],errors=[],screenshots=[];let instance,browser,page,failure;
function check(name,pass){checks.push({name,pass:!!pass});if(!pass)throw Error(name);}
async function ready(){await page.waitForFunction(()=>app.readyRemote&&!app.busy);}
async function tap(id){for(let n=0;n<20;n++){await page.waitForTimeout(35);const m=await page.evaluate(id=>({t:app.input.targets.find(t=>t.id===id),s:app.viewport.scale,r:app.renderer.scrollRegion}),id),c=await page.locator('canvas').boundingBox();if(m.t){await page.mouse.click(c.x+(m.t.x+m.t.w/2)*m.s,c.y+(m.t.y+m.t.h/2)*m.s);await page.waitForTimeout(35);return;}if(!m.r)throw Error('缺少控件'+id);await page.mouse.move(c.x+(m.r.x+m.r.w*.9)*m.s,c.y+(m.r.y+m.r.h*.75)*m.s);await page.mouse.wheel(0,100);}throw Error('无法滚到控件'+id);}
async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});screenshots.push(name+'.png');}
(async()=>{try{
  instance=await start({port:0,dbPath:':memory:',mode:'experience',seedBank:{questions},adminCredentials:{username:'media-test',password:crypto.randomBytes(24).toString('base64url')}});
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});page=await browser.newPage({viewport:{width:320,height:568}});page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:'+instance.server.address().port;await page.goto(base+'/web/play.html');await ready();await tap('theme-ecology');await tap('level-1');await tap('ready-start');await ready();
  let images=0,videos=0;
  for(let level=1;level<=3;level++){
    for(let n=0;n<10;n++){
      const q=await page.evaluate(()=>app.online.question);
      if(q.media?.type==='image'){
        if(images===0){await page.route('**/wetland-observation.jpg',route=>route.abort());await page.reload();await ready();await tap('practice');await ready();await page.waitForFunction(()=>app.mediaFailed);await shot('image-failed-320');await page.unroute('**/wetland-observation.jpg');await tap('media-retry');}
        await page.waitForFunction(()=>app.mediaImage&&app.mediaStatus==='ready');check('题目配图实际加载并保留示意说明',q.media.caption.includes('示意'));await shot('image-question-'+level);images++;
      }
      if(q.media?.type==='video'){
        const deadline=await page.evaluate(()=>app.online.deadline);await tap('play-video');const video=page.locator('#video-dialog video');await video.waitFor();await video.evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('#video-dialog video').currentTime>1.2);check('原创动画实际可播放',await video.evaluate(v=>v.duration>=5&&v.videoWidth===640));check('看视频仍保留原截止时间',await page.evaluate(d=>app.online.deadline===d,deadline));await shot('video-playing-320');await page.locator('#video-dialog [data-close]').click();await page.waitForFunction(()=>{const v=document.querySelector('#video-dialog video');return v.paused&&!v.getAttribute('src');});check('视频关闭后释放播放资源',true);videos++;
      }
      await tap('option-'+answers.get(q.id));await tap('confirm');await ready();if(n<9){await tap('confirm');await ready();}
    }
    check('媒体关卡真实完成'+level,await page.evaluate(()=>app.online.state==='completed'));if(level<3){await tap('next');await tap('ready-start');await ready();}
  }
  check('两张相关配图和一个原创视频已覆盖',images===2&&videos===1);check('浏览器无运行异常',errors.length===0);
}catch(e){failure=e.stack;try{await shot('media-failure')}catch(_){}}finally{
  if(browser)await browser.close();if(instance)await instance.close();const report={date:new Date().toISOString(),...identity(),passed:!failure,checks,errors,screenshots,failure,scope:'隔离库每关保留10道原题，保证媒体题被抽到；实际浏览器操作30题，验证图片失败重试、视频解码播放与关闭、服务端计时。未替代微信真机。'};
  fs.writeFileSync(path.join(out,'media-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:checks.length,failure}));if(failure)process.exitCode=1;
}})();
