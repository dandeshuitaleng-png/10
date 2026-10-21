'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const designs=require('../miniprogram/services-v4/home-designs');
const home=require('../miniprogram/services-v4/home-layout');
const {layout}=require('../miniprogram/services-v4/journey');
const {environment}=require('./v4-page.cjs');
test('new homepage selection is review-only unless explicitly configured',()=>{
 for(const key of ['map','guide']){
  assert.equal(designs.resolve({}, {homeDesign:key},false),'current');
  assert.equal(designs.resolve({}, {homeDesign:key},true),key);
  assert.equal(designs.resolve({homeDesign:key},{},false),key);
  const env=environment({query:{review:'1',homeDesign:key}});
  assert.equal(env.page.data.homeDesign,'current');
 }
 assert.equal(designs.resolve({}, {homeDesign:'unknown'},true),'current');
});
test('current production geometry is unchanged',()=>{
 const base=home.metrics({windowWidth:375,windowHeight:812});
 assert.deepEqual(designs.metrics(base,'current'),{mapWidth:375,mapViewport:base.mapViewport,style:''});
});
test('A retains the original art ratio and visible current chapter at three widths',()=>{
 for(const [w,h,status,safe] of [[320,568,20,0],[375,812,44,34],[430,932,59,34]]){
  const base=home.metrics({windowWidth:w,windowHeight:h,statusBarHeight:status,screenHeight:h,safeArea:{bottom:h-safe}});
  for(const design of ['map'])for(const theme of ['red','culture','industry','ecology']){
   const m=designs.metrics(base,design),rows=Array.from({length:4},(_,i)=>({id:'l'+i,status:i===0?'current':'locked'})),j=layout(rows,theme,m.mapWidth,m.mapViewport),node=j.nodes[0],geometry=home.mapMetrics(m.mapWidth);
   assert.equal(m.mapWidth,w);
   assert.equal(j.height,m.mapWidth*1280/750);
   const center=j.height-node.distance-j.focusTop;
   assert.ok(center+45<=m.mapViewport-15);
   assert.ok(center+geometry.nodeHeight/2-(m.mapWidth<=350?48:60)-(m.mapWidth<=350?66:76)>=0,'current figure remains visible');
  }
 }
});

test('B chapter dashboard follows catalog states and counts without scene assets',()=>{
 for(const count of [0,1,4,7,8])for(const width of [320,375,430]){
  const rows=Array.from({length:count},(_,i)=>({id:'l'+i,label:'第'+(i+1)+'关',name:'章节'+i,status:i===0?'current':'locked'}));
  const b=designs.chapters(rows,width,260);assert.equal(b.nodes.length,count);assert.deepEqual(b.tiles,[]);
  if(!count)continue;const current=b.nodes.find(n=>n.featured);assert.equal(current.id,'l0');assert(current.showMascot);assert(current.actorTop>=0&&current.actorBottom<=260);
  for(const n of b.nodes){assert(n.left>=16&&n.left+n.width<=width-15);assert(n.top+n.height<=b.height);if(n.status==='locked')assert(!n.showMascot);}
 }
 for(const status of ['current','today-locked','completed']){
  const b=designs.chapters([{id:'one',status},{id:'two',status:'locked'}],375,300);assert(b.nodes[0].featured&&b.nodes[0].showMascot);assert(!b.nodes[1].showMascot);
 }
});
test('B preserves pose by catalog index when the current chapter changes',()=>{
 const rows=Array.from({length:5},(_,i)=>({id:'l'+i,status:i<2?'completed':i===2?'today-locked':'locked'}));
 const b=designs.chapters(rows,320,260);assert.equal(b.guideId,'l2');assert.equal(b.nodes.find(n=>n.id==='l2').pose,'think');assert.equal(b.nodes.filter(n=>n.showMascot).length,3);
});
test('actual B Page preserves learning, today lock, resume and completion flows',async()=>{
 const env=environment({homeDesign:'guide',levelCount:3});
 assert.equal(env.page.data.homeDesign,'guide');assert.equal(env.page.data.journey.tiles.length,0);
 const first=env.page.data.levels[0].id;
 await env.action('level',{id:first});assert.equal(env.page.data.modal,'rules');
 await env.action('confirm-start');assert.equal(env.page.data.route,'quiz');
 await env.action('option',{index:0});await env.action('submit');await env.action('next');
 env.page.go('home');
 assert.equal(env.page.data.snapshot.progress.completed,1);
 assert(env.page.data.journey.nodes.find(n=>n.id===first).showMascot);
 assert.equal(env.page.data.journey.guideId,env.page.data.levels[1].id);
 assert.equal(env.page.data.journey.nodes.find(n=>n.id===env.page.data.levels[2].id).showMascot,false);
 env.page.onUnload();
});
test('B grows for long chapter names without overlapping the following row',()=>{
 const rows=Array.from({length:8},(_,i)=>({id:'long'+i,name:'认识乡村文化和自然生态的阅读旅程',status:i===0?'current':i<3?'completed':'locked'}));
 for(const width of [320,375,430]){
  const b=designs.chapters(rows,width,300),hero=b.nodes.find(n=>n.featured);assert(hero.height>164);assert.equal(hero.actorBottom-b.focusTop,270);
  const grid=b.nodes.filter(n=>!n.featured);for(let i=2;i<grid.length;i++)assert(grid[i].top>=grid[i-2].top+grid[i-2].height+12);
 }
});
