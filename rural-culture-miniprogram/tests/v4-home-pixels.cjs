'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {layout}=require('../miniprogram/services-v4/journey');
const home=require('../miniprogram/services-v4/home-layout');
const designs=require('../miniprogram/services-v4/home-designs');
const pageSource=fs.readFileSync(require.resolve('../miniprogram/pages/game/index.js'),'utf8');
function resizePage(gameId,info){let page;const filename=require.resolve('../miniprogram/pages/game/index.js');vm.runInNewContext(pageSource,{Page:d=>{page=d},require:id=>id.endsWith('game-config')?{gameId}:id.endsWith('services-v4/index')?{profile:()=>({})}:require(path.resolve(path.dirname(filename),id)),wx:{getWindowInfo:()=>info}});page.data=structuredClone(page.data);page.setData=p=>Object.assign(page.data,p);page.resize();return page.data;}
test('实际Page.resize四主题共用完整标题区域，覆盖三个视口',()=>{
 for(const [width,height] of [[320,568],[375,812],[430,932]]){
  const i={windowWidth:width,windowHeight:height,screenHeight:height,statusBarHeight:44,safeArea:{bottom:height-34}};
  const all=['culture','red','industry','ecology'].map(id=>resizePage(id,i));
  const m=home.metrics(i);for(const p of all){assert.equal(p.mapViewport,designs.metrics(m,'map').mapViewport);assert.equal(p.shellStyle,all[0].shellStyle);}
 }
});
test('390×844原生屏幕：A地图294至738、标题与操作区可达，水纹不越出标题区域',()=>{
 const p=resizePage('industry',{windowWidth:390,windowHeight:844,screenHeight:844,statusBarHeight:47,safeArea:{bottom:810}});
 assert.equal(p.mapViewport,444);assert.ok(p.shellStyle.includes('--home-title-h:119px'));assert.equal(294+p.mapViewport,738);
});
test('不同进度和短屏按实际卡片边界定位，保留16px下方间距',()=>{
 for(const [width,height] of [[320,568],[375,812],[430,932]])for(const game of ['culture','red','industry','ecology'])for(const state of [0,2,'locked','complete']){
  const p=resizePage(game,{windowWidth:width,windowHeight:height,screenHeight:height,statusBarHeight:44,safeArea:{bottom:height-34}});
  const rows=Array.from({length:4},(_,i)=>({id:'l'+i,status:state==='complete'?'completed':state==='locked'?(i<2?'completed':i===2?'today-locked':'locked'):i<state?'completed':i===state?'current':'locked'}));
  const r=layout(rows,game,width,p.mapViewport),focus=r.nodes.find(n=>n.id===r.guideId)||r.nodes.at(-1);
  const scale=Math.max(88/96,Math.min(110/96,width/375)),nodeHeight=Math.round(86*scale),center=r.height-focus.distance;
  const bottom=center+Math.max(nodeHeight/2,45)-r.focusTop;
  assert.ok(bottom<=p.mapViewport-15,'focus card is clipped at bottom');
  const guideHeight=width<=350?75:87,guideBottom=width<=350?48:60;
  const top=r.guideId?center+nodeHeight/2-guideBottom-guideHeight-r.focusTop:center-45-r.focusTop;
  assert.ok(top>=0,'focus guide is clipped at top');
  assert.ok(r.focusTop>=0&&r.focusTop<=Math.max(0,r.height-p.mapViewport));
 }
});
test('宽横幅布局下当前产业关卡仍保留16px底部间距',()=>{
 const rows=Array.from({length:4},(_,i)=>({id:'l'+i,status:i===0?'current':'locked'})),r=layout(rows,'industry',390,497);
 const bottom=r.height-r.nodes[0].distance+45-r.focusTop;
 assert.ok(bottom<=497-15);assert.equal(r.focusTop,130);
});
test('浏览器WXSS导入器会内联实际共享样式，保持与原生的加载顺序',async()=>{
 const source=fs.readFileSync(require.resolve('../preview/v4-runtime.js'),'utf8');
 const start=source.indexOf('  async function readStyle('),end=source.indexOf('  async function loadStyle(',start);
 const path=require('node:path');
 const context={fetchText:async file=>fs.readFileSync(path.join(__dirname,'..',file.replace(/^\/miniprogram\//,'miniprogram/')),'utf8'),normalize:file=>path.posix.normalize(file)};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+';this.read=readStyle;',context);
 const css=await context.read('/miniprogram/pages/game/index.wxss');
 assert.ok(!css.includes('@import'));assert.ok(css.includes('.game-device.activity-page.home-layout .activity-header'));
 assert.ok(css.lastIndexOf('height:var(--home-header-h)')>css.indexOf('height:160px'));
});

test('四主题标题保留屏幕中轴和光学基线，所有可见素材均位于标题区内',()=>{
 for(const width of [320,375,390,430])for(const left of [width-94,width-110]){
  const m=home.metrics({windowWidth:width,windowHeight:812,statusBarHeight:47},{left,bottom:83});
  assert.ok(m.header<=216);assert.equal(16+m.titleAreaWidth/2,width/2);assert.ok(m.titleArtWidth>=272);
  for(const game of ['culture','red','industry','ecology']){
   const a=home.titleArtwork(game,width,m.titleArtWidth,m.titleCenterY),v=Object.fromEntries(a.frameStyle.split(';').filter(Boolean).map(s=>{const [k,n]=s.split(':');return [k,parseFloat(n)];}));
   assert.ok(Math.abs(16+v.left+v.width/2-width/2)<1e-6);assert.ok(v.top>=0);assert.ok(v.top+v.height<=m.title+.1);
   assert.equal(a.native,false);
  }
 }
});
