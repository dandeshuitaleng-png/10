'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createPressFeedback}=require('../miniprogram/services-v4/press-feedback');
function fixture(){let now=0,id=0;const timers=new Map(),states=[];
 const p=createPressFeedback({now:()=>now,schedule:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},unschedule:id=>timers.delete(id),onChange:s=>states.push(s)});
 return {p,states,timers,tick(ms){now+=ms;for(const [id,t] of timers)if(t.at<=now){timers.delete(id);t.fn();}}};
}
const touch=(x,y)=>({touches:[{clientX:x,clientY:y}]});
test('every one of 100 repeated taps gets feedback and returns to rest',()=>{
 const x=fixture();for(let i=0;i<100;i++){x.p.start('answer',touch(10,10));assert.equal(x.states.at(-1),'answer');x.p.end();x.p.tap('answer');x.tick(100);assert.equal(x.states.at(-1),'');}
 assert.equal(x.states.filter(Boolean).length,100);assert.equal(x.timers.size,0);
});
test('the previous release cannot end a new press, including the same answer',()=>{
 const x=fixture();x.p.start('answer');x.p.end();const stale=[...x.timers.values()][0].fn;
 x.tick(50);x.p.start('answer');stale();assert.equal(x.states.at(-1),'answer');
 x.p.end();x.tick(99);assert.equal(x.states.at(-1),'answer');x.tick(1);assert.equal(x.states.at(-1),'');
});
test('scroll gestures, touch cancellation and page disposal leave no stuck press',()=>{
 const x=fixture();x.p.start('answer',touch(10,10));x.p.move(touch(10,14));assert.equal(x.states.at(-1),'answer');
 x.p.move(touch(10,30));assert.equal(x.states.at(-1),'');x.p.start('answer');x.p.end();x.p.cancel();assert.equal(x.timers.size,0);
 x.p.start('answer');x.p.dispose();x.p.tap('answer');assert.equal(x.states.at(-1),'');assert.equal(x.timers.size,0);
});
test('keyboard or accessible tap also gets feedback without a preceding touch event',()=>{
 const x=fixture();x.p.tap('answer');assert.equal(x.states.at(-1),'answer');x.tick(100);assert.equal(x.states.at(-1),'');
});
test('the actual shared button continues to emit actions after 100 taps and guards disabled/loading',()=>{
 const file=path.resolve(__dirname,'../miniprogram/components/game-button/index.js');let def;
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{Component:d=>def=d,require:()=>({createPressFeedback})});
 let actions=0;const c={...def.methods,data:{disabled:false,loading:false,touching:false},setData(p){Object.assign(this.data,p);},triggerEvent(){actions++;}};
 def.lifetimes.attached.call(c);
 for(let i=0;i<100;i++){c.touchStart(touch(1,1));assert.equal(c.data.touching,true);c.touchEnd();c.press();c.touchCancel();assert.equal(c.data.touching,false);}
 assert.equal(actions,100);
 for(const flag of ['disabled','loading']){c.data[flag]=true;def.observers['disabled, loading'].call(c,c.data.disabled,c.data.loading);c.touchStart(touch(1,1));c.press();assert.equal(c.data.touching,false);c.data[flag]=false;}
 assert.equal(actions,100);c.touchStart(touch(1,1));def.pageLifetimes.hide.call(c);assert.equal(c.data.touching,false);def.lifetimes.detached.call(c);
});
