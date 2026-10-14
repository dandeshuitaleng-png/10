const App=require('./main');
const {LocalProgress,LOCAL_PROGRESS_KEY,LEGACY_PROGRESS_KEY}=require('./services/local-progress');
const {getTheme,getLevels}=require('./data/themes');
const {copyQuestion}=require('./core/question');
class LocalCampaign extends App {
  constructor(platform,{pools,sourceId,manifest,qualityRefinement=false}={}){
    if(!pools||typeof sourceId!=='string'||!sourceId.trim())throw Error('INVALID_LOCAL_CAMPAIGN');
    const checked={};for(const [id,questions]of Object.entries(pools)){
      if(!Array.isArray(questions)||questions.length<10||new Set(questions.map(q=>q.id)).size!==questions.length)throw Error('INVALID_LOCAL_POOL');
      checked[id]=questions.map(copyQuestion);
    }
    super(platform);this.qualityRefinement=qualityRefinement;this.localPools=checked;this.localProgress=new LocalProgress(platform.api,sourceId,manifest);this.themeProgress=this.localProgress.view;
    this.unsubscribeProgress=this.localProgress.subscribe(()=>{this.themeProgress=this.localProgress.view;});
    this.unsubscribeStorage=platform.api.subscribeStorage?.(key=>{if(key===LOCAL_PROGRESS_KEY||key===LEGACY_PROGRESS_KEY)this.localProgress.refresh();});
  }
  prepare(themeId,order){this.closePractice();if(this.router.current.name==='home')this.router.navigate('map',{themeId});else this.router.returnTo('map',{themeId});this.router.navigate('level-ready',{themeId,levelId:themeId+'-'+order});this.input.cancel();}
  startLocal(themeId,order){
    if(this.router.current.name==='quiz'&&this.challenge)return;
    const level=getTheme(themeId)&&getLevels(themeId)[order-1];
    if(!level||!this.localProgress.canEnter(themeId,order)||!this.localPools[level.id]){this.notify('请先完成上一关或确认存档提示；题库不足时不能开始');return;}
    this.practiceContent={themeId,levelOrder:order,questions:this.localPools[level.id]};this.practiceThemeId=themeId;this.localCompletion=null;this.practiceLocked=false;super.startPractice();
  }
  handle(action){
    if(this.localProgress.pending)return;
    if(this.exitRequested)return super.handle(action);
    if(action.type==='practice'){const d=this.localProgress.destination;if(d.map){this.router.navigate('map',{themeId:d.themeId});this.input.cancel();}else this.prepare(d.themeId,d.order);return;}
    if(action.type==='local-start'){this.startLocal(action.themeId,action.order);return;}
    if(action.type==='save-retry'){this.retrySave();return;}
    if(action.type==='replay'){if(this.localProgress.status==='saving')return;this.startLocal(this.practiceThemeId,this.practiceContent.levelOrder);return;}
    if(action.type==='home'){this.closePractice();this.router.returnTo('home');this.input.cancel();return;}
    if(action.type==='next'){
      if(this.localProgress.status==='saving')return;
      const themeId=this.practiceThemeId,order=this.practiceContent.levelOrder;
      if(order<4&&this.qualityRefinement)this.prepare(themeId,order+1);else{this.closePractice();this.router.returnTo('map',{themeId});this.input.cancel();}
      this.renderer.scrollKey=null;return;
    }
    if(action.type==='theme'&&getTheme(action.themeId))this.localProgress.visit(action.themeId);
    super.handle(action);
    if(action.type==='confirm'&&this.challenge?.state==='complete'&&!this.localCompletion){
      this.router.current.params.themeId=this.practiceThemeId;
      const completion={ok:true,earned:this.challenge.level.order<=this.localProgress.completed[this.practiceThemeId]?0:this.challenge.level.points,saved:false,status:'saving',replay:this.challenge.level.order<=this.localProgress.completed[this.practiceThemeId]};this.localCompletion=completion;
      this.saveTask=this.localProgress.complete(this.practiceThemeId,this.challenge.level.order).then(result=>{Object.assign(completion,result);});
    }
  }
  retrySave(){if(this.retryTask||this.localProgress.status==='saving')return this.retryTask;const completion=this.localCompletion,wasSaved=completion?.saved,themeId=this.practiceThemeId,order=this.practiceContent?.levelOrder,points=this.challenge?.level.points||completion?.earned||0;this.retryTask=this.localProgress.save().then(result=>{if(completion){Object.assign(completion,result);if(result.saved&&!wasSaved)completion.earned=result.credited?.[themeId]?.includes(order)?points:0;}}).finally(()=>{this.retryTask=null;});return this.retryTask;}
  viewState(){const base=super.viewState();return {...base,localCampaign:true,qualityRefinement:this.qualityRefinement,localStorageStatus:this.localProgress.status,localTotal:this.localProgress.total,localCompletion:this.localCompletion,localDestination:this.localProgress.destination};}
  destroy(){this.unsubscribeProgress?.();this.unsubscribeStorage?.();super.destroy();}
}
module.exports=LocalCampaign;
