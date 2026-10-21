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
test('both directions retain the original art ratio and a visible current chapter at three widths',()=>{
 for(const [w,h,status,safe] of [[320,568,20,0],[375,812,44,34],[430,932,59,34]]){
  const base=home.metrics({windowWidth:w,windowHeight:h,statusBarHeight:status,screenHeight:h,safeArea:{bottom:h-safe}});
  for(const design of ['map','guide'])for(const theme of ['red','culture','industry','ecology']){
   const m=designs.metrics(base,design),rows=Array.from({length:4},(_,i)=>({id:'l'+i,status:i===0?'current':'locked'})),j=layout(rows,theme,m.mapWidth,m.mapViewport),node=j.nodes[0],geometry=home.mapMetrics(m.mapWidth);
   assert.equal(m.mapWidth,w-(design==='guide'?36:0));
   assert.equal(j.height,m.mapWidth*1280/750);
   const center=j.height-node.distance-j.focusTop;
   assert.ok(center+45<=m.mapViewport-15);
   assert.ok(center+geometry.nodeHeight/2-(m.mapWidth<=350?48:60)-(m.mapWidth<=350?66:76)>=0,'current figure remains visible');
  }
 }
});
