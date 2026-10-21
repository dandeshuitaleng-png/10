'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const cover=require('../miniprogram/services-v4/share-cover');
const presentation=require('../miniprogram/services-v4/visual-feedback');
test('four theme covers keep the original horizon, header and character inside a 5:4 image',async()=>{
 for(const [id,name] of Object.entries({culture:'千年文脉',red:'十步芳草',industry:'金色产业',ecology:'青山绿水'})){
  const drawings=[],texts=[];let exports=0;
  const ctx={drawImage(...args){drawings.push(args);},createLinearGradient(){return {addColorStop(){}};},fillRect(){},fillText(...args){texts.push(args);}};
  const canvas={createImage(){const image={width:750,height:1280};Object.defineProperty(image,'src',{set(src){image.source=src;queueMicrotask(()=>image.onload());}});return image;},getContext(){return ctx;}};
  const wx={createSelectorQuery(){const q={in(){return q;},select(s){assert.equal(s,'#share-cover-canvas');return q;},fields(){return q;},exec(cb){cb([{node:canvas}]);}};return q;},canvasToTempFilePath(o){exports++;assert.equal(o.destWidth,600);assert.equal(o.destHeight,480);o.success({tempFilePath:'/tmp/'+id+'.jpg'});}};
  const result=await cover.render(wx,{},presentation.apply({gameId:id,name}));
  assert.equal(result,'/tmp/'+id+'.jpg');assert.equal(exports,1);assert.equal(canvas.width/canvas.height,1.25);
  assert.equal(drawings[0][0].source,'/assets/journey/'+id+'-a-v4.jpg');assert.deepEqual(drawings[0].slice(1),[0,0,750,600,0,0,600,480]);
  assert.equal(drawings[1][0].source,presentation.header(id));
  assert.equal(drawings[2][0].source,'/assets/brand/original-extensions/'+cover.actors[id]+'.png');
  for(const [text,x,y,max] of texts){assert(x>=0&&x<=600);assert(y>=0&&y<=480);assert(max<=600);assert(!/模拟|本地|演示|联调/.test(text));}
 }
});
test('presentation cleanup preserves real names, formal certificate copy and source records',()=>{
 const source={id:'DEMO-ECOLOGY',userName:'本地联调用户',footer:'本地模拟证书 · 非正式颁发',levelIds:['ecology-1']};
 const label=presentation.certificateLabel(source);assert.equal(label.displayId,'');assert.equal(label.userName,'乡村阅读者');assert.equal(source.footer,'本地模拟证书 · 非正式颁发');assert.equal(source.id,label.id);
 const official={id:'issued-123',userName:'王小明',footer:'文化阅读活动学习纪念'};
 assert.equal(presentation.certificateLabel(official).footer,official.footer);assert.equal(presentation.certificateLabel(official).userName,official.userName);assert.equal(presentation.certificateLabel(official).displayId,official.id);
 assert.equal(presentation.readerProfile({nickname:'本地联调用户',badge:'本地联网用户'}).badge,'阅读探索者');
});
