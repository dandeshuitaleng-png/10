// Asset timeout is a technical loading safeguard, never a quiz time limit.
class QuestionMedia {
  constructor(createImage,onChange,{timeoutMs=8000,setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}={}) {
    this.createImage=createImage;this.onChange=onChange;this.timeoutMs=timeoutMs;this.setTimer=setTimer;this.clearTimer=clearTimer;this.generation=0;this.state={src:null,status:'idle',image:null};
  }
  clear() { this.generation++;if(this.timer)this.clearTimer(this.timer);this.timer=null;this.state={src:null,status:'idle',image:null};this.onChange(this.state); }
  load(media,force=false) {
    const src=media&&media.type==='image'?media.src:null;
    if(!src){if(this.state.src)this.clear();return;}
    if(!force&&this.state.src===src)return;
    this.clear();const generation=this.generation;this.state={src,status:'loading',image:null};this.onChange(this.state);
    const finish=(status,image=null)=>{if(generation!==this.generation||this.state.status!=='loading')return;if(this.timer)this.clearTimer(this.timer);this.timer=null;this.state={src,status,image:status==='ready'?image:null};this.onChange(this.state);};
    this.timer=this.setTimer(()=>finish('failed'),this.timeoutMs);if(this.timer&&this.timer.unref)this.timer.unref();
    try {const image=this.createImage();image.onload=()=>finish(image.width>0&&image.height>0?'ready':'failed',image);image.onerror=()=>finish('failed');image.src=src;}
    catch(_){finish('failed');}
  }
}
module.exports={QuestionMedia};
