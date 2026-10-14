const test=require('node:test');
const assert=require('node:assert/strict');
const {Renderer}=require('../js/ui/renderer');
const {createViewport}=require('../js/core/viewport');
const {THEMES,getLevels}=require('../js/data/themes');
function context(){const calls=[];return new Proxy({calls,drawImage(...a){calls.push(a)},measureText:s=>({width:String(s).length*15})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}
const sizes=[[320,568],[375,812],[414,896],[430,932]];
test('四主题各关准备页实际裁切不拉伸、不越出源图，规则与操作分区保持安全',()=>{
 for(const [width,height] of sizes) for(const theme of THEMES) for(const level of getLevels(theme.id)){
  const v=createViewport({windowWidth:width,windowHeight:height,statusBarHeight:44,safeArea:{top:44,bottom:height-12}},{bottom:56});
  const ctx=context(),r=new Renderer(ctx),image={width:750,height:1125};
  const states=['current','locked','locked','locked'],before=JSON.stringify(states);
  const targets=r.render({name:'level-ready',params:{themeId:theme.id,levelId:level.id}},v,{images:{['map-'+theme.id]:image},nodeStates:states});
  const g=r.layout.ready,src=g.source;
  assert.ok(src&&src.sw>0&&src.sh>0);
  assert.ok(src.sx>=0&&src.sy>=0&&src.sx+src.sw<=image.width+.001&&src.sy+src.sh<=image.height+.001);
  const draw=ctx.calls.find(a=>a[0]===image&&a.length===9&&Math.abs(a[5]-g.hero.x)<.001&&Math.abs(a[6]-g.hero.y)<.001&&Math.abs(a[7]-g.hero.w)<.001&&Math.abs(a[8]-g.hero.h)<.001);
  assert.ok(draw,'selected landmark is actually drawn');
  assert.ok(Math.abs(draw[3]/draw[4]-draw[7]/draw[8])<.001,'source and destination aspects agree');
  assert.ok(g.hero.y>=g.content.top-.001&&g.panel.y>=g.hero.y+g.hero.h);
  assert.ok(g.panel.y+g.panel.h<=g.content.bottom+g.scrollMax+.001,'rules fit or remain reachable by scrolling');
  const firstButton=Math.min(...targets.map(t=>t.y));
  assert.ok(g.noticeY+20<=firstButton,'availability notice never overlaps an action');
  assert.ok(targets.find(t=>t.id==='ready-start').disabled);
  assert.equal(JSON.stringify(states),before,'visual crop must not change progress');
 }
});
test('场景图缺失时准备页保留规则和禁用开始，有可用返回及生态独立试玩',()=>{
 for(const theme of THEMES){
  const r=new Renderer(context()),v=createViewport({windowWidth:320,windowHeight:568,statusBarHeight:44});
  const targets=r.render({name:'level-ready',params:{themeId:theme.id,levelId:theme.id+'-1'}},v,{images:{}});
  assert.equal(r.layout.ready.source,null);
  assert.ok(targets.find(t=>t.id==='back'&&!t.disabled));
  assert.ok(targets.find(t=>t.id==='ready-start'&&t.disabled));
  assert.equal(!!targets.find(t=>t.id==='ready-practice'),theme.id==='ecology');
 }
});
