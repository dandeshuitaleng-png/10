'use strict';
// Exercise the real Page -> motion controller -> Canvas2D renderer path.
// Pixel readback proves a paused surface is empty; native compositor timing is
// verified separately and is not simulated by this lifecycle regression.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const {createCanvas,loadImage}=require('/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const {createMotion}=require('../miniprogram/services-v4/mascot-motion'),{createAnimator}=require('../miniprogram/services-v4/mascot-canvas'),{rigs}=require('../miniprogram/services-v4/mascot-rig');
const file=path.resolve(__dirname,'../miniprogram/pages/game/index.js');
async function environment(){
 let definition,now=0,uid=0;const timers=new Map();
 const schedule=(fn,delay)=>{timers.set(++uid,{fn,at:now+delay});return uid;},cancel=id=>timers.delete(id);
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:createRequire(file),Page:v=>definition=v,wx:{},setTimeout:schedule,clearTimeout:cancel,clearInterval:cancel,console});
 const canvas=createCanvas(1,1),image=await loadImage(path.resolve(__dirname,'../miniprogram'+rigs.welcome.source));
 canvas.requestAnimationFrame=fn=>schedule(fn,33);canvas.cancelAnimationFrame=cancel;
 const animator=createAnimator({canvas,image,rig:rigs.welcome,width:76,height:120,pixelRatio:2,clock:()=>now});
 const p=Object.assign({},definition,{data:structuredClone(definition.data),_alive:true,_foreground:true});
 p.setData=patch=>Object.assign(p.data,patch);p.pauseMedia=()=>{};
 Object.assign(p.data,{loading:false,error:'',mascotAnimationReady:true,mapWidth:390,mapViewport:400,journey:{height:500,maxScroll:100,canScroll:true,nodes:[{id:'one',pose:'welcome',status:'current',showMascot:true,actorTop:200,actorBottom:276}]}});
 p._motion=createMotion({clock:()=>now,schedule,cancel,onChange:s=>{p.setData({motion:s});animator.update({playing:!!s.playingId,responding:!!s.respondingId,cycle:s.sequence});}});
 function advance(ms){const target=now+ms;for(;;){const entry=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry||entry[1].at>target)break;now=entry[1].at;timers.delete(entry[0]);entry[1].fn();}now=target;}
 const pixels=()=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0);
 p.syncMotion();return {p,advance,pixels,timers,animator};
}
test('scrolling a fully visible map actor clears the live canvas for every direction reversal, then resumes after settling',async()=>{
 const e=await environment();assert(e.pixels());
 for(let i=0;i<40;i++){
  e.p.onMapScroll({detail:{scrollTop:i%2?20:40}});
  assert.equal(e.p.data.motion.playingId,'','scrolling must not retain a separately composited animation');
  assert.equal(e.pixels(),false,'moving map must contain no duplicate canvas pixels');
  e.advance(30);
 }
 e.advance(250);assert.equal(e.p.data.motion.playingId,'one');assert(e.pixels());e.p.onUnload();e.animator.stop();assert.equal(e.timers.size,0);
});
test('finger down pauses before displacement; a held touch cannot restart and a tap still responds',async()=>{
 const e=await environment();e.p.onMapTouchStart();assert.equal(e.pixels(),false);
 e.advance(1000);assert.equal(e.p.data.motion.playingId,'');
 e.p.onMapTouchEnd();e.p.mascotTap({currentTarget:{dataset:{id:'one'}}});assert.equal(e.p.data.motion.respondingId,'one');assert(e.pixels());e.p.onUnload();e.animator.stop();
});
test('an inertial-scroll timer cannot wake the page after hide or unload',async()=>{
 for(const lifecycle of ['onHide','onUnload']){
  const e=await environment();e.p.onMapScroll({detail:{scrollTop:40}});e.p[lifecycle]();e.advance(1000);
  assert.equal(e.p.data.motion.playingId,'');assert.equal(e.pixels(),false);assert.equal(e.timers.size,0);e.animator.stop();
 }
});
test('inertia postpones resume and ordinary refresh cannot restart a canvas under the moving map',async()=>{
 const e=await environment();e.p.onMapTouchStart();e.p.onMapScroll({detail:{scrollTop:40}});e.p.onMapTouchEnd();e.advance(100);
 e.p.onMapScroll({detail:{scrollTop:60}});e.p.syncMotion();e.advance(100);assert.equal(e.pixels(),false);e.advance(100);assert(e.pixels());e.p.onUnload();e.animator.stop();
});
