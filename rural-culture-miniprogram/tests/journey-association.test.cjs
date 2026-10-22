'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {layout}=require('../miniprogram/services-v4/journey'),{mapMetrics}=require('../miniprogram/services-v4/home-layout');
const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
test('chapter cards stay with their bases and clear every neighbouring figure across scene boundaries',()=>{
 for(const width of [320,375,430])for(const theme of ['red','culture','industry','ecology'])for(const count of [1,4,5,11]){
  const levels=Array.from({length:count},(_,i)=>({id:'row-'+i,status:i===count-1?'current':'completed'})),j=layout(levels,theme,width,300),g=mapMetrics(width),actorHeight=width<=350?66:width>=410?84:76;
  const rows=j.nodes.map(n=>{const left=parseFloat(n.left)/100*width-g.nodeWidth/2,top=j.height-n.distance-g.nodeHeight/2,center=top+6+g.nodeWidth*.375,cardLeft=n.side==='right'?left-g.cardGap-g.cardWidth:left+g.nodeWidth+g.cardGap;return{id:n.id,card:{left:cardLeft,right:cardLeft+g.cardWidth,top:center-g.cardHeight/2,bottom:center+g.cardHeight/2},actor:{left:left+g.nodeWidth/2-36,right:left+g.nodeWidth/2+36,top:top+30-actorHeight,bottom:top+30}};});
  for(let i=0;i<rows.length;i++)for(let k=0;k<rows.length;k++)if(i!==k){assert.equal(overlap(rows[i].card,rows[k].card),0,`${width} ${i}/${k} cards overlap`);assert.equal(overlap(rows[i].card,rows[k].actor),0,`${width} ${i}/${k} card overlaps another chapter's figure`);}
  assert.equal(j.tiles[0].height,width*1280/750,'scene aspect ratio remains unchanged');
  assert.deepEqual(j.nodes.map(n=>n.id),levels.map(n=>n.id));
 }
});
test('unlocking changes status and figures without moving the paired chapter units',()=>{
 for(const width of [320,375,430]){const rows=Array.from({length:7},(_,i)=>({id:'l'+i,status:i?'locked':'current'})),before=layout(rows,'ecology',width),after=layout(rows.map((r,i)=>({...r,status:i<6?'completed':'today-locked'})),'ecology',width);assert.deepEqual(before.nodes.map(n=>n.distance),after.nodes.map(n=>n.distance));}
});
