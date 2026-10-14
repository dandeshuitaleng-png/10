const ui=require('../../utils/page');
Page({
 data:{loading:true,error:'',session:null,selected:'',remaining:0,busy:false,feedback:null,showRevival:false,actionError:''},
 onLoad(p){this.chapterId=p.chapterId;this.sessionId=p.sessionId;this._alive=true;},
 async onShow(){this._alive=true;if(this._shareRequested){this._shareRequested=false;await this.revive();return;}await this.refresh();},
 onHide(){clearInterval(this._timer);},onUnload(){this._alive=false;clearInterval(this._timer);},
 refresh(){return ui.load(this,async()=>{const s=this.sessionId?await ui.api.getSession({sessionId:this.sessionId}):await ui.api.startSession({chapterId:this.chapterId});this.sessionId=s.sessionId;if(s.status==='completed'){wx.redirectTo({url:'/pages/result/index?sessionId='+this.sessionId});return;}this.hydrate(s);});},
 hydrate(s){if(!this._alive)return;this.setData({session:s,selected:s.feedback?s.feedback.selectedOptionId||'':'',feedback:s.feedback,showRevival:['revival','locked'].includes(s.status),actionError:''});this._offset=s.serverNow-Date.now();clearInterval(this._timer);this.tick();if(s.status==='answering')this._timer=setInterval(()=>this.tick(),1000);},
 tick(){const s=this.data.session;if(!s)return;const remaining=Math.max(0,Math.ceil((s.deadline-(Date.now()+this._offset))/1000));this.setData({remaining});if(remaining===0&&s.status==='answering'&&!this.data.busy){clearInterval(this._timer);this.submit(true);}},
 choose(e){if(this.data.busy||this.data.session.status!=='answering')return;this.setData({selected:e.currentTarget.dataset.id,actionError:''});},
 submit(timeout){if(this.data.busy||!this.data.session||this.data.session.status!=='answering')return;timeout=timeout===true||this.data.remaining===0;if(!timeout&&!this.data.selected){ui.toast('请先选择一个答案');return;}const q=this.data.session.question;this._requestId=this._requestId||'answer-'+Date.now()+'-'+Math.random().toString(36).slice(2);this.setData({busy:true,actionError:''});return ui.api.submitAnswer({sessionId:this.sessionId,questionId:q.id,optionId:timeout===true?null:this.data.selected,requestId:this._requestId}).then(s=>{this._requestId=null;this.hydrate(s);}).catch(e=>{this.setData({actionError:e.message});}).finally(()=>{this.setData({busy:false});});},
 async next(){if(this.data.busy)return;this.setData({busy:true,actionError:''});try{const r=await ui.api.nextQuestion({sessionId:this.sessionId});if(r.completed){wx.redirectTo({url:'/pages/result/index?sessionId='+this.sessionId});}else{this.hydrate(r.session);}}catch(e){this.setData({actionError:e.message});}finally{this.setData({busy:false});}},
 async revive(){this.setData({busy:true,actionError:''});try{const s=await ui.api.claimRevival({sessionId:this.sessionId,token:this.data.session.revivalToken});if(s.status==='pending'){this.setData({actionError:'资格正在确认，请稍后再试'});}else{this.hydrate(s);ui.toast('可以继续学习，请重新回答这道题');}}catch(e){this.setData({actionError:e.message});}finally{this.setData({busy:false});}},
 back(){const theme=this.data.session?this.data.session.theme.id:this.chapterId?this.chapterId.split('-')[0]:'';if(theme)wx.redirectTo({url:'/pages/chapters/index?themeId='+theme});else ui.go('/pages/themes/index');},
 async leave(){if(this.data.showRevival||this.data.feedback){this.back();return;}wx.showModal({title:'稍后继续探索？',content:'本题计时会继续，重新进入可接着完成。',confirmText:'返回主题',cancelText:'继续答题',success:r=>{if(r.confirm)this.back();}});},
 noop(){},
 mediaFailed(){this.setData({actionError:'题目素材暂时无法加载，请稍后重试'});},
 onShareAppMessage(e){if(e&&e.from==='button'&&e.target&&e.target.id==='revival-share'&&this.data.session.status==='revival'){this._shareRequested=true;}return ui.share();}
});
