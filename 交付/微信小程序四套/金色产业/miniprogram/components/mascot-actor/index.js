const {rigs}=require('../../services-v4/mascot-rig');
const {createAnimator}=require('../../services-v4/mascot-canvas');
Component({
 properties:{pose:{type:String,value:'welcome'},playing:{type:Boolean,value:false},responding:{type:Boolean,value:false},cycle:{type:Number,value:0},touchCycle:{type:Number,value:0}},
 data:{rigs,canvasReady:false},
 lifetimes:{ready(){this._alive=true;this.prepareCanvas();},detached(){this._alive=false;this._loadToken=(this._loadToken||0)+1;if(this._animator)this._animator.stop();clearTimeout(this._retry);}},
 observers:{'pose, playing, responding, cycle':function(){if(!this._alive)return;if(this._canvasPose!==this.data.pose||(!this._animator&&this.data.playing))this.prepareCanvas();else this.updateCanvas();}},
 pageLifetimes:{hide(){if(this._animator)this._animator.stop();}},
 methods:{
  prepareCanvas(){
   const rig=rigs[this.data.pose];if(!rig||rig.extension){if(this._animator)this._animator.stop();return;}
   const token=(this._loadToken||0)+1;this._loadToken=token;this._canvasPose=this.data.pose;this.setData({canvasReady:false});if(this._animator)this._animator.stop();
   wx.nextTick(()=>{if(!this._alive||token!==this._loadToken)return;wx.createSelectorQuery().in(this).select('#original-motion').fields({node:true,size:true}).exec(rows=>{
    const item=rows&&rows[0];if(!item||!item.node||!item.width||!item.height)return;
    const image=item.node.createImage();image.onload=()=>{if(!this._alive||token!==this._loadToken)return;try{const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();this._animator=createAnimator({canvas:item.node,image,rig,width:item.width,height:item.height,pixelRatio:info.pixelRatio,onError:()=>{if(this._alive)this.setData({canvasReady:false});}});this._image=image;this.setData({canvasReady:true});this.updateCanvas();}catch(e){this.setData({canvasReady:false});}};
    image.onerror=()=>{if(this._alive&&token===this._loadToken)this.setData({canvasReady:false});};image.src=rig.source;
   });});
  },
  updateCanvas(){if(this._animator)this._animator.update({playing:this.data.playing,responding:this.data.responding,cycle:this.data.cycle});},
  // Isolated frame inspection uses the same renderer; never changes pose pixels.
  inspectFrame(progress){if(this._animator){this._animator.stop();this._animator.drawFrame(progress,true);}}
 }
});
