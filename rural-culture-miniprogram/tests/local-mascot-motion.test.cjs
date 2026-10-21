'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{rigs}=require('../miniprogram/services-v4/mascot-rig'),{affine}=require('../miniprogram/services-v4/mascot-mesh'),{geometry,deform,angleAt,createAnimator}=require('../miniprogram/services-v4/mascot-canvas');
test('seasonal figures render one original bitmap without cutout arms, painted patches or whole-body keyframes',()=>{
 const css=fs.readFileSync(path.join(root,'miniprogram/components/mascot-actor/index.wxss'),'utf8'),wxml=fs.readFileSync(path.join(root,'miniprogram/components/mascot-actor/index.wxml'),'utf8');
 assert(!/\.gesture-plane\{animation-name|\.extension-plane\{animation-name/.test(css));assert(!wxml.includes('limb-underlay')&&!wxml.includes('limb-pivot')&&!wxml.includes('mesh-triangle'));
 assert(wxml.includes('class="mascot-motion-canvas"'));assert(css.includes('.actor-original .gesture-original{opacity:1!important}'));
 assert(css.includes('.canvas-ready.is-playing .gesture-original{opacity:0}'));assert(wxml.includes('class="actor-original-image actor-art gesture-original"'));
});
test('all original RGBA files are byte-identical and the local deformation stays above the feet',()=>{
 const source=require('../design-source/original-poses.json');
 for(const pose of ['welcome','celebrate','observe','think']){
  const r=rigs[pose],record=source.poses.find(p=>r.source.endsWith('/'+p.name+'.png')),mesh=geometry(r);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'miniprogram',r.source))).digest('hex'),record.runtimeSha256);
  assert.equal(mesh.triangles.length,32);assert(!r.limbUnderlays&&!r.limb);assert(Math.max(...mesh.vertices.map(v=>v.point[1]))/r.height<.78);
 }
});
test('shared vertices remain joined, fixed outer edges match the static body, and no triangle inverts at any motion frame',()=>{
 for(const pose of ['welcome','celebrate','observe','think']){
  const r=rigs[pose],mesh=geometry(r);
  for(let frame=0;frame<=100;frame++){
   const targets=deform(mesh,angleAt(frame/100,r.gesture.angles)),seen=new Map();
   for(const ids of mesh.triangles){const [a,b,c,d,x,y]=affine(ids.map(i=>mesh.vertices[i].point),ids.map(i=>targets[i]));assert(a*d-b*c>.1);
    for(const id of ids){const p=mesh.vertices[id].point,dest=[a*p[0]+c*p[1]+x,b*p[0]+d*p[1]+y];assert(Math.hypot(dest[0]-targets[id][0],dest[1]-targets[id][1])<.00002);if(seen.has(id))assert(Math.hypot(dest[0]-seen.get(id)[0],dest[1]-seen.get(id)[1])<.00002);else seen.set(id,dest);}
   }
   mesh.vertices.forEach((v,i)=>{if(v.weight===0)assert.deepEqual(targets[i],v.point);});
  }
 }
});
test('canvas playback is bounded and repeated property refresh does not restart it; disposal cancels the pending frame',()=>{
 let now=0,id=0,draws=0;const timers=new Map(),ctx={scale(){},clearRect(){},drawImage(){draws++;},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},transform(){}};
 const canvas={getContext:()=>ctx,requestAnimationFrame:fn=>{timers.set(++id,fn);return id;},cancelAnimationFrame:id=>timers.delete(id)};
 const a=createAnimator({canvas,image:{},rig:rigs.welcome,width:76,height:120,clock:()=>now});
 a.update({playing:true,responding:true,cycle:1});const first=draws;for(let i=0;i<100;i++)a.update({playing:true,responding:true,cycle:1});assert.equal(draws,first);assert.equal(timers.size,1);
 now=150;const fn=[...timers.values()][0];timers.clear();fn();assert(draws>first);a.stop();assert.equal(timers.size,0);assert.equal(a.state().active,false);
 a.update({playing:true,responding:true,cycle:2});now+=rigs.welcome.responseDuration;const last=[...timers.values()][0];timers.clear();last();assert.equal(a.state().active,false);assert.equal(timers.size,0);
});

test('a canvas drawing failure stops its frame loop and invokes the original-image fallback',()=>{
 let failed=false;const ctx={scale(){},clearRect(){},drawImage(){throw Error('TEST_RENDER_FAILURE');}};
 const canvas={getContext:()=>ctx,requestAnimationFrame(){throw Error('must not schedule after failure');}};
 const a=createAnimator({canvas,image:{},rig:rigs.welcome,width:76,height:120,onError:()=>{failed=true;}});a.update({playing:true,responding:true,cycle:1});assert(failed);assert.equal(a.state().active,false);assert.equal(a.state().framePending,false);
});

test('idle, scroll/modal pause and component disposal leave a transparent canvas, not an un-clipped original frame',()=>{
 let visible=false,next=0;const timers=new Map(),ctx={scale(){},clearRect(){visible=false;},drawImage(){visible=true;},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},transform(){}};
 const canvas={getContext:()=>ctx,requestAnimationFrame:fn=>{timers.set(++next,fn);return next;},cancelAnimationFrame:id=>timers.delete(id)};
 const a=createAnimator({canvas,image:{},rig:rigs.welcome,width:76,height:120});
 a.update({playing:false,responding:false,cycle:0});assert.equal(visible,false,'component ready must not paint a duplicate still figure');
 a.update({playing:true,responding:true,cycle:1});assert.equal(visible,true);
 a.update({playing:false,responding:false,cycle:1});assert.equal(visible,false,'scroll/modal pause must erase the canvas');assert.equal(timers.size,0);
 a.update({playing:true,responding:true,cycle:2});assert.equal(visible,true);a.stop();assert.equal(visible,false,'hide/detach must erase the last frame');assert.equal(timers.size,0);
});
