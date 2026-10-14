const { createWechatPlatform } = require('./platform/wechat');
const { toLogical } = require('./core/viewport');
const { Router } = require('./core/router');
const { Input } = require('./core/input');
const { Renderer } = require('./ui/renderer');
const { Resources } = require('./services/resources');
const { Storage } = require('./services/storage');
const { Audio } = require('./services/audio');
const { Backend } = require('./services/backend');
const { Challenge } = require('./core/challenge');
const { QuestionMedia } = require('./services/question-media');
const { PRACTICE_QUESTIONS } = require('./data/practice');
const { getTheme, getLevels } = require('./data/themes');
const { THEME_PROGRESS } = require('./data/progress');

class App {
  constructor(platform = createWechatPlatform(), { mapArt, practiceContent = null } = {}) {
    if (practiceContent && (!getTheme(practiceContent.themeId) || !Number.isInteger(practiceContent.levelOrder) || practiceContent.levelOrder < 1 || practiceContent.levelOrder > 4 || !Array.isArray(practiceContent.questions) || practiceContent.questions.length < 10)) throw new Error('INVALID_PRACTICE_CONTENT');
    this.practiceContent=practiceContent;
    this.practiceThemeId=practiceContent?practiceContent.themeId:'ecology';
    this.platform=platform;this.canvas=platform.canvas;this.ctx=this.canvas.getContext('2d');
    this.router=new Router();this.renderer=new Renderer(this.ctx);this.input=new Input((action)=>this.handle(action),(dy)=>this.renderer.scrollBy(dy));
    this.resources=new Resources(platform,{mapArt});this.storage=new Storage(platform.api);this.audio=new Audio(platform.api,this.storage.loadPreferences().muted);this.backend=new Backend();
    this.themeProgress=THEME_PROGRESS;
    this.questionMedia=new QuestionMedia(()=>this.platform.createImage(),state=>{this.mediaSrc=state.src;this.mediaImage=state.image;this.mediaFailed=state.status==='failed';this.mediaStatus=state.status;});
    this.challenge=null;this.practiceComplete=false;this.practiceLocked=false;
    this.frame=null;this.running=false;this.progress=0;this.toast=null;this.toastUntil=0;this.bound={};
    this.tick=this.tick.bind(this);this.resize=this.resize.bind(this);this.resize();
  }
  resize() {
    this.viewport=this.platform.viewport();const v=this.viewport;
    this.canvas.width=Math.round(v.physicalWidth*v.pixelRatio);this.canvas.height=Math.round(v.physicalHeight*v.pixelRatio);
    this.ctx.setTransform(v.scale*v.pixelRatio,0,0,v.scale*v.pixelRatio,0,0);
    this.input.cancel();
  }
  start() {
    if(this.started) return;
    this.started=true;
    ['Start','Move','End'].forEach((suffix)=>{
      const name=`onTouch${suffix}`;
      this.bound[name]=(event)=>{
        const touches=suffix==='End'?event.changedTouches:event.touches;
        if(!touches||!touches.length) return;
        const touch= suffix==='Start'||!this.input.active?touches[0]:Array.from(touches).find((item)=>(item.identifier||0)===this.input.active.id);
        if(touch) this.input[suffix.toLowerCase()](toLogical(touch,this.viewport),touch.identifier||0);
      };
      this.platform.on(name,this.bound[name]);
    });
    this.bound.onTouchCancel=()=>this.input.cancel();this.platform.on('onTouchCancel',this.bound.onTouchCancel);
    this.bound.onHide=()=>{this.pause();};this.bound.onShow=()=>{this.resize();this.resume();};
    this.platform.on('onHide',this.bound.onHide);this.platform.on('onShow',this.bound.onShow);this.platform.on('onWindowResize',this.resize);
    this.resume();
    this.resources.load((value)=>{this.progress=value;}).then(()=>{ if(!this.destroyed&&this.router.current.name==='loading')this.router.replace('home'); });
  }
  handle(action) {
    if(this.exitRequested && !['exit-cancel','exit-confirm'].includes(action.type))return;
    const previousRoute=this.router.current;
    this.audio.play('press');
    if(action.type==='exit-request' && this.router.current.name==='quiz') {
      this.exitRequested=true;this.input.cancel();
    }
    else if(action.type==='exit-cancel'){this.exitRequested=false;this.input.cancel();}
    else if(action.type==='exit-confirm' && this.exitRequested){
      this.exitRequested=false;this.closePractice();this.router.returnTo('map',{themeId:this.practiceThemeId});this.input.cancel();
    }
    else if(action.type==='practice') {
      this.startPractice();
    }
    else if(action.type==='continue'&&this.feedback&&this.router.current.name==='quiz'){this.feedback=null;this.input.cancel();}
    else if(action.type==='retry-media'){this.loadMedia(true);}
    else if(action.type==='option' && this.router.current.name==='quiz' && this.challenge && !this.feedback) this.challenge.select(action.index,action.questionId);
    else if(action.type==='confirm' && this.router.current.name==='quiz' && this.challenge && !this.feedback) {
      const question=this.challenge.question,selected=this.challenge.selected,explanation=this.challenge.questions[this.challenge.position].explanation;
      const outcome=this.challenge.submit(action.questionId);
      if(outcome&&!outcome.right)this.incorrectSelected=selected;
      if(!outcome)return;
      this.input.cancel();this.toast=null;
      if(outcome.state==='complete'){this.practiceComplete=true;this.router.replace('result',{practice:true});}
      else if(outcome.state==='locked'){this.practiceLocked=true;this.notify('当前试玩关卡已锁定');}
      else if(outcome.right)this.feedback={question,selected,explanation};
    }
    else if(action.type==='share') {
      if(this.challenge && this.challenge.state==='revive') this.notify('分享验证未接入，暂不能复活');
      else this.notify('分享功能尚未接入');
    }
    else if(action.type==='replay') this.startPractice();
    else if(action.type==='next') {this.closePractice();this.router.returnTo('map',{themeId:this.practiceThemeId});this.notify('试玩完成，正式下一关待题库接入');}
    else if(action.type==='theme') {
      if(!getTheme(action.themeId)){this.notify('主题暂时无法打开');return;}
      this.router.navigate('map',{themeId:action.themeId});
    }
    else if(action.type==='route') this.router.navigate(action.name);
    else if(action.type==='back') {
      const practice=this.router.current.params.practice;
      this.closePractice();
      if(practice)this.router.returnTo('map',{themeId:this.practiceThemeId});
      else this.router.back();
      this.input.cancel();
    }
    else if(action.type==='level') {
      if(!getTheme(action.themeId)||!Number.isInteger(action.index)||action.index<0||action.index>3){this.notify('关卡暂时无法打开');return;}
      const state=this.themeProgress[action.themeId].nodes[action.index];
      if(state==='today-locked')this.notify('仅当前关卡今日锁定');
      else if(state==='locked') this.notify('完成上一关后解锁');
      else this.router.navigate('level-ready',{themeId:action.themeId,levelId:`${action.themeId}-${action.index+1}`});
    }
    if(this.router.current!==previousRoute&&this.toastRoute!==this.router.current){this.toast=null;this.toastUntil=0;}
  }
  closePractice() {
    if(this.challenge)this.challenge.close();
    this.challenge=null;this.feedback=null;this.incorrectSelected=null;this.exitRequested=false;
    this.questionMedia.clear();
  }
  openPracticeRoute() {
    const map={themeId:this.practiceThemeId};
    if(this.router.current.name==='home')this.router.navigate('map',map);
    else if(this.router.current.name!=='map'||this.router.current.params.themeId!==this.practiceThemeId)this.router.returnTo('map',map);
    this.router.navigate('quiz',{themeId:this.practiceThemeId,levelId:`${this.practiceThemeId}-${this.practiceContent?this.practiceContent.levelOrder:1}`,practice:true});
    this.input.cancel();
  }
  startPractice() {
    if(this.router.current.name==='quiz'&&this.router.current.params.practice&&this.challenge)return;
    this.toast=null;
    this.closePractice();
    if(this.practiceLocked){this.openPracticeRoute();return;}
    const level={...getLevels(this.practiceThemeId)[this.practiceContent?this.practiceContent.levelOrder-1:0],themeName:getTheme(this.practiceThemeId).name};
    this.challenge=new Challenge({questions:this.practiceContent?this.practiceContent.questions:PRACTICE_QUESTIONS,level});
    this.openPracticeRoute();
  }
  viewState() {
    const themeId=this.router.current.params.themeId;
    const base={exitRequested:!!this.exitRequested,themeProgress:this.themeProgress,nodeStates:this.themeProgress[themeId]?this.themeProgress[themeId].nodes:[],practiceLocked:this.practiceLocked};
    const active=this.router.current.params && this.router.current.params.practice && this.challenge;
    if(active)return {...base,feedback:this.feedback,incorrectSelected:this.incorrectSelected,mediaImage:this.mediaImage,mediaFailed:this.mediaFailed,mediaStatus:this.mediaStatus,question:this.challenge.question,selected:this.challenge.selected,modal:this.challenge.state==='revive'?'revive':null,result:this.challenge.result,challengeState:this.challenge.state,practice:true};
    if(this.router.current.params.practice&&this.practiceLocked)return {...base,practice:true,challengeState:'locked'};
    return base;
  }
  loadMedia(force=false){const q=this.feedback?this.feedback.question:this.challenge&&this.challenge.question;this.questionMedia.load(q&&q.media,force);}
  notify(message) {this.toast=message;this.toastRoute=this.router.current;this.toastUntil=Date.now()+1800;}
  tick(time) {
    if(!this.running)return;
    this.loadMedia();
    const targets=this.renderer.render(this.router.current,this.viewport,{...this.viewState(),images:this.resources.images,progress:this.progress,time,pressedId:this.input.pressedId,toast:Date.now()<this.toastUntil?this.toast:null});
    this.input.setTargets(targets);this.input.scrollRegion=this.renderer.scrollRegion;
    if(this.platform.syncAccessibility)this.platform.syncAccessibility(this);
    this.frame=this.platform.requestFrame(this.tick);
  }
  pause() {this.running=false;if(this.frame!==null)this.platform.cancelFrame(this.frame);this.frame=null;this.input.cancel();this.audio.stopAll();}
  resume() {if(this.running||this.destroyed)return;this.running=true;this.frame=this.platform.requestFrame(this.tick);}
  destroy() {
    this.destroyed=true;this.questionMedia.clear();if(this.challenge)this.challenge.close();this.pause();this.audio.destroy();
    Object.keys(this.bound).forEach((key)=>this.platform.off(key.replace(/^on/,'off'),this.bound[key]));
    this.platform.off('offWindowResize',this.resize);
  }
}

module.exports=App;
