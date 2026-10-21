'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {createMotion,durations}=require('../miniprogram/services-v4/mascot-motion');const {layout}=require('../miniprogram/services-v4/journey');
function env(pose='welcome'){let time=0,uid=0;const timers=new Map(),changes=[];const controller=createMotion({clock:()=>time,schedule:(fn,ms)=>{timers.set(++uid,{fn,at:time+ms});return uid;},cancel:id=>timers.delete(id),onChange:s=>changes.push({...s})});const context={enabled:true,nodes:[{id:'one',pose,status:'current',distance:100},{id:'two',pose:'think',status:'completed',distance:250}],canvasHeight:500,viewportTop:0,viewportHeight:500,nodeHeight:86,actorHeight:76};function advance(ms){const target=time+ms;while(true){const task=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!task||task[1].at>target)break;time=task[1].at;timers.delete(task[0]);task[1].fn();}time=target;}return {controller,context,changes,timers,advance};}
test('visible current node plays once, finishes its full gesture, restarts exactly 8s after start',()=>{const e=env();e.controller.update(e.context);assert.equal(e.controller.state().playingId,'one');e.advance(durations.welcome);assert.equal(e.controller.state().playingId,'');e.advance(8000-durations.welcome-1);assert.equal(e.controller.state().sequence,1);e.advance(1);assert.equal(e.controller.state().sequence,2);e.controller.dispose();assert.equal(e.timers.size,0);});
test('a reached noncurrent node has its own full thinking action; future nodes cannot play',()=>{const e=env();e.controller.update(e.context);e.advance(durations.welcome);assert.equal(e.controller.play('two'),true);e.advance(durations.think-1);assert.equal(e.controller.state().playingId,'two');e.advance(1);assert.equal(e.controller.state().playingId,'');e.controller.update({nodes:[...e.context.nodes,{id:'future',pose:'observe',status:'locked',distance:200,showMascot:false}]});assert.equal(e.controller.play('future'),false);e.controller.dispose();});
test('background, offscreen and reduced-motion each cancel playback and scheduled work',()=>{for(const exit of ['background','offscreen','reduced']){const e=env();e.controller.update(e.context);if(exit==='background')e.controller.hide();else e.controller.update(exit==='offscreen'?{viewportTop:1000}:{enabled:false});assert.equal(e.controller.state().playingId,'');assert.equal(e.timers.size,0);e.advance(24000);assert.equal(e.controller.state().sequence,1);assert.equal(e.controller.play('one'),false);e.controller.update(e.context);assert.equal(e.controller.state().sequence,2);e.controller.dispose();}});
test('frequent service refresh does not continually restart animation or postpone repeat',()=>{const e=env();for(let i=0;i<80;i++){e.controller.update(e.context);e.advance(100);}assert.equal(e.controller.state().sequence,2);assert.ok(e.timers.size<=2);e.controller.dispose();});
test('a catalog of 9 enabled nodes retains business IDs/order and cycles all four poses',()=>{const nodes=Array.from({length:9},(_,i)=>({id:'custom-'+(i+1),status:i?'locked':'current'}));const map=layout(nodes,'ecology',320,300);assert.deepEqual(map.nodes.map(n=>n.id),nodes.map(n=>n.id));assert.deepEqual(map.nodes.map(n=>n.pose),['welcome','celebrate','observe','think','welcome','celebrate','observe','think','welcome']);assert.equal(map.tiles.length,3);});

test('a scheduled repeat lets a manual one-shot finish before resuming the current node',()=>{const e=env();e.controller.update(e.context);e.advance(7500);e.controller.play('two');e.advance(500);assert.equal(e.controller.state().playingId,'two');e.advance(durations.think-501);assert.equal(e.controller.state().playingId,'two');e.advance(1);assert.equal(e.controller.state().playingId,'one');e.controller.dispose();});

test('today-locked reached node still animates; all-completed map celebrates at the last reached node',()=>{for(const status of ['today-locked','completed']){const e=env();e.controller.update({...e.context,nodes:[{...e.context.nodes[0],status,showMascot:true},{...e.context.nodes[1],status:'locked',showMascot:false}]});assert.equal(e.controller.state().playingId,'one');e.advance(8000);assert.equal(e.controller.state().sequence,2);e.controller.dispose();}});

