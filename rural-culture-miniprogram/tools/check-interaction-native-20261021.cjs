'use strict';
// Actual native renderer; constrained sizes and fixed service clock belong only to this fixture.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/interaction-20261021');fs.mkdirSync(out,{recursive:true});const checks=[];
async function call(tool,args=[]){fs.writeFileSync(path.join(out,'native-last-operation.json'),JSON.stringify({tool,args,at:new Date().toISOString()}));return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let text='';c.stdout.on('data',b=>text+=b);c.stderr.on('data',b=>text+=b);const t=setTimeout(()=>{c.kill();reject(Error(tool+' timeout'));},55000);c.on('close',code=>{clearTimeout(t);let r;try{r=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1));}catch{return reject(Error(text.slice(0,800)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||r.result?.error||text.slice(0,800)));resolve(r.result);});});}
async function evaluate(fn){let r=await call('automation_evaluate',['--fn-source',fn]);for(let i=0;i<6&&r&&r.result!==undefined;i++)r=r.result;return r;}
const trigger=(selector,type)=>call('automation_element_action',['--action','trigger','--selector',selector,'--type',type,'--detail',JSON.stringify({touches:[{clientX:100,clientY:450}],changedTouches:[{clientX:100,clientY:450}]}),'--wait-for-selector',selector]);
function css(s,size){return s.replace(/@media\s*\(max-width:(\d+)px\)/g,(_,n)=>size.w<=Number(n)?'@media(min-width:0px)':'@media(max-width:0px)').replace(/([\d.]+)rpx\b/g,(_,n)=>(Number(n)*size.w/750)+'px').replace(/([\d.]+)v([wh])\b/g,(_,n,a)=>(Number(n)*(a==='w'?size.w:size.h)/100)+'px');}
function stage(size){for(const dir of ['pages/game','components/game-button','components/mascot-actor'])for(const name of fs.readdirSync(path.join(root,'miniprogram',dir)).filter(x=>x.endsWith('.wxss'))){let s=css(fs.readFileSync(path.join(root,'miniprogram',dir,name),'utf8'),size);if(dir==='pages/game'&&name==='index.wxss')s+='\n.game-device{width:'+size.w+'px!important;height:'+size.h+'px!important;max-width:none!important;margin:0!important;transform-origin:0 0}\n';fs.writeFileSync(path.join(project,'miniprogram',dir,name),s);}
 const info={windowWidth:size.w,windowHeight:size.h,screenWidth:size.w,screenHeight:size.h,statusBarHeight:size.status,safeArea:{top:size.status,left:0,right:size.w,bottom:size.h-size.safe,width:size.w,height:size.h-size.safe-size.status}},menu={left:size.w-94,right:size.w-7,top:size.status+6,bottom:size.status+38,width:87,height:32};
 const s=fs.readFileSync(path.join(root,'miniprogram/pages/game/index.js'),'utf8'),from='const i=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync(),m=homeLayout.metrics(i,wx.getMenuButtonBoundingClientRect?wx.getMenuButtonBoundingClientRect():null,skin.gameId);';assert(s.includes(from));fs.writeFileSync(path.join(project,'miniprogram/pages/game/index.js'),s.replace(from,'const i='+JSON.stringify(info)+',m=homeLayout.metrics(i,'+JSON.stringify(menu)+',skin.gameId);'));
}
function save(){fs.writeFileSync(path.join(out,'native-checks.json'),JSON.stringify({passed:checks.every(c=>c.passed),scope:'WeChat native renderer, real WXML touch bindings and actual Page/component methods in isolated review project. Container sizes and window metrics injected; host simulator 390x844. No physical iPhone/Android acceptance.',checks},null,2)+'\n');}
(async()=>{try{
 await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);
 await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme=ecology&review=1&controls=0&scenario=quiz']);
 await trigger('.option','touchstart');const binding=await evaluate('function(){const p=getCurrentPages().slice(-1)[0];return {key:p.data.pressedKey};}');assert(binding.key.startsWith('press-14-'));await trigger('.option','touchcancel');const canceled=await evaluate('function(){return {key:getCurrentPages().slice(-1)[0].data.pressedKey};}');assert.equal(canceled.key,'');checks.push({name:'native WXML touchstart and touchcancel bindings',passed:true});save();
 const component=await evaluate('async function(){const p=getCurrentPages().slice(-1)[0];p.action({currentTarget:{dataset:{action:"option",index:0}}});const b=p.selectComponent("#footer-primary");if(!b||!b._press)throw Error("component feedback not attached");for(let i=0;i<100;i++){b.touchStart({touches:[{clientX:100,clientY:760}]});if(!b.data.touching)throw Error("lost component press "+i);b.touchEnd();b.touchCancel();}return {touching:b.data.touching,cycles:100};}');assert.equal(component.touching,false);checks.push({name:'native shared button attached and responds to 100 press cycles',passed:true,...component});save();
 for(const size of [{w:320,h:568,status:20,safe:0},{w:375,h:812,status:44,safe:34},{w:430,h:932,status:59,safe:34}]){
 stage(size);await call('simulator_refresh');await call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);
 for(const theme of ['ecology','red','culture','industry']){
 await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario=quiz']);
 const result=await evaluate(`async function(){
 const p=getCurrentPages().slice(-1)[0],delay=ms=>new Promise(r=>setTimeout(r,ms));
 const measure=()=>new Promise(resolve=>{const sels=['.game-device','.panel-scroll-frame','.panel-body','.panel-body-inner','.panel-footer','.options','.option','.option-text','.option.is-touching'],q=wx.createSelectorQuery();sels.forEach(s=>q.selectAll(s).boundingClientRect());q.exec(r=>resolve(Object.fromEntries(sels.map((s,i)=>[s,r[i]]))));});
 await delay(120);const before=await measure();let presses=0,renderedPresses=0;
 for(let i=0;i<100;i++){
  const index=i%8<4?0:i%4,key='press-14-'+index,e={currentTarget:{dataset:{action:'option',index,pressKey:key}},touches:[{clientX:100,clientY:450}]};
  p.pressStart(e);if(p.data.pressedKey!==key)throw Error('lost press '+i);p.pressEnd();await p.action(e);if(p.data.pressedKey!==key)throw Error('refresh erased press '+i);presses++;
  await delay(i===0||i===49||i===99?40:8);if(i===0||i===49||i===99){const r=await measure();if(r['.option.is-touching'].length===1)renderedPresses++;}
  await delay(8);
 }
 await delay(120);if(p.data.pressedKey!=='')throw Error('stuck final press');const after=await measure();
 // Long text changes only presentation in the disposable fixture.
 const labels=['这是一段需要在较窄屏幕中完整换行显示的长选项，用于检查点击后文字与按钮不会相互遮挡，也不会横向超出答题区域。','自然生态保护与乡村发展','茶树','柑橘'];
 p.setData({'challenge.question.options':labels,options:labels.map((text,index)=>({index,letter:String.fromCharCode(65+index),text,selected:index===0}))});await delay(150);const long=await measure();
 const e={currentTarget:{dataset:{action:'option',index:0,pressKey:'press-14-0'}},touches:[{clientX:100,clientY:450}]};p.pressStart(e);await delay(35);const pressed=await measure();p.cancelPress();await delay(100);
 return {theme:p.data.skin.gameId,presses,renderedPresses,optionHeight:p.data.optionHeight,before,after,long,pressed};
 }`);
 const issues=[],test=(yes,label)=>{if(!yes)issues.push(label);};test(result.presses===100&&result.renderedPresses===3,'100 presses plus native pressed class');
 test(result.long['.option'].slice(1).every(r=>r.height<=57),'short options retain natural height next to long answer');
 test(result.before['.option'].every((r,i)=>Math.abs(r.height-result.after['.option'][i].height)<.5),'row sizes stable after 100 selections');
 for(const [phase,rect] of Object.entries({before:result.before,after:result.after,long:result.long,pressed:result.pressed})){
 const body=rect['.panel-body'][0],box=rect['.game-device'][0];test(rect['.option'].every(r=>r.left>=body.left-.5&&r.right<=body.right+.5&&r.left>=box.left&&r.right<=box.right),phase+' horizontal bounds');
 test(rect['.option-text'].every((r,i)=>r.top>=rect['.option'][i].top&&r.bottom<=rect['.option'][i].bottom+.5),phase+' text inside button');
 test(rect['.panel-scroll-frame'][0].bottom<=rect['.panel-footer'][0].top+1,phase+' scroll does not overlap fixed footer');
 }
 await call('automation_element_action',['--action','scrollTo','--selector','.panel-body','--x','0','--y','9999']);
 const scrolled=await evaluate('function(){return new Promise(resolve=>{const q=wx.createSelectorQuery();q.select(".panel-body").boundingClientRect();q.selectAll(".option").boundingClientRect();q.exec(r=>resolve({body:r[0],options:r[1]}));});}');test(scrolled.options.at(-1).bottom<=scrolled.body.bottom+1,'last long option fully reachable above footer');
 const scale=Math.min(1,390/size.w,844/size.h);if(scale<1){const data=await call('automation_page_action',['--action','getData','--data-path','shellStyle']);await call('automation_page_action',['--action','setData','--patch',JSON.stringify({shellStyle:data.data+';transform:scale('+scale+');'})]);}
 const screenshot=theme+'-'+size.w+'-selected-long.png';await call('simulator_screenshot',['--path',path.join(out,screenshot),'--optimize','false','--wait-for-selector','.option.selected']);
 checks.push({name:theme+' '+size.w+'x'+size.h,theme,size,passed:issues.length===0,issues,result,scrolled,screenshot,screenshotScale:scale});save();console.log((issues.length?'FAIL ':'PASS ')+theme+' '+size.w+' '+issues.join(', '));
 }
 }
 }finally{for(const dir of ['pages/game','components/game-button','components/mascot-actor'])for(const file of fs.readdirSync(path.join(root,'miniprogram',dir)).filter(x=>x.endsWith('.wxss')))fs.copyFileSync(path.join(root,'miniprogram',dir,file),path.join(project,'miniprogram',dir,file));fs.copyFileSync(path.join(root,'miniprogram/pages/game/index.js'),path.join(project,'miniprogram/pages/game/index.js'));await call('simulator_refresh');}
 if(checks.some(c=>!c.passed))process.exitCode=1;
})().catch(e=>{fs.writeFileSync(path.join(out,'native-error.txt'),e.stack);console.error(e);process.exitCode=1;});
