'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const component=process.env.MASCOT_COMPONENT_DIR||path.resolve(__dirname,'../miniprogram/components/mascot-actor'),wxml=fs.readFileSync(path.join(component,'index.wxml'),'utf8'),css=fs.readFileSync(path.join(component,'index.wxss'),'utf8');
test('seasonal actors keep the same full-body image through play, stop and modal/map use; no native-canvas handoff',()=>{
 assert(!wxml.includes('<canvas'),'a clearable native canvas still owns the modal body');
 assert(!wxml.includes('gesture-original'),'a second whole-body image still trades visibility');
 assert(wxml.includes('class="map-motion-strip"'));
 assert(!/wx:if="\{\{scrollSafe\}\}"/.test(wxml),'the continuous strip must render in modal/result as well as map');
});
test('contextual figures retain their base and original part layers at rest, during action and on repeat',()=>{
 assert(!wxml.includes('extension-still'),'an entire second body is still swapped at action boundaries');
 assert(wxml.includes('extension-base')&&wxml.includes('extension-part'),'base and moving parts must both stay mounted');
 assert(!/\.is-playing\s+\.extension-(still|layered)/.test(css),'action must not hide the base image');
});
test('no actor allocates or clears a native animation surface on any property update',()=>{
 let def;const file=path.join(component,'index.js');vm.runInNewContext(fs.readFileSync(file,'utf8'),{require:createRequire(file),Component:d=>def=d,wx:{nextTick(){throw Error('native canvas lifecycle still active');}}});
 for(const pose of Object.keys(def.data.rigs))for(const scrollSafe of [false,true]){
  const c={...(def.methods||{}),data:{pose,scrollSafe,playing:true,cycle:1},setData(p){Object.assign(this.data,p);}};def.lifetimes?.ready?.call(c);for(const fn of Object.values(def.observers||{}))fn.call(c);assert.equal(c._animator,undefined,pose);def.lifetimes?.detached?.call(c);
 }
});
