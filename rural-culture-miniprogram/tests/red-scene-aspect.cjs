'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {layout}=require('../miniprogram/services-v4/journey');
const rows=Array.from({length:4},(_,i)=>({id:'level-'+i,status:i===2?'current':'locked'}));
test('红色场景不随可视高度压缩或拉长，三个宽度保持原图比例',()=>{
 for(const width of [320,375,430])for(const viewport of [180,419,900]){
  const r=layout(rows,'red',width,viewport);
  assert.equal(r.tiles.length,1);
  assert.ok(Math.abs(r.tiles[0].height/width-1280/750)<1e-10);
  assert.equal(r.height,r.tiles[0].height);
  const ys=r.nodes.map(n=>(r.height-n.distance)/r.height);
  ys.forEach((y,i)=>assert.ok(Math.abs(y-[.85,.64,.42,.24][i])<1e-10));
 }
});
test('配置少于四关时仍保留完整场景，不截掉山景',()=>{
 for(const count of [1,2,3])assert.equal(layout(rows.slice(0,count),'red',375,200).height,640);
});
test('文化场景也采用原图比例，不再压成可视高度',()=>{
 for(const skin of ['culture'])for(const viewport of [200,640,900])assert.equal(layout(rows,skin,375,viewport).height,640);
});

test('另外两套场景沿用相同自然比例',()=>{for(const skin of ['industry','ecology'])for(const width of [320,375,430])assert.equal(layout(rows,skin,width,200).height,width*1280/750);});
