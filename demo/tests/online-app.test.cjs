const test=require('node:test'),assert=require('node:assert/strict');
const {OnlineApp}=require('../js/online-app'),{ApiError}=require('../js/services/http-client');
const {createViewport}=require('../js/core/viewport');
const {THEMES,getLevels}=require('../js/data/themes');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function setup({delayedArt=false,mode='experience'}={}){
  const context=new Proxy({measureText:t=>({width:String(t).length*10})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)}),images=[],listeners=new Map(),calls=[];
  let expired=false,authenticated=0,name='趣味闯关';
  const me=()=>({user:{id:'saved-user',name:'乡村探索者'},mode,points:10,progress:Object.fromEntries(THEMES.map(t=>[t.id,{nodes:['available','locked','locked','locked'],completed:0}]))});
  const catalog=()=>({mode,config:{name,version:name==='趣味闯关'?1:2,themes:THEMES.map(t=>({...t,enabled:true})),timer:{seconds:30}},themes:THEMES.map(t=>({...t,enabled:true})),levels:THEMES.flatMap(t=>getLevels(t.id)),readiness:{shareConfigured:true}});
  const client={async request(url){calls.push(url);if(expired)throw new ApiError('UNAUTHENTICATED','请先登录',401);if(url==='/api/me')return me();if(url==='/api/catalog')return catalog();if(url.startsWith('/api/rankings'))return {entries:[],period:'day'};throw Error('unexpected '+url);}};
  const platform={canvas:{getContext:()=>context},api:{getStorageSync:()=>null,setStorageSync(){}},viewport:()=>createViewport({windowWidth:375,windowHeight:812,pixelRatio:1}),requestFrame:()=>1,cancelFrame(){},on:(n,fn)=>listeners.set(n,fn),off(){},createImage(){const im={};Object.defineProperty(im,'src',{set(){images.push(im);if(!delayedArt)queueMicrotask(()=>im.onerror());}});return im;}};
  const app=new OnlineApp(platform,{client,authenticate:async()=>{authenticated++;expired=false;},share:async()=>({type:'provider-evidence'})});
  return {app,calls,images,listeners,expire:()=>expired=true,rename:()=>name='更新后的乡村活动',authenticated:()=>authenticated};
}
test('运行中会话过期后单次重试重新认证并恢复同一账号',async t=>{
  const h=setup();t.after(()=>h.app.destroy());h.app.start();await h.app.initialization;await turn();
  h.expire();await h.app.handle({type:'route',name:'ranking'});assert.equal(h.app.router.current.name,'error');
  await h.app.handle({type:'retry-remote'});assert.equal(h.authenticated(),1);assert.equal(h.app.readyRemote,true);assert.equal(h.app.me.user.id,'saved-user');assert.equal(h.app.me.points,10);assert.equal(h.app.toastUntil,0);
});
test('回到前台在关卡外更新目录和后台配置',async t=>{
  const h=setup();t.after(()=>h.app.destroy());h.app.start();await h.app.initialization;await turn();h.rename();
  h.listeners.get('onHide')();h.listeners.get('onShow')();await h.app.task;assert.equal(h.app.catalog.config.name,'更新后的乡村活动');
});
test('默认美术迟到时不把已经进入的地图重置到首页',async t=>{
  const h=setup({delayedArt:true});t.after(()=>h.app.destroy());h.app.start();await h.app.initialization;
  h.app.handle({type:'theme',themeId:'culture'});assert.equal(h.app.router.current.name,'map');
  for(const im of h.images)im.onerror();await turn();assert.equal(h.app.router.current.name,'map');
});
test('正式环境仅在服务端能力和客户端适配器都具备时开放分享复活入口',async t=>{
  const h=setup({mode:'production'});t.after(()=>h.app.destroy());h.app.start();await h.app.initialization;await turn();
  assert.equal(h.app.viewState().shareReady,true);h.app.catalog.readiness.shareConfigured=false;assert.equal(h.app.viewState().shareReady,false);
});
test('新增主题和不带数字后缀的关卡按目录导航，题面保留服务端数量',async t=>{
  const h=setup();t.after(()=>h.app.destroy());h.app.start();await h.app.initialization;
  h.app.catalog={themes:[{id:'new-theme',name:'新增主题',enabled:true}],levels:[{id:'intro',themeId:'new-theme',name:'启程',order:2,points:7,questionCount:15},{id:'ending',themeId:'new-theme',name:'归途',order:8,points:17,questionCount:5}],config:{revive:{limit:0}}};
  h.app.themeProgress={'new-theme':{nodes:['current','locked'],levelIds:['intro','ending'],completed:0,total:2}};
  h.app.handle({type:'theme',themeId:'new-theme'});h.app.handle({type:'level',themeId:'new-theme',levelId:'intro',index:0});
  assert.equal(h.app.router.current.params.levelId,'intro');
  h.app.online={id:'challenge',themeId:'new-theme',themeName:'开局时主题名',levelId:'intro',levelOrder:1,total:15,position:11,state:'answering',reviveLimit:0,revivesRemaining:0,question:{id:'q12',title:'第十二题',options:['甲','乙','丙','丁']}};
  assert.equal(h.app.questionView().total,15);assert.equal(h.app.questionView().position,12);assert.equal(h.app.questionView().difficultyLabel,'启程');assert.equal(h.app.questionView().themeName,'开局时主题名');
  assert.equal(h.app.viewState().reviveLimit,0);assert.equal(h.app.viewState().revivesRemaining,0);
  h.app.online.result={passed:true,points:7,accuracy:1,nextLevelId:'ending',themeComplete:false};h.app.handle({type:'next'});
  assert.equal(h.app.router.current.params.levelId,'ending');
});
test('目录停用后恢复旧局仍用快照名称，无可用关卡不启动旧默认关',async t=>{
  const h=setup();t.after(()=>h.app.destroy());h.app.start();await h.app.initialization;h.app.catalog={themes:[],levels:[],config:{}};
  h.app.online={id:'historical',themeId:'removed',themeName:'历史主题',levelName:'历史关',levelId:'old-opaque-id',levelOrder:5,total:30,position:29,state:'answering',question:{id:'q30',title:'末题',options:['甲','乙','丙','丁']}};
  assert.equal(h.app.questionView().themeName,'历史主题');assert.equal(h.app.questionView().levelOrder,5);assert.equal(h.app.questionView().total,30);
  h.app.router.returnTo('home');h.app.handle({type:'practice'});assert.equal(h.app.router.current.name,'home');assert.match(h.app.toast,/暂无可开始/);
});
