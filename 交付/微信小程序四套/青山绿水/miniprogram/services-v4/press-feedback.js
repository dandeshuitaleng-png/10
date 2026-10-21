'use strict';

// Touch feedback is independent of selection/business state. Each new gesture
// owns its release timer, so an old release cannot cancel a subsequent press.
function createPressFeedback({onChange,now=Date.now,schedule=setTimeout,unschedule=clearTimeout,minVisible=100}={}){
 let key='',started=0,origin=null,timer=null,generation=0,disposed=false;
 const emit=value=>{if(key!==value){key=value;if(onChange)onChange(value);}};
 const clear=()=>{generation++;if(timer!==null)unschedule(timer);timer=null;};
 const point=e=>(e&&e.touches&&e.touches[0])||(e&&e.changedTouches&&e.changedTouches[0]);
 const cancel=()=>{clear();origin=null;emit('');};
 function start(value,event){if(disposed||!value)return;clear();started=now();origin=point(event)||null;emit(value);}
 function end(){if(disposed||!key)return;clear();origin=null;const token=generation;timer=schedule(()=>{if(token===generation){timer=null;emit('');}},Math.max(0,minVisible-(now()-started)));}
 return {
  start,
  move(event){const p=point(event);if(origin&&p&&Math.hypot(p.clientX-origin.clientX,p.clientY-origin.clientY)>8)cancel();},
  end,
  tap(value){if(disposed||!value)return;if(key!==value)start(value);end();},
  cancel,
  dispose(){cancel();disposed=true;}
 };
}
module.exports={createPressFeedback};
