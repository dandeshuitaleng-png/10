'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {layout}=require('../miniprogram/services-v4/journey'),{mapMetrics}=require('../miniprogram/services-v4/home-layout'),{rigs}=require('../miniprogram/services-v4/mascot-rig');
test('map visibility uses the standing surface foot location without moving chapter units',()=>{
 for(const width of [320,390,430]){const g=mapMetrics(width),levels=Array.from({length:7},(_,i)=>({id:'n'+i,status:i===6?'current':'completed'})),j=layout(levels,'ecology',width,300);
  for(const n of j.nodes){const stopTop=j.height-n.distance-g.nodeHeight/2;assert(Math.abs(n.actorBottom-(stopTop+6+g.nodeWidth*65/220))<1e-8);assert.equal(n.actorTop,n.actorBottom-g.actorHeight);}
  const changed=layout(levels.map(n=>({...n,status:'locked'})),'ecology',width,300);assert.deepEqual(changed.nodes.map(n=>n.distance),j.nodes.map(n=>n.distance));
 }
});
test('each seasonal map framing translates its primary body foot point to the same anchor',()=>{
 for(const pose of ['welcome','celebrate','observe','think']){const r=rigs[pose],m=r.mapAnchorStyle.match(/translate\(([-\d.]+)%,([-\d.]+)%\)/);assert(m);assert(Math.abs(Number(m[1])+100*r.mapFoot.x/r.width)<1e-6);assert(Math.abs(Number(m[2])+100*r.mapFoot.y/r.height)<1e-6);assert(r.mapAnchorStyle.includes('left:50%;top:100%'));}
});
