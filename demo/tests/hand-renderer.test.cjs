const test=require('node:test'),assert=require('node:assert/strict');
const {HandRenderer}=require('../js/ui/hand-renderer');
const {createViewport}=require('../js/core/viewport');
const {THEMES,getLevels}=require('../js/data/themes');
function context(){const o={font:'16px sans-serif',texts:[],calls:[]};o.measureText=v=>({width:Array.from(String(v)).reduce((n,c)=>n+( /\p{Script=Han}/u.test(c)?1:.55)*(Number(o.font.match(/([\d.]+)px/)?.[1])||16),0)});o.createRadialGradient=o.createLinearGradient=()=>({addColorStop(){}});o.fillText=(v,x,y)=>o.texts.push(String(v));o.drawImage=(...args)=>o.calls.push(args);return new Proxy(o,{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}
const question={id:'q',themeName:'千年文脉',levelName:'乡土记忆',levelOrder:1,position:3,total:10,title:'湖南桃花源文化与哪位作家的作品密切相关？',options:['沈从文','范仲淹','陶渊明','雷锋']};
const catalog={themes:THEMES,levels:THEMES.flatMap(t=>getLevels(t.id)),config:{background:'#F5F9F7',timer:{seconds:30},revive:{limit:1}}};
const images={'hand-home':{width:1536,height:1024},...Object.fromEntries(['back','clock','points','rank','selected','check','cross'].map(k=>['hand-'+k,{width:96,height:96}]))};
const base={question,catalog,images,remainingSeconds:22,totalPoints:20,themeProgress:{culture:{completed:4,levelIds:['culture-1','culture-2','culture-3','culture-4'],nodes:['complete','complete','complete','complete']}},reviveLimit:1,revivesRemaining:1,mode:'experience',shareReady:true};
function setup(width=375,height=812){const v=createViewport({windowWidth:width,windowHeight:height,pixelRatio:2,statusBarHeight:24,safeArea:{top:24,bottom:height-34}},{bottom:56});const r=new HandRenderer(context());const frame=(name='quiz',view={})=>{r.ctx.texts=[];return r.render({name,params:{themeId:'culture',levelId:'culture-1'}},v,{...base,...view});};return{r,v,frame};}
function safe(targets,v){for(const t of targets){assert.ok(t.w*v.scale>=43.99&&t.h*v.scale>=43.99,t.id+' touch size');assert.ok(t.x>=0&&t.x+t.w<=375+.01,t.id+' width');assert.ok(t.y>=v.top-.01&&t.y+t.h<=v.bottom+.01,t.id+' safe area');}}
test('新首页在320/375/430手机中保留20px边距、52px主按钮和44px热点，矮屏插画完整缩放',()=>{
 for(const [w,h]of[[320,568],[375,812],[430,932]]){const {r,v,frame}=setup(w,h);safe(frame('home'),v);assert.equal(r.layout.home.primary.x*v.scale,20);assert.ok(Math.abs(r.layout.home.primary.h*v.scale-52)<.01);assert.equal(r.layout.home.total,16);assert.equal(r.layout.home.completed,4);assert.equal(r.semanticTargets.filter(t=>t.id==='practice').length,1);assert.ok(!r.targets.some(t=>t.action.type==='theme'));assert.ok(r.layout.home.art.w/r.layout.home.art.h-1.5<.01);r.scrollBy(1e4);safe(frame('home'),v);assert.ok(r.targets.some(t=>t.id==='home-progress'));}
});
test('默认态禁用提交，选中保持独立选择状态，解析仅使用服务端反馈',()=>{
 const {r,frame}=setup();assert.equal(frame().find(t=>t.id==='confirm').disabled,true);frame('quiz',{selected:2});assert.equal(r.targets.find(t=>t.id==='confirm').disabled,false);assert.equal(r.layout.quiz.options[2].state,'selected');assert.ok(!r.ctx.texts.join('').includes('桃花源记'));frame('quiz',{feedback:{question,selected:2,answer:2,right:true,explanation:'服务端知识解析'}});assert.equal(r.layout.quiz.options[2].state,'correct');assert.ok(r.ctx.texts.includes('服务端知识解析'));assert.equal(r.targets.find(t=>t.id==='confirm').action.type,'continue');
});
test('长题与两行以上选项统一增高，滚动后的最后选项在固定提交按钮上方',()=>{
 const {r,v,frame}=setup(320,568),q={...question,title:question.title.repeat(3),options:question.options.map(o=>o.repeat(12))};const first=frame('quiz',{question:q,selected:2});safe(first,v);assert.ok(r.scrollMax>0);assert.equal(new Set(r.layout.quiz.options.map(o=>o.h)).size,1);const fixed=first.find(t=>t.id==='confirm').y;r.scrollBy(1e4);safe(frame('quiz',{question:q,selected:2}),v);assert.equal(r.targets.find(t=>t.id==='confirm').y,fixed);const last=r.layout.quiz.options.at(-1);assert.ok(last.y+last.h<=r.scrollRegion.y+r.scrollRegion.h+.01);assert.ok(last.y+last.h<fixed);assert.ok(r.targets.some(t=>t.id==='option-3'));
});
test('媒体题保留144px完整比例图片，文字题移除媒体区域；失败可重试',()=>{
 const {r,v,frame}=setup(),q={...question,media:{type:'image',src:'/media/x.png'}};frame('quiz',{question:q,mediaImage:{width:1200,height:600}});assert.ok(Math.abs(r.layout.quiz.media.h*v.scale-144)<.01);assert.equal(r.layout.quiz.media.image.w/r.layout.quiz.media.image.h,2);r.scrollBy(100);frame('quiz',{question:q,mediaFailed:true});assert.ok(r.semanticTargets.some(t=>t.id==='media-retry'));frame();assert.equal(r.layout.quiz.media,null);
});
test('320短屏播放视频后关闭按钮保留安全区且只允许关闭视频',()=>{
 const {r,v,frame}=setup(320,568);const ts=frame('quiz',{videoActive:true});safe(ts,v);assert.deepEqual(ts.map(t=>t.id),['close-video']);assert.equal(ts[0].action.type,'close-video');
});
test('长解析允许滚动且固定下一题不变，未通过复活遮罩不泄露答案',()=>{
 const {r,v,frame}=setup(320,568),f={question,selected:2,answer:2,right:true,explanation:'长知识解析'.repeat(30)};frame('quiz',{feedback:f});assert.equal(r.layout.quiz.feedback.inline,true);assert.ok(r.scrollMax>0);r.scrollBy(1e4);safe(frame('quiz',{feedback:f}),v);assert.ok(r.ctx.texts.join('').includes('长知识解析'));const ts=frame('quiz',{modal:'revive',incorrectSelected:1});safe(ts,v);assert.deepEqual(ts.map(t=>t.id),['revive-share','revive-back']);assert.equal(r.layout.revive.answerRevealed,false);assert.ok(!r.ctx.texts.join('').includes('知识解析'));
});
test('后台动态目录与空目录驱动主题入口，不产生写死主题；积分零上限按实际配置显示',()=>{
 const {r,v,frame}=setup(320,568),c={themes:[{id:'custom',name:'后台新增主题',description:'新的内容'}],levels:[{id:'arbitrary-id',themeId:'custom',name:'第一章',questionCount:5}],config:{}};frame('themes',{catalog:c});safe(r.targets,v);assert.deepEqual(r.semanticTargets.filter(t=>t.action.type==='theme').map(t=>t.action.themeId),['custom']);frame('home',{catalog:{themes:[],levels:[],config:{}}});assert.equal(r.layout.home.total,0);assert.equal(r.targets.find(t=>t.id==='practice').disabled,true);frame('points',{dailyPointCap:0});assert.ok(r.ctx.texts.join('').includes('每日上限 0 分'));
});
test('V4.1进度标识遵循目录顺序、稳定ID完成状态及整体读屏热点，12主题可滚动',()=>{
 for(const [width,height] of [[320,568],[375,812],[430,932]]){
  const {r,v,frame}=setup(width,height),c={themes:Array.from({length:12},(_,i)=>({id:'t-'+i,name:'新增主题'+i,order:12-i})),levels:Array.from({length:24},(_,i)=>({id:'l-'+i,themeId:'t-'+Math.floor(i/2),order:i%2+1}))};
  const progress={'t-0':{levelIds:['l-1','l-0'],nodes:['complete','completed']},'t-1':{levelIds:['l-2','l-3'],nodes:['complete','current']}};
  frame('home',{catalog:c,themeProgress:progress});assert.equal(r.layout.home.completed,3);assert.equal(r.layout.home.total,24);assert.equal(r.layout.home.markers.length,12);assert.equal(r.layout.home.markers[0].id,'t-11');
  assert.equal(r.layout.home.markers.find(t=>t.id==='t-0').state,'complete');assert.equal(r.layout.home.markers.find(t=>t.id==='t-1').state,'partial');
  for(const marker of r.layout.home.markers){assert.ok(Math.abs(marker.w*v.scale-24)<.01);assert.ok(marker.x+marker.w<=r.inset()+r.width()+.01);}
  assert.ok(!r.semanticTargets.some(t=>t.id.startsWith('marker-')));r.scrollBy(1e4);safe(frame('home',{catalog:c,themeProgress:progress}),v);assert.match(r.semanticTargets.find(t=>t.id==='home-progress').label,/新增主题0，已完成2 \/ 2关/);
 }
});
test('未读取目录不伪造16关，空目录无完成标识，复活按钮统一52px且资格保持后端约束',()=>{
 const {r,v,frame}=setup(320,568);frame('home',{catalog:null,loadingRemote:true});assert.equal(r.layout.home.total,null);assert.equal(r.layout.home.ready,false);assert.equal(r.layout.home.markers.length,0);assert.ok(r.ctx.texts.includes('正在读取学习进度…'));
 frame('home',{catalog:{themes:[],levels:[]}});assert.ok(r.ctx.texts.includes('主题内容正在准备中'));assert.equal(r.layout.home.completed,0);
 const ts=frame('quiz',{modal:'revive',incorrectSelected:0,revivesRemaining:0,mode:'production'});safe(ts,v);assert.equal(ts.find(t=>t.id==='revive-share').disabled,true);assert.ok(ts.every(t=>Math.abs(t.h*v.scale-52)<.01));assert.equal(r.layout.revive.revivesRemaining,0);assert.equal(r.layout.revive.answerRevealed,false);
});
