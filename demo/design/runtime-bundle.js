(function(){const modules={"/js/core/challenge.js":function(module,exports,require){
// Local playtest state machine. Production scoring must use the server adapter.
const {copyQuestion,questionView}=require('./question');
class Challenge {
  constructor({ questions, level, random = Math.random, verifyShare = null }) {
    if (!level || !Array.isArray(questions) || questions.length < 10) throw new Error('INSUFFICIENT_QUESTIONS');
    const ids = new Set();
    const pool=questions.map(q=>{
      const copy=copyQuestion(q);if(ids.has(copy.id))throw new Error('INVALID_QUESTION');ids.add(copy.id);return copy;
    });
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));if(j<0||j>i)throw new Error('INVALID_RANDOM');[pool[i],pool[j]]=[pool[j],pool[i]];}
    this.questions=pool.slice(0,10);this.level={...level};this.verifyShare=verifyShare;
    this.position=0;this.correct=0;this.attempts=0;this.selected=null;this.revived=false;this.state='answering';this.pending=false;this.closed=false;
  }
  select(index,expectedQuestionId=null) {
    if(this.closed||this.state!=='answering'||(expectedQuestionId!=null&&expectedQuestionId!==this.questions[this.position].id)||!Number.isInteger(index)||index<0||index>3)return false;
    this.selected=index;return true;
  }
  submit(expectedQuestionId) {
    if(this.closed||this.state!=='answering'||this.selected===null||expectedQuestionId!==this.questions[this.position].id)return false;
    const right=this.selected===this.questions[this.position].answer;
    this.attempts++;this.selected=null;
    if(right){this.correct++;if(this.correct===10)this.state='complete';else this.position++;}
    else this.state=this.revived?'locked':'revive';
    return {right,state:this.state};
  }
  async revive(evidence) {
    if(this.closed||this.state!=='revive'||this.revived||this.pending)return false;
    if(!this.verifyShare)throw new Error('SHARE_VERIFICATION_UNAVAILABLE');
    this.pending=true;
    try {
      const response=await this.verifyShare(evidence);
      if(this.closed||this.state!=='revive'||!response||response.verified!==true)return false;
      this.revived=true;this.state='answering';this.selected=null;return true;
    } finally {this.pending=false;}
  }
  close(){this.closed=true;}
  get question(){return questionView(this.questions[this.position],{position:this.position+1,total:this.questions.length,levelOrder:this.level.order,difficultyLabel:this.level.difficulty,themeName:this.level.themeName,practice:true});}
  get result(){return {themeName:this.level.themeName,levelOrder:this.level.order,points:null,accuracyPercent:null,correct:this.correct,attempts:this.attempts,practice:true,complete:this.state==='complete'};}
}
module.exports={Challenge};

},
"/js/core/input.js":function(module,exports,require){
function contains(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

class Input {
  constructor(onAction, onScroll = null) { this.onAction = onAction; this.onScroll=onScroll; this.scrollRegion=null; this.targets = []; this.active = null; }
  setTargets(targets) { this.targets = targets; }
  start(point, id = 0) {
    if (this.active) return;
    const target = [...this.targets].reverse().find((item) => !item.disabled && contains(item, point));
    if (target || (this.scrollRegion && contains(this.scrollRegion,point))) this.active = { target, start: point, last:point, id, cancelled: false, dragging: false, scroll:!!(this.scrollRegion&&contains(this.scrollRegion,point)) };
  }
  move(point, id = 0) {
    if (!this.active || this.active.id !== id) return;
    if(this.active.scroll&&(this.active.dragging||Math.abs(point.y-this.active.start.y)>12)){
      this.active.dragging=true;this.active.cancelled=true;
      if(this.onScroll)this.onScroll(this.active.last.y-point.y);
    }
    this.active.last=point;
    if (!this.active.target || !contains(this.active.target, point) || Math.hypot(point.x - this.active.start.x, point.y - this.active.start.y) > 12) this.active.cancelled = true;
  }
  end(point, id = 0) {
    if (!this.active || this.active.id !== id) return;
    const { target, cancelled } = this.active;
    this.active = null;
    if (target && !cancelled && contains(target, point)) this.onAction(target.action);
  }
  cancel() { this.active = null; }
  get pressedId() { return this.active && !this.active.cancelled && this.active.target ? this.active.target.id : null; }
}

module.exports = { Input, contains };

},
"/js/core/local-content.js":function(module,exports,require){
// Only player-visible question content participates; review/source metadata is excluded.
function levelContent(questions){return JSON.stringify(questions.map(q=>({id:q.id,title:q.title,options:q.options,answer:q.answer,explanation:q.explanation||'',difficulty:q.difficulty||null,media:q.media?{type:q.media.type,src:q.media.src,alt:q.media.alt||'',caption:q.media.caption||''}:null})).sort((a,b)=>a.id.localeCompare(b.id)));}
module.exports={levelContent};

},
"/js/core/question.js":function(module,exports,require){
// Common four-choice schema and immutable rendering snapshot. Answers stay in the challenge.
const DIFFICULTIES = ['基础', '进阶', '综合'];
function validateQuestion(q) {
  if (!q || typeof q.id !== 'string' || !q.id.trim() || typeof q.title !== 'string' || !q.title.trim() ||
      !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(s => typeof s !== 'string' || !s.trim()) ||
      !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3 ||
      (q.explanation != null && typeof q.explanation !== 'string') ||
      (q.difficulty != null && !DIFFICULTIES.includes(q.difficulty))) throw new Error('INVALID_QUESTION');
  if (q.media && (q.media.type !== 'image' || typeof q.media.src !== 'string' || !q.media.src.trim() ||
      ['alt','caption'].some(k => q.media[k] != null && typeof q.media[k] !== 'string'))) throw new Error('INVALID_QUESTION_MEDIA');
  return q;
}
function copyQuestion(q) { validateQuestion(q); return {...q,options:q.options.slice(),media:q.media?{...q.media}:null}; }
function questionView(q, context) {
  const media=q.media?Object.freeze({...q.media}):null;
  return Object.freeze({id:q.id,title:q.title,options:Object.freeze(q.options.slice()),media,
    kind:media?'image-choice':'text-choice',difficulty:q.difficulty||null,
    position:context.position,total:context.total,levelOrder:context.levelOrder,
    difficultyLabel:context.difficultyLabel,themeName:context.themeName,practice:context.practice===true});
}
module.exports={validateQuestion,copyQuestion,questionView};

},
"/js/core/router.js":function(module,exports,require){
const ROUTES = Object.freeze(['loading', 'home', 'themes', 'points', 'map', 'level-ready', 'quiz', 'result', 'ranking', 'certificates', 'settings', 'error']);

class Router {
  constructor() { this.current = { name: 'loading', params: {} }; this.history = []; }
  navigate(name, params = {}) {
    if (!ROUTES.includes(name)) throw new Error(`Unknown route: ${name}`);
    if (name === this.current.name && JSON.stringify(params) === JSON.stringify(this.current.params)) return;
    this.history.push(this.current);
    this.current = { name, params };
  }
  replace(name, params = {}) {
    if (!ROUTES.includes(name)) throw new Error(`Unknown route: ${name}`);
    this.current = { name, params };
  }
  returnTo(name, params = {}) {
    if (!ROUTES.includes(name)) throw new Error(`Unknown route: ${name}`);
    const encoded = JSON.stringify(params);
    for (let i = this.history.length - 1; i >= 0; i--) {
      const route = this.history[i];
      if (route.name === name && JSON.stringify(route.params) === encoded) {
        this.current = route;
        this.history = this.history.slice(0, i);
        return;
      }
    }
    this.replace(name, params);
  }
  back() { this.current = this.history.pop() || { name: 'home', params: {} }; }
}

module.exports = { Router, ROUTES };

},
"/js/core/viewport.js":function(module,exports,require){
function createViewport(info, capsule) {
  const width = info.windowWidth || info.screenWidth || 375;
  const height = info.windowHeight || info.screenHeight || 812;
  const scale = width / 375;
  const safe = info.safeArea || { top: 0, bottom: height };
  const top = Math.max(44, info.statusBarHeight || 0, (capsule && capsule.bottom + 12) || 0, safe.top || 0);
  const bottom = Math.min(height, Number.isFinite(safe.bottom) ? safe.bottom : height);
  return { width: 375, height: height / scale, scale, pixelRatio: Math.min(info.pixelRatio || 1, 3),
    physicalWidth: width, physicalHeight: height, top: top / scale, bottom: (bottom - 16) / scale };
}

function toLogical(touch, viewport) {
  const x = Number.isFinite(touch.clientX) ? touch.clientX : touch.x;
  const y = Number.isFinite(touch.clientY) ? touch.clientY : touch.y;
  return { x: x / viewport.scale, y: y / viewport.scale };
}

module.exports = { createViewport, toLogical };

},
"/js/data/approved-pools.js":function(module,exports,require){
// Legacy module path. Online questions are loaded from the server; never embed authoring answers in the player bundle.
module.exports = {};

},
"/js/data/catalog.js":function(module,exports,require){
const { THEMES, getLevels } = require('./themes');

// The old four-theme dataset is an initial instance, never a restriction on a
// received activity. An intentionally empty catalogue must remain empty.
function catalogThemes(catalog, { includeDisabled = false } = {}) {
  const source = catalog == null ? THEMES : catalog.themes || catalog.config?.themes || [];
  return source.map((theme, index) => {
    const original = THEMES.find(item => item.id === theme.id);
    return { description: '开启新的乡村知识旅程', motif: 'book', defaultart: original?.id || null, ...original, ...theme, order: Number.isFinite(theme.order) ? theme.order : index + 1 };
  }).filter(theme => !theme.deleted && (includeDisabled || theme.enabled !== false)).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
function catalogTheme(catalog, id) {
  return catalogThemes(catalog, { includeDisabled: true }).find(theme => theme.id === id) || null;
}
function catalogLevels(catalog, themeId, { includeDisabled = false } = {}) {
  const source = catalog == null ? THEMES.flatMap(theme => getLevels(theme.id)) : catalog.levels || [];
  return source.filter(level => !level.deleted && level.themeId === themeId && (includeDisabled || level.enabled !== false))
    .slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((level, index) => ({ ...level, displayOrder: index + 1, label: `第${index + 1}关`, difficulty: level.difficultyLabel || level.name || level.difficulty || '知识挑战', questionCount: Number.isInteger(level.questionCount) ? level.questionCount : 10 }));
}
function catalogLevel(catalog, id) {
  const themes = catalogThemes(catalog, { includeDisabled: true });
  for (const theme of themes) {
    const level = catalogLevels(catalog, theme.id, { includeDisabled: true }).find(item => item.id === id);
    if (level) return level;
  }
  return null;
}
function usesOriginalMap(catalog, themeId) {
  if (!THEMES.some(theme => theme.id === themeId)) return false;
  const levels = catalogLevels(catalog, themeId);
  return levels.length === 4 && levels.every((level, index) => level.id === `${themeId}-${index + 1}` && level.order === index + 1);
}
module.exports = { catalogThemes, catalogTheme, catalogLevels, catalogLevel, usesOriginalMap };

},
"/js/data/content.js":function(module,exports,require){
// Valid enabled questions enter the runtime without a review workflow.
const { validateQuestion } = require('../core/question');
const QUESTION_POOLS = require('./approved-pools');

function inspectPool(levelId) {
  const questions = QUESTION_POOLS[levelId] || [];
  if (questions.length < 10) return { ready: false, reason: 'insufficient-content' };
  const ids = new Set();
  try {
    for (const q of questions) {
      validateQuestion(q);
      if (q.levelId !== levelId || q.enabled === false || ids.has(q.id)) return { ready: false, reason: 'invalid-content' };
      ids.add(q.id);
    }
  } catch (_) { return { ready: false, reason: 'invalid-content' }; }
  return { ready: true, questions };
}

module.exports = { QUESTION_POOLS, inspectPool };

},
"/js/data/learning-progress.js":function(module,exports,require){
const {catalogThemes, catalogLevels} = require('./catalog');

// Progress is a join of the current enabled catalogue with saved level IDs.
// Historical aggregate counts may include disabled levels; never use them here.
function learningProgress(catalog, progress = {}) {
  if (catalog == null) return {ready:false, completed:0, total:null, themes:[], label:'正在读取学习进度…', ariaLabel:'正在读取学习进度'};
  const themes = catalogThemes(catalog).map(theme => {
    const levels = catalogLevels(catalog, theme.id), saved = progress[theme.id] || {};
    const states = new Map((saved.levelIds || []).map((id, index) => [id, saved.nodes?.[index]]));
    const completed = levels.filter(level => ['complete','completed'].includes(saved.levelStates?.[level.id] ?? states.get(level.id))).length;
    const total = levels.length, state = !total ? 'empty' : completed === total ? 'complete' : completed ? 'partial' : 'idle';
    return {...theme, levelIds:levels.map(level=>level.id), completed, total, state,
      ariaLabel:theme.name + (total ? '，已完成'+completed+' / '+total+'关' : '，暂无可参与关卡')};
  });
  const completed = themes.reduce((sum,theme)=>sum+theme.completed,0), total = themes.reduce((sum,theme)=>sum+theme.total,0);
  const label = total ? '已完成 '+completed+' / '+total+' 关' : '主题内容正在准备中';
  return {ready:true, completed, total, themes, label, ariaLabel:themes.length ? '我的学习进度，'+themes.map(theme=>theme.ariaLabel).join('；') : label};
}

module.exports = {learningProgress};

},
"/js/data/practice.js":function(module,exports,require){
// Illustrative ecological questions for an explicitly labelled playtest only.
// These are not reviewed local content and never enter QUESTION_POOLS.
const rows=[
['河边游玩后，垃圾应该怎样处理？',['装好后带到垃圾收集点','留在草丛里','倒进河里','埋在岸边'],0,'带走垃圾，交给合适的垃圾收集设施处理。'],
['观察野生鸟类，哪种做法合适？',['保持距离，安静观察','追逐鸟群','靠近鸟巢抓幼鸟','用石子驱赶'],0,'保持距离，避免干扰野生动物。'],
['发现水龙头一直滴水，应该怎么做？',['提醒管理人员维修','让它继续滴水','把水引到地面','只拍照不处理'],0,'及时报告漏水，减少水资源浪费。'],
['哪种物品适合反复使用？',['可清洗的水杯','用过的一次性纸杯','破损的塑料袋','沾油的纸巾'],0,'使用可反复清洗的水杯，可以减少一次性用品消耗。'],
['进入自然保护区域，应选择哪条路？',['允许通行的步道','穿过封闭的区域','随意踩踏湿地','沿着动物巢穴走'],0,'遵守现场标识，沿允许通行的步道行走。'],
['为什么不要随意放生外来动物？',['可能影响当地生态','一定能帮助所有动物','能让河流自动变清','可以替代环境保护'],0,'外来物种可能影响当地生态，不能随意放生。'],
['野餐结束，哪种行为更合适？',['清理现场并带走垃圾','留下塑料餐具','把剩菜倒进溪流','把包装烧在草地上'],0,'野餐后清理现场，避免垃圾和食物残渣污染环境。'],
['发现有人破坏保护区标识，怎么办？',['告知管理人员','和他一起拆掉','自己冒险追赶','把标识扔掉'],0,'在保证自身安全的前提下，向管理人员报告。'],
['植物根系对土壤有什么作用？',['有助于固定土壤','让土壤全部消失','让所有雨水不能下渗','自动清除全部污染'],0,'根系有助于固定土壤，减少水土流失。'],
['为什么不应把废电池丢在河边？',['应按当地要求分类处理','废电池可以净化河水','鱼会吃掉废电池','电池会马上变成石头'],0,'废电池应按当地分类要求处理，避免随意丢弃。'],
['爱护草地，哪种行为合适？',['沿开放道路通行','反复踩踏新种草坪','在草地乱扔包装','随意拔走植物'],0,'沿开放道路通行，保护草地和植物。'],
['哪种观察方式更尊重自然？',['用望远镜远距离观察','拔下植物带回家','抓走野生昆虫收藏','把巢穴翻开拍照'],0,'远距离观察可以减少对自然环境的干扰。'],
];
const PRACTICE_QUESTIONS=rows.map(([title,options,answer,explanation],i)=>{
  const shift=i%4;const rotated=options.slice(shift).concat(options.slice(0,shift));
  return {id:`practice-eco-${i+1}`,title,options:rotated,answer:(answer-shift+4)%4,explanation,difficulty:'基础'};
});
// Image-choice example stays in the isolated practice pool, never formal content.
PRACTICE_QUESTIONS.push({id:'practice-eco-observe-image',title:'图中的双筒望远镜适合怎样观察湿地鸟类？',options:['保持距离，沿开放步道安静观察','追着鸟群跑，观察得更清楚','离开步道走进芦苇丛找鸟巢','用食物吸引鸟群靠近'],answer:0,explanation:'使用望远镜远距离观察，留在开放步道，减少对野生鸟类和湿地植被的干扰。',difficulty:'基础',media:{type:'image',src:'images/v2-style03/wetland-observation.jpg',alt:'双筒望远镜放在木栏杆上，远处有湿地和鸟类。',caption:'湿地观察工具示意'}});
module.exports={PRACTICE_QUESTIONS};

},
"/js/data/progress.js":function(module,exports,require){
const { THEMES } = require('./themes');

// Read-only formal progress until a verified progress source is connected.
// Local playtests never mutate these values or write them to player storage.
const THEME_PROGRESS = Object.freeze(Object.fromEntries(THEMES.map((theme) => [
  theme.id,
  Object.freeze({ completed: 0, nodes: Object.freeze(['current', 'locked', 'locked', 'locked']) }),
])));

module.exports = { THEME_PROGRESS };

},
"/js/data/rules.js":function(module,exports,require){
// Unconfirmed business details stay null; interface examples never become live rules.
module.exports = Object.freeze({
  themeCount: 4, levelsPerTheme: 4, questionsPerLevel: 10, optionsPerQuestion: 4,
  requireAllCorrect: true, reviveCount: 1, lockScope: 'current-level',
  levelPoints: Object.freeze([10, 15, 20, 30]),
  questionTimeSeconds: null, timeoutPolicy: null, reviveResetPeriod: null,
  dayBoundary: null, replayPointsPolicy: null, accuracyPolicy: null,
  shareVerificationPolicy: null,
});

},
"/js/data/themes.js":function(module,exports,require){
const LEVEL_POINTS = Object.freeze([10, 15, 20, 30]);
const DIFFICULTIES = Object.freeze(['基础认知', '进阶理解', '深度应用', '综合挑战']);
const THEMES = Object.freeze([
  { id: 'red', name: '十步芳草', description: '走近乡村红色故事', motif: 'village' },
  { id: 'culture', name: '千年文脉', description: '读懂家乡人文历史', motif: 'book' },
  { id: 'industry', name: '金色产业', description: '发现乡土物产特色', motif: 'field' },
  { id: 'ecology', name: '青山绿水', description: '认识身边生态风光', motif: 'water' },
]);

function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) || null;
}

function getLevels(themeId) {
  if (!getTheme(themeId)) throw new Error('Unknown theme');
  return LEVEL_POINTS.map((points, index) => ({
    id: `${themeId}-${index + 1}`, themeId, order: index + 1,
    label: `第${index + 1}关`, difficulty: DIFFICULTIES[index], points,
    questionCount: 10,
  }));
}

module.exports = { THEMES, LEVEL_POINTS, DIFFICULTIES, getTheme, getLevels };

},
"/js/local-campaign.js":function(module,exports,require){
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

},
"/js/main.js":function(module,exports,require){
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

},
"/js/online-app.js":function(module,exports,require){
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

},
"/js/platform/wechat-media.js":function(module,exports,require){
// Native media are tied to the authenticated server record, never local progress.
function installWechatMedia(platform, api, client, baseUrl) {
  let video=null;
  platform.videoActive=()=>!!video;
  platform.closeVideo=()=>{if(video){video.destroy();video=null;}};
  platform.playVideo=src=>{
    if(!src)return;platform.closeVideo();
    const info=api.getWindowInfo?api.getWindowInfo():api.getSystemInfoSync();
    video=api.createVideo({x:12,y:info.windowHeight*.28,width:info.windowWidth-24,height:Math.min(240,info.windowHeight*.4),src:/^https?:/.test(src)?src:baseUrl+'/'+src.replace(/^\//,''),controls:true,autoplay:false});
    video.onEnded(platform.closeVideo);
    video.onError(()=>{platform.closeVideo();api.showToast({title:'视频加载失败，可重试',icon:'none'});});
  };
  const generate=async url=>{
    const match=/\/api\/certificates\/([^/]+)\.svg$/.exec(url);
    if(!match)throw Error('证书地址不正确。');
    const [data,me]=await Promise.all([client.request('/api/certificates'),client.request('/api/me')]);
    const certificate=data.certificates.find(c=>c.id===decodeURIComponent(match[1]));
    if(!certificate)throw Error('证书尚未获得，请完成相应挑战。');
    const canvas=api.createCanvas();canvas.width=1200;canvas.height=850;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#f8f5e9';ctx.fillRect(0,0,1200,850);
    ctx.strokeStyle='#287d7d';ctx.lineWidth=5;ctx.strokeRect(40,40,1120,770);
    ctx.strokeStyle='#dba747';ctx.lineWidth=2;ctx.strokeRect(65,65,1070,720);
    ctx.textAlign='center';ctx.textBaseline='middle';
    const text=(value,y,size,color='#214c4c',weight='normal')=>{ctx.font=weight+' '+size+'px sans-serif';ctx.fillStyle=color;ctx.fillText(value,600,y,1000);};
    text(certificate.title||'趣味闯关 · 电子荣誉证书',205,36,'#287d7d');
    text(certificate.name,310,58,'#214c4c','bold');text(me.user.name,420,38);
    text(certificate.description||('已完成'+(certificate.themeId?'本主题四关':'四个主题共十六关')+'乡村知识挑战'),505,27,'#456767');
    text('完成日期：'+certificate.day+' · '+(certificate.mode!=='production'?'体验版学习记录':'正式挑战记录'),575,25,'#456767');
    text('证书编号：'+certificate.id,675,20,'#658080');text(certificate.footer||'学习活动纪念，不代表学历或教育资格',728,18,'#658080');
    const file=await new Promise((resolve,reject)=>canvas.toTempFilePath({fileType:'png',success:r=>resolve(r.tempFilePath),fail:()=>reject(Error('证书图片生成失败，请重试。'))}));
    return {file,certificate};
  };
  const download=async url=>{
    const {file}=await generate(url);
    const choice=await new Promise(resolve=>api.showModal({title:'证书已生成',content:'可预览证书或保存到相册。保存时微信会请求相册权限。',confirmText:'保存相册',cancelText:'预览证书',success:r=>resolve(r.confirm),fail:()=>resolve(false)}));
    if(!choice){api.previewImage({urls:[file],current:file});return;}
    await new Promise((resolve,reject)=>api.saveImageToPhotosAlbum({filePath:file,success:()=>{api.showToast({title:'证书已保存',icon:'success'});resolve();},fail:()=>{api.previewImage({urls:[file],current:file});reject(Error('证书已生成。相册保存未完成，可在预览中手动保存。'));}}));
  };
  download.share=async url=>{
    const {file,certificate}=await generate(url);
    const confirmed=await new Promise(resolve=>api.showModal({title:'分享证书',content:'将已获得的证书图片用于分享。也可先预览图片。',confirmText:'分享证书',cancelText:'预览',success:r=>resolve(r.confirm),fail:()=>resolve(false)}));
    if(!confirmed){api.previewImage({urls:[file],current:file});return;}
    if(typeof api.shareAppMessage!=='function'){api.previewImage({urls:[file],current:file});throw Error('当前环境请从预览保存证书后分享。');}
    api.shareAppMessage({title:certificate.name,imageUrl:file});
    // Opening the system share flow is not evidence of a completed share and
    // must never grant a revival or alter the server's progress.
  };
  return download;
}
module.exports={installWechatMedia};

},
"/js/platform/wechat.js":function(module,exports,require){
const { createViewport } = require('../core/viewport');

function createWechatPlatform(api = wx) {
  const canvas = api.createCanvas();
  const frameRequest = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame : (callback) => setTimeout(() => callback(Date.now()), 16);
  const frameCancel = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout;
  return {
    api, canvas,
    viewport() {
      const info = api.getWindowInfo ? api.getWindowInfo() : api.getSystemInfoSync();
      let capsule = null;
      try { capsule = api.getMenuButtonBoundingClientRect ? api.getMenuButtonBoundingClientRect() : null; } catch (_) { /* safe fallback */ }
      return createViewport(info, capsule);
    },
    requestFrame: (callback) => frameRequest(callback), cancelFrame: (id) => frameCancel(id),
    createImage: () => api.createImage(),
    on(name, callback) { if (typeof api[name] === 'function') api[name](callback); },
    off(name, callback) { if (typeof api[name] === 'function') api[name](callback); },
  };
}

module.exports = { createWechatPlatform };

},
"/js/runtime-config.js":function(module,exports,require){
// Local experience server. Replace with the approved HTTPS domain before release.
module.exports = Object.freeze({onlineEnabled:true,baseUrl:'http://127.0.0.1:63112',mode:'experience'});

},
"/js/services/audio.js":function(module,exports,require){
class Audio {
  constructor(api, muted = false) { this.api = api; this.muted = muted; this.tracks = new Map(); }
  register(name, src) {
    if (!src) return;
    const track = this.api.createInnerAudioContext(); track.src = src;
    this.tracks.set(name, track);
  }
  play(name) {
    if (this.muted) return;
    const track = this.tracks.get(name);
    if (track) { track.stop(); track.play(); }
  }
  stopAll() { this.tracks.forEach((track) => track.stop()); }
  destroy() { this.stopAll(); this.tracks.forEach((track) => track.destroy()); this.tracks.clear(); }
}

module.exports = { Audio };

},
"/js/services/backend.js":function(module,exports,require){
// No endpoint, access token or share reward is fabricated in this framework.
class Backend {
  constructor(transport = null) { this.transport = transport; }
  request(operation, payload) {
    if (!this.transport) return Promise.reject(new Error('BACKEND_NOT_CONFIGURED'));
    return this.transport(operation, payload);
  }
  beginChallenge(levelId) { return this.request('challenge.begin', { levelId }); }
  submitAnswer(challengeId, questionId, optionId) { return this.request('challenge.answer', { challengeId, questionId, optionId }); }
  claimRevive(challengeId, verifiedEvidence) {
    if (!verifiedEvidence) return Promise.reject(new Error('VERIFIED_SHARE_REQUIRED'));
    return this.request('challenge.revive', { challengeId, evidence: verifiedEvidence });
  }
  getRanking(period) { return this.request('ranking.list', { period }); }
  getCertificates() { return this.request('certificates.list', {}); }
}

module.exports = { Backend };

},
"/js/services/http-client.js":function(module,exports,require){
// The same authenticated contract is used by the browser and WeChat adapter.
class ApiError extends Error {
  constructor(code, message, status = 0) { super(message || code); this.code = code; this.status = status; }
}
class HttpClient {
  constructor({baseUrl = '', transport, token = null} = {}) {
    if (baseUrl && !/^https:\/\//.test(baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) throw new Error('HTTPS_REQUIRED');
    this.baseUrl = baseUrl.replace(/\/$/, ''); this.transport = transport; this.token = token;
  }
  async request(path, body, method = body === undefined ? 'GET' : 'POST') {
    if (!path.startsWith('/api/')) throw new Error('INVALID_API_PATH');
    const headers = {'Content-Type':'application/json'};
    if (this.token) headers.Authorization = 'Bearer ' + this.token;
    let response;
    try {
      if (this.transport) response = await this.transport({url: this.baseUrl + path, method, headers, body});
      else {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
        try { const r = await fetch(this.baseUrl + path, {method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal}); response = {status:r.status, data:await r.json()}; }
        finally { clearTimeout(timer); }
      }
    } catch (_) { throw new ApiError('NETWORK_UNAVAILABLE', '连接暂时中断，请重试。'); }
    if (response.status < 200 || response.status >= 300 || response.data?.error) {
      throw new ApiError(response.data?.error?.code || 'REQUEST_FAILED', response.data?.error?.message || '操作未完成，请重试。', response.status);
    }
    if (!response.data || !Object.prototype.hasOwnProperty.call(response.data, 'data')) throw new ApiError('INVALID_RESPONSE', '服务响应暂不可用。');
    return response.data.data;
  }
}
function wechatTransport(api) {
  return ({url, method, headers, body}) => new Promise((resolve, reject) => {
    api.request({url, method, header:headers, data:body, timeout:12000,
      success:r => resolve({status:r.statusCode, data:r.data}), fail:reject});
  });
}
module.exports = {HttpClient, ApiError, wechatTransport};

},
"/js/services/local-progress.js":function(module,exports,require){
const {THEMES,LEVEL_POINTS}=require('../data/themes');
const LEGACY_PROGRESS_KEY='rural-quiz:local-campaign:v1';
const LOCAL_PROGRESS_KEY='rural-quiz:local-campaign:v2';
const BACKUP_KEY='rural-quiz:local-campaign:backup:';
const LOCK_NAME='rural-quiz:local-campaign';
const empty=()=>Object.fromEntries(THEMES.map(t=>[t.id,0]));
const clone=v=>JSON.parse(JSON.stringify(v));
const validCounts=v=>v&&THEMES.every(t=>Number.isInteger(v[t.id])&&v[t.id]>=0&&v[t.id]<=4);
const defaultManifest=id=>Object.fromEntries(THEMES.flatMap(t=>[1,2,3,4].map(n=>[t.id+'-'+n,id])));
const manifestSignature=m=>JSON.stringify(Object.keys(defaultManifest('')).map(k=>m?.[k]));
// Local demonstration only. Exclusive transactions are required for persistent writes.
class LocalProgress {
  constructor(api,sourceId,manifest=defaultManifest(sourceId)){
    this.api=api;this.sourceId=sourceId;this.manifest=clone(manifest);this.completed=empty();this.status='new';this.recentTheme='red';this.recentAt=0;this.pending=null;this.notice=null;this.dirty=false;this.recentDirty=false;this.inflight=null;this.listeners=new Set();
    if(!this.validManifest(manifest))throw Error('INVALID_LEVEL_MANIFEST');
    try{const record=this.read();this.baseManifest=record.value?.version===2?manifestSignature(record.value.manifest):null;this.adopt(record,true);}catch(e){this.readFailure(e);}
  }
  validManifest(m){return m&&Object.keys(defaultManifest('')).every(k=>typeof m[k]==='string'&&m[k].length>0);}
  read(){const current=this.api.getStorageSync(LOCAL_PROGRESS_KEY);return current==null?{key:LEGACY_PROGRESS_KEY,value:this.api.getStorageSync(LEGACY_PROGRESS_KEY)}:{key:LOCAL_PROGRESS_KEY,value:current};}
  inspect(record){
    const v=record.value;if(v==null)return {completed:empty(),recentTheme:'red',recentAt:0};
    if(!validCounts(v.completed))return {blocked:'invalid',message:'本地存档损坏或格式无法识别。原存档保留，请确认是否重新开始本地试玩。'};
    if(record.key===LEGACY_PROGRESS_KEY){
      if(v.version!==1||v.sourceId!==this.sourceId)return {blocked:'legacy',message:'旧存档无法确认与当前题库一致。原存档保留，确认后才会重置本地试玩进度。'};
      return {completed:{...v.completed},recentTheme:'red',recentAt:0,migrate:true};
    }
    if(v.version!==2||!this.validManifest(v.manifest))return {blocked:'invalid',message:'存档版本暂时无法识别。原存档保留，请确认是否重新开始本地试玩。'};
    const signature=manifestSignature(v.manifest);if(this.baseManifest&&signature!==this.baseManifest&&signature!==manifestSignature(this.manifest))return {blocked:'stale',message:'其他页面已更新题库版本。请刷新本页面后继续；当前页面不会覆盖新版存档。'};
    const completed={...v.completed},affected=[];
    for(const t of THEMES)for(let n=1;n<=completed[t.id];n++)if(v.manifest[t.id+'-'+n]!==this.manifest[t.id+'-'+n]){completed[t.id]=n-1;affected.push({themeId:t.id,from:n});break;}
    const recentTheme=THEMES.some(t=>t.id===v.recentTheme)?v.recentTheme:'red',recentAt=Number.isFinite(v.recentAt)?v.recentAt:0;
    if(affected.length)return {blocked:'changed',completed,recentTheme,recentAt,affected,message:affected.map(a=>THEMES.find(t=>t.id===a.themeId).name+'：第'+a.from+'—4关').join('；')+' 的已通关题目发生实质变更。确认后仅重置这些关卡，其他进度保留。'};
    return {completed,recentTheme,recentAt};
  }
  adopt(record,initial=false){
    const v=this.inspect(record);
    if(v.blocked){if(validCounts(record.value?.completed))this.completed={...record.value.completed};this.pending={...v,record:clone(record)};this.status='needs-confirmation';this.notice={blocking:true,message:v.message};this.emit();return false;}
    this.pending=null;
    for(const t of THEMES)this.completed[t.id]=this.dirty?Math.max(this.completed[t.id],v.completed[t.id]):v.completed[t.id];
    if(v.recentAt>=this.recentAt){this.recentTheme=v.recentTheme;this.recentAt=v.recentAt;}
    if(!initial&&record.value!=null&&!this.dirty&&!this.inflight&&this.status==='new')this.status='restored';
    if(initial&&record.value!=null){this.status='restored';this.notice={blocking:false,message:v.migrate?'已读取旧版本地进度；下次保存会备份并迁移。':'已恢复本机试玩进度。'};}
    this.emit();return true;
  }
  readFailure(e){if(e instanceof SyntaxError){this.pending={blocked:'invalid',record:null,message:'本地存档无法读取。原记录保留，请确认是否重新开始本地试玩。'};this.status='needs-confirmation';this.notice={blocking:true,message:this.pending.message};}else{this.status='unsaved';this.notice={blocking:false,message:'无法访问本机存储。本次进度仅临时保留，可稍后重试存档。'};}this.emit();}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  emit(){for(const fn of this.listeners)fn(this);}
  dismissNotice(){if(!this.notice?.blocking){this.notice=null;this.emit();}}
  refresh(){try{this.adopt(this.read());}catch(e){this.readFailure(e);}}
  canEnter(themeId,order){return !this.pending&&Object.hasOwn(this.completed,themeId)&&Number.isInteger(order)&&order>=1&&order<=4&&order<=this.completed[themeId]+1;}
  visit(themeId){if(!THEMES.some(t=>t.id===themeId)||this.pending)return Promise.resolve({saved:false});this.recentTheme=themeId;this.recentAt=Math.max(Date.now(),this.recentAt+1);this.recentDirty=true;this.emit();return this.save();}
  async complete(themeId,order){
    if(!this.canEnter(themeId,order))return {ok:false,reason:this.pending?'confirmation':'locked'};
    const replay=order<=this.completed[themeId],earned=replay?0:LEVEL_POINTS[order-1];
    this.completed[themeId]=Math.max(this.completed[themeId],order);this.dirty=true;
    const result=await this.save();return {ok:true,replay,...result,earned:result.saved?(result.credited?.[themeId]?.includes(order)?LEVEL_POINTS[order-1]:0):earned};
  }
  save(){
    if(this.inflight)return this.inflight.then(result=>this.dirty||this.recentDirty?this.save():result);
    if(this.pending)return Promise.resolve({saved:false,status:this.status,reason:'confirmation'});
    if(typeof this.api.withStorageLock!=='function'){this.status='session-only';this.notice={blocking:false,message:'当前环境不支持独占存档锁。本次进度仅在当前页面有效，刷新或关闭后不会保存。'};this.emit();return Promise.resolve({saved:false,status:this.status,reason:'unsupported-lock'});}
    this.status='saving';this.emit();
    const task=Promise.resolve().then(()=>this.api.withStorageLock(LOCK_NAME,()=>{
      const record=this.read(),latest=this.inspect(record);
      if(latest.blocked){this.adopt(record);return {saved:false,status:this.status,reason:'confirmation'};}
      const counts=Object.fromEntries(THEMES.map(t=>[t.id,Math.max(latest.completed[t.id],this.completed[t.id])]));
      const recent=latest.recentAt>this.recentAt?latest:{recentTheme:this.recentTheme,recentAt:this.recentAt};
      if(record.key===LEGACY_PROGRESS_KEY&&record.value!=null)this.api.setStorageSync(BACKUP_KEY+'v1',record.value);
      this.api.setStorageSync(LOCAL_PROGRESS_KEY,{version:2,sourceId:this.sourceId,manifest:this.manifest,completed:counts,recentTheme:recent.recentTheme,recentAt:recent.recentAt});
      const credited=Object.fromEntries(THEMES.map(t=>[t.id,Array.from({length:Math.max(0,counts[t.id]-latest.completed[t.id])},(_,i)=>latest.completed[t.id]+i+1)]));
      this.baseManifest=manifestSignature(this.manifest);if(this.notice?.message.includes('存档失败'))this.notice=null;
      this.completed=counts;this.recentTheme=recent.recentTheme;this.recentAt=recent.recentAt;this.dirty=false;this.recentDirty=false;this.status='saved';this.emit();return {saved:true,status:'saved',completed:{...counts},credited};
    })).catch(()=>{this.status='unsaved';this.notice={blocking:false,message:'存档失败，本次进度仅临时保留。请重试存档；重试不会重复加分。'};this.emit();return {saved:false,status:'unsaved',reason:'storage-failed'};});
    this.inflight=task;task.finally(()=>{if(this.inflight===task)this.inflight=null;});return task;
  }
  async confirmReset(){
    if(!this.pending)return {saved:true};
    if(this.pending.blocked==='stale')return {saved:false,reason:'reload-required'};
    if(typeof this.api.withStorageLock!=='function'){this.completed=this.pending.blocked==='changed'?{...this.pending.completed}:empty();this.pending=null;this.status='session-only';this.notice={blocking:false,message:'已仅在当前会话更新进度。当前环境不支持独占锁，旧存档保持原样；本次进度在刷新后不会保留。'};this.emit();return {saved:false,reason:'unsupported-lock'};}
    const pending=this.pending;if(pending.blocked==='stale')return {saved:false,reason:'reload-required'};
    try{return await this.api.withStorageLock(LOCK_NAME,()=>{
      // Re-read within the lock: another tab may have changed the affected range.
      let record;try{record=this.read();}catch(e){if(!(e instanceof SyntaxError))throw e;record=null;}
      if(JSON.stringify(record)!==JSON.stringify(pending.record)){this.refresh();return {saved:false,reason:'changed-again'};}
      const v=record?this.inspect(record):pending;
      if(record?.value!=null)this.api.setStorageSync(BACKUP_KEY+'before-reset:'+Date.now(),record.value);
      else if(this.api.backupRawStorage)this.api.backupRawStorage(LOCAL_PROGRESS_KEY,LEGACY_PROGRESS_KEY);
      const completed=v.blocked==='changed'?v.completed:empty();
      this.api.setStorageSync(LOCAL_PROGRESS_KEY,{version:2,sourceId:this.sourceId,manifest:this.manifest,completed,recentTheme:v.recentTheme||'red',recentAt:v.recentAt||0});
      this.baseManifest=manifestSignature(this.manifest);this.completed=completed;this.recentTheme=v.recentTheme||'red';this.recentAt=v.recentAt||0;this.dirty=false;this.recentDirty=false;this.pending=null;this.status='saved';this.notice={blocking:false,message:v.blocked==='changed'?'已按确认范围更新本地进度，其他关卡保持原状。':'已重新开始本地试玩；旧存档备份已保留。'};this.emit();return {saved:true};
    });}catch(_){this.status='needs-confirmation';this.notice={blocking:true,message:pending.message+' 存储仍不可用，重置尚未生效，请重试。'};this.emit();return {saved:false};}
  }
  get total(){return THEMES.reduce((sum,t)=>sum+LEVEL_POINTS.slice(0,this.completed[t.id]).reduce((a,b)=>a+b,0),0);}
  get destination(){const themeId=this.recentTheme,n=this.completed[themeId],all=THEMES.every(t=>this.completed[t.id]===4);return {themeId,order:Math.min(4,n+1),map:n===4||all,label:n===4||all?'返回'+THEMES.find(t=>t.id===themeId).name+'地图':(this.recentAt||this.total?'继续':'开始')+THEMES.find(t=>t.id===themeId).name+' · 第'+(n+1)+'关'};}
  get view(){return Object.fromEntries(THEMES.map(t=>{const n=this.completed[t.id];return [t.id,{completed:n,nodes:Array.from({length:4},(_,i)=>i<n?'complete':i===n?'current':'locked')}];}));}
}
module.exports={LocalProgress,LOCAL_PROGRESS_KEY,LEGACY_PROGRESS_KEY,BACKUP_KEY,LOCK_NAME};

},
"/js/services/question-media.js":function(module,exports,require){
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

},
"/js/services/resources.js":function(module,exports,require){
const ART = Object.freeze({ red:'images/v2-quality-20261010/theme-red-runtime.png',culture:'images/v2-style03/theme-culture.png',industry:'images/v2-style03/theme-industry.png',ecology:'images/v2-style03/theme-ecology.png' });
const DEFAULT_MAP_ART = Object.freeze({ red:'images/v2-quality-20261010/map-red-runtime.jpg',culture:'images/v2-style03/map-culture.jpg',industry:'images/v2-style03/map-industry.jpg',ecology:'images/v2-style03/ecology-map.jpg' });

class Resources {
  constructor(platform, { mapArt, extraArt = {} } = {}) {
    this.platform = platform; this.images = {}; this.failures = [];
    this.mapArt = Object.freeze({ ...DEFAULT_MAP_ART, ...mapArt });
    this.extraArt = Object.freeze({ ...extraArt });
  }
  load(onProgress) {
    const maps = Object.keys(DEFAULT_MAP_ART).filter((id) => typeof this.mapArt[id] === 'string' && this.mapArt[id].length).map((id) => [`map-${id}`,this.mapArt[id]]);
    const entries = Object.entries(ART).concat(maps, Object.entries(this.extraArt)); let completed = 0;
    return Promise.all(entries.map(([key, src]) => new Promise((resolve) => {
      const image = this.platform.createImage(); let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (ok) { this.images[key] = image; if (key === 'map-ecology') this.images.map = image; }
        else this.failures.push(src);
        completed++; if(onProgress) onProgress(completed / entries.length); resolve();
      };
      const timer = setTimeout(() => finish(false), 4000);
      image.onload = () => finish(true); image.onerror = () => finish(false); image.src = src;
    })));
  }
}

module.exports = { Resources, ART, DEFAULT_MAP_ART };

},
"/js/services/storage.js":function(module,exports,require){
const KEY = 'rural-quiz:preferences:v1';

class Storage {
  constructor(api) { this.api = api; }
  loadPreferences() {
    try {
      const value = this.api.getStorageSync(KEY);
      return { muted: !!(value && value.version === 1 && value.muted) };
    } catch (_) { return { muted: false }; }
  }
  savePreferences(preferences) {
    try { this.api.setStorageSync(KEY, { version: 1, muted: !!preferences.muted }); return { ok: true }; }
    catch (_) { return { ok: false, reason: 'storage-unavailable' }; }
  }
}

module.exports = { Storage, KEY };

},
"/js/ui/draw.js":function(module,exports,require){
const T = require('./tokens');

function rounded(ctx, x, y, w, h, radius, fill, stroke) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
}
function text(ctx, value, x, y, size = 16, color = T.colors.ink, weight = 400, align = 'left') {
  ctx.font = `${weight} ${size}px ${T.font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(String(value), x, y);
}
function wrap(ctx, value, x, y, maxWidth, size = 16, color = T.colors.ink, weight = 400) {
  ctx.font = `${weight} ${size}px ${T.font}`; const lines=[];let line='';
  const closing=/[，。！？；：、）》」』】,.!?;:)]/;
  for(const char of String(value)) {
    if(char==='\n'){lines.push(line);line='';continue;}
    if(line && ctx.measureText(line+char).width>maxWidth){
      if(closing.test(char) && line.length>1){const last=line.slice(-1);lines.push(line.slice(0,-1));line=last+char;}
      else {lines.push(line);line=char;}
    }else line+=char;
  }
  if(line)lines.push(line);
  lines.forEach((row,i)=>text(ctx,row,x,y+i*size*1.5,size,color,weight));
  return lines.length*size*1.5;
}
function imageCover(ctx, image, x, y, w, h, radius = 16) {
  ctx.save(); rounded(ctx, x, y, w, h, radius); ctx.clip();
  const ratio = Math.max(w / image.width, h / image.height);
  const dw = image.width * ratio, dh = image.height * ratio;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); ctx.restore();
}
function line(ctx, points, color, width = 2) {
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]); points.slice(1).forEach(([x,y]) => ctx.lineTo(x,y)); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function circle(ctx, x, y, r, fill, stroke) { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();} }
function motif(ctx, type, x, y, size = 40) {
  const C=T.colors;ctx.save();ctx.translate(x,y);ctx.scale(size/40,size/40);
  if(type==='village') { rounded(ctx,5,17,30,21,3,C.surface,C.ink); line(ctx,[[2,18],[20,5],[38,18]],C.lake,4);rounded(ctx,16,25,8,13,2,C.orange);line(ctx,[[28,6],[28,0],[37,2],[28,5]],C.orange,2); }
  if(type==='book') { ctx.fillStyle=C.surface;ctx.beginPath();ctx.moveTo(2,9);ctx.quadraticCurveTo(12,4,20,11);ctx.quadraticCurveTo(28,4,38,9);ctx.lineTo(38,35);ctx.quadraticCurveTo(28,29,20,36);ctx.quadraticCurveTo(12,29,2,35);ctx.closePath();ctx.fill();ctx.strokeStyle=C.lake;ctx.lineWidth=2;ctx.stroke();line(ctx,[[20,11],[20,36]],C.lake,2);line(ctx,[[7,16],[15,17]],C.orange,2);line(ctx,[[25,17],[33,16]],C.orange,2); }
  if(type==='field') { line(ctx,[[20,37],[20,5]],C.lake,2);for(let i=0;i<4;i++){const yy=8+i*6;ctx.fillStyle=C.orange;ctx.beginPath();ctx.ellipse(15,yy,6,3,.55,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(25,yy+2,6,3,-.55,0,Math.PI*2);ctx.fill();}line(ctx,[[4,38],[36,38]],C.lake,2); }
  if(type==='water') { ctx.fillStyle=C.lakeLight;ctx.beginPath();ctx.moveTo(0,24);ctx.lineTo(12,5);ctx.lineTo(25,24);ctx.lineTo(32,15);ctx.lineTo(40,27);ctx.closePath();ctx.fill();line(ctx,[[0,31],[9,28],[18,32],[28,28],[40,31]],C.lake,2);line(ctx,[[3,38],[13,35],[24,38],[37,35]],C.lake,2);circle(ctx,32,6,4,C.orange); }
  ctx.restore();
}
module.exports={rounded,text,wrap,imageCover,line,circle,motif};

},
"/js/ui/hand-renderer.js":function(module,exports,require){
const {OnlineRenderer} = require('./online-renderer');
const D = require('./draw');
const T = require('./tokens');
const {learningProgress} = require('../data/learning-progress');
const C = T.colors;
const S = T.hand;

const HAND_ART = Object.freeze({
  'hand-home': 'images/handdrawn-v4/courtyard.png',
  ...Object.fromEntries(['points','rank','back','clock','selected','check','cross'].map(name => ['hand-'+name, 'images/handdrawn-v4/icons/'+name+'.png'])),
  ...Object.fromEntries(['village','book','field','water','partial','complete'].map(name => ['hand-theme-'+name, 'images/handdrawn-v41/icons/'+name+'.png']))
});

// The approved two-page design uses physical pixels. The existing input and
// viewport coordinate system stays unchanged, including WeChat native safe areas.
class HandRenderer extends OnlineRenderer {
  px(value) { return value / this.v.scale; }
  inset() { return this.px(S.inset); }
  width() { return this.v.width - 2*this.inset(); }
  bottom() { return Math.min(this.v.bottom, this.v.height-this.px(50)); }
  navTop() { return Math.max(this.px(44), this.v.top-this.px(16)); }
  modern() { return ['home','quiz','themes','points'].includes(this.route.name) && this.view.challengeState!=='locked' && (!this.modalActive||this.drawingHandModal); }
  label(value,x,y,size=16,color=C.ink,weight=400,align='left') { D.text(this.ctx,value,x,y,this.px(size),color,weight,align); }
  lines(value,x,y,width,size=16,color=C.ink,weight=400) { return D.wrap(this.ctx,value,x,y,width,this.px(size),color,weight); }
  box(x,y,w,h,r,fill,stroke,strokeWidth=1.2) {
    D.rounded(this.ctx,x,y,w,h,this.px(r),fill);
    if(stroke){this.ctx.strokeStyle=stroke;this.ctx.lineWidth=this.px(strokeWidth);this.ctx.stroke();}
  }
  icon(name,x,y,size=24) {
    const image=this.view.images?.['hand-'+name];
    if(image)this.ctx.drawImage(image,x,y,this.px(size),this.px(size));
    return !!image;
  }
  sceneBackdrop(name) {
    if(['home','quiz','themes','points'].includes(name)){
      const background=this.view.catalog?.config?.background;
      this.ctx.fillStyle=background && !['#F5F9F7','#f5f9f7'].includes(background) ? background : C.surface;
      this.ctx.fillRect(0,0,this.v.width,this.v.height);
      this.layout.backdrop={source:'plain-surface',decorative:false};
    } else super.sceneBackdrop(name);
  }
  heading(value,x,y,size=30,align='left',maxWidth=313) {
    if(!this.modern())return super.heading(value,x,y,size,align,maxWidth);
    this.label(this.fit(value,maxWidth,this.px(size),700),x,y,size,C.ink,700,align);
  }
  button(id,label,x,y,w,action,secondary=false,disabled=false) {
    if(!this.modern())return super.button(id,label,x,y,w,action,secondary,disabled);
    if(id==='close-video'){x=this.inset();y=this.bottom()-this.px(52);w=this.width();}
    const h=this.px(S.buttonHeight),blocked=disabled||!!this.view.submitting||!!this.view.loadingRemote&&!this.view.connectionError;
    const pressed=this.view.pressedId===id&&!blocked,yy=y+this.px(pressed?2:0);
    if(!blocked&&!pressed&&!secondary)this.box(x,yy+this.px(2),w,h,14,'rgba(38,61,52,.25)');
    this.box(x,yy,w,h,S.buttonRadius,blocked?C.paper:secondary?C.surface:C.lake,secondary&&!blocked?C.line:null,1);
    this.label(this.fit(label,w-this.px(32),this.px(16),500),x+w/2,yy+this.px(16),16,blocked?C.muted:secondary?C.muted:C.surface,500,'center');
    this.target(id,x,y,w,h,action,blocked,label);
  }
  beginContent(key,top,bottom,total) {
    if(!this.modern())return super.beginContent(key,top,bottom,total);
    const region={x:this.inset(),y:top,w:this.width(),h:Math.max(this.px(24),bottom-top)};
    if(this.scrollKey!==key){this.scrollKey=key;this.scroll=0;}
    const excess=total-region.h;this.scrollMax=excess*this.v.scale>.5?excess:0;this.scroll=Math.max(0,Math.min(this.scroll||0,this.scrollMax));
    this.scrollRegion=region;this.clipRegion=region;
    this.ctx.save();this.ctx.beginPath();this.ctx.rect(region.x,region.y,region.w,region.h);this.ctx.clip();
    return top-this.scroll;
  }
  endContent(total) {
    if(!this.modern())return super.endContent(total);
    this.ctx.restore();this.clipRegion=null;
    if(this.scrollMax>0){const r=this.scrollRegion,rail=r.h-this.px(16),thumb=Math.max(this.px(24),rail*r.h/total);
      this.box(r.x+r.w-this.px(3),r.y+this.px(8),this.px(3),rail,2,C.paper);
      this.box(r.x+r.w-this.px(3),r.y+this.px(8)+(rail-thumb)*this.scroll/this.scrollMax,this.px(3),thumb,2,C.line);
    }
  }
  backControl(id='back',action={type:'back'}) {
    const x=this.inset(),y=Math.max(this.v.top,this.navTop()),size=this.px(44);
    this.icon('back',x+this.px(10),y+this.px(10));
    this.target(id,x,y,size,size,action,!!this.view.submitting,'返回');
    return {x,y,w:size,h:size};
  }
  courtyard(image,rect) {
    const ctx=this.ctx,p=n=>this.px(n),{x,y,w,h}=rect;
    // Editable interface washes sit around the unchanged original image.
    const wash=ctx.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,Math.max(w,h)/2+p(16));
    wash.addColorStop(0,'rgba(220,233,223,.2)');wash.addColorStop(1,'rgba(220,233,223,0)');
    ctx.fillStyle=wash;ctx.fillRect(x-p(8),y-p(16),w+p(16),h+p(32));
    ctx.drawImage(image,x,y,w,h);
    const edge=Math.min(p(12),h/4,w/4);
    [[x,y,x,y+edge,x,y,w,edge], [x,y+h,x,y+h-edge,x,y+h-edge,w,edge],
     [x,y,x+edge,y,x,y,edge,h], [x+w,y,x+w-edge,y,x+w-edge,y,edge,h]].forEach(([x0,y0,x1,y1,xx,yy,ww,hh])=>{
      const fade=ctx.createLinearGradient(x0,y0,x1,y1);fade.addColorStop(0,C.surface);fade.addColorStop(1,'rgba(255,252,240,0)');
      ctx.fillStyle=fade;ctx.fillRect(xx,yy,ww,hh);
    });
  }
  themeMarker(theme,x,y) {
    const p=n=>this.px(n),ctx=this.ctx;
    ctx.save();if(['idle','empty'].includes(theme.state))ctx.globalAlpha*=.68;
    this.icon('theme-'+this.motif(theme),x,y,S.iconSize);ctx.restore();
    if(['partial','complete'].includes(theme.state)){
      this.box(x+p(12),y+p(12),p(12),p(12),6,C.surface);
      this.icon('theme-'+theme.state,x+p(theme.state==='partial'?15:12),y+p(theme.state==='partial'?15:12),theme.state==='partial'?6:12);
    }
  }
  home() {
    const x=this.inset(),w=this.width(),p=n=>this.px(n),ctx=this.ctx,summary=learningProgress(this.view.catalog,this.view.themeProgress);
    const compact=this.v.physicalHeight<700,top=this.navTop()+p(compact?52:68),introH=p(90);
    const counterSize=summary.total?16:14;ctx.font=`400 ${p(counterSize)}px ${T.font}`;
    const inlineMarkers=compact&&summary.themes.length>0&&summary.themes.length<=4&&ctx.measureText(summary.label).width+p(8+summary.themes.length*32-8)<=w;
    const columns=Math.max(1,Math.floor((w+p(8))/p(32))),rows=inlineMarkers?0:Math.ceil(summary.themes.length/columns);
    const progressH=p(40+rows*32),maxButton=this.bottom()-p(52+24+48+40);
    const imageH=compact?Math.min(w*2/3,Math.max(p(80),maxButton-p(24)-top-introH-p(16)-progressH)):w*2/3;
    const total=introH+imageH+p(16)+progressH,naturalButton=top+total+p(24),buttonY=Math.min(naturalButton,maxButton);
    let y=this.beginContent('hand-home',top,buttonY-p(24),total);
    this.heading(this.view.catalog?.config?.name||'趣味闯关',x,y,30,'left',w);this.label('沿着小路，发现家乡',x,y+p(50),16,C.muted);
    y+=introH;
    const image=this.view.configuredImages?.cover||this.view.images?.['hand-home'];
    let artRect={x,y,w,h:imageH};
    if(image){const ratio=Math.min(w/image.width,imageH/image.height),dw=image.width*ratio,dh=image.height*ratio;artRect={x:x+(w-dw)/2,y:y+(imageH-dh)/2,w:dw,h:dh};this.courtyard(image,artRect);}
    else {this.box(x,y,w,imageH,12,C.paper);this.label('小院插画'+(this.view.loadingRemote?'加载中…':'暂未加载'),x+w/2,y+imageH/2,14,C.muted,400,'center');}
    y+=imageH+p(16);
    this.label(summary.label,x,y,counterSize,C.ink,400);
    if(summary.total&&!inlineMarkers){ctx.font=`400 ${p(16)}px ${T.font}`;if(ctx.measureText(summary.label).width+p(104)<=w)this.label('我的进度  ›',x+w,y,14,C.muted,400,'right');}
    this.box(x,y+p(32),w,p(8),4,C.paper);
    if(summary.completed&&summary.total)this.box(x,y+p(32),w*summary.completed/summary.total,p(8),4,C.orange);
    const markers=summary.themes.map((theme,index)=>{
      const xx=inlineMarkers?x+w-p(summary.themes.length*32-8)+p(index*32):x+p(index%columns*32);
      const yy=inlineMarkers?y:y+p(48+Math.floor(index/columns)*32);
      this.themeMarker(theme,xx,yy);return {id:theme.id,motif:this.motif(theme),state:theme.state,completed:theme.completed,total:theme.total,x:xx,y:yy,w:p(24),h:p(24),ariaLabel:theme.ariaLabel};
    });
    this.target('home-progress',x,y-p(4),w,progressH+p(4),{type:'route',name:'themes'},!summary.ready,summary.ariaLabel);
    this.endContent(total);
    this.button('practice',this.view.hasActiveChallenge?this.view.continueLabel||'继续本次挑战':'开始闯关',x,buttonY,w,{type:'practice',chooseTheme:true},false,!summary.total&&!this.view.hasActiveChallenge);
    const secondaryY=buttonY+p(76),half=(w-p(16))/2;
    [['points','我的积分','points'],['rank','排行榜','ranking']].forEach(([icon,label,route],index)=>{
      const xx=x+index*(half+p(16));
      this.box(xx,secondaryY+p(4),p(40),p(40),12,C.paper);
      this.icon(icon,xx+p(8),secondaryY+p(12));this.label(label,xx+p(48),secondaryY+p(14),16,C.ink,500);
      this.target('home-'+route,xx,secondaryY,half,p(48),{type:'route',name:route},false,label);
    });
    if(this.bottom()-secondaryY-p(48)>=p(32))this.label('湖南数字农家书屋',this.v.width/2,this.bottom()-p(18),14,C.muted,400,'center');
    this.layout.home={ready:summary.ready,themes:summary.themes.map(theme=>theme.id),completed:summary.completed,total:summary.total,markers,inlineMarkers,progress:{x,y,w,h:progressH,label:summary.label,ariaLabel:summary.ariaLabel},art:artRect,primary:{x,y:buttonY,w,h:p(52)},scroll:this.scroll,scrollMax:this.scrollMax};
  }
  balancedTitle(value,width,size) {
    // Balance short two-line Chinese questions without changing the question bank.
    const ctx=this.ctx,text=String(value);if(text.includes('\n'))return text;
    ctx.save();ctx.font=`500 ${size}px ${T.font}`;
    const chars=Array.from(text),length=chars.length,choices=[];
    if(ctx.measureText(text).width>width&&ctx.measureText(text).width<=width*2){
      for(let i=5;i<=length-5;i++){
        const left=chars.slice(0,i).join(''),right=chars.slice(i).join('');
        if(ctx.measureText(left).width>width||ctx.measureText(right).width>width||/^[，。！？；：、]/.test(right))continue;
        choices.push({value:left+'\n'+right,score:Math.abs(ctx.measureText(left).width-ctx.measureText(right).width)});
      }
    }
    ctx.restore();choices.sort((a,b)=>a.score-b.score);return choices[0]?.value||text;
  }
  quiz() {
    const q=this.view.feedback?.question||this.view.question;
    if(!q)return this.empty('quiz');
    const x=this.inset(),w=this.width(),p=n=>this.px(n),ctx=this.ctx,feedback=this.view.feedback;
    const submitting=!!this.view.submitting,revive=this.view.modal==='revive',primaryY=this.bottom()-p(62);
    this.backControl('quiz-exit',{type:'exit-request'});
    const headerTop=this.navTop()+p(60),titleSize=p(20),optionSize=p(16),totalQuestions=q.total||1;
    this.label(this.fit(q.themeName+' · '+(q.levelName||'第'+q.levelOrder+'关'),w,p(16),500),x,headerTop,16,C.ink,500);
    this.box(x,headerTop+p(32),w,p(8),4,C.paper);this.box(x,headerTop+p(32),w*Math.min(1,q.position/totalQuestions),p(8),4,C.orange);
    this.label('第 '+q.position+' / '+totalQuestions+' 题',x,headerTop+p(48),14,C.muted);
    const seconds=Math.max(0,Math.ceil(this.view.remainingSeconds??this.seconds())),urgent=!feedback&&!revive&&seconds<=5;
    this.icon('clock',x+w-p(80),headerTop+p(48),20);
    this.label(feedback?'已作答':String(seconds).padStart(2,'0')+' 秒',x+w,headerTop+p(48),14,urgent?C.error:C.muted,urgent?600:400,'right');
    const timer={seconds,urgent,active:!feedback&&!revive,total:this.seconds()};
    const title=this.balancedTitle(q.title,w,titleSize),titleH=this.measure(title,w,titleSize,500);
    const media=q.media&&['image','video'].includes(q.media.type),video=media&&q.media.type==='video',mediaH=p(144);
    const caption=media&&q.media.caption,captionH=caption?this.measure(caption,w,p(14))+p(8):0;
    const textW=w-p(104);
    const h=Math.max(p(S.optionHeight),Math.ceil((Math.max(...q.options.map(o=>this.measure(o,textW,optionSize)),0)+p(24))/p(8))*p(8));
    const explanation=feedback?.explanation||'继续下一题，认识更多家乡知识。';
    const explanationH=feedback?this.measure(explanation,w,p(16)):0;
    // Long explanations join the scrollable reading area; the action stays fixed.
    const inlineExplanation=feedback&&(explanationH>p(72)||this.v.physicalHeight<650);
    const footerTop=primaryY-p(feedback&&!inlineExplanation?112:24);
    const bodyTop=headerTop+p(96),bodyBottom=footerTop-p(16);
    const total=titleH+p(S.readingGap)+(media?mediaH+captionH+p(S.readingGap):0)+q.options.length*h+Math.max(0,q.options.length-1)*p(8)+(inlineExplanation?explanationH+p(88):0)+p(8);
    let y=this.beginContent('hand-quiz-'+q.id+'-'+(feedback?'feedback':'answer'),bodyTop,bodyBottom,total);
    const titleRect={x,y,w,h:titleH};this.lines(title,x,y,w,20,C.ink,500);y+=titleH+p(S.readingGap);
    let mediaRect=null;
    if(media){mediaRect={x,y,w,h:mediaH};this.box(x,y,w,mediaH,12,C.paper);
      if(video){
        this.label('▷  播放题目视频',x+w/2,y+p(48),16,C.lake,600,'center');
        this.label('观看时倒计时继续',x+w/2,y+p(80),14,C.muted,400,'center');
        this.target('play-video',x,y,w,mediaH,{type:'play-video',src:q.media.src,url:q.media.url},submitting,'播放题目视频，观看时倒计时继续');
      } else if(this.view.mediaImage){
        const image=this.view.mediaImage,ratio=Math.min(w/image.width,mediaH/image.height),dw=image.width*ratio,dh=image.height*ratio;
        ctx.save();D.rounded(ctx,x,y,w,mediaH,p(12));ctx.clip();ctx.drawImage(image,x+(w-dw)/2,y+(mediaH-dh)/2,dw,dh);ctx.restore();
        mediaRect.image={w:dw,h:dh,sourceW:image.width,sourceH:image.height};
      } else {
        this.label(this.view.mediaFailed?'图片未能加载，点击重试':'图片加载中…',x+w/2,y+p(60),14,C.muted,400,'center');
        if(this.view.mediaFailed)this.target('media-retry',x,y,w,mediaH,{type:'retry-media'},submitting,'重新加载题目图片');
      }
      if(caption)this.lines(caption,x,y+mediaH+p(8),w,14,C.muted);
      y+=mediaH+captionH+p(S.readingGap);
    }
    const optionRects=[];
    q.options.forEach((option,index)=>{
      const selected=(revive?this.view.incorrectSelected:feedback?feedback.selected:this.view.selected)===index;
      const correct=!!feedback&&(Number.isInteger(feedback.answer)?feedback.answer===index:feedback.right!==false&&selected);
      const wrong=selected&&(revive||feedback?.right===false),state=correct?'correct':wrong?'wrong':selected?'selected':'idle';
      const yy=y+p(this.view.pressedId==='option-'+index&&!feedback?2:0),letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ',letter=letters[index]||String(index+1);
      this.box(x,yy,w,h,S.optionRadius,wrong?C.orangeLight:selected||correct?C.lakeLight:C.surface,wrong?C.error:selected||correct?C.lake:C.lineSoft,state==='idle'?S.optionStroke:S.activeStroke);
      this.box(x+p(16),yy+(h-p(24))/2,p(24),p(24),6,selected||correct?C.surface:C.paper);
      this.label(letter,x+p(28),yy+(h-p(14))/2,14,C.ink,500,'center');
      const textH=this.measure(option,textW,optionSize);this.lines(option,x+p(56),yy+(h-textH)/2,textW,16,C.ink,selected||correct?500:400);
      if(state!=='idle')this.icon(correct?'check':wrong?'cross':'selected',x+w-p(40),yy+(h-p(24))/2);
      this.target('option-'+index,x,y,w,h,{type:'option',index,questionId:q.id},!!feedback||submitting||revive,letter+'，'+option);
      optionRects.push({index,x,y,w,h,selected,state});y+=h+p(8);
    });
    let feedbackRect=null;
    if(inlineExplanation){y+=p(16);this.icon(feedback.right===false?'cross':'check',x,y);this.label(feedback.right===false?'本次回答未通过':'答对了！',x+p(32),y+p(2),16,feedback.right===false?C.error:C.lake,600);
      this.lines(explanation,x,y+p(32),w,16);feedbackRect={x,y,w,h:explanationH+p(56),inline:true};}
    this.endContent(total);
    if(feedback&&!inlineExplanation){
      const y=footerTop+p(16);this.icon(feedback.right===false?'cross':'check',x,y);
      this.label(feedback.right===false?'本次回答未通过':'答对了！',x+p(32),y+p(2),16,feedback.right===false?C.error:C.lake,600);
      this.lines(explanation,x,y+p(32),w,16);feedbackRect={x,y,w,h:explanationH+p(32),inline:false};
    }
    const hint=submitting?'提交中…':feedback?q.position===totalQuestions?'查看结果':'下一题':'提交答案';
    this.button('confirm',hint,x,primaryY,w,{type:feedback?'continue':'confirm',questionId:q.id},false,submitting||!feedback&&this.view.selected==null);
    this.layout.quiz={kind:video?'video-choice':media?'image-choice':'text-choice',position:q.position,total:totalQuestions,region:this.scrollRegion,title:titleRect,media:mediaRect,options:optionRects,feedback:feedbackRect,timer,scroll:this.scroll,scrollMax:this.scrollMax,submitting,primary:{x,y:primaryY,w,h:p(52)}};
  }
  revive() {
    if(this.route.name!=='quiz')return super.revive();
    const ctx=this.ctx,p=n=>this.px(n),x=this.inset(),w=this.width(),pad=p(24),inner=w-pad*2;
    const selected=this.view.incorrectSelected,remaining=this.remainingRevives();
    const test=this.view.testShare||['development','experience'].includes(this.view.mode),ready=this.view.shareReady!==false&&remaining>0;
    const copy=(Number.isInteger(selected)?'本次回答未通过。':'本题超时，未能完成作答。')+'\n'+
      (remaining?'本次还剩 '+remaining+' 次复活机会，分享后可以重答当前题。':'本次挑战的复活机会已用完，可返回主题继续学习。')+
      (test&&remaining?'\n体验版使用测试复活。':'');
    const copyH=this.measure(copy,inner,p(16)),titleH=p(30),naturalH=pad*2+titleH+p(16)+copyH+p(16)+p(120);
    const h=Math.min(naturalH,this.bottom()-this.v.top),y=Math.max(this.v.top,Math.min((this.v.height-h)/2,this.bottom()-h));
    ctx.fillStyle='rgba(38,61,52,.48)';ctx.fillRect(0,0,this.v.width,this.v.height);
    this.box(x,y,w,h,16,C.surface);
    this.icon('cross',x+pad,y+pad);this.label(this.fit('再试一次，继续探索',inner-p(32),p(20),500),x+pad+p(32),y+pad,20,C.ink,500);
    this.targets=[];this.semanticTargets=[];this.clipRegion=null;this.modalActive=true;
    const actionY=y+h-pad-p(120),bodyTop=y+pad+titleH+p(16),bodyBottom=actionY-p(16);
    if(this.modalKey!=='hand-revive'){this.modalKey='hand-revive';this.modalScroll=0;}
    this.scrollMax=Math.max(0,copyH-(bodyBottom-bodyTop));this.scroll=this.modalScroll=Math.max(0,Math.min(this.modalScroll||0,this.scrollMax));
    this.scrollRegion=this.scrollMax?{x:x+pad,y:bodyTop,w:inner,h:bodyBottom-bodyTop}:null;
    ctx.save();ctx.beginPath();ctx.rect(x+pad,bodyTop,inner,bodyBottom-bodyTop);ctx.clip();this.lines(copy,x+pad,bodyTop-this.scroll,inner,16,C.muted);ctx.restore();
    if(this.scrollMax){const rail=bodyBottom-bodyTop,thumb=Math.max(p(24),rail*rail/copyH);this.box(x+w-pad-p(3),bodyTop,p(3),rail,2,C.paper);this.box(x+w-pad-p(3),bodyTop+(rail-thumb)*this.scroll/this.scrollMax,p(3),thumb,2,C.line);}
    this.drawingHandModal=true;
    try{
      this.button('revive-share',!remaining?'复活机会已用完':this.view.submitting?'复活中…':test?'测试复活 · 重答本题':'分享并复活',x+pad,actionY,inner,{type:'share'},false,!ready||!!this.view.submitting);
      this.button('revive-back','返回主题',x+pad,actionY+p(68),inner,{type:'back'},true,!!this.view.submitting);
    }finally{this.drawingHandModal=false;}
    this.layout.revive={x,y,w,h,selected,answerRevealed:false,testShare:!!test,revivesRemaining:remaining,scrollMax:this.scrollMax};
  }
  empty(name) {
    if(name==='themes')return this.themeChooser();
    if(name==='points')return this.points();
    return super.empty(name);
  }
  themeChooser() {
    const x=this.inset(),w=this.width(),p=n=>this.px(n),top=this.navTop()+p(64),themes=this.themes();
    this.backControl();this.heading('选择探索主题',x,top,26,'left',w);
    this.label('从一段家乡故事开始',x,top+p(42),16,C.muted);
    const rows=themes.map(theme=>({theme,h:Math.max(p(128),this.measure(theme.name,w-p(40),p(18),600)+this.measure(theme.description||'乡村文化知识探索',w-p(40),p(14))+p(64))}));
    const total=rows.reduce((sum,row)=>sum+row.h+p(16),0),progress=learningProgress(this.view.catalog,this.view.themeProgress);
    let y=this.beginContent('hand-themes',top+p(88),this.bottom(),total);
    for(const {theme,h} of rows){const levels=this.levels(theme.id),completed=progress.themes.find(t=>t.id===theme.id)?.completed||0;
      this.box(x,y,w,h,14,C.surface,C.line);const titleH=this.lines(theme.name,x+p(20),y+p(16),w-p(40),18,C.ink,600);
      this.lines(theme.description||'乡村文化知识探索',x+p(20),y+p(24)+titleH,w-p(40),14,C.muted);
      this.label('已完成 '+Math.min(completed,levels.length)+' / '+levels.length+' 关',x+p(20),y+h-p(32),14,C.muted);
      this.label('进入  ›',x+w-p(20),y+h-p(32),14,C.lake,600,'right');
      this.target('theme-'+theme.id,x,y,w,h,{type:'theme',themeId:theme.id},!levels.length,'进入'+theme.name+'主题');y+=h+p(16);
    }
    if(!themes.length)this.lines('主题内容正在准备中，请稍后再来。',x,y,w,16,C.muted);
    this.endContent(total);this.layout.themes={total:themes.length,scrollMax:this.scrollMax};
  }
  points() {
    const x=this.inset(),w=this.width(),p=n=>this.px(n),top=this.navTop()+p(64);
    this.backControl();this.heading('我的积分',x,top,26,'left',w);
    const total=p(432);let y=this.beginContent('hand-points',top+p(64),this.bottom(),total);
    this.label(String(this.view.totalPoints||0),x,y,40,C.lake,700);this.label('累计学习积分',x,y+p(56),16,C.muted);y+=p(112);
    const cap=this.view.dailyPointCap;
    this.lines('今日获得 '+(this.view.dailyPoints||0)+' 分'+(cap==null?'':'，每日上限 '+cap+' 分')+'。完成学习后结算积分。',x,y,w,16,C.muted);y+=p(88);
    [['points-certificates','我的学习证书','certificates'],['points-ranking','查看排行榜','ranking'],['points-settings','声音与学习规则','settings']].forEach(([id,label,name])=>{this.button(id,label,x,y,w,{type:'route',name},true);y+=p(76);});
    this.endContent(total);this.layout.points={totalPoints:this.view.totalPoints||0};
  }
}

module.exports={HandRenderer,HAND_ART};

},
"/js/ui/map-layout.js":function(module,exports,require){
// Original candidate illustration geometry. Labels, score and states are explicitly supplied by the data layer.
const MAP_LAYOUTS={
  "red": [
    {
      "entry": [
        0.64,
        0.89
      ],
      "crop": [
        0.33,
        0.64,
        0.63,
        0.33
      ],
      "focus": [
        0.72,
        0.8
      ],
      "threshold": [
        0.775,
        0.825
      ]
    },
    {
      "entry": [
        0.28,
        0.6
      ],
      "crop": [
        0,
        0.34,
        0.54,
        0.29
      ],
      "focus": [
        0.27,
        0.49
      ],
      "threshold": [
        0.27,
        0.565
      ]
    },
    {
      "entry": [
        0.65,
        0.4
      ],
      "crop": [
        0.42,
        0.2,
        0.49,
        0.24
      ],
      "focus": [
        0.7,
        0.32
      ],
      "threshold": [
        0.75,
        0.38
      ]
    },
    {
      "entry": [
        0.5,
        0.265
      ],
      "crop": [
        0,
        0,
        0.6,
        0.26
      ],
      "focus": [
        0.3,
        0.13
      ],
      "threshold": [
        0.32,
        0.205
      ],
      "side": "left"
    }
  ],
  "culture": [
    {
      "entry": [
        0.64,
        0.89
      ],
      "crop": [
        0.33,
        0.64,
        0.63,
        0.33
      ],
      "focus": [
        0.72,
        0.8
      ],
      "threshold": [
        0.75,
        0.85
      ]
    },
    {
      "entry": [
        0.28,
        0.6
      ],
      "crop": [
        0,
        0.34,
        0.54,
        0.29
      ],
      "focus": [
        0.27,
        0.49
      ],
      "threshold": [
        0.29,
        0.555
      ]
    },
    {
      "entry": [
        0.65,
        0.4
      ],
      "crop": [
        0.42,
        0.2,
        0.49,
        0.24
      ],
      "focus": [
        0.7,
        0.32
      ],
      "threshold": [
        0.73,
        0.375
      ]
    },
    {
      "entry": [
        0.5,
        0.265
      ],
      "crop": [
        0,
        0,
        0.6,
        0.26
      ],
      "focus": [
        0.3,
        0.13
      ],
      "threshold": [
        0.29,
        0.18
      ],
      "side": "left"
    }
  ],
  "industry": [
    {
      "entry": [
        0.64,
        0.89
      ],
      "crop": [
        0.33,
        0.64,
        0.63,
        0.33
      ],
      "focus": [
        0.72,
        0.8
      ],
      "threshold": [
        0.72,
        0.885
      ]
    },
    {
      "entry": [
        0.28,
        0.6
      ],
      "crop": [
        0,
        0.34,
        0.54,
        0.29
      ],
      "focus": [
        0.27,
        0.49
      ],
      "threshold": [
        0.29,
        0.57
      ]
    },
    {
      "entry": [
        0.65,
        0.4
      ],
      "crop": [
        0.42,
        0.2,
        0.49,
        0.24
      ],
      "focus": [
        0.7,
        0.32
      ],
      "threshold": [
        0.75,
        0.375
      ]
    },
    {
      "entry": [
        0.5,
        0.265
      ],
      "crop": [
        0,
        0,
        0.6,
        0.26
      ],
      "focus": [
        0.3,
        0.13
      ],
      "threshold": [
        0.29,
        0.19
      ],
      "side": "left"
    }
  ],
  "ecology": [
    {
      "entry": [
        0.64,
        0.89
      ],
      "crop": [
        0.33,
        0.64,
        0.63,
        0.33
      ],
      "focus": [
        0.7,
        0.8
      ],
      "threshold": [
        0.75,
        0.81
      ]
    },
    {
      "entry": [
        0.28,
        0.6
      ],
      "crop": [
        0,
        0.34,
        0.54,
        0.29
      ],
      "focus": [
        0.27,
        0.49
      ],
      "threshold": [
        0.27,
        0.515
      ]
    },
    {
      "entry": [
        0.65,
        0.4
      ],
      "crop": [
        0.42,
        0.2,
        0.49,
        0.24
      ],
      "focus": [
        0.7,
        0.32
      ],
      "threshold": [
        0.71,
        0.35
      ]
    },
    {
      "entry": [
        0.5,
        0.265
      ],
      "crop": [
        0,
        0,
        0.6,
        0.26
      ],
      "focus": [
        0.3,
        0.13
      ],
      "threshold": [
        0.42,
        0.18
      ],
      "side": "left"
    }
  ]
};
for (const sites of Object.values(MAP_LAYOUTS)){for (const site of sites){for(const v of Object.values(site))if(Array.isArray(v))Object.freeze(v);Object.freeze(site);}Object.freeze(sites);}Object.freeze(MAP_LAYOUTS);

function landmarkRegion(image, site, width, height) {
  if (!image || !site || !Array.isArray(site.crop) || !Array.isArray(site.focus) || site.crop.length !== 4 || site.focus.length !== 2 || ![image.width, image.height, width, height].every(value => Number.isFinite(value) && value > 0) || !site.crop.every(Number.isFinite) || !site.focus.every(Number.isFinite)) return null;
  const [x,y,w,h]=site.crop;
  if (w <= 0 || h <= 0) return null;
  const scale=Math.max(width/(w*image.width),height/(h*image.height));
  const sw=width/scale,sh=height/scale;
  const sx=Math.max(x*image.width,Math.min((x+w)*image.width-sw,site.focus[0]*image.width-sw/2));
  const sy=Math.max(y*image.height,Math.min((y+h)*image.height-sh,site.focus[1]*image.height-sh/2));
  return { sx,sy,sw,sh };
}

module.exports={ MAP_LAYOUTS, landmarkRegion };

},
"/js/ui/online-renderer.js":function(module,exports,require){
const { Renderer } = require('./renderer');
const T = require('./tokens');
const D = require('./draw');
const { catalogThemes, catalogTheme, catalogLevels, catalogLevel, usesOriginalMap } = require('../data/catalog');
const { MAP_LAYOUTS, landmarkRegion } = require('./map-layout');
const C = T.colors;

// Online scenes share the approved artwork with the original practice renderer.
// A separate class keeps the older, explicitly local demonstration intact.
class OnlineRenderer extends Renderer {
  constructor(ctx) { super(ctx); this.clipRegion = null; this.modalActive = false; this.semanticTargets = []; }
  scrollBy(delta) { super.scrollBy(delta); if (this.modalActive) this.modalScroll = this.scroll; }
  size(value, minimum = 12) { return Math.max(value, minimum / this.v.scale); }
  fit(value, width, size, weight = 400, family = T.font) {
    const ctx = this.ctx, full = String(value == null ? '' : value); ctx.save(); ctx.font = `${weight} ${size}px ${family}`;
    let text = full;
    if (ctx.measureText(text).width > width) {
      const chars = Array.from(full);
      while (chars.length && ctx.measureText(chars.join('') + '…').width > width) chars.pop();
      text = chars.join('') + '…';
    }
    ctx.restore(); return text;
  }
  themes(options) { return catalogThemes(this.view.catalog, options); }
  theme(id = this.route.params.themeId) { return catalogTheme(this.view.catalog, id); }
  levels(id = this.route.params.themeId, options) { return catalogLevels(this.view.catalog, id, options); }
  motif(theme) { return ['village', 'book', 'field', 'water'].includes(theme?.motif) ? theme.motif : 'book'; }
  themeImage(theme) {
    if (!theme) return null;
    return this.view.configuredImages?.[theme.id] || this.view.images?.[theme.defaultart || theme.id] || null;
  }
  sceneImage(theme) {
    if (!theme) return null;
    return this.view.configuredImages?.['map-' + theme.id] || this.view.images?.['map-' + (theme.defaultart || theme.id)] || null;
  }
  reviveLimit() {
    const value = this.view.reviveLimit ?? this.view.catalog?.config?.revive?.limit ?? 1;
    return Number.isInteger(value) && value >= 0 ? value : 0;
  }
  remainingRevives() {
    const value = this.view.revivesRemaining ?? Math.max(0, this.reviveLimit() - (this.view.reviveUsed ? 1 : 0));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  }
  seconds() { return this.view.countdownTotal ?? this.view.catalog?.config?.timer?.seconds ?? 30; }
  nodeState(level, index, progress) {
    const value = progress?.levelStates?.[level.id] ?? this.view.levelStates?.[level.id] ?? this.view.nodeStates?.[index] ?? progress?.nodes?.[index] ?? (index === 0 ? 'current' : 'locked');
    return { available: 'current', completed: 'complete' }[value] || value;
  }
  measure(value, width, size, weight = 400) {
    const ctx = this.ctx; ctx.save(); ctx.globalAlpha = 0;
    const height = D.wrap(ctx, value, 0, 0, width, size, C.ink, weight);
    ctx.restore(); return height;
  }
  heading(value, x, y, size = 30, align = 'left', maxWidth = 313) {
    const ctx = this.ctx;
    const family = `"Kaiti SC", "STKaiti", ${T.font}`, text = this.fit(value, maxWidth, size, 700, family);
    ctx.font = `700 ${size}px ${family}`;
    ctx.fillStyle = C.ink; ctx.textBaseline = 'top'; ctx.textAlign = align; ctx.fillText(text, x, y);
  }
  target(id, x, y, w, h, action, disabled = false, label = '') {
    if (h * this.v.scale >= 43.99 && w * this.v.scale >= 43.99) this.semanticTargets.push({ id, x, y, w, h, action, disabled, label: label || id });
    if (this.clipRegion) {
      const top = Math.max(y, this.clipRegion.y), bottom = Math.min(y + h, this.clipRegion.y + this.clipRegion.h);
      y = top; h = bottom - top;
    }
    if (h * this.v.scale < 43.99 || w * this.v.scale < 43.99) return;
    super.target(id, x, y, w, h, action, disabled);
    this.targets[this.targets.length - 1].label = label || id;
  }
  button(id, label, x, y, w, action, secondary = false, disabled = false) {
    const ctx = this.ctx, h = Math.max(52, 44 / this.v.scale), pressed = this.view.pressedId === id;
    const blocked = disabled || !!this.view.submitting || !!this.view.loadingRemote && !this.view.connectionError;
    const yy = y + (pressed && !blocked ? 2 : 0);
    D.rounded(ctx, x, yy + 3, w, h, 13, secondary ? 'rgba(38,61,52,.13)' : C.ink);
    D.rounded(ctx, x, yy, w, h, 13, blocked ? C.lakeLight : secondary ? C.surface : C.lake, secondary ? C.line : null);
    D.text(ctx, this.fit(label, w - 24, this.size(17, 14), 600), x + w / 2, yy + (h - this.size(17, 14)) / 2 - 1, this.size(17, 14), secondary || blocked ? C.ink : C.surface, 600, 'center');
    this.target(id, x, y, w, h, action, blocked, label);
  }
  smallControl(id, label, x, y, w, action, active = false, disabled = false, a11yLabel = label) {
    const h = Math.max(52, 44 / this.v.scale), pressed = this.view.pressedId === id;
    D.rounded(this.ctx, x, y + (pressed ? 2 : 0), w, h, 12, active || pressed ? C.lakeLight : C.surface, active ? C.lake : C.line);
    D.text(this.ctx, this.fit(label, w - 16, this.size(15), active ? 600 : 500), x + w / 2, y + 17, this.size(15), active ? C.lake : C.ink, active ? 600 : 500, 'center');
    this.target(id, x, y, w, h, action, disabled || !!this.view.submitting || !!this.view.loadingRemote && !this.view.connectionError, a11yLabel);
  }
  render(route, viewport, view = {}) {
    this.v = viewport; this.view = view; this.route = route; this.targets = []; this.semanticTargets = []; this.layout = {};
    this.scrollRegion = null; this.clipRegion = null; this.modalActive = false;
    this.t = Math.max(viewport.top + 12, 68 / viewport.scale);
    const ctx = this.ctx;
    ctx.clearRect(0, 0, viewport.width, viewport.height); ctx.fillStyle = view.catalog?.config?.themes?.find(t=>t.id===route.params.themeId)?.background || view.catalog?.config?.background || C.paper; ctx.fillRect(0, 0, viewport.width, viewport.height);
    this.sceneBackdrop(route.name);
    if (route.name === 'loading') this.loading();
    else if (route.name === 'home') this.home();
    else if (route.name === 'map') this.map();
    else if (route.name === 'level-ready') this.levelReady();
    else if (route.name === 'quiz' && view.challengeState === 'locked') this.locked();
    else if (route.name === 'quiz' && (view.question || view.feedback)) this.quiz();
    else if (route.name === 'result' && view.result) this.result();
    else if (route.name === 'ranking') this.ranking();
    else if (route.name === 'certificates') this.certificates();
    else if (route.name === 'settings') this.settings();
    else this.empty(route.name);
    if (view.modal === 'revive') this.revive();
    if (view.exitRequested) this.exitDialog();
    if (view.connectionError) this.remoteError();
    if(view.videoActive){
      this.targets=[];this.semanticTargets=[];this.scrollRegion=null;ctx.fillStyle='rgba(33,54,47,.55)';ctx.fillRect(0,this.t+70,375,this.v.bottom-this.t-70);
      this.button('close-video','关闭视频 · 返回答题',24,this.v.bottom-52,327,{type:'close-video'});
    }
    if (view.loadingRemote && route.name !== 'loading' && !view.connectionError) {
      D.rounded(ctx, 93, this.t - 39, 189, 31, 15, C.ink);
      D.text(ctx, '正在连接，请稍候…', 187.5, this.t - 32, this.size(13), C.surface, 500, 'center');
    }
    if (view.toast && !view.connectionError) {
      const font = this.size(14), height = this.measure(view.toast, 303, font) + 22;
      const y = view.modal || view.exitRequested ? this.t - 47 : this.v.bottom - 128 - height;
      D.rounded(ctx, 20, y, 335, height, 12, C.ink); D.wrap(ctx, view.toast, 36, y + 11, 303, font, C.surface);
    }
    return this.targets;
  }
  sceneBackdrop(name) {
    const theme = this.theme(), homeTheme = this.themes().find(item => item.id === 'ecology');
    const scene = name === 'home' ? this.view.configuredImages?.cover || (homeTheme && usesOriginalMap(this.view.catalog, homeTheme.id) ? this.sceneImage(homeTheme) : null) : this.sceneImage(theme);
    if (scene && ['home', 'quiz', 'result'].includes(name)) {
      D.imageCover(this.ctx, scene, 0, 0, 375, this.v.height, 0);
      this.ctx.fillStyle = 'rgba(239,234,217,.43)'; this.ctx.fillRect(0, 0, 375, this.v.height);
      this.layout.backdrop = { source: name === 'home' ? 'activity-environment' : 'theme-' + theme.id + '-environment', decorative: true };
    }
  }
  pageTitle(title, caption = '', extra = null) {
    const ctx = this.ctx, t = this.t;
    D.rounded(ctx, 16, t - 8, 343, 94, 16, C.surface, C.line);
    D.text(ctx, this.fit(caption, 313, this.size(13), 600), 30, t + 4, this.size(13), C.lake, 600);
    this.heading(title, 30, t + 30, 29, 'left', extra ? 254 : 313);
    if (extra) D.text(ctx, extra, 344, t + 39, this.size(13), C.muted, 500, 'right');
  }
  beginContent(key, top, bottom, total) {
    const region = { x: 20, y: top, w: 335, h: Math.max(40, bottom - top) };
    if (this.scrollKey !== key) { this.scrollKey = key; this.scroll = 0; }
    this.scrollMax = Math.max(0, total - region.h); this.scroll = Math.max(0, Math.min(this.scroll || 0, this.scrollMax));
    this.scrollRegion = region; this.clipRegion = region;
    this.ctx.save(); this.ctx.beginPath(); this.ctx.rect(region.x, region.y, region.w, region.h); this.ctx.clip();
    return top - this.scroll;
  }
  endContent(total) {
    this.ctx.restore(); this.clipRegion = null;
    const r = this.scrollRegion;
    if (this.scrollMax > 0 && r) {
      const rail = r.h - 16, thumb = Math.max(28, rail * r.h / total);
      D.rounded(this.ctx, 352, r.y + 8, 3, rail, 2, C.lakeLight);
      D.rounded(this.ctx, 352, r.y + 8 + (rail - thumb) * this.scroll / this.scrollMax, 3, thumb, 2, C.lake);
    }
  }
  home() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, points = Number(this.view.totalPoints) || 0;
    D.rounded(ctx, 16, t - 8, 343, 104, 16, C.surface, C.line);
    D.text(ctx, '乡村知识之旅', 30, t + 3, this.size(13), C.lake, 600);
    const name=this.view.catalog?.config?.name || '趣味闯关';
    this.heading(name, 30, t + 28, name.length>5?27:33, 'left', 205);
    const dayCap = this.view.dailyPointCap;
    D.text(ctx, Number.isFinite(dayCap) ? `今日 ${this.view.dailyPoints || 0} / ${dayCap} 积分` : '沿着小路，发现家乡。', 30, t + 73, this.size(14), C.muted);
    const player = this.view.userName || '旅人';
    D.text(ctx, player.length > 7 ? player.slice(0, 6) + '…' : player, 273, t + 5, this.size(12), C.muted, 500, 'right');
    D.text(ctx, `${points} 积分`, 273, t + 28, this.size(15), C.lake, 700, 'right');
    this.smallControl('settings', '设置', 287, t + 17, 56, { type: 'settings' });
    const themes = this.themes(), cardH = 180, rows = Math.ceil(themes.length / 2), total = themes.length ? rows * (cardH + 14) - 12 : 245;
    const start = this.beginContent('online-home', t + 110, b - 132, total);
    const artBoxes = [], artRects = [];
    themes.forEach((theme, i) => {
      const x = 24 + i % 2 * 170, y = start + Math.floor(i / 2) * (cardH + 14), pressed = this.view.pressedId === `theme-${theme.id}`;
      const yy = y + (pressed ? 2 : 0), progress = this.view.themeProgress && this.view.themeProgress[theme.id];
      const levels = this.levels(theme.id), enabled = levels.length > 0;
      const complete = progress ? progress.completed : 0, image = this.themeImage(theme);
      D.rounded(ctx, x, yy + 3, 157, cardH, 16, 'rgba(38,61,52,.2)');
      D.rounded(ctx, x, yy, 157, cardH, 16, pressed ? C.lakeLight : C.surface, C.line);
      const box = { themeId: theme.id, x: x + 9, y: yy + 8, w: 139, h: 120 }; artBoxes.push(box);
      if (image) artRects.push(this.art(theme.id, image, box.x, box.y, box.w, box.h));
      else D.motif(ctx, this.motif(theme), x + 53, yy + 35, 52);
      D.text(ctx, this.fit(theme.name, 139, this.size(19, 15), 700), x + 78.5, yy + 129, this.size(19, 15), C.ink, 700, 'center');
      D.text(ctx, enabled ? `${Math.min(complete, levels.length)} / ${levels.length} 关已完成` : '关卡准备中', x + 78.5, yy + 155, this.size(12), C.muted, 500, 'center');
      this.target(`theme-${theme.id}`, x, y, 157, cardH, { type: 'theme', themeId: theme.id }, false, `${theme.name}，${enabled ? '已完成' + complete + '关，共' + levels.length + '关' : '关卡准备中'}`);
    });
    if (!themes.length) {
      D.rounded(ctx, 24, start, 327, 232, 16, C.surface, C.line); D.motif(ctx, 'book', 158, start + 30, 58);
      D.text(ctx, '新的旅程正在准备', 187.5, start + 119, 24, C.ink, 700, 'center');
      D.wrap(ctx, '当前没有开放的主题，请稍后再来。', 48, start + 164, 279, this.size(16, 14), C.muted);
    }
    this.endContent(total);
    D.rounded(ctx, 16, b - 124, 343, 130, 16, C.surface, C.line);
    this.smallControl('ranking', '排行榜', 24, b - 119, 155, { type: 'route', name: 'ranking' });
    this.smallControl('certificates', '我的证书', 195, b - 119, 156, { type: 'route', name: 'certificates' });
    this.button('practice', this.view.continueLabel || (this.view.localDestination && this.view.localDestination.label) || (this.view.hasActiveChallenge ? '继续当前挑战' : '开启乡村之旅'), 24, b - 55, 327, { type: 'practice' }, false, !themes.some(theme => this.levels(theme.id).length) && !this.view.hasActiveChallenge);
    this.layout.home = { cardH, themes: themes.map(theme => theme.id), rows, artBoxes, artRects, region: this.scrollRegion, scrollMax: this.scrollMax };
  }
  map() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, theme = this.theme(), levels = this.levels();
    if (!theme || theme.enabled === false) { this.empty('theme-unavailable'); return; }
    if (!levels.length) { this.empty('levels-empty'); return; }
    const progress = this.view.themeProgress && this.view.themeProgress[theme.id];
    const states = levels.map((level, index) => this.nodeState(level, index, progress));
    this.pageTitle(theme.name, `${levels.length}关旅程 · ${theme.description || '发现更多乡村知识'}`);
    D.text(ctx, `${progress ? Math.min(progress.completed, levels.length) : 0} / ${levels.length} 关已完成`, 30, t + 69, this.size(13), C.muted);
    if (!usesOriginalMap(this.view.catalog, theme.id)) { this.genericMap(theme, levels, states); return; }
    const top = t + 105, h = b - 75 - top, scene = this.sceneImage(theme);
    const worldH = scene ? 335 * scene.height / scene.width : 502.5, frame = { x: 20, y: top, w: 335, h: Math.min(worldH, h) };
    const sites = MAP_LAYOUTS[theme.id], max = Math.max(0, worldH - frame.h), focus = Math.max(0, states.indexOf('current'));
    const key = `online-map-${theme.id}-${this.v.physicalWidth}-${this.v.physicalHeight}`;
    if (this.scrollKey !== key) { this.scrollKey = key; this.scroll = Math.max(0, Math.min(max, worldH * sites[focus].entry[1] - frame.h * .58)); }
    this.scrollMax = max; this.scroll = Math.max(0, Math.min(max, this.scroll || 0)); this.scrollRegion = frame; this.clipRegion = frame;
    D.rounded(ctx, 20, top, 335, frame.h, 16, C.lakeLight);
    ctx.save(); D.rounded(ctx, 20, top, 335, frame.h, 16); ctx.clip();
    const originY = top - this.scroll;
    if (scene) ctx.drawImage(scene, 20, originY, 335, worldH);
    const coords = sites.map(site => [20 + 335 * site.entry[0], originY + worldH * site.entry[1]]);
    ctx.beginPath(); ctx.moveTo(...coords[0]);
    for (let i = 1; i < coords.length; i++) { const a = coords[i - 1], z = coords[i]; ctx.bezierCurveTo(a[0], (a[1] + z[1]) / 2, z[0], (a[1] + z[1]) / 2, ...z); }
    ctx.strokeStyle = C.paper; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.setLineDash([2, 6]); ctx.stroke(); ctx.setLineDash([]);
    const nodes = [];
    levels.forEach((level, i) => {
      const [cx, cy] = coords[i], state = states[i] || 'locked', complete = state === 'complete', current = state === 'current', today = state === 'today-locked';
      const left = sites[i].side ? sites[i].side === 'left' : sites[i].entry[0] > .5, lx = left ? cx - 132 : cx + 26, ly = cy + (sites[i].signY || -22);
      D.rounded(ctx, lx, ly, 108, 49, 12, complete ? C.lakeLight : current || today ? C.orangeLight : C.surface, today ? C.error : current || complete ? C.lake : C.line);
      if (current) D.circle(ctx, cx, cy, 23, C.orangeLight, C.lake);
      D.circle(ctx, cx, cy, 18, complete ? C.lake : today ? C.error : C.surface, current || complete ? C.lake : C.line);
      if (complete) D.line(ctx, [[cx - 8, cy], [cx - 2, cy + 6], [cx + 9, cy - 7]], C.surface, 2);
      else D.text(ctx, today ? '!' : String(i + 1), cx, cy - 11, 21, today ? C.surface : C.ink, 700, 'center');
      D.text(ctx, this.fit(level.name || level.difficulty, 88, this.size(14), 600), lx + 10, ly + 6, this.size(14), C.ink, 600);
      const label = today ? '今日锁定' : complete ? '已通关 · 可重玩' : current ? '从这里出发' : '完成上关解锁';
      D.text(ctx, label, lx + 10, ly + 29, this.size(11, 11), today ? C.error : complete || current ? C.lake : C.muted, 500);
      const hot = { x: Math.min(lx - 4, cx - 25), y: Math.min(ly - 4, cy - 27), w: Math.max(lx + 112, cx + 25) - Math.min(lx - 4, cx - 25), h: Math.max(ly + 53, cy + 27) - Math.min(ly - 4, cy - 27) };
      nodes.push({ id: `level-${i + 1}`, levelId: level.id, x: cx, y: cy, hotRect: hot, state });
      this.target(`level-${i + 1}`, hot.x, hot.y, hot.w, hot.h, { type: 'level', themeId: theme.id, levelId: level.id, index: i }, false, `${level.label}，${level.name || level.difficulty}，${label}`);
    });
    ctx.restore(); this.clipRegion = null;
    if (max > 0) { const rail = frame.h - 32, thumb = Math.max(28, rail * frame.h / worldH); D.rounded(ctx, 349, top + 16, 3, rail, 2, C.surface); D.rounded(ctx, 349, top + 16 + (rail - thumb) * this.scroll / max, 3, thumb, 2, C.lake); }
    this.mapFooter(theme, levels, states);
    this.layout.map = { style: 'original', frame, scene: { x: 20, y: originY, w: 335, h: worldH }, nodes, scroll: this.scroll, scrollMax: max, scaleX: scene ? 335 / scene.width : null, scaleY: scene ? worldH / scene.height : null };
  }
  mapFooter(theme, levels, states) {
    const b = this.v.bottom; this.button('back', '返回', 24, b - 52, 80, { type: 'back' }, true);
    const allComplete = states.length > 0 && states.every(state => state === 'complete');
    let next = states.indexOf('current');
    if (next < 0) next = states.indexOf('today-locked');
    if (next < 0) next = allComplete ? levels.length - 1 : 0;
    const level = levels[next];
    this.button('begin', allComplete ? `回顾${level.label}` : states[next] === 'today-locked' ? '查看今日锁定说明' : `前往${level.label}`, 116, b - 52, 235, { type: 'level', themeId: theme.id, levelId: level.id, index: next });
  }
  genericMap(theme, levels, states) {
    const ctx = this.ctx, top = this.t + 105, bottom = this.v.bottom - 75, stride = 103, coverH = 122, total = coverH + levels.length * stride + 12;
    const key = `online-journey-${theme.id}-${levels.map(level => level.id).join('|')}`, changed = this.scrollKey !== key;
    let start = this.beginContent(key, top, bottom, total);
    const focus = Math.max(0, states.indexOf('current'));
    if (changed && focus > 0) { this.scroll = Math.min(this.scrollMax, coverH + focus * stride - this.scrollRegion.h / 2); ctx.restore(); this.clipRegion = null; start = this.beginContent(key, top, bottom, total); }
    D.rounded(ctx, 24, start, 327, 108, 16, C.lakeLight, C.line);
    D.text(ctx, `${levels.length} 段旅程`, 42, start + 21, 28, C.lake, 700);
    D.text(ctx, '沿着小路，逐关发现。', 42, start + 68, this.size(13), C.muted);
    const image = this.themeImage(theme);
    if (image) this.art(theme.id, image, 225, start + 6, 113, 96);
    else D.motif(ctx, this.motif(theme), 262, start + 26, 52);
    const nodes = [];
    levels.forEach((level, index) => {
      const y = start + coverH + index * stride, cx = 43, cy = y + 43, state = states[index], complete = state === 'complete', current = state === 'current', today = state === 'today-locked';
      const label = complete ? '已通关 · 可重玩' : today ? '今日锁定' : current ? '从这里出发' : '完成上关解锁';
      if (index < levels.length - 1) { ctx.save(); ctx.setLineDash([2, 5]); D.line(ctx, [[cx, cy + 19], [cx, cy + stride - 19]], C.line, 2); ctx.restore(); }
      D.rounded(ctx, 74, y, 263, 86, 14, complete ? C.lakeLight : current || today ? C.orangeLight : C.surface, today ? C.error : current || complete ? C.lake : C.line);
      if (current) D.circle(ctx, cx, cy, 23, C.orangeLight, C.lake);
      D.circle(ctx, cx, cy, 18, complete ? C.lake : today ? C.error : C.surface, current || complete ? C.lake : C.line);
      if (complete) D.line(ctx, [[cx - 8, cy], [cx - 2, cy + 6], [cx + 9, cy - 7]], C.surface, 2);
      else D.text(ctx, today ? '!' : String(index + 1), cx, cy - 10, 19, today ? C.surface : C.ink, 700, 'center');
      D.text(ctx, this.fit(level.name || `${level.label} · ${level.difficulty}`, 231, this.size(17), 600), 90, y + 15, this.size(17), C.ink, 600);
      D.text(ctx, label, 90, y + 40, this.size(12), today ? C.error : complete || current ? C.lake : C.muted, 500);
      D.text(ctx, this.fit(`${level.questionCount}题 · 首次奖励${level.points ?? 0}分`, 231, this.size(12)), 90, y + 63, this.size(12), C.muted);
      const hotRect = { x: 24, y, w: 313, h: 86 };
      nodes.push({ id: `level-${index + 1}`, levelId: level.id, x: cx, y: cy, hotRect, state });
      this.target(`level-${index + 1}`, hotRect.x, hotRect.y, hotRect.w, hotRect.h, { type: 'level', themeId: theme.id, levelId: level.id, index }, false, `${level.label}，${level.name || level.difficulty}，${level.questionCount}题，${level.points ?? 0}分，${label}`);
    });
    this.endContent(total); this.mapFooter(theme, levels, states);
    this.layout.map = { style: 'generic', frame: this.scrollRegion, scene: null, nodes, scroll: this.scroll, scrollMax: this.scrollMax, contentHeight: total, scaleX: null, scaleY: null };
  }
  levelReady() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, level = catalogLevel(this.view.catalog, this.route.params.levelId), theme = level && this.theme(level.themeId);
    if (!theme || theme.enabled === false || !level || level.enabled === false) { this.empty('level-unavailable'); return; }
    const currentLevel = this.levels(theme.id).find(item => item.id === level.id);
    this.pageTitle(level.name || `${currentLevel.label} · ${level.difficulty}`, theme.name + ' / 关卡准备');
    D.text(ctx, this.fit(theme.description, 311, this.size(14)), 30, t + 69, this.size(14), C.muted);
    const limit = this.reviveLimit(), font = this.size(15, 14), rule = `${level.questionCount}题全部答对，完成本关旅程。每题${this.seconds()}秒，超时算答错。${limit ? `本次挑战最多复活${limit}次，机会用完后再次答错，当前关卡当日锁定。` : '本关没有复活机会，答错后当前关卡当日锁定。'}`;
    const ruleH = this.measure(rule, 287, font), panelH = 150 + ruleH, heroH = 155, total = heroH + 14 + panelH + 12;
    const y = this.beginContent('online-ready-' + level.id, t + 104, b - 91, total);
    const scene = this.sceneImage(theme), site = usesOriginalMap(this.view.catalog, theme.id) && MAP_LAYOUTS[theme.id]?.[currentLevel.displayOrder - 1];
    const hero = { x: 24, y, w: 327, h: heroH }; D.rounded(ctx, hero.x, hero.y, hero.w, hero.h, 16, C.lakeLight);
    let source = null;
    if (scene && site) source = landmarkRegion(scene, site, hero.w, hero.h);
    if (source) { ctx.save(); D.rounded(ctx, hero.x, hero.y, hero.w, hero.h, 16); ctx.clip(); ctx.drawImage(scene, source.sx, source.sy, source.sw, source.sh, hero.x, hero.y, hero.w, hero.h); ctx.restore(); }
    else if (this.themeImage(theme)) this.art(theme.id, this.themeImage(theme), 66, y + 10, 245, 135);
    else D.motif(ctx, this.motif(theme), 158, y + 46, 60);
    const py = y + heroH + 14; D.rounded(ctx, 24, py, 327, panelH, 16, C.surface, C.line);
    D.text(ctx, `${level.questionCount} 题`, 98, py + 16, 28, C.lake, 700, 'center'); D.text(ctx, '四选一知识挑战', 98, py + 54, this.size(12), C.muted, 400, 'center');
    D.line(ctx, [[186, py + 20], [186, py + 71]], C.line, 1);
    D.text(ctx, `${level.points} 分`, 271, py + 16, 28, C.lake, 700, 'center'); D.text(ctx, '首次通关获得', 271, py + 54, this.size(12), C.muted, 400, 'center');
    D.line(ctx, [[40, py + 86], [335, py + 86]], C.line, 1); D.text(ctx, '出发前，记住三件事', 44, py + 100, this.size(14), C.lake, 600); D.wrap(ctx, rule, 44, py + 129, 287, font, C.ink);
    this.endContent(total);
    D.text(ctx, '正确率按首次作答统计 · 日锁北京时间零点解除', 187.5, b - 79, this.size(11, 11), C.muted, 400, 'center');
    this.button('back', '返回地图', 24, b - 52, 100, { type: 'back' }, true);
    this.button('ready-start', this.view.loadingRemote ? '准备中…' : '开始挑战', 136, b - 52, 215, { type: 'formal-start', themeId: theme.id, levelId: level.id });
    this.layout.ready = { hero, source, levelId: level.id, questionCount: level.questionCount, points: level.points, landmark: site ? currentLevel.displayOrder - 1 : null, panel: { x: 24, y: py, w: 327, h: panelH }, scrollMax: this.scrollMax };
  }
  countdown(seconds, x, y, active = true) {
    const ctx = this.ctx, total = this.view.countdownTotal || 30, left = Math.max(0, Math.min(total, Number(seconds) || 0)), urgent = active && left <= 5;
    D.circle(ctx, x, y, 25, urgent ? C.orangeLight : C.paper);
    ctx.beginPath(); ctx.arc(x, y, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left / total);
    ctx.strokeStyle = urgent ? C.error : C.lake; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    D.text(ctx, active ? String(Math.ceil(left)) : '✓', x, y - 12, 23, urgent ? C.error : C.lake, 700, 'center');
    return { seconds: left, urgent, active, total };
  }
  quiz() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, feedback = this.view.feedback, q = feedback ? feedback.question : this.view.question;
    if (!q) { this.empty('quiz'); return; }
    const submitting = !!this.view.submitting, totalQuestions = q.total || 10, key = `online-${q.id}-${feedback ? 'feedback' : 'answer'}`;
    const changed = this.scrollKey !== key, small = this.size(13), optionSize = this.size(17, 14), bodySize = this.size(15, 14), titleSize = this.size(23, 18);
    D.rounded(ctx, 16, t - 8, 343, 81, 16, C.surface, C.line);
    D.text(ctx, this.fit(`${q.themeName} · ${q.levelName || `第${q.levelOrder}关`}`, 255, this.size(16), 600), 28, t + 3, this.size(16), C.ink, 600);
    const remainingRevives = this.remainingRevives();
    D.text(ctx, this.fit(`第 ${q.position} / ${totalQuestions} 题 · 剩余${remainingRevives}次复活`, 255, small), 28, t + 31, small, C.muted);
    D.rounded(ctx, 28, t + 59, 252, 5, 3, C.lakeLight); D.rounded(ctx, 28, t + 59, 252 * q.position / totalQuestions, 5, 3, C.lake);
    const timer = this.countdown(this.view.remainingSeconds, 320, t + 32, !feedback && this.view.modal !== 'revive');
    const media = q.media && (q.media.type === 'image' || q.media.type === 'video'), video = media && q.media.type === 'video', caption = media ? q.media.caption || (video ? '题目视频' : '题目配图') : '';
    const title = this.balancedTitle(q.title, 303, titleSize), titleH = this.measure(title, 303, titleSize, 600), captionH = media ? this.measure(caption, 303, small) : 0;
    const heights = q.options.map(option => Math.max(58, this.measure(option, 253, optionSize) + 26)), gap = 10, mediaH = video ? 92 : 146;
    const explanation = feedback && (feedback.explanation || '继续下一题，认识更多家乡知识。');
    const feedbackH = feedback ? this.measure(explanation, 287, bodySize) + 65 : 0;
    const total = titleH + 52 + (media ? mediaH + captionH + 21 : 0) + heights.reduce((sum, h) => sum + h + gap, 0) + feedbackH + 16;
    let y = this.beginContent(key, t + 86, b - 100, total);
    if (changed && feedback) { this.scroll = this.scrollMax; this.ctx.restore(); this.clipRegion = null; y = this.beginContent(key, t + 86, b - 100, total); }
    const titleRect = { x: 24, y, w: 327, h: titleH + 42 };
    D.rounded(ctx, 24, y, 327, titleRect.h, 16, C.surface, C.line);
    D.text(ctx, q.difficultyLabel || q.difficulty || '知识答题', 36, y + 10, small, C.lake, 600);
    D.wrap(ctx, title, 36, y + 35, 303, titleSize, C.ink, 600); y += titleH + 52;
    let mediaRect = null;
    if (media) {
      mediaRect = { x: 24, y, w: 327, h: mediaH };
      D.rounded(ctx, 24, y, 327, mediaH, 14, C.surface, C.line);
      if (video) {
        D.circle(ctx, 55, y + 42, 21, C.lake); ctx.beginPath(); ctx.moveTo(50, y + 32); ctx.lineTo(64, y + 42); ctx.lineTo(50, y + 52); ctx.closePath(); ctx.fillStyle = C.surface; ctx.fill();
        D.text(ctx, '播放题目视频', 91, y + 21, optionSize, C.lake, 600); D.text(ctx, '观看时倒计时继续', 91, y + 52, small, C.muted);
        this.target('play-video', 24, y, 327, mediaH, { type: 'play-video', src: q.media.src, url: q.media.url }, false, '播放题目视频，观看时倒计时继续');
      } else if (this.view.mediaImage) {
        const image = this.view.mediaImage, scale = Math.min(311 / image.width, (mediaH - 16) / image.height), w = image.width * scale, h = image.height * scale;
        ctx.drawImage(image, 24 + (327 - w) / 2, y + (mediaH - h) / 2, w, h);
        mediaRect.image = { w, h, sourceW: image.width, sourceH: image.height };
      } else {
        D.text(ctx, this.view.mediaFailed ? '图片未能加载' : '图片加载中…', 40, y + 36, bodySize, C.ink);
        if (this.view.mediaFailed) { D.text(ctx, '点击重试', 40, y + 86, optionSize, C.lake, 600); this.target('media-retry', 24, y, 327, mediaH, { type: 'retry-media' }, false, '重新加载题目图片'); }
      }
      D.rounded(ctx, 24, y + mediaH + 3, 327, captionH + 12, 8, C.surface); D.wrap(ctx, caption, 36, y + mediaH + 8, 303, small, C.muted); y += mediaH + captionH + 21;
    }
    const optionRects = [];
    q.options.forEach((option, index) => {
      const selectedIndex = this.view.modal === 'revive' ? this.view.incorrectSelected : feedback ? feedback.selected : this.view.selected;
      const selected = selectedIndex === index, correct = !!feedback && (Number.isInteger(feedback.answer) ? feedback.answer === index : feedback.right !== false && selected), wrong = selected && (this.view.modal === 'revive' || feedback && feedback.right === false);
      const pressed = this.view.pressedId === `option-${index}`, h = heights[index], yy = y + (pressed ? 2 : 0);
      D.rounded(ctx, 24, yy + 2, 327, h, 12, 'rgba(38,61,52,.16)');
      D.rounded(ctx, 24, yy, 327, h, 12, correct ? C.lakeLight : selected ? C.orangeLight : C.surface, wrong ? C.error : selected || correct ? C.lake : C.line);
      D.circle(ctx, 47, yy + 27, 14, correct ? C.lake : wrong ? C.error : selected ? C.lake : C.paper);
      D.text(ctx, correct ? '✓' : wrong ? '×' : 'ABCD'[index], 47, yy + 18, 14, selected || correct ? C.surface : C.ink, 600, 'center');
      D.wrap(ctx, option, 71, yy + 13, 253, optionSize, C.ink, selected || correct ? 600 : 400);
      this.target(`option-${index}`, 24, y, 327, h, { type: 'option', index, questionId: q.id }, !!feedback || submitting || this.view.modal === 'revive', `${'ABCD'[index]}，${option}`);
      optionRects.push({ index, x: 24, y, w: 327, h, selected, state: correct ? 'correct' : wrong ? 'wrong' : selected ? 'selected' : 'idle' }); y += h + gap;
    });
    let feedbackRect = null;
    if (feedback) {
      feedbackRect = { x: 24, y, w: 327, h: feedbackH };
      D.rounded(ctx, 24, y, 327, feedbackH, 14, C.lakeLight, C.lake);
      D.text(ctx, feedback.right === false ? '知识解析' : '答对了 · 知识解析', 44, y + 15, optionSize, C.lake, 700);
      D.wrap(ctx, explanation, 44, y + 48, 287, bodySize, C.ink);
    }
    this.endContent(total);
    D.rounded(ctx, 16, b - 96, 343, 103, 16, C.surface, C.line);
    const hint = submitting ? '正在提交答案…' : feedback ? '看完解析，继续旅程' : timer.urgent ? '还剩几秒，选好后确认' : this.scrollMax > this.scroll + 2 ? '上下滑动，查看全部选项' : '选好一项，再确认答案';
    D.text(ctx, hint, 187.5, b - 82, bodySize, timer.urgent ? C.error : C.muted, timer.urgent ? 600 : 400, 'center');
    this.button('quiz-exit', '退出', 24, b - 52, 80, { type: 'exit-request' }, true, submitting);
    this.button('confirm', submitting ? '提交中…' : feedback ? q.position === totalQuestions ? '查看结果' : '下一题' : '确认答案', 116, b - 52, 235, { type: feedback ? 'continue' : 'confirm', questionId: q.id }, false, submitting || !feedback && this.view.selected == null);
    this.layout.quiz = { kind: video ? 'video-choice' : media ? 'image-choice' : 'text-choice', position: q.position, total: totalQuestions, region: this.scrollRegion, title: titleRect, media: mediaRect, options: optionRects, feedback: feedbackRect, timer, scroll: this.scroll, scrollMax: this.scrollMax, submitting };
  }
  modal(title, copy, actions, tone = C.ink) {
    const ctx = this.ctx, font = this.size(15, 14), copyH = this.measure(copy, 279, font), naturalH = 85 + copyH + actions.length * 62 + 18;
    const h = Math.min(naturalH, this.v.bottom - this.t);
    const y = Math.max(this.t, (this.t + this.v.bottom - h) / 2);
    ctx.fillStyle = 'rgba(24,45,39,.62)'; ctx.fillRect(0, 0, 375, this.v.height);
    D.rounded(ctx, 28, y, 319, h, 18, C.surface, C.ink); D.text(ctx, title, 48, y + 23, this.size(25, 20), tone, 700);
    this.targets = []; this.semanticTargets = []; this.scrollRegion = null; this.clipRegion = null;
    const actionY = y + h - actions.length * 62 - 18, bodyTop = y + 67, bodyBottom = actionY - 12;
    if (this.modalKey !== title) { this.modalKey = title; this.modalScroll = 0; }
    this.modalActive = true; this.scrollMax = Math.max(0, copyH - (bodyBottom - bodyTop));
    this.scroll = this.modalScroll = Math.max(0, Math.min(this.modalScroll || 0, this.scrollMax));
    this.scrollRegion = this.scrollMax ? { x: 48, y: bodyTop, w: 279, h: bodyBottom - bodyTop } : null;
    ctx.save(); ctx.beginPath(); ctx.rect(48, bodyTop, 279, bodyBottom - bodyTop); ctx.clip();
    D.wrap(ctx, copy, 48, bodyTop - this.scroll, 279, font, C.muted); ctx.restore();
    if (this.scrollMax) {
      const rail = bodyBottom - bodyTop, thumb = Math.max(28, rail * rail / copyH);
      D.rounded(ctx, 333, bodyTop, 3, rail, 2, C.lakeLight); D.rounded(ctx, 333, bodyTop + (rail - thumb) * this.scroll / this.scrollMax, 3, thumb, 2, C.lake);
    }
    actions.forEach((a, i) => this.button(a.id, a.label, 48, actionY + i * 62, 279, a.action, !!a.secondary, !!a.disabled));
    return { x: 28, y, w: 319, h, scrollMax: this.scrollMax };
  }
  revive() {
    const selected = this.view.incorrectSelected, choice = Number.isInteger(selected) ? `你选择了 ${'ABCD'[selected]}，本题未通过。` : '本题超时，未能完成作答。';
    const remaining = this.remainingRevives(), test = this.view.testShare || ['development', 'experience'].includes(this.view.mode), ready = this.view.shareReady !== false && remaining > 0;
    const copy = `${choice}\n${remaining ? `分享后可重答当前题，本次挑战还剩${remaining}次复活。机会用完后再次答错，当前关卡今日锁定。` : '本次挑战的复活机会已用完，可返回地图继续其他旅程。'}${test && remaining ? '\n体验版使用测试复活。' : ''}`;
    this.layout.revive = { ...this.modal('再试一次，继续旅程', copy, [
      { id: 'revive-share', label: !remaining ? '复活机会已用完' : this.view.submitting ? '复活中…' : test ? '测试复活 · 重答本题' : '分享并复活', action: { type: 'share' }, disabled: !ready || !!this.view.submitting },
      { id: 'revive-back', label: '返回关卡地图', action: { type: 'back' }, secondary: true, disabled: !!this.view.submitting }
    ], C.error), selected, answerRevealed: false, testShare: !!test, revivesRemaining: remaining };
  }
  exitDialog() {
    this.layout.exit = this.modal('先休息一下吗？', '当前挑战会保存，可以回到首页继续。倒计时仍会继续，本题答题时间到后会按答错处理。', [
      { id: 'exit-cancel', label: '继续作答', action: { type: 'exit-cancel' } },
      { id: 'exit-confirm', label: '保存并返回地图', action: { type: 'exit-confirm' }, secondary: true }
    ]);
  }
  locked() {
    const theme = this.theme(), themeName = this.view.question?.themeName || theme?.name || '本次旅程';
    this.pageTitle('今日先到这里', themeName + ' / 当前关卡锁定');
    const y = this.t + 119, font = this.size(16, 14), copy = '本次挑战未通过，当前关卡今日锁定。北京时间零点后可以再次挑战已开放的关卡。其他主题仍可继续。', total = 310;
    const start = this.beginContent('online-locked', y, this.v.bottom - 75, total);
    D.rounded(this.ctx, 24, start, 327, total - 10, 16, C.surface, C.line); D.motif(this.ctx, this.motif(theme), 158, start + 27, 58);
    D.text(this.ctx, '旅程还可以继续', 187.5, start + 110, 24, C.ink, 700, 'center'); D.wrap(this.ctx, copy, 44, start + 158, 287, font, C.muted);
    this.endContent(total); this.button('locked-back', '返回关卡地图', 24, this.v.bottom - 52, 327, { type: 'back' });
  }
  result() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, r = this.view.result, theme = this.theme(), levels = theme ? this.levels(theme.id) : [];
    const completeTheme = r.themeComplete ?? (this.view.catalog == null && levels.length > 0 && r.levelOrder === levels.length);
    const nextLevel = r.nextLevelId ? catalogLevel(this.view.catalog, r.nextLevelId) : null;
    this.pageTitle(r.passed === false ? '旅程暂告一段落' : completeTheme ? '主题旅程，完成！' : `第${r.levelOrder}关，通关！`, `${r.themeName || theme?.name || '本次旅程'} / 挑战结果`);
    const title = r.passed === false ? '回到地图，继续其他主题。' : completeTheme ? '主题证书已收进你的旅程。' : '本关已完成，继续发现家乡。';
    const points = Number(r.points) || 0, requested = r.requestedPoints == null ? null : Number(r.requestedPoints);
    const rewardNote = r.passed === false ? '本次挑战未通关，未获得积分。' : r.dailyCapReached ? points ? `本关奖励${requested ?? points}分，今日额度内获得${points}分。通关进度已保存。` : '今日积分额度已用完，通关进度和证书照常保存。' : points === 0 ? requested === 0 && !r.alreadyRewarded ? '本关奖励为0积分，通关进度已保存。' : '本关已领过积分，重玩不重复发放。' : '进度与奖励已保存。';
    const noteH = this.measure(rewardNote, 287, this.size(13)), recapH = r.finalExplanation ? 70 + this.measure(r.finalExplanation, 287, this.size(15, 14)) : 0;
    const total = 330 + noteH + recapH, y = this.beginContent('online-result-' + (this.route.params.levelId || r.themeName + r.levelOrder), t + 104, b - 139, total);
    D.rounded(ctx, 24, y, 327, total - 12, 16, C.surface, C.line);
    if (this.themeImage(theme)) this.art(theme.id, this.themeImage(theme), 130, y + 4, 115, 98);
    else D.motif(ctx, this.motif(theme), 157, y + 20, 60);
    D.text(ctx, title, 187.5, y + 111, this.size(15, 14), C.lake, 600, 'center');
    D.rounded(ctx, 40, y + 154, 295, 95, 13, C.paper, C.line);
    D.text(ctx, '本关获得', 111, y + 170, this.size(13), C.muted, 500, 'center'); D.text(ctx, '首次作答正确率', 262, y + 170, this.size(13), C.muted, 500, 'center');
    D.text(ctx, `+${Number(r.points) || 0}`, 111, y + 199, 31, C.ink, 700, 'center'); D.text(ctx, `${Math.round(Number(r.accuracyPercent) || 0)}%`, 262, y + 199, 31, C.ink, 700, 'center');
    D.text(ctx, `累计 ${Number(this.view.totalPoints) || 0} 积分`, 187.5, y + 268, this.size(17), C.lake, 700, 'center');
    D.wrap(ctx, rewardNote, 44, y + 303, 287, this.size(13), C.muted);
    if(r.finalExplanation){const recapY=y+320+noteH;D.line(ctx,[[44,recapY],[331,recapY]],C.line,1);D.text(ctx,'最后一题 · 知识回顾',44,recapY+18,this.size(15),C.lake,600);D.wrap(ctx,r.finalExplanation,44,recapY+47,287,this.size(15,14),C.ink);}
    if (!this.view.reducedMotion && r.passed !== false) {
      const elapsed = Math.max(0, (this.view.time || 0) - (this.resultStart || 0));
      if (this.resultKey !== this.scrollKey) { this.resultKey = this.scrollKey; this.resultStart = this.view.time || 0; }
      if (elapsed < 1200) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - elapsed / 1200); for (let i = 0; i < 12; i++) { const angle = i * Math.PI / 6, distance = 30 + elapsed / 15; D.circle(ctx, 187.5 + Math.cos(angle) * distance, y + 57 + Math.sin(angle) * distance, 2.5, i % 2 ? C.orange : C.lake); } ctx.restore(); }
    }
    this.endContent(total);
    this.button('next', r.passed === false ? '返回主题地图' : completeTheme ? '查看主题证书' : nextLevel ? `进入${nextLevel.label}` : this.view.catalog == null && r.levelOrder < levels.length ? `进入第${r.levelOrder + 1}关` : '查看主题地图', 24, b - 115, 327, { type: r.passed === false ? 'back' : 'next', levelId: r.nextLevelId || null });
    this.button('replay', '再玩一次', 24, b - 52, 155, { type: 'replay' }, true);
    this.button('share-result', '分享旅程', 195, b - 52, 156, { type: 'share' }, true);
    this.layout.result = { region: this.scrollRegion, scrollMax: this.scrollMax, total, passed: r.passed !== false, themeComplete: !!completeTheme, nextLevelId: r.nextLevelId || null, rewardNote };
  }
  ranking() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, rankings = this.view.rankings || { entries: [], period: 'total' }, entries = rankings.entries || [];
    this.pageTitle('乡村知识榜', '和旅人们一起，读懂家乡');
    this.smallControl('ranking-day', '今日榜', 24, t + 100, 155, { type: 'ranking-period', period: 'day' }, rankings.period === 'day');
    this.smallControl('ranking-total', '总榜', 195, t + 100, 156, { type: 'ranking-period', period: 'total' }, rankings.period !== 'day');
    D.text(ctx, '先比通关数，再比首次作答正确率', 187.5, t + 168, this.size(13), C.muted, 400, 'center');
    const total = entries.length ? 45 + entries.length * 78 : 270, y = this.beginContent('online-ranking-' + rankings.period, t + 195, b - 76, total);
    if (entries.length) {
      D.rounded(ctx, 24, y, 327, 33, 10, C.lakeLight);
      D.text(ctx, '名次 / 旅人', 36, y + 9, this.size(12), C.muted, 600); D.text(ctx, '关数', 241, y + 9, this.size(12), C.muted, 600, 'center'); D.text(ctx, '正确率', 314, y + 9, this.size(12), C.muted, 600, 'center');
      entries.forEach((entry, i) => {
        const ry = y + 45 + i * 78, name = String(entry.name || '旅人');
        D.rounded(ctx, 24, ry, 327, 68, 12, entry.isMe ? C.lakeLight : C.surface, entry.isMe ? C.lake : C.line);
        D.circle(ctx, 48, ry + 26, 14, Number(entry.rank) <= 3 ? C.orangeLight : C.paper);
        D.text(ctx, String(entry.rank || i + 1), 48, ry + 17, 14, C.ink, 700, 'center');
        D.text(ctx, (name.length > 7 ? name.slice(0, 6) + '…' : name) + (entry.isMe ? ' · 我' : ''), 74, ry + 14, this.size(15), C.ink, 600);
        D.text(ctx, `${Number(entry.points) || 0} 积分`, 74, ry + 42, this.size(12), C.muted);
        D.text(ctx, String(entry.completedLevels || 0), 241, ry + 21, 22, C.lake, 700, 'center');
        const accuracy = Number(entry.accuracy) || 0, accuracyPercent = Math.round(accuracy <= 1 ? accuracy * 100 : accuracy);
        D.text(ctx, `${accuracyPercent}%`, 314, ry + 25, this.size(15), C.ink, 600, 'center');
      });
    } else {
      D.rounded(ctx, 24, y, 327, 248, 16, C.surface, C.line); D.motif(ctx, 'field', 158, y + 32, 58);
      D.text(ctx, '榜单等你来开启', 187.5, y + 114, 24, C.ink, 700, 'center');
      D.wrap(ctx, '完成一关，留下你的旅程。榜单按北京时间计算每日成绩。', 48, y + 161, 279, this.size(16, 14), C.muted);
    }
    this.endContent(total); this.button('ranking-back', '返回', 24, b - 52, 327, { type: 'back' }, true);
    this.layout.ranking = { period: rankings.period, entries: entries.length, rows: entries.map((entry, i) => ({ rank: entry.rank || i + 1, y: y + 45 + i * 78, h: 68 })), scrollMax: this.scrollMax };
  }
  stamp(theme, x, y, achieved) {
    const ctx = this.ctx; D.circle(ctx, x, y, 30, achieved ? C.orangeLight : C.paper, achieved ? C.orange : C.line);
    ctx.save(); ctx.setLineDash([1, 4]); D.circle(ctx, x, y, 25, null, achieved ? C.orange : C.line); ctx.restore();
    D.motif(ctx, this.motif(theme), x - 17, y - 18, 34);
  }
  certificates() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, owned = this.view.certificates || [], themes = this.themes().filter(theme => this.levels(theme.id).length), used = new Set();
    const items = themes.map(theme => {
      const levels = this.levels(theme.id), match = owned.find(cert => cert.themeId === theme.id);
      if (match) used.add(match.id);
      return { theme, count: levels.length, title: match?.name || match?.title || theme.certificateName || theme.name + ' · 知识证书', match, condition: match ? match.description || match.certificateText || '已收藏，留下这段乡村旅程。' : theme.certificateText || `完成本主题${levels.length}关获得` };
    });
    const overall = owned.find(cert => !cert.themeId || cert.themeId === 'all');
    if (themes.length) {
      if (overall) used.add(overall.id);
      const count = themes.reduce((sum, theme) => sum + this.levels(theme.id).length, 0);
      items.push({ theme: null, count, title: overall?.name || overall?.title || this.view.catalog?.config?.certificates?.totalName || '乡村知识闯关王', match: overall, condition: overall ? overall.description || overall.certificateText || '已收藏，留下完整的知识之旅。' : this.view.catalog?.config?.certificates?.totalText || `完成${themes.length}主题，共${count}关获得` });
    }
    for (const certificate of owned) {
      if (!used.has(certificate.id)) items.push({ theme: null, count: null, historical: true, title: certificate.name || certificate.title || '历史旅程证书', match: certificate, condition: certificate.description || certificate.certificateText || '已收藏的历史旅程，仍可保存和分享。' });
    }
    this.pageTitle('我的旅程印章', '完成主题旅程，收藏学习纪念', `${owned.length} / ${items.length}`);
    const font = this.size(13), cardHeights = items.map(item => 184 + this.measure(item.condition, 287, font));
    const total = items.length ? cardHeights.reduce((sum, height) => sum + height + 14, 0) : 240;
    const y = this.beginContent('online-certificates-' + items.map(item => item.match?.id || item.theme?.id || 'all').join('|'), t + 103, b - 75, total);
    let offset = 0; const cards = [];
    items.forEach((item, i) => {
      const ry = y + offset, achieved = !!item.match, h = cardHeights[i], conditionH = this.measure(item.condition, 287, font);
      offset += h + 14;
      D.rounded(ctx, 24, ry, 327, h, 16, C.surface, achieved ? C.lake : C.line);
      this.stamp(item.theme, 69, ry + 49, achieved);
      this.heading(item.title, 113, ry + 21, 20, 'left', 222);
      D.text(ctx, achieved ? item.historical ? '已收藏 · 历史证书' : '已收藏 · 旅程留念' : '旅程中的下一枚印章', 113, ry + 57, font, achieved ? C.lake : C.muted, achieved ? 600 : 400);
      D.wrap(ctx, item.condition, 42, ry + 91, 287, font, C.muted);
      if (achieved) {
        const raw = item.match.issuedAt, date = raw ? new Date(new Date(raw).getTime() + 8 * 3600 * 1000) : null, valid = date && !Number.isNaN(date.getTime());
        const label = valid ? `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日获得` : '证书可下载保存';
        D.text(ctx, label, 42, ry + 101 + conditionH, this.size(11, 11), C.muted);
        const buttonY = ry + h - 58;
        this.smallControl(`certificate-${item.match.id}`, '保存证书', 42, buttonY, 137, { type: 'certificate-download', id: item.match.id }, false, false, `保存证书，${item.title}`);
        this.smallControl(`certificate-share-${item.match.id}`, '分享证书', 195, buttonY, 134, { type: 'certificate-share', id: item.match.id }, false, !this.view.canShareCertificate, `分享证书，${item.title}`);
      } else {
        D.line(ctx, [[42, ry + 110 + conditionH], [333, ry + 110 + conditionH]], C.lakeLight, 1);
        const progress = item.theme && this.view.themeProgress && this.view.themeProgress[item.theme.id];
        const completed = item.theme ? Math.min(progress?.completed || 0, item.count) : themes.reduce((sum, theme) => sum + Math.min(this.view.themeProgress?.[theme.id]?.completed || 0, this.levels(theme.id).length), 0);
        D.text(ctx, `旅程进度 ${completed} / ${item.count} 关`, 42, ry + 123 + conditionH, this.size(12), C.muted);
      }
      cards.push({ themeId: item.theme?.id || null, certificateId: item.match?.id || null, historical: !!item.historical, x: 24, y: ry, w: 327, h });
    });
    if (!items.length) { D.rounded(ctx, 24, y, 327, 225, 16, C.surface, C.line); D.motif(ctx, 'book', 158, y + 29, 58); D.text(ctx, '旅程印章正在准备', 187.5, y + 117, 23, C.ink, 700, 'center'); D.wrap(ctx, '主题开放后，可查看相应的证书条件。', 48, y + 162, 279, this.size(15, 14), C.muted); }
    this.endContent(total); this.button('certificates-back', '返回', 24, b - 52, 327, { type: 'back' }, true);
    this.layout.certificates = { owned: owned.length, total: items.length, cards, scrollMax: this.scrollMax };
  }
  settings() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, enabled = this.view.soundEnabled != null ? !!this.view.soundEnabled : !this.view.muted;
    this.pageTitle('旅程设置', this.view.userName || '我的旅程');
    const counts = [...new Set(this.themes().flatMap(theme => this.levels(theme.id).map(level => level.questionCount)))];
    const font = this.size(15, 14), cap = this.view.dailyPointCap, limit = this.reviveLimit();
    const rule = `${counts.length === 1 ? `每关${counts[0]}题` : '各关题数以准备页为准'}，单题${this.view.catalog?.config?.timer?.seconds ?? 30}秒。超时算答错；${limit ? `每次挑战最多复活${limit}次，机会用完后再次答错，当前关卡当日锁定` : '没有复活机会，答错后当前关卡当日锁定'}，北京时间零点解除。首次通关获得积分，重玩不重复发分；正确率按首次作答统计。${Number.isFinite(cap) ? `\n今日已获${this.view.dailyPoints || 0}分，每日上限${cap}分，还可获得${this.view.dailyRemaining ?? Math.max(0, cap - (this.view.dailyPoints || 0))}分。` : ''}\n规则调整从后续挑战生效，当前挑战沿用开始时规则。`;
    const ruleH = this.measure(rule, 287, font), total = 380 + ruleH;
    const y = this.beginContent('online-settings', t + 105, b - 75, total);
    D.rounded(ctx, 24, y, 327, 96, 16, C.surface, C.line); D.text(ctx, '声音反馈', 44, y + 18, this.size(18), C.ink, 600); D.text(ctx, '按压与答题时播放轻提示', 44, y + 57, this.size(13), C.muted);
    this.smallControl('toggle-sound', enabled ? '已开启' : '已关闭', 255, y + 14, 80, { type: 'toggle-sound' }, enabled);
    D.rounded(ctx, 24, y + 110, 327, 96, 16, C.surface, C.line); D.text(ctx, '减少动画', 44, y + 128, this.size(18), C.ink, 600); D.text(ctx, '保留清晰反馈，关闭结算粒子', 44, y + 167, this.size(13), C.muted);
    this.smallControl('toggle-motion', this.view.reducedMotion ? '已开启' : '已关闭', 255, y + 124, 80, { type: 'toggle-motion' }, !!this.view.reducedMotion);
    D.rounded(ctx, 24, y + 220, 327, 65 + ruleH, 16, C.surface, C.line); D.text(ctx, '挑战规则', 44, y + 239, this.size(18), C.ink, 600); D.wrap(ctx, rule, 44, y + 277, 287, font, C.muted);
    D.rounded(ctx, 24, y + 297 + ruleH, 327, 68, 14, C.lakeLight); D.text(ctx, ['development', 'experience'].includes(this.view.mode) ? '本地体验版' : '乡村知识挑战', 44, y + 310 + ruleH, this.size(14), C.lake, 600); D.text(ctx, this.view.reducedMotion ? '已开启减少动画' : '声音偏好会保存到当前设备', 44, y + 337 + ruleH, this.size(12), C.muted);
    this.endContent(total); this.button('settings-back', '返回', 24, b - 52, 327, { type: 'back' }, true);
    this.layout.settings = { soundEnabled: enabled, scrollMax: this.scrollMax };
  }
  remoteError() {
    const message = typeof this.view.connectionError === 'string' ? this.view.connectionError : '暂时连接不到游戏。进度已保存，请检查网络后再试。';
    this.layout.remoteError = this.modal('连接需要再试一次', message, [
      { id: 'retry-remote', label: '重新连接', action: { type: 'retry-remote' } },
      { id: 'connection-back', label: '返回', action: { type: 'back' }, secondary: true }
    ]);
  }
  empty(name) {
    const unavailable = ['theme-unavailable', 'level-unavailable', 'levels-empty'].includes(name);
    const title = name === 'quiz' ? '正在准备题目' : name === 'levels-empty' ? '关卡正在准备' : unavailable ? '旅程已更新' : name === 'error' ? '暂时无法打开' : '乡村之旅';
    this.pageTitle(title, '趣味闯关');
    const copy = name === 'quiz' ? '题目准备好后即可继续，请稍候。' : name === 'levels-empty' ? '这个主题暂时没有开放的关卡。可以返回首页，选择其他主题。' : unavailable ? '当前主题或关卡暂时不可用，请返回首页选择新的旅程。' : '请重新连接，或返回主题页再试一次。';
    const y = this.beginContent('online-empty-' + name, this.t + 106, this.v.bottom - 140, 245);
    D.rounded(this.ctx, 24, y, 327, 235, 16, C.surface, C.line); D.motif(this.ctx, 'water', 158, y + 26, 58); D.wrap(this.ctx, copy, 48, y + 132, 279, this.size(17, 14), C.muted); this.endContent(245);
    this.button('empty-retry', '重新连接', 24, this.v.bottom - 115, 327, { type: 'retry-remote' });
    this.button('empty-back', unavailable ? '返回首页' : '返回', 24, this.v.bottom - 52, 327, { type: unavailable ? 'home' : 'back' }, true);
  }
}

module.exports = { OnlineRenderer };

},
"/js/ui/renderer.js":function(module,exports,require){
const T = require('./tokens');
const D = require('./draw');
const { THEMES, getTheme, getLevels } = require('../data/themes');
const C = T.colors;
const { MAP_LAYOUTS, landmarkRegion } = require('./map-layout');
// Trim only transparent padding while keeping the approved source PNGs intact.
const ART_BOUNDS = {};

class Renderer {
  constructor(ctx) { this.ctx = ctx; this.targets = []; }
  target(id, x, y, w, h, action, disabled = false) { this.targets.push({ id, x, y, w, h, action, disabled }); }
  button(id, label, x, y, w, action, secondary = false, disabled = false) {
    const ctx = this.ctx; const pressed = this.view.pressedId === id; const yy = y + (pressed ? 2 : 0);
    D.rounded(ctx, x, yy + 3, w, 52, 12, secondary ? C.line : C.ink);
    D.rounded(ctx, x, yy, w, 52, 12, disabled ? C.lakeLight : secondary ? C.surface : C.lake, secondary ? C.line : null);
    D.text(ctx, label, x + w / 2, yy + 13, 17, secondary || disabled ? C.ink : C.surface, 600, 'center');
    this.target(id, x, y, w, 52, action, disabled);this.targets[this.targets.length-1].label=label;
  }
  render(route, viewport, view = {}) {
    this.v = viewport; this.view = view; this.route = route; this.targets = []; this.layout = {};
    const ctx = this.ctx; ctx.clearRect(0,0,viewport.width,viewport.height);ctx.fillStyle=C.paper;ctx.fillRect(0,0,viewport.width,viewport.height);
    this.scrollRegion=null; const t = Math.max(viewport.top + 12,68 / viewport.scale); this.t = t;
    this.sceneBackdrop(route.name);
    if (route.name === 'loading') this.loading();
    else if (route.name === 'home') this.home();
    else if (route.name === 'map') this.map();
    else if (route.name === 'level-ready') this.levelReady();
    else if (route.name === 'quiz' && view.challengeState==='locked') this.locked();
    else if (route.name === 'quiz' && view.question) this.quiz();
    else if (route.name === 'result' && view.result) this.result();
    else this.empty(route.name);
    if (view.modal === 'revive') this.revive();
    if (view.exitRequested) this.exitDialog();
    if(view.toast){const y=view.modal?this.t:route.name==='quiz'?viewport.bottom-92:this.t+92;D.rounded(ctx,20,y,335,48,12,C.ink);D.wrap(ctx,view.toast,32,y+7,311,14,C.surface);}
    return this.targets;
  }
  sceneBackdrop(name) {
    const themeId=(name==='level-ready'||this.view.localCampaign)?(this.route.params.themeId||'ecology'):'ecology';
    const ctx=this.ctx,scene=this.view.images&&this.view.images['map-'+themeId];
    if(!scene||!['home','quiz','result'].includes(name))return;
    D.imageCover(ctx,scene,0,0,375,this.v.height,0);
    if(name==='quiz'){ctx.fillStyle='rgba(239,234,217,.15)';ctx.fillRect(0,0,375,this.v.height);}
    ctx.fillStyle=name==='quiz'?'rgba(239,234,217,.28)':'rgba(239,234,217,.18)';ctx.fillRect(0,0,375,this.v.height);
    this.layout.backdrop={source:'original-'+themeId+'-environment',decorative:true,qualityRefinement:true};
  }
  loading() {
    const ctx=this.ctx,y=this.v.height*.42;
    D.motif(ctx,'water',157,y-80,60);D.text(ctx,'趣味闯关',187.5,y,28,C.ink,700,'center');
    D.text(ctx,'正在准备乡村之旅',187.5,y+47,15,C.muted,400,'center');
    D.rounded(ctx,77,y+88,221,7,4,C.lakeLight);
    const progress=Math.max(.06,this.view.progress || 0);
    D.rounded(ctx,77,y+88,221*progress,7,4,C.lake);
    const offset=((this.view.time||0)/10)%200;D.circle(ctx,87+offset,y+91,5,C.orange);
  }
  journey(x,y,size=110){const id=this.route.params.themeId||'ecology',im=this.view.images&&this.view.images[id];if(im){this.art(id,im,x,y,size,size*.82);return;}const ctx=this.ctx,k=size/150;ctx.save();ctx.translate(x,y);ctx.scale(k,k);ctx.beginPath();ctx.moveTo(18,98);ctx.bezierCurveTo(108,83,43,58,119,37);ctx.strokeStyle=C.orange;ctx.lineWidth=13;ctx.lineCap='round';ctx.stroke();D.line(ctx,[[109,17],[109,45]],C.ink,3);ctx.beginPath();ctx.moveTo(109,18);ctx.lineTo(136,24);ctx.lineTo(109,33);ctx.closePath();ctx.fillStyle=C.orange;ctx.fill();D.circle(ctx,45,77,10,C.lake);D.circle(ctx,39,70,6,C.lake);D.circle(ctx,51,68,6,C.lake);D.circle(ctx,88,48,8,C.lake);D.circle(ctx,77,78,15,C.surface,C.lake);D.line(ctx,[[69,78],[75,84],[87,70]],C.lake,3);ctx.restore();}
  art(themeId, image, x, y, w, h) {
    const bounds=ART_BOUNDS[themeId];
    const crop=bounds&&image.width===bounds[4]&&image.height===bounds[5]?bounds:[0,0,image.width,image.height];
    const scale=Math.min(w/crop[2],h/crop[3]),dw=crop[2]*scale,dh=crop[3]*scale;
    const rect={themeId,x:x+(w-dw)/2,y:y+(h-dh)/2,w:dw,h:dh};
    this.ctx.drawImage(image,crop[0],crop[1],crop[2],crop[3],rect.x,rect.y,rect.w,rect.h);
    return rect;
  }
  quietButton(id,label,x,y,w,action){
    const pressed=this.view.pressedId===id;
    if(pressed)D.rounded(this.ctx,x,y,w,52,12,C.lakeLight);
    D.text(this.ctx,label+'  ›',x+w/2,y+17,Math.max(15,12/this.v.scale),C.lake,500,'center');
    this.target(id,x,y,w,52,action);
  }
  home() {
    const ctx=this.ctx,t=this.t,b=this.v.bottom,compact=b-t<600;
    this.scrollKey='home';this.scroll=0;this.scrollMax=0;
    const heroH=compact?60:126,cardY=t+heroH+12,cardH=(b-126-cardY-12)/2;
    D.rounded(ctx,16,t-8,343,heroH,16,C.surface,C.line);
    D.text(ctx,this.view.localCampaign?'本地闯关试玩 · 非正式':'乡村知识挑战',30,t+3,Math.max(12,12/this.v.scale),C.lake,600);
    D.text(ctx,'趣味闯关',30,t+26,compact?24:32,C.ink,700);
    if(!compact){D.text(ctx,'沿着小路，发现家乡。',30,t+70,14,C.muted);D.text(ctx,'从哪个主题出发？',30,t+97,15,C.ink,600);}
    this.journey(compact?292:284,t+20,compact?46:62);
    const artBoxes=[],artRects=[];
    THEMES.forEach((theme,i)=>{
      const x=20+i%2*174,y=cardY+Math.floor(i/2)*(cardH+12),pressed=this.view.pressedId===`theme-${theme.id}`,yy=y+(pressed?2:0),im=this.view.images&&this.view.images[theme.id];
      D.rounded(ctx,x,yy+3,161,cardH,16,'rgba(38,61,52,.25)');D.rounded(ctx,x,yy,161,cardH,16,pressed?C.lakeLight:C.surface,C.line);
      const box={themeId:theme.id,x:x+13,y:yy+6,w:135,h:cardH-62};artBoxes.push(box);if(im)artRects.push(this.art(theme.id,im,box.x,box.y,box.w,box.h));
      D.text(ctx,theme.name,x+80.5,yy+cardH-50,18,C.ink,700,'center');
      const progress=this.view.themeProgress&&this.view.themeProgress[theme.id],caption=['红色故事','乡土人文','物产特色','生态风光'][i];D.text(ctx,`${caption} · ${progress?progress.completed:0}/4关`,x+80.5,yy+cardH-23,Math.max(12,12/this.v.scale),C.muted,400,'center');this.target(`theme-${theme.id}`,x,y,161,cardH,{type:'theme',themeId:theme.id});
    });
    D.rounded(ctx,16,b-117,343,123,16,C.surface,C.line);
    this.quietButton('ranking','排行榜 · 未开放',24,b-113,155,{type:'route',name:'ranking'});this.quietButton('certificates','证书 · 未开放',195,b-113,156,{type:'route',name:'certificates'});this.button('practice',this.view.localCampaign?this.view.localDestination.label:'试玩10题 · 不计正式积分',24,b-52,327,{type:'practice'},true);
    this.layout.home={compact,cardH,artBoxes,artRects};
  }
  map() {
    const ctx=this.ctx,t=this.t,theme=getTheme(this.route.params.themeId)||THEMES[3],baseY=t+104,availableH=this.v.bottom-baseY-76;
    const progress=this.view.themeProgress&&this.view.themeProgress[theme.id];
    const states=this.view.nodeStates||(progress&&progress.nodes)||['current','locked','locked','locked'];
    D.text(ctx,theme.id==='red'?'红色故事 / 十步芳草':'趣味闯关 / '+theme.name,24,t,13,theme.id==='red'?C.error:C.lake,600);
    D.text(ctx,theme.name,24,t+26,29,C.ink,700);
    D.text(ctx,this.view.visualFixture?'状态样例 · 非正式进度':`${this.view.localCampaign?'本地试玩':'正式进度'} ${progress?progress.completed:0} / 4关`,24,t+69,Math.max(14,12/this.v.scale),C.muted);
    const images=this.view.images||{},scene=images['map-'+theme.id]||(theme.id==='ecology'&&images.map);
    // One projection for the background, road, markers and their hit areas.
    const worldH=scene?335*scene.height/scene.width:502.5,h=Math.min(worldH,availableH),y=baseY+Math.max(0,(availableH-h)/2),frame={x:20,y,w:335,h};
    const sites=MAP_LAYOUTS[theme.id],pts=sites.map(site=>site.entry),focus=Math.max(0,states.indexOf('current'));
    const max=Math.max(0,worldH-h),key=`map-${theme.id}-${this.v.physicalWidth}-${this.v.physicalHeight}`;
    if(this.scrollKey!==key){this.scrollKey=key;const center=this.view.qualityRefinement&&focus>0?(pts[focus][1]+pts[focus-1][1])/2:pts[focus][1];this.scroll=Math.max(0,Math.min(max,worldH*center-(this.view.qualityRefinement?h/2:h-36)));}
    this.scrollMax=max;this.scroll=Math.max(0,Math.min(max,this.scroll||0));
    this.scrollRegion={...frame};
    D.text(ctx,max>0?'上下滑动查看四关':'10题全对，逐级解锁',351,t+69,Math.max(12,12/this.v.scale),C.lake,500,'right');
    D.rounded(ctx,20,y,335,h,16,C.lakeLight);
    ctx.save();D.rounded(ctx,20,y,335,h,16);ctx.clip();
    const originY=y-this.scroll;
    if(scene)ctx.drawImage(scene,20,originY,335,worldH);
    else{D.motif(ctx,theme.motif,302,originY+14,30);D.text(ctx,theme.id==='ecology'?'场景暂不可用':'场景画面待确认',36,originY+18,13,C.muted);}
    const coords=pts.map(([a,b])=>[20+335*a,originY+worldH*b]),nodes=[];
    ctx.beginPath();ctx.moveTo(...coords[0]);
    for(let i=1;i<4;i++){const a=coords[i-1],b=coords[i];ctx.bezierCurveTo(a[0],(a[1]+b[1])/2,b[0],(a[1]+b[1])/2,...b);}
    ctx.strokeStyle=C.paper;ctx.lineWidth=5;ctx.lineCap='round';ctx.stroke();ctx.strokeStyle=C.ink;ctx.lineWidth=1;ctx.setLineDash([2,6]);ctx.stroke();ctx.setLineDash([]);
    if(scene)sites.forEach((site,i)=>{
      const threshold=[20+335*site.threshold[0],originY+worldH*site.threshold[1]];
      D.line(ctx,[coords[i],threshold],C.paper,3);
      ctx.setLineDash([1,4]);D.line(ctx,[coords[i],threshold],C.ink,1);ctx.setLineDash([]);
    });
    getLevels(theme.id).forEach((level,i)=>{
      const [cx,cy]=coords[i],state=states[i]||'locked',pressed=this.view.pressedId===`level-${i+1}`;
      const complete=state==='complete',today=state==='today-locked',current=state==='current',offset=pressed?2:0;
      const fill=complete?C.lakeLight:current||today?C.orangeLight:C.surface,border=today?C.error:current||complete?C.lake:C.line;
      const left=sites[i].side?sites[i].side==='left':pts[i][0]>.5,labelX=left?cx-130:cx+26,labelY=cy+(sites[i].signY||-22)+offset;
      D.rounded(ctx,labelX,labelY,104,44,12,fill,border);
      if(current){D.circle(ctx,cx,cy+offset,22,C.orangeLight,C.lake);}
      D.circle(ctx,cx,cy+offset,18,complete?C.lake:today?C.error:C.surface,border);
      if(complete)D.line(ctx,[[cx-8,cy+offset],[cx-2,cy+6+offset],[cx+9,cy-7+offset]],C.surface,2);
      else if(today)D.text(ctx,'!',cx,cy-12+offset,24,C.surface,700,'center');
      else D.text(ctx,String(i+1),cx,cy-11+offset,21,current?C.lake:C.ink,600,'center');
      D.text(ctx,level.difficulty,labelX+10,labelY+5,15,C.ink,600);
      const label=today?'今日锁定':complete?'已通关':current?'当前关卡':`未解锁 · ${level.points}分`;
      D.text(ctx,state==='locked'?'未解锁':label,labelX+10,labelY+25,Math.max(12,12/this.v.scale),today?C.error:complete||current?C.lake:C.muted,500);
      if(state==='locked'){
        ctx.beginPath();ctx.arc(labelX+90,labelY+29,3,Math.PI,0);ctx.strokeStyle=C.line;ctx.lineWidth=1.5;ctx.stroke();D.rounded(ctx,labelX+85,labelY+29,10,7,2,C.line);
      }
      const hotX=Math.min(labelX-4,cx-24),hotY=Math.min(labelY-4,cy-26),hotRight=Math.max(labelX+108,cx+24),hotBottom=Math.max(labelY+48,cy+26);
      const hotRect={x:hotX,y:Math.max(hotY,y),w:hotRight-hotX,h:Math.min(hotBottom,y+h)-Math.max(hotY,y)};
      nodes.push({id:`level-${i+1}`,x:cx,y:cy,hotRect});
      if(hotRect.h*this.v.scale>=44)this.target(`level-${i+1}`,hotRect.x,hotRect.y,hotRect.w,hotRect.h,{type:'level',themeId:theme.id,index:i});
    });
    ctx.restore();
    if(max>0){const railH=h-32,thumb=Math.max(28,railH*h/worldH);D.rounded(ctx,349,y+16,3,railH,2,C.surface);D.rounded(ctx,349,y+16+(railH-thumb)*this.scroll/max,3,thumb,2,C.lake);}
    this.layout.map={frame,scene:{x:20,y:originY,w:335,h:worldH},nodes,scroll:this.scroll,scrollMax:max,scaleX:scene?335/scene.width:null,scaleY:scene?worldH/scene.height:null};
    this.button('back','返回',24,this.v.bottom-52,80,{type:'back'},true);
    const nextIndex=this.view.localCampaign?Math.min(3,progress.completed):0;
    this.button('begin',`查看第${nextIndex+1}关`,116,this.v.bottom-52,235,{type:'level',themeId:theme.id,index:nextIndex});
  }
  levelReady() {
    const ctx=this.ctx,t=this.t,b=this.v.bottom,theme=getTheme(this.route.params.themeId);
    const level=theme&&getLevels(theme.id).find(item=>item.id===this.route.params.levelId);
    if(!theme||!level){this.empty('quiz');return;}
    D.rounded(ctx,16,t-8,343,94,16,C.surface,C.line);
    D.text(ctx,theme.name+' / 关卡准备',24,t,13,C.lake,600);
    D.text(ctx,`${level.label} · ${level.difficulty}`,24,t+28,27,C.ink,700);
    D.text(ctx,theme.description,24,t+69,14,C.muted);
    const ecology=theme.id==='ecology'&&!this.view.localCampaign,top=t+99,bottom=b-(ecology?156:92),available=bottom-top;
    const key='ready-'+level.id;if(this.scrollKey!==key){this.scrollKey=key;this.scroll=0;}
    const rule='10题全部答对，才能解锁下一关。',ruleSize=Math.max(16,14/this.v.scale);
    ctx.save();ctx.globalAlpha=0;const ruleH=D.wrap(ctx,rule,40,0,295,ruleSize,C.ink);ctx.restore();
    const panelH=116+ruleH+16,heroH=Math.max(88,Math.min(300,available-panelH-16)),total=heroH+16+panelH;
    this.scrollMax=Math.max(0,total-available);this.scroll=Math.max(0,Math.min(this.scroll||0,this.scrollMax));
    this.scrollRegion={x:20,y:top,w:335,h:available};
    const start=top+Math.max(0,Math.min(32,(available-total)/2))-this.scroll;
    ctx.save();ctx.beginPath();ctx.rect(20,top,335,available);ctx.clip();
    const hero={x:24,y:start,w:327,h:heroH},images=this.view.images||{};
    const scene=images['map-'+theme.id]||(theme.id==='ecology'&&images.map),site=MAP_LAYOUTS[theme.id][level.order-1];
    D.rounded(ctx,hero.x,hero.y,hero.w,hero.h,16,C.lakeLight);
    let source=null;
    if(scene){
      source=landmarkRegion(scene,site,hero.w,hero.h);
      ctx.save();D.rounded(ctx,hero.x,hero.y,hero.w,hero.h,16);ctx.clip();
      ctx.drawImage(scene,source.sx,source.sy,source.sw,source.sh,hero.x,hero.y,hero.w,hero.h);ctx.restore();
    } else if(images[theme.id]) this.art(theme.id,images[theme.id],48,start+12,279,heroH-24);
    else D.motif(ctx,theme.motif,160,start+(heroH-55)/2,55);
    const y=start+heroH+16;
    D.rounded(ctx,24,y,327,panelH,16,C.surface,C.line);
    D.text(ctx,String(level.questionCount)+'题',48,y+14,28,C.lake,700);D.text(ctx,'本关题目',48,y+51,13,C.muted);
    D.line(ctx,[[187,y+17],[187,y+69]],C.line,1);
    D.text(ctx,String(level.points)+'分',213,y+14,28,C.lake,700);D.text(ctx,this.view.localCampaign?'试玩积分 · 非正式':'通关积分',213,y+51,13,C.muted);
    D.line(ctx,[[40,y+83],[335,y+83]],C.line,1);
    D.text(ctx,'通关规则',40,y+96,13,C.lake,600);D.wrap(ctx,rule,40,y+116,295,ruleSize,C.ink);
    ctx.restore();
    const noticeY=b-(ecology?144:80);
    D.rounded(ctx,107,noticeY-3,161,26,12,C.surface,C.line);
    D.text(ctx,this.view.localCampaign?'仅保存本机试玩进度':'本关暂未开放',187.5,noticeY,Math.max(13,12/this.v.scale),C.muted,400,'center');
    this.layout.ready={hero,source,landmark:level.order-1,panel:{x:24,y,w:327,h:panelH},content:{top,bottom},noticeY,scrollMax:this.scrollMax};
    if(ecology)this.button('ready-practice','试玩10题 · 不计正式进度',24,b-116,327,{type:'practice'},true);
    this.button('back','返回地图',24,b-52,100,{type:'back'},true);
    this.button('ready-start',this.view.localCampaign?'开始本地试玩':'暂未开放',136,b-52,215,this.view.localCampaign?{type:'local-start',themeId:theme.id,order:level.order}:{type:'formal-start',themeId:theme.id,levelId:level.id},false,!this.view.localCampaign);
  }
  scrollBy(delta){this.scroll=Math.max(0,Math.min(this.scrollMax||0,(this.scroll||0)+delta));}
  balancedTitle(value,width,size) {
    const ctx=this.ctx;ctx.save();ctx.font=`600 ${size}px ${T.font}`;
    const chars=Array.from(String(value));let lines=[],row='';
    for(const ch of chars){if(row&&ctx.measureText(row+ch).width>width){lines.push(row);row=ch;}else row+=ch;}
    if(row)lines.push(row);let result=String(value);
    if(lines.length===2&&Array.from(lines[1]).length<5){
      const cues=['怎样','怎么','应该','适合','选择','观察','处理','丢','才能','需要','可以'];
      const choices=[];
      for(let i=5;i<=chars.length-5;i++){
        const left=chars.slice(0,i).join(''),right=chars.slice(i).join('');
        if(ctx.measureText(left).width>width||ctx.measureText(right).width>width||/^[，。！？；：、]/.test(right))continue;
        const phrase=cues.some(c=>right.startsWith(c));
        choices.push({value:left+'\n'+right,score:Math.abs(i-(chars.length-i))-(phrase?7:0)});
      }
      choices.sort((a,b)=>a.score-b.score);if(choices.length)result=choices[0].value;
    }
    ctx.restore();return result;
  }
  quiz() {
    const ctx=this.ctx,t=this.t,q=this.view.feedback?this.view.feedback.question:this.view.question;
    const feedback=this.view.feedback,submitting=this.view.submitting===true,totalQuestions=q.total||10;
    const key=q.id+(feedback?':feedback':':answer');const changed=this.scrollKey!==key;
    if(changed){this.scrollKey=key;this.scroll=0;}
    const small=Math.max(13,12/this.v.scale),optionSize=Math.max(16,14/this.v.scale),bodySize=Math.max(14,14/this.v.scale);
    D.rounded(ctx,16,t-8,343,73,16,C.surface,C.line);
    D.text(ctx,`${q.practice?'试玩 · ':''}${q.themeName} · 第${q.levelOrder}关`,28,t+3,16,C.ink,600);
    D.text(ctx,'本次试玩不限时',28,t+25,Math.max(12,12/this.v.scale),C.muted);
    // Practice only: no production countdown policy is inferred.
    D.text(ctx,`第${q.position} / ${totalQuestions}题`,24,t+40,14,C.muted);
    D.rounded(ctx,120,t+46,230,5,3,C.lakeLight);D.rounded(ctx,120,t+46,230*q.position/totalQuestions,5,3,C.lake);
    const top=t+76,bottom=this.v.bottom-98,region={x:20,y:top,w:335,h:bottom-top};this.scrollRegion=region;
    const measure=(value,width,size)=>{ctx.save();ctx.globalAlpha=0;const h=D.wrap(ctx,value,0,0,width,size);ctx.restore();return h;};
    const titleSize=this.v.bottom-this.t<600?22:24,titleValue=this.balancedTitle(q.title,307,titleSize),titleH=measure(titleValue,307,titleSize),heights=q.options.map(o=>Math.max(58,measure(o,258,optionSize)+26));
    const media=q.media&&q.media.type==='image',caption=media?(q.media.caption||'题目配图'):null;
    const gap=media||this.v.bottom-this.t<600?8:12,titleGap=media?20:18;
    const captionH=media?measure(caption,311,small):0;
    const baseHeight=31+titleH+titleGap+heights.reduce((a,b)=>a+b,0)+4*gap+8+captionH+18;
    const mediaH=Math.max(120,Math.min(150,region.h-baseHeight)),mediaTotal=media?mediaH+captionH+18:0;
    const explanation=feedback&&(feedback.explanation||'继续下一题，发现更多生态知识。');
    const feedbackH=feedback?measure(explanation,295,bodySize)+55:0;
    const total=31+titleH+titleGap+mediaTotal+heights.reduce((a,b)=>a+b,0)+4*gap+feedbackH+8;
    // Keep ordinary text question context visible while its answers scroll.
    const pinnedTitle=!media && titleH+31+titleGap<=region.h*.48;
    const pinnedH=pinnedTitle?31+titleH+titleGap:0;
    if(pinnedTitle){region.y+=pinnedH;region.h-=pinnedH;}
    this.scrollMax=Math.max(0,total-pinnedH-region.h-8);
    if(changed&&feedback)this.scroll=this.scrollMax;
    this.scroll=Math.max(0,Math.min(this.scroll||0,this.scrollMax));
    if(!pinnedTitle){ctx.save();ctx.beginPath();ctx.rect(20,top,335,region.h);ctx.clip();}
    let y=pinnedTitle?top:top-this.scroll;
    const difficulty=q.difficultyLabel||({基础:'基础认知',进阶:'进阶理解',综合:'综合挑战'}[q.difficulty])||'知识答题';
    D.rounded(ctx,20,y,335,titleH+31+titleGap-12,16,C.surface,C.line);
    D.text(ctx,difficulty,34,y+9,small,C.lake,600);y+=31;
    const titleRect={x:34,y,w:307,h:titleH};D.wrap(ctx,titleValue,34,y,307,titleSize,C.ink,600);y+=titleH+titleGap;
    if(pinnedTitle){ctx.save();ctx.beginPath();ctx.rect(20,region.y,335,region.h);ctx.clip();y=region.y-this.scroll;}
    let mediaRect=null,feedbackRect=null;const optionRects=[];
    if(media){
      mediaRect={x:24,y,w:327,h:mediaH};D.rounded(ctx,24,y,327,mediaH,16,C.surface,C.line);
      const im=this.view.mediaImage;
      if(im){const scale=Math.min(303/im.width,(mediaH-16)/im.height),w=im.width*scale,h=im.height*scale;ctx.drawImage(im,24+(327-w)/2,y+(mediaH-h)/2,w,h);mediaRect.image={w,h,sourceW:im.width,sourceH:im.height};}
      else{
        D.text(ctx,this.view.mediaFailed?'题目图片加载失败':'图片加载中…',40,y+35,bodySize,C.ink);
        if(!this.view.mediaFailed){const angle=(this.view.time||0)/300;D.circle(ctx,306+Math.cos(angle)*6,y+44+Math.sin(angle)*6,3,C.lake);}
        else {D.text(ctx,'点击重新加载',40,y+86,optionSize,C.lake,600);const hitY=Math.max(y,top),hitBottom=Math.min(y+mediaH,bottom);if(hitBottom-hitY>=44/this.v.scale)this.target('media-retry',24,hitY,327,hitBottom-hitY,{type:'retry-media'});}
      }
      D.rounded(ctx,24,y+mediaH+3,327,captionH+10,8,C.surface);D.wrap(ctx,caption,32,y+mediaH+8,311,small,C.muted);y+=mediaTotal;
    }
    q.options.forEach((option,i)=>{
      const selected=(this.view.modal==='revive'?this.view.incorrectSelected:feedback?feedback.selected:this.view.selected)===i;
      const wrong=this.view.modal==='revive'&&selected,right=feedback&&selected,pressed=this.view.pressedId===`option-${i}`;
      const h=heights[i],yy=y+(pressed?2:0),border=wrong?C.error:selected?C.lake:C.line;
      D.rounded(ctx,24,yy+2,327,h,12,'rgba(38,61,52,.2)');
      D.rounded(ctx,24,yy,327,h,12,wrong||selected&&!right?C.orangeLight:right||pressed?C.lakeLight:C.surface,border);
      D.circle(ctx,47,yy+26,14,wrong?C.error:right?C.lake:C.paper,selected?border:null);
      D.text(ctx,wrong?'×':right?'✓':'ABCD'[i],47,yy+17,14,wrong||right?C.surface:C.ink,600,'center');
      D.wrap(ctx,option,71,yy+13,258,optionSize,C.ink,selected?600:400);
      const hitY=Math.max(y,region.y),hitBottom=Math.min(y+h,bottom);
      if(hitBottom-hitY>=44/this.v.scale)this.target(`option-${i}`,24,hitY,327,hitBottom-hitY,{type:'option',index:i,questionId:q.id},!!feedback||submitting||this.view.modal==='revive');
      optionRects.push({index:i,x:24,y,w:327,h,selected:!!selected,state:wrong?'wrong':right?'correct':selected?'selected':pressed?'pressed':'idle'});y+=h+gap;
    });
    if(feedback){feedbackRect={x:24,y,w:327,h:feedbackH};D.rounded(ctx,24,y,327,feedbackH,12,C.lakeLight,C.lake);D.text(ctx,'答对了 · 知识解析',40,y+12,optionSize,C.lake,600);D.wrap(ctx,explanation,40,y+41,295,bodySize,C.ink);}
    ctx.restore();
    if(this.scrollMax>0){const railH=region.h-16,thumb=Math.max(24,railH*region.h/total);D.rounded(ctx,352,region.y+8,3,railH,2,C.lakeLight);D.rounded(ctx,352,region.y+8+(railH-thumb)*this.scroll/this.scrollMax,3,thumb,2,C.lake);}
    D.rounded(ctx,16,this.v.bottom-96,343,104,16,C.surface,C.line);
    const hint=submitting?'正在提交，请稍候':feedback?'答对了，查看解析后继续':this.scrollMax>this.scroll+2?'上下滑动查看全部选项':'选好一项，再确认答案';
    D.text(ctx,hint,187.5,this.v.bottom-83,bodySize,C.muted,400,'center');
    this.button('quiz-exit','退出',24,this.v.bottom-52,80,{type:'exit-request'},true);
    this.button('confirm',submitting?'正在提交…':feedback?'下一题':'确认答案',116,this.v.bottom-52,235,{type:feedback?'continue':'confirm',questionId:q.id},false,submitting||!feedback&&this.view.selected==null);
    this.layout.quiz={kind:media?'image-choice':'text-choice',difficulty,total:totalQuestions,position:q.position,pinnedTitle,region,title:titleRect,media:mediaRect,options:optionRects,feedback:feedbackRect,contentHeight:total,scroll:this.scroll,scrollMax:this.scrollMax,submitting};
  }
  revive() {
    const ctx=this.ctx,size=Math.max(14,14/this.v.scale),x=28,w=319,inner=w-40;
    const selected=this.view.incorrectSelected,choice=Number.isInteger(selected)?`你选择了 ${'ABCD'[selected]}，本题未通过。`:'本题未通过。';
    const lines=[choice,'本次试玩结束。分享复活暂未开放，你可以返回地图，再次试玩。','正式关卡规则：分享成功后可重答当前题，每关仅1次；复活后再错，仅当前关卡今日锁定。'];
    const measure=value=>{ctx.save();ctx.globalAlpha=0;const h=D.wrap(ctx,value,0,0,inner,size);ctx.restore();return h;};
    const heights=lines.map(measure),h=76+heights.reduce((a,b)=>a+b,0)+36+128;
    const y=Math.max(this.t,(this.t+this.v.bottom-h)/2);
    ctx.fillStyle='rgba(32,61,67,.5)';ctx.fillRect(0,0,375,this.v.height);D.rounded(ctx,x,y,w,h,16,C.surface,C.ink);
    D.text(ctx,'本题答错了',x+20,y+22,26,C.error,700);
    let rowY=y+68;lines.forEach((line,i)=>{D.wrap(ctx,line,x+20,rowY,inner,size,i===0?C.error:i===2?C.ink:C.muted,i===0?600:400);rowY+=heights[i]+12;});
    this.targets=[];this.scrollRegion=null;
    this.button('revive-share','分享暂未开放',x+20,y+h-128,inner,{type:'share'},true,true);
    this.button('revive-back','返回关卡地图',x+20,y+h-64,inner,{type:'back'});
    this.layout.revive={x,y,w,h,selected,answerRevealed:false};
  }
  exitDialog() {
    const ctx=this.ctx,x=28,w=319,h=246,y=Math.max(this.t,(this.t+this.v.bottom-h)/2);
    ctx.fillStyle='rgba(32,61,67,.5)';ctx.fillRect(0,0,375,this.v.height);
    D.rounded(ctx,x,y,w,h,16,C.surface,C.ink);D.text(ctx,'要退出本次试玩吗？',x+20,y+22,24,C.ink,700);
    D.wrap(ctx,'退出后，这次作答不会保留。正式进度和积分不受影响。',x+20,y+66,279,Math.max(14,14/this.v.scale),C.muted);
    this.targets=[];this.scrollRegion=null;
    this.button('exit-cancel','继续作答',x+20,y+h-116,279,{type:'exit-cancel'});
    this.button('exit-confirm','退出到地图',x+20,y+h-56,279,{type:'exit-confirm'},true);
    this.layout.exit={x,y,w,h};
  }
  locked(){const ctx=this.ctx,t=this.t;D.rounded(ctx,16,t-8,343,this.v.bottom-t-64,16,C.surface,C.line);D.text(ctx,'试玩 · 青山绿水 / 第1关',24,t,16,C.lake,600);D.text(ctx,'当前试玩关卡已锁定',187.5,t+160,26,C.ink,700,'center');D.text(ctx,'复活后再次答错，不能继续本次挑战。',187.5,t+213,15,C.muted,400,'center');D.text(ctx,'仅影响当前关卡，其他主题不受影响。',187.5,t+250,15,C.ink,400,'center');this.button('locked-back','返回关卡地图',24,this.v.bottom-52,327,{type:'back'},true);}
  result() {
    if(this.view.localCampaign&&this.view.qualityRefinement)return this.localResult();
    const ctx=this.ctx,t=this.t,result=this.view.result,local=this.view.localCampaign,completion=this.view.localCompletion;
    D.rounded(ctx,16,t-8,343,Math.min(this.v.bottom-t-140,this.v.bottom-t<600?this.v.bottom-t-140:520),16,C.surface,C.line);
    D.text(ctx,`${result.themeName} · 第${result.levelOrder}关`,24,t,18,C.muted,500);
    const compact=this.v.bottom-t<600,cy=t+(compact?76:126);this.journey(112,cy-60,150);
    D.text(ctx,local?'本地试玩通关':result.practice?'十题试玩完成':`第${result.levelOrder}关通关`,187.5,cy+(compact?64:92),32,C.ink,700,'center');
    D.text(ctx,local?(result.levelOrder===4?'主题四关完成 · 不发正式证书':'10题全部答对 · 本地下一关已解锁'):result.practice?'10题全部答对 · 不计正式积分':'10题全部完成，下一关已解锁',187.5,cy+(compact?108:140),15,C.muted,400,'center');
    const y=cy+(compact?144:191);D.rounded(ctx,24,y,327,compact?95:103,16,C.surface,C.line);
    D.text(ctx,local?'本次试玩积分':result.practice?'答对题数':'本关积分',104,y+18,14,C.muted,400,'center');D.text(ctx,local?'累计试玩积分':result.practice?'作答次数':'本次正确率',273,y+18,14,C.muted,400,'center');
    D.text(ctx,local?`+${completion?.earned||0}`:result.practice?String(result.correct):result.points==null?'—':`+${result.points}`,104,y+47,32,C.ink,700,'center');D.text(ctx,local?String(this.view.localTotal):result.practice?String(result.attempts):result.accuracyPercent==null?'—':`${result.accuracyPercent}%`,273,y+47,32,C.ink,700,'center');
    D.text(ctx,local?(this.view.localStorageStatus==='saving'?'保存中，请稍候…':this.view.localStorageStatus==='session-only'?'仅本次会话有效 · 不会保存':this.view.localStorageStatus==='needs-confirmation'?'存档需要确认 · 尚未保存':this.view.localStorageStatus==='unsaved'?'存档失败 · 本次仅临时保留':completion?.replay?'重玩不重复累计试玩积分':'本机已存档 · 不同步正式账号'):result.practice?'正式进度与积分不受试玩影响':`继续前往第${result.levelOrder+1}关 · ${result.nextDifficulty}`,187.5,y+(compact?110:128),15,C.lake,600,'center');
    this.button('next',local?'查看闯关地图':result.practice?'返回关卡地图':'进入下一关',24,this.v.bottom-112,327,{type:'next'});
    this.button('replay','重玩',24,this.v.bottom-52,155,{type:'replay'},true);if(local&&this.view.localStorageStatus==='unsaved')this.button('save-retry','重试存档',195,this.v.bottom-52,156,{type:'save-retry'},true);else this.button('share-result','分享 · 未开放',195,this.v.bottom-52,156,{type:'share'},true,true);
  }
  localResult(){
    const ctx=this.ctx,b=this.v.bottom,r=this.view.result,c=this.view.localCompletion,status=this.view.localStorageStatus,compact=b-this.t<600,saving=status==='saving',failed=status==='unsaved',unsupported=status==='session-only';
    const titleOffset=compact?56:151,totalH=titleOffset+92+(failed?243:183)+112,t=this.t+Math.max(0,(b-this.t-totalH)/2),titleY=t+titleOffset,y=titleY+92,buttonY=y+(failed?243:183);
    D.rounded(ctx,16,t-8,343,buttonY-t-12,16,C.surface,C.line);
    D.text(ctx,`${r.themeName} · 第${r.levelOrder}关`,32,t+10,16,C.muted,600);
    this.journey(compact?263:130,t+(compact?43:43),compact?78:115);
    D.text(ctx,'本地试玩通关',compact?32:187.5,titleY,compact?27:30,C.ink,700,compact?'left':'center');
    const subtitle=r.levelOrder<4?`10题全部答对 · 第${r.levelOrder+1}关已解锁`:'四关全部完成 · 可返回主题地图';
    D.text(ctx,subtitle,compact?32:187.5,titleY+47,15,C.lake,600,compact?'left':'center');
    D.rounded(ctx,32,y,311,94,12,C.paper,C.line);
    D.text(ctx,'本次试玩积分',104,y+15,14,C.muted,400,'center');D.text(ctx,'累计试玩积分',273,y+15,14,C.muted,400,'center');
    D.text(ctx,`+${c?.earned||0}`,104,y+41,31,C.ink,700,'center');D.text(ctx,String(this.view.localTotal),273,y+41,31,C.ink,700,'center');
    const label=saving?'保存中…':failed?'未保存 · 本次临时保留':unsupported?'会话进度 · 刷新后不保留':status==='needs-confirmation'?'存档需确认 · 尚未保存':'已保存到当前浏览器';
    D.text(ctx,label,32,y+110,15,failed?C.error:C.lake,600);
    D.text(ctx,c?.replay?'重玩不重复累计积分':'仅本地试玩，不同步正式账号',32,y+139,13,C.muted);
    if(failed)this.button('save-retry','重试存档',32,y+167,311,{type:'save-retry'},true);
    this.button('next',r.levelOrder<4?`查看第${r.levelOrder+1}关`:'返回主题地图',24,buttonY,327,{type:'next'},false,saving);
    this.button('replay','重玩',24,buttonY+60,155,{type:'replay'},true,saving);this.button('home','返回首页',195,buttonY+60,156,{type:'home'},true);
    this.layout.localResult={compact,saveStatus:status,contentBottom:y+(failed?219:163),footerTop:buttonY};
  }
  empty(name) {
    const ctx=this.ctx,t=this.t,copy={quiz:['题目准备中','本关暂未开放，请稍后再来。'],ranking:['排行榜','榜单暂未开放，请稍后再来。'],certificates:['我的证书','完成一个主题的4关，获得主题证书。'],error:['暂时无法打开','请返回主题页，再试一次。']}[name]||['趣味闯关','请选择一个主题开始。'];
    D.text(ctx,copy[0],24,t,29,C.ink,700);
    const bookArt=this.view.images&&this.view.images.culture;
    if(name==='certificates'&&bookArt)this.art('culture',bookArt,142,t+130,105,80);
    else D.motif(ctx,name==='certificates'?'book':'water',157,t+150,60);
    D.wrap(ctx,copy[1],35,t+246,305,18,C.muted);
    if(name==='certificates') D.text(ctx,'证书暂未开放；试玩不发证。',35,t+212,Math.max(14,12/this.v.scale),C.lake,600);
    if(name==='certificates') D.wrap(ctx,'完成四主题16关，获得“乡村知识闯关王”总证书。',35,t+309,305,16,C.muted);
    this.button('empty-back','返回',24,this.v.bottom-52,327,{type:'back'},true);
  }
}

module.exports = { Renderer };

},
"/js/ui/tokens.js":function(module,exports,require){
module.exports = Object.freeze({
  colors: Object.freeze({ paper: '#EFEAD9', surface: '#FFFCF0', ink: '#263D34', muted: '#52645B', lake: '#176B80', lakeLight: '#DCE9DF', orange: '#E89246', orangeLight: '#F4E1BD', line: '#607664', lineSoft: '#87968A', error: '#9D4B31' }),
  hand: Object.freeze({version:'4.1', inset:20, gap:8, blockGap:24, readingGap:16, buttonHeight:52, buttonRadius:14, optionHeight:56, optionRadius:12, iconSize:24, optionStroke:1, activeStroke:1.5}),
  radius: Object.freeze({ panel: 16, control: 12 }),
  font: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
});

},
"/design/fixtures.js":function(module,exports,require){
// Design fixtures only; excluded from the WeChat package and formal question bank.
module.exports = {
  question: { themeName:'青山绿水',levelOrder:1,position:1,title: '下面哪种做法\n更有利于保护河流？', options: ['把游玩垃圾带走', '把剩饭倒进河里', '往河里扔塑料瓶', '在河边随意丢弃杂物'] },
  screens: [
    { id:'home',name:'01 主题首页',route:{name:'home',params:{}},view:{} },
    { id:'map',name:'02 青山绿水地图',route:{name:'map',params:{themeId:'ecology'}},view:{} },
    { id:'quiz',name:'03 四选一答题',route:{name:'quiz',params:{}},view:{selected:0} },
    { id:'revive',name:'04 分享复活弹窗',route:{name:'quiz',params:{}},view:{selected:1,modal:'revive'} },
    { id:'result',name:'05 通关结算',route:{name:'result',params:{}},view:{result:{themeName:'青山绿水',levelOrder:1,points:10,accuracyPercent:100,nextDifficulty:'进阶理解'}} },
  ],
};

}};const cache={};window.quizRequire=function load(id,from='/'){let resolved=id.startsWith('/')?id:from.slice(0,from.lastIndexOf('/')+1)+id;const parts=[];for(const p of resolved.split('/')){if(p==='..')parts.pop();else if(p&&p!=='.')parts.push(p);}resolved='/'+parts.join('/');if(!resolved.endsWith('.js'))resolved+='.js';if(cache[resolved])return cache[resolved].exports;if(!modules[resolved])throw new Error('Unknown module '+resolved);const module={exports:{}};cache[resolved]=module;modules[resolved](module,module.exports,(next)=>load(next,resolved));return module.exports;};})();