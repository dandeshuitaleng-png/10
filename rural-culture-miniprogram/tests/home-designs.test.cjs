'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const designs=require('../miniprogram/services-v4/home-designs');
const home=require('../miniprogram/services-v4/home-layout');
const {layout}=require('../miniprogram/services-v4/journey');
const {environment}=require('./v4-page.cjs');
test('approved A is the only active homepage; stale B links cannot reactivate B',()=>{
 for(const configured of [undefined,'map','guide','current'])for(const query of [undefined,'map','guide','current','unknown'])for(const review of [true,false]){
  assert.equal(designs.resolve({homeDesign:configured},{homeDesign:query},review),'map');
  const env=environment({homeDesign:configured,query:{review:review?'1':'0',homeDesign:query}});
  assert.equal(env.page.data.homeDesign,'map');assert.ok(env.page.data.journey.tiles.length>0);env.page.onUnload();
 }
});
test('mother and four independent projects explicitly use A with review controls disabled',()=>{
 const projects=[['..',null],['../../交付/微信小程序四套/十步芳草','red'],['../../交付/微信小程序四套/千年文脉','culture'],['../../交付/微信小程序四套/金色产业','industry'],['../../交付/微信小程序四套/青山绿水','ecology']];
 for(const [dir,id] of projects){const c=require(path.resolve(__dirname,dir,'miniprogram/game-config.js'));assert.equal(c.homeDesign,'map');assert.equal(c.reviewEnabled,false);assert(!c.allowThemeSwitch);if(id)assert.equal(c.gameId,id);}
});
test('A retains illustration ratio and visible current chapter at three widths',()=>{
 for(const [w,h,status,safe] of [[320,568,20,0],[375,812,44,34],[430,844,59,34]])for(const theme of ['red','culture','industry','ecology']){
  const base=home.metrics({windowWidth:w,windowHeight:h,statusBarHeight:status,screenHeight:h,safeArea:{bottom:h-safe}}),m=designs.metrics(base,'map');
  const rows=Array.from({length:4},(_,i)=>({id:'l'+i,status:i===0?'current':'locked'})),j=layout(rows,theme,m.mapWidth,m.mapViewport),node=j.nodes[0],geometry=home.mapMetrics(m.mapWidth);
  assert.equal(m.mapWidth,w);assert.equal(j.height,w*1280/750);const center=j.height-node.distance-j.focusTop;
  assert.ok(center+45<=m.mapViewport-15);assert.ok(center+geometry.nodeHeight/2-(w<=350?48:60)-(w<=350?66:76)>=0);
 }
});
test('catalog owns counts and sequence; four original seasons cycle in the client order',()=>{
 for(const count of [0,1,4,9]){
  const rows=Array.from({length:count},(_,i)=>({id:'chapter-'+i,status:i?'locked':'current'})),a=layout(rows,'ecology',375,300);
  assert.equal(a.nodes.length,count);assert.equal(a.tiles.length,Math.ceil(count/4));assert.deepEqual(a.nodes.map(n=>n.id),rows.map(n=>n.id));
  for(const [i,n] of a.nodes.entries()){assert.equal(n.pose,['welcome','celebrate','observe','think'][i%4]);assert.equal(n.season,['春','夏','秋','冬'][i%4]);assert.equal(n.mascot,'/assets/brand/original-poses/'+['spring','summer','autumn','winter'][i%4]+'.png');}
 }
});
test('each theme has its own scene and podium with explicit state and reached-only figures',()=>{
 const scenes=new Set(),bases=new Set();
 for(const theme of ['red','culture','industry','ecology'])for(const status of ['current','today-locked','completed']){
  const a=layout([{id:'arrived',status},{id:'future',status:'locked'}],theme,375,300);scenes.add(a.tiles[0].src);bases.add(a.nodes[0].nodeImage);
  assert.equal(a.nodes[0].status,status);assert(a.nodes[0].showMascot);assert.equal(a.nodes[1].showMascot,false);assert.equal(a.nodes[0].nodeImage,a.nodes[1].nodeImage);
  for(const src of [a.tiles[0].src,a.nodes[0].nodeImage])assert(fs.existsSync(path.join(__dirname,'../miniprogram',src)));
  assert(fs.statSync(path.join(__dirname,'../miniprogram',a.tiles[0].src)).size<240*1024);
 }
 assert.equal(scenes.size,4);assert.equal(bases.size,4);
});
test('actual A Page preserves chapter start, completion, next unlock and resume',async()=>{
 const env=environment({homeDesign:'guide',levelCount:3}),p=env.page,first=p.data.levels[0].id;
 await env.action('level',{id:first});assert.equal(p.data.modal,'rules');await env.action('confirm-start');assert.equal(p.data.route,'quiz');
 await env.action('option',{index:0});await env.action('submit');await env.action('next');p.go('home');
 assert.equal(p.data.snapshot.progress.completed,1);assert.equal(p.data.journey.guideId,p.data.levels[1].id);assert.deepEqual(p.data.journey.nodes.filter(n=>n.showMascot).map(n=>n.season),['春','夏']);assert.equal(p.data.journey.nodes[2].showMascot,false);
 await env.begin(p.data.levels[1].id);await env.choose(0);p.go('home');await env.begin(p.data.levels[1].id);assert.equal(p.data.challenge.selected,0);p.onUnload();
});