test('rapid repeated taps do not reset a playing figure or delay its next automatic gesture',()=>{const e=env();e.controller.update(e.context);e.advance(600);assert.equal(e.controller.play('one'),true);e.advance(300);assert.equal(e.controller.play('one'),true);assert.equal(e.controller.state().sequence,1);assert.equal(e.controller.state().nextAt,8000);e.advance(durations.welcome-901);assert.equal(e.controller.state().playingId,'one');e.advance(1);assert.equal(e.controller.state().playingId,'');e.advance(8000-durations.welcome);assert.equal(e.controller.state().sequence,2);e.controller.dispose();});

test('direct touch immediately upgrades idle action, deduplicates repeated touch and clears linked feedback',()=>{const e=env();e.controller.update(e.context);e.advance(400);assert.equal(e.controller.react('one'),true);assert.equal(e.controller.state().respondingId,'one');assert.equal(e.controller.state().sequence,2);assert.equal(e.controller.state().nextAt,8400);e.advance(200);e.controller.react('one');assert.equal(e.controller.state().sequence,2);e.advance(durations.welcome-200);assert.equal(e.controller.state().respondingId,'');assert.equal(e.controller.state().playingId,'');e.controller.react('two');assert.equal(e.controller.state().respondingId,'two');e.controller.hide();assert.equal(e.controller.state().respondingId,'');assert.equal(e.timers.size,0);assert.equal(e.controller.react('one'),false);e.controller.dispose();});

test('changing a visible scene pose cancels the previous gesture and uses the replacement duration',()=>{
 const e=env('reader');e.controller.update(e.context);e.advance(400);
 const changed={...e.context,nodes:[{...e.context.nodes[0],pose:'drummer'}]};
 e.controller.update(changed);assert.equal(e.controller.state().sequence,2);
 e.advance(durations.drummer-1);assert.equal(e.controller.state().playingId,'one');
 e.advance(1);assert.equal(e.controller.state().playingId,'');
 e.controller.dispose();assert.equal(e.timers.size,0);
});

test('every supplied extension completes its own action and remains interruptible',()=>{
 for(const pose of ['reader','scholar','heart','lotus','drummer','skater']){
  const e=env(pose);e.controller.update(e.context);e.advance(durations[pose]-1);
  assert.equal(e.controller.state().playingId,'one',pose);e.advance(1);assert.equal(e.controller.state().playingId,'',pose);
  e.controller.react('one');assert.equal(e.controller.state().respondingId,'one');
  e.controller.hide();assert.equal(e.timers.size,0);assert.equal(e.controller.state().respondingId,'');e.controller.dispose();
 }
});

test('each seasonal tap completes its shorter gesture; repeated taps refresh feedback without restarting the hand',()=>{
 const {responseDurations}=require('../miniprogram/services-v4/mascot-motion');
 for(const pose of ['welcome','celebrate','observe','think']){
  const e=env(pose);e.controller.update(e.context);e.controller.react('one');const started=e.controller.state().sequence,next=e.controller.state().nextAt;
  for(let i=0;i<100;i++)e.controller.react('one');
  assert.equal(e.controller.state().touchSequence,101);assert.equal(e.controller.state().sequence,started);assert.equal(e.controller.state().nextAt,next);assert(e.timers.size<=2);
  assert.equal(e.changes.at(-1).touchSequence,101);e.advance(responseDurations[pose]-1);assert.equal(e.controller.state().respondingId,'one');e.advance(1);assert.equal(e.controller.state().playingId,'');
  e.controller.react('one');assert.equal(e.controller.state().sequence,started+1);assert.equal(e.controller.state().touchSequence,102);e.controller.hide();assert.equal(e.controller.state().respondingId,'');e.controller.dispose();
 }
});

test('a partly clipped figure uses its static image; animation stops before it can cross the map edge',()=>{
 const e=env(),node={id:'one',pose:'welcome',status:'current',actorTop:100,actorBottom:176};
 e.controller.update({...e.context,nodes:[node],viewportHeight:200});assert.equal(e.controller.state().playingId,'one');
 e.controller.update({viewportHeight:160});assert.equal(e.controller.state().playingId,'');assert.equal(e.controller.react('one'),false);assert.equal(e.timers.size,0);
 e.controller.update({viewportTop:120,viewportHeight:200});assert.equal(e.controller.state().playingId,'');
 e.controller.update({viewportTop:0,viewportHeight:200});assert.equal(e.controller.react('one'),true);e.controller.dispose();
});
