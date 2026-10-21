const {createPressFeedback}=require('../../services-v4/press-feedback');
Component({
 properties:{label:{type:String,value:''},kind:{type:String,value:'primary'},emphasis:{type:Boolean,value:false},disabled:{type:Boolean,value:false},loading:{type:Boolean,value:false},skin:{type:String,value:'culture'}},
 data:{touching:false},
 lifetimes:{attached(){this._press=createPressFeedback({onChange:key=>this.setData({touching:!!key})});},detached(){if(this._press)this._press.dispose();}},
 observers:{'disabled, loading':function(disabled,loading){if((disabled||loading)&&this._press)this._press.cancel();}},
 pageLifetimes:{hide(){if(this._press)this._press.cancel();}},
 methods:{
  touchStart(e){if(!this.data.disabled&&!this.data.loading&&this._press)this._press.start('button',e);},
  touchMove(e){if(this._press)this._press.move(e);},
  touchEnd(){if(this._press)this._press.end();},
  touchCancel(){if(this._press)this._press.cancel();},
  press(){if(this.data.disabled||this.data.loading)return;if(this._press)this._press.tap('button');this.triggerEvent('action');}
 }
});
