const App = require('./main');
const {HandRenderer, HAND_ART} = require('./ui/hand-renderer');
const {Resources} = require('./services/resources');
const {catalogTheme, catalogThemes, catalogLevel, catalogLevels} = require('./data/catalog');
const {HttpClient} = require('./services/http-client');

const MESSAGES = {
  AUTH_REQUIRED:'登录已过期，请重新进入游戏。', QUESTION_EXPIRED:'本题时间已到。',
  LEVEL_LOCKED:'本关今日已锁定，明日再来。', PREVIOUS_LEVEL_REQUIRED:'先完成上一关，再继续旅程。',
  SHARE_NOT_CONFIGURED:'当前环境还不能验证分享，请返回地图。', REQUEST_CONFLICT:'这次操作已处理，请刷新状态。',
  CONTENT_UNAVAILABLE:'本关题目准备中，请选择其他主题。', RULES_UNAPPROVED:'规则更新后待确认，请稍后再来。',
};
function requestId() { return 'client-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,12); }
function nextLevelId(challenge, catalog) {
  if(challenge?.result && Object.prototype.hasOwnProperty.call(challenge.result,'nextLevelId'))return challenge.result.nextLevelId;
  if(challenge && Object.prototype.hasOwnProperty.call(challenge,'nextLevelId'))return challenge.nextLevelId;
  const levels=catalogLevels(catalog,challenge?.themeId),index=levels.findIndex(level=>level.id===challenge?.levelId);
  return index>=0?levels[index+1]?.id||null:null;
}
class OnlineApp extends App {
  constructor(platform, {client = new HttpClient(), authenticate, share, download, shareCertificate, reducedMotion = false} = {}) {
    super(platform); this.renderer = new HandRenderer(this.ctx); this.client = client;
    this.resources = new Resources(platform, {extraArt: HAND_ART});
    this.authenticate = authenticate; this.shareAction = share; this.download = download; this.shareCertificate=shareCertificate;
    this.reducedMotion = reducedMotion; this.online = null; this.me = null; this.rankingPeriod = 'day';
    try { const preference=platform.api.getStorageSync('quiz:accessibility:v1');if(preference&&typeof preference.reducedMotion==='boolean')this.reducedMotion=preference.reducedMotion; } catch (_) {}
    this.rankings = {entries:[], period:'day'}; this.certificates = []; this.selected = null;
    this.busy = false; this.readyRemote = false; this.serverOffset = 0; this.revision = 0;
    this.startedAt = Date.now(); this.soundEnabled = !this.audio.muted;
  }
  start() {
    super.start(); this.initialization = this.initialize();
  }
  async initialize() {
    return this.run(async () => {
      try { await this.refreshMe(); }
      catch (error) {
        if (error.status !== 401 || !this.authenticate) throw error;
        await this.authenticate(this.client); await this.refreshMe();
      }
      await this.refreshCatalog();
      this.readyRemote = true; this.connectionError = null;
      if (this.router.current.name === 'loading' || this.router.current.name === 'error') this.router.replace('home');
    }, {initial:true});
  }
  async refreshMe() {
    const me = await this.client.request('/api/me'); this.me = me;
    if(!me.activeChallenge||['completed','locked'].includes(me.activeChallenge.state))me.activeChallenge=me.activeChallenges?.find(c=>!['completed','locked'].includes(c.state)) || null;
    const raw = me.progress || me.themeProgress || {};
    this.themeProgress = Object.fromEntries(Object.entries(raw).map(([id, p]) => [id, {
      ...p, completed:p.completed || 0, nodes:(p.nodes || []).map(x=>({available:'current',completed:'complete'}[x] || x))
    }]));
    return me;
  }
  async refreshCatalog() {
    const catalog=await this.client.request('/api/catalog');
    const changed=JSON.stringify(this.catalog)!==JSON.stringify(catalog);
    this.catalog=catalog;
    if(changed)await this.loadConfiguredArt();
  }
  async loadConfiguredArt() {
    this.configuredImages = {};
    const cfg = this.catalog?.config || this.me?.config;
    const sources = [['cover',cfg?.cover],...(cfg?.themes||[]).flatMap(t=>[[t.id,t.cover],['map-'+t.id,t.mapImage]])].filter(([,src])=>src);
    await Promise.all(sources.map(([id,src])=>new Promise(resolve=>{
      const image=this.platform.createImage(),timer=setTimeout(resolve,4000);
      image.onload=()=>{clearTimeout(timer);this.configuredImages[id]=image;resolve();};
      image.onerror=()=>{clearTimeout(timer);resolve();};image.src=this.platform.resolveMediaUrl?.(src)||src;
    })));
  }
  run(operation, {initial = false} = {}) {
    if (this.busy) return this.task;
    if(this.connectionError){this.toast=null;this.toastUntil=0;}
    this.busy = true; this.connectionError = null; this.input.cancel();
    const task = Promise.resolve().then(async()=>{
      try { return await operation(); }
      catch (e) {
        this.connectionError = MESSAGES[e.code] || e.message || '操作暂时未完成，请重试。';
        this.lastFailed = operation; this.notify(this.connectionError);
        if(e.status===401)this.readyRemote=false;
        if (initial || e.status === 401) this.router.replace('error');
        return null;
      } finally { this.busy = false; this.input.cancel(); if(this.task===task)this.task=null; }
    });
    this.task = task; return task;
  }
  synchronize(snapshot) {
    if (!snapshot || typeof snapshot.id !== 'string') throw Error('INVALID_CHALLENGE');
    if(this.online?.question?.id!==snapshot.question?.id||snapshot.state!=='answering')this.platform.closeVideo?.();
    this.online = snapshot; this.selected = null; this.revision++;
    if (Number.isFinite(snapshot.serverTime)) this.serverOffset = snapshot.serverTime - Date.now();
    if (snapshot.state === 'completed') {
      this.router.replace('result', {themeId:snapshot.themeId, levelId:snapshot.levelId});
      this.celebrationAt = Date.now(); this.platform.effect?.('complete', this.soundEnabled);
    } else {
      this.router.replace('quiz', {themeId:snapshot.themeId, levelId:snapshot.levelId});
      if (snapshot.state === 'feedback') this.platform.effect?.('correct', this.soundEnabled);
      if (snapshot.state === 'revive' || snapshot.state === 'locked') this.platform.effect?.('wrong', this.soundEnabled);
    }
    this.challenge = {question:this.questionView(), selected:this.selected,close(){}};
    this.feedback = this.feedbackView(); this.questionMedia.clear(); this.loadMedia();
  }
  questionView() {
    const c = this.online, q = c?.question;
    if (!q) return null;
    const level=catalogLevel(this.catalog,c.levelId), theme=catalogTheme(this.catalog,c.themeId);
    const order=c.levelOrder || level?.displayOrder || 1;
    const mediaSrc=q.media?.src||q.media?.url;
    return {...q,media:q.media?{...q.media,src:this.platform.resolveMediaUrl?.(mediaSrc)||mediaSrc}:null, position:(c.position || 0)+1, total:c.total || 10, levelOrder:order,
      levelName:c.levelName || level?.name || '', difficultyLabel:c.difficultyLabel || level?.difficulty || q.difficulty || '知识挑战',
      themeName:c.themeName || theme?.name || '乡村知识', practice:false};
  }
  feedbackView() {
    const f = this.online?.feedback;
    return this.online?.state === 'feedback' && f ? {question:this.questionView(), selected:f.selected, explanation:f.explanation, answer:f.answer, right:f.right} : null;
  }
  startLevel(levelId) {
    const id = requestId(); return this.run(async()=>{
      const snapshot = await this.client.request('/api/challenges', {levelId, requestId:id});
      this.activeLevelId = levelId;
      const themeId = snapshot.themeId;
      this.router.returnTo('map', {themeId});
      this.router.navigate('quiz', {themeId, levelId}); this.synchronize(snapshot);
    });
  }
  mutateChallenge(endpoint, payload = {}) {
    const challengeId = this.online?.id, id = requestId();
    return this.run(async()=>{
      const snapshot = await this.client.request('/api/challenges/' + encodeURIComponent(challengeId) + '/' + endpoint, {...payload, requestId:id});
      this.synchronize(snapshot);
      if (['completed','locked'].includes(snapshot.state)) await this.refreshMe();
    });
  }
  handle(action) {
    if(action.type==='close-video'){this.platform.closeVideo?.();return;}
    if (this.exitRequested && !['exit-cancel','exit-confirm'].includes(action.type)) return;
    if (action.type === 'retry-remote') {
      if (!this.readyRemote) return this.initialize();
      return this.run(this.lastFailed || (()=>this.refreshMe()));
    }
    if (this.busy || !this.readyRemote) return;
    this.platform.effect?.('press', this.soundEnabled);
    if (action.type === 'formal-start') return this.startLevel(action.levelId);
    if (action.type === 'practice') {
      const active = this.me?.activeChallenge;
      if (active?.id) return this.run(async()=>{
        const snapshot = await this.client.request('/api/challenges/' + encodeURIComponent(active.id));
        this.activeLevelId = snapshot.levelId;
        this.router.navigate('map', {themeId:snapshot.themeId}); this.router.navigate('quiz', {themeId:snapshot.themeId,levelId:snapshot.levelId}); this.synchronize(snapshot);
      });
      if(action.chooseTheme){this.router.navigate('themes');return;}
      const candidates=catalogThemes(this.catalog).flatMap(theme=>catalogLevels(this.catalog,theme.id).map(level=>({theme,level,state:this.levelState(level)})));
      const choice=candidates.find(item=>item.state==='current') || candidates.find(item=>item.state==='complete');
      if(!choice){this.notify('暂无可开始的关卡，请查看主题状态。');return;}
      this.router.navigate('map',{themeId:choice.theme.id}); this.router.navigate('level-ready',{themeId:choice.theme.id,levelId:choice.level.id}); return;
    }
    if (action.type === 'option') {
      if(this.online?.state!=='answering'||action.questionId!==this.online.question?.id)return;
      this.selected = action.index; if(this.challenge)this.challenge.selected=this.selected; return;
    }
    if (action.type === 'confirm') {
      if(this.online?.state!=='answering'||this.selected==null||action.questionId!==this.online.question?.id)return;
      return this.mutateChallenge('answer',{questionId:action.questionId,optionId:this.selected});
    }
    if (action.type === 'continue') return this.mutateChallenge('advance');
    if (action.type === 'share') {
      if (this.online?.state === 'revive') {
        const challengeId=this.online.id,id=requestId();let evidence=null;
        return this.run(async()=>{
        if (!this.shareAction) throw Error('当前环境分享不可用。');
        evidence ||= await this.shareAction({type:'revive',challenge:this.online,mode:this.me?.mode || this.catalog?.mode,settings:this.catalog?.config?.share,reviveSettings:this.catalog?.config?.revive});
        if (!evidence) {this.notify('分享未完成，可返回地图或重试。');return;}
        const snapshot = await this.client.request('/api/challenges/'+encodeURIComponent(challengeId)+'/revive',{evidence,requestId:id});
        this.synchronize(snapshot);
      });
      }
      return this.run(async()=>{
        await this.shareAction?.({type:'result',result:this.online?.result,levelId:this.online?.levelId,settings:this.catalog?.config?.share});
      });
    }
    if (action.type === 'exit-request') {this.exitRequested=true;this.input.cancel();return;}
    if (action.type === 'exit-cancel') {this.exitRequested=false;this.input.cancel();return;}
    if (action.type === 'exit-confirm') {
      this.exitRequested=false;
      return this.run(async()=>{
        const snapshot = await this.client.request('/api/challenges/'+encodeURIComponent(this.online.id)+'/exit',{requestId:requestId()});
        const themeId=this.online.themeId; this.online=snapshot;this.challenge=null;this.feedback=null;this.questionMedia.clear();
        await this.refreshMe();this.router.returnTo('map',{themeId});
      });
    }
    if (action.type === 'replay') return this.startLevel(this.online?.levelId || this.activeLevelId);
    if (action.type === 'next') {
      const c = this.online;
      if(!c)return;
      const themeLevels=catalogLevels(this.catalog,c.themeId),index=themeLevels.findIndex(level=>level.id===c.levelId);
      const nextId=nextLevelId(c,this.catalog);
      const next=nextId?catalogLevel(this.catalog,nextId):null;
      this.challenge=null;this.feedback=null;this.questionMedia.clear();
      this.router.returnTo('map',{themeId:c.themeId});
      if(next&&next.enabled!==false)this.router.navigate('level-ready',{themeId:c.themeId,levelId:next.id});
      else if(c.result?.themeComplete ?? c.themeComplete ?? (index===themeLevels.length-1&&index>=0)) {this.router.returnTo('home');this.notify('主题已完成，可查看获得的证书。');return this.handle({type:'route',name:'certificates'});}
      else this.notify('关卡配置已调整，请查看当前旅程。');
      return;
    }
    if (action.type === 'route' || action.type === 'settings') {
      const name = action.name || 'settings'; this.router.navigate(name);
      if(name==='ranking')return this.loadRankings(this.rankingPeriod);
      if(name==='certificates')return this.run(async()=>{const data=await this.client.request('/api/certificates');this.certificates=(Array.isArray(data)?data:data.certificates||[]).map(c=>({...c,url:c.url||c.downloadUrl}));});
      return;
    }
    if(action.type==='ranking-period')return this.loadRankings(action.period);
    if(action.type==='certificate-download')return this.run(async()=>{await this.download?.('/api/certificates/'+encodeURIComponent(action.id)+'.svg');});
    if(action.type==='certificate-share')return this.run(async()=>{
      const certificate=this.certificates.find(item=>item.id===action.id);
      if(!certificate)throw Error('证书尚未获得。');
      if(!this.shareCertificate)throw Error('当前环境可先下载证书再分享。');
      await this.shareCertificate('/api/certificates/'+encodeURIComponent(action.id)+'.svg',certificate);
    });
    if(action.type==='toggle-sound'){
      this.soundEnabled=!this.soundEnabled;this.audio.muted=!this.soundEnabled;
      this.storage.savePreferences({muted:!this.soundEnabled});return;
    }
    if(action.type==='toggle-motion'){this.reducedMotion=!this.reducedMotion;try{this.platform.api.setStorageSync('quiz:accessibility:v1',{reducedMotion:this.reducedMotion});}catch(_){}return;}
    if(action.type==='play-video'){this.platform.playVideo?.(action.src || action.url);return;}
    if(action.type==='theme') {
      const theme=catalogTheme(this.catalog,action.themeId);
      if(!theme||theme.enabled===false){this.notify('本主题正在准备中');return;}
      this.router.navigate('map',{themeId:action.themeId});return;
    }
    if(action.type==='level'){
      const level=action.levelId?catalogLevel(this.catalog,action.levelId):catalogLevels(this.catalog,action.themeId)[action.index];
      if(!level||level.themeId!==action.themeId||level.enabled===false){this.notify('本关正在准备中');return;}
      const s=this.levelState(level);
      if(s==='locked'){this.notify('完成上一关后解锁');return;}
      if(s==='today-locked'){this.notify('本关今日锁定，明日再来');return;}
      this.router.navigate('level-ready',{themeId:action.themeId,levelId:level.id});return;
    }
    if(action.type==='home'){this.router.returnTo('home');return;}
    if(action.type==='back'){
      if(this.router.current.name==='quiz'){const themeId=this.online?.themeId;this.challenge=null;this.feedback=null;this.questionMedia.clear();this.router.returnTo('map',{themeId});this.run(()=>this.refreshMe());}
      else this.router.back();
      return;
    }
    if(action.type==='retry-media')this.loadMedia(true);
  }
  loadRankings(period){
    this.rankingPeriod=period==='total'?'total':'day';
    return this.run(async()=>{const data=await this.client.request('/api/rankings?period='+this.rankingPeriod);this.rankings={...data,entries:(data.entries||[]).map(e=>({...e,completedLevels:e.completedLevels||e.completed||0,isMe:e.userId===this.me?.user?.id,points:e.points||0}))};});
  }
  levelState(level){
    const progress=this.themeProgress[level.themeId];
    const ids=progress?.levelIds || catalogLevels(this.catalog,level.themeId).map(item=>item.id);
    const index=ids.indexOf(level.id);
    return index>=0 ? progress?.nodes?.[index] || (index===0?'current':'locked') : 'locked';
  }
  viewState() {
    const c=this.online, q=this.questionView(), level=catalogLevel(this.catalog,c?.levelId),theme=catalogTheme(this.catalog,c?.themeId);
    const themeLevels=catalogLevels(this.catalog,c?.themeId), index=themeLevels.findIndex(item=>item.id===c?.levelId);
    const order=c?.levelOrder || level?.displayOrder || 1;
    const nextId=nextLevelId(c,this.catalog);
    const nextLevel=nextId?catalogLevel(this.catalog,nextId):null;
    const remoteResult=c?.result, remaining=c?.deadline?Math.max(0,Math.ceil((c.deadline-(Date.now()+this.serverOffset))/1000)):30;
    const result=remoteResult?{...remoteResult,themeName:c?.themeName || theme?.name,levelOrder:order,levelName:c?.levelName || level?.name,practice:false,points:remoteResult.points||0,
      nextLevelId:nextLevel?.enabled!==false?nextId:null,themeComplete:remoteResult.themeComplete ?? c?.themeComplete ?? (index===themeLevels.length-1&&index>=0),
      accuracyPercent:Math.round((remoteResult.accuracy||0)* (remoteResult.accuracy<=1?100:1)),attempts:remoteResult.totalAnswered, nextDifficulty:nextLevel?.difficulty || null,
      finalExplanation:c.feedback?.right?c.feedback.explanation:null}:null;
    return {onlineCampaign:true, themeProgress:this.themeProgress,nodeStates:this.themeProgress[this.router.current.params.themeId]?.nodes,
      question:q, selected:this.selected, feedback:this.feedbackView(), result,challengeState:c?.state,
      modal:c?.state==='revive'?'revive':null,incorrectSelected:c?.feedback?.selected,exitRequested:!!this.exitRequested,
      mediaImage:this.mediaImage, mediaFailed:this.mediaFailed,mediaStatus:this.mediaStatus,
      totalPoints:this.me?.points||this.me?.totalPoints||0,userName:this.me?.user?.name || '乡村探索者',
      rankings:this.rankings, certificates:this.certificates, remainingSeconds:remaining,countdownTotal:c?.countdownSeconds||this.me?.config?.timer?.seconds||30,
      submitting:this.busy,loadingRemote:!this.readyRemote,connectionError:this.connectionError,
      mode:this.me?.mode || this.catalog?.mode || 'experience',shareReady:!!this.shareAction&&(this.me?.mode!=='production'||this.catalog?.readiness?.shareConfigured===true),reviveUsed:!!c?.reviveUsed,
      reviveLimit:c?.reviveLimit ?? this.catalog?.config?.revive?.limit ?? 1,revivesRemaining:c?.revivesRemaining ?? Math.max(0,(c?.reviveLimit ?? this.catalog?.config?.revive?.limit ?? 1)-(c?.reviveCount ?? (c?.reviveUsed?1:0))),
      dailyPoints:this.me?.dailyPoints || 0,dailyPointCap:this.me?.dailyPointCap ?? null,dailyRemaining:this.me?.dailyRemaining ?? null,canShareCertificate:!!this.shareCertificate,
      soundEnabled:this.soundEnabled,reducedMotion:this.reducedMotion,celebrationAt:this.celebrationAt,
      hasActiveChallenge:!!this.me?.activeChallenge,continueLabel:this.me?.activeChallenge?'继续本次挑战':'开启知识之旅',catalog:this.catalog,
      configuredImages:this.configuredImages,videoActive:!!this.platform.videoActive?.()};
  }
  tick(time) {
    if(this.online?.state==='answering'&&this.online.deadline&&Date.now()+this.serverOffset>=this.online.deadline&&!this.busy&&Date.now()>(this.nextDeadlinePoll||0)&&this.router.current.name==='quiz') {
      const id=this.online.id;this.nextDeadlinePoll=Date.now()+3000;this.run(async()=>this.synchronize(await this.client.request('/api/challenges/'+encodeURIComponent(id))));
    }
    super.tick(time);
  }
  resume(){
    super.resume();
    if(this.readyRemote&&!this.busy)this.run(async()=>{
      if(this.online&&this.router.current.name==='quiz')this.synchronize(await this.client.request('/api/challenges/'+encodeURIComponent(this.online.id)));
      await this.refreshMe();await this.refreshCatalog();
    });
  }
  pause(){this.platform.closeVideo?.();super.pause();}
}
module.exports = {OnlineApp, requestId};
