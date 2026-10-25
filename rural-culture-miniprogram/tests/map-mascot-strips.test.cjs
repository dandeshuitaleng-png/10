'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module');
const {createCanvas,loadImage}=require('/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'../miniprogram'),{rigs}=require('../miniprogram/services-v4/mascot-rig');
test('both action rows of every strip return to the same original frame and keep identical feet through all frames',async()=>{
 for(const pose of ['welcome','celebrate','observe','think']){
  const image=await loadImage(path.join(root,rigs[pose].spriteSource)),count=rigs[pose].spriteFrames||16,rows=Math.ceil(count/16),w=image.width/16,h=image.height/(rows*2),canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  const box=(i,row)=>[(i%16)*w,(row*rows+Math.floor(i/16))*h],frame=(i,row)=>{const[x,y]=box(i,row);return Buffer.from(ctx.getImageData(x,y,w,h).data);},base=frame(0,0),footAt=(i,row)=>{const[x,y]=box(i,row),top=Math.ceil(h*.78);return Buffer.from(ctx.getImageData(x,y+top,w,h-top).data);},foot=footAt(0,0);
  assert(image.width<=4096&&image.height<=4096,'texture stays within 4096px');
  assert.deepEqual(frame(count-1,0),base,pose+' idle returns to original');assert.deepEqual(frame(0,1),base);assert.deepEqual(frame(count-1,1),base);
  assert(!frame(4,0).equals(base),pose+' idle action has real movement');assert(!frame(4,1).equals(frame(4,0)),pose+' tap has stronger movement');
  for(let row=0;row<2;row++)for(let i=0;i<count;i++)assert.deepEqual(footAt(i,row),foot,pose+' feet must stay anchored');
 }
});
test('a map component never requests or creates a native canvas, including property refresh',()=>{
 const file=path.join(root,'components/mascot-actor/index.js');let def;
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:createRequire(file),Component:d=>def=d,clearTimeout,wx:{nextTick(){throw Error('map must not start the canvas lifecycle');}}});
 const c={...def.methods,data:{pose:'welcome',playing:true,scrollSafe:true},setData(){}};def.lifetimes?.ready?.call(c);for(const fn of Object.values(def.observers||{}))fn.call(c);assert.equal(c._animator,undefined);
});
test('winter snowman remains fixed while the candy and hand gesture plays',async()=>{
 const im=await loadImage(path.join(root,rigs.think.spriteSource)),count=rigs.think.spriteFrames||16,rows=Math.ceil(count/16),w=im.width/16,h=im.height/(rows*2),c=createCanvas(im.width,im.height),x=c.getContext('2d');x.drawImage(im,0,0);const left=Math.ceil(270/486*w),top=Math.ceil(455/796*h);
 const region=(frame,row)=>Buffer.from(x.getImageData(frame%16*w+left,(row*rows+Math.floor(frame/16))*h+top,w-left,h-top).data),base=region(0,0);
 for(let row=0;row<2;row++)for(let frame=0;frame<count;frame++)assert.deepEqual(region(frame,row),base,'snowman must not sway with the hand');
});
