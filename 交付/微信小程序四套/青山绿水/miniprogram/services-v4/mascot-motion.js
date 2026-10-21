'use strict';
// Presentation-only controller. One active actor and at most two timeouts per page.
const {rigs}=require('./mascot-rig');
const durations={};Object.keys(rigs).forEach(pose=>{durations[pose]=rigs[pose].duration;});
function createMotion({onChange,clock=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout}={}){
 let context={enabled:false,nodes:[]},playingId='',playingPose='',respondingId='',sequence=0,endTimer=null,nextTimer=null,activeCurrent='',nextAt=0,disposed=false;
 const later=(fn,delay)=>{const timer=schedule(fn,delay);if(timer&&timer.unref)timer.unref();return timer;};
 function publish(id,response=false){playingId=id;if(!id)playingPose='';respondingId=response?id:'';onChange&&onChange({playingId:id,respondingId,sequence});}
 function visible(node){const top=Number.isFinite(node.actorTop)?node.actorTop:context.canvasHeight-node.distance+(30-context.nodeHeight/2)-context.actorHeight;const bottom=Number.isFinite(node.actorBottom)?node.actorBottom:top+context.actorHeight;return bottom>context.viewportTop&&top<context.viewportTop+context.viewportHeight;}
 function nodes(){return context.enabled&&!disposed?context.nodes.filter(node=>node.showMascot!==false&&node.status!=='locked'&&visible(node)):[];}
 function stop(){if(endTimer!==null)cancel(endTimer);if(nextTimer!==null)cancel(nextTimer);endTimer=nextTimer=null;if(playingId)publish('');}
 function play(id,automatic=false,response=false){const node=nodes().find(n=>n.id===id);if(!node)return false;if(playingId===id&&playingPose===node.pose&&(!response||respondingId===id))return true;if(endTimer!==null)cancel(endTimer);if(playingId)publish('');if(!automatic&&id===activeCurrent)nextAt=clock()+8000;sequence++;playingPose=node.pose;publish(id,response);endTimer=later(()=>{endTimer=null;publish('');},durations[node.pose]||1800);return true;}
 function auto(){if(nextTimer!==null)cancel(nextTimer);nextTimer=null;const eligible=nodes(),current=eligible.find(n=>n.status==='current')||eligible.find(n=>n.status==='today-locked')||eligible.filter(n=>n.status==='completed').slice(-1)[0];if(!current){activeCurrent='';nextAt=0;return;}if(activeCurrent!==current.id){activeCurrent=current.id;nextAt=clock();}if(clock()>=nextAt){if(playingId){nextTimer=later(auto,50);return;}play(current.id,true);nextAt=clock()+8000;}nextTimer=later(auto,Math.max(1,nextAt-clock()));}
 return {update(patch){if(disposed)return;const prior=context.nodes.find(n=>n.id===activeCurrent);context=Object.assign({},context,patch);const eligible=nodes();if(!eligible.length){stop();activeCurrent='';nextAt=0;return;}const current=eligible.find(n=>n.id===activeCurrent);if(prior&&current&&prior.pose!==current.pose){stop();activeCurrent='';nextAt=0;}if(playingId&&!eligible.some(n=>n.id===playingId))stop();auto();},play,react(id){return play(id,false,true);},hide(){context.enabled=false;stop();activeCurrent='';nextAt=0;},dispose(){this.hide();disposed=true;},state(){return {playingId,respondingId,sequence,activeCurrent,nextAt};}};
}
module.exports={createMotion,durations};
