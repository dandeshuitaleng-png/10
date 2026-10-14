const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {THEMES,getLevels}=require('../js/data/themes');
const {Router}=require('../js/core/router');
const {createViewport}=require('../js/core/viewport');
const {Input}=require('../js/core/input');
const {Backend}=require('../js/services/backend');
const {Storage}=require('../js/services/storage');
const {Renderer}=require('../js/ui/renderer');
const F=require('../design/fixtures');

function context() {
  return new Proxy({ measureText(value){return{width:String(value).length*16};} },{
    get(target,key){return key in target?target[key]:(()=>{});},set(target,key,value){target[key]=value;return true;},
  });
}
test('需求配置保持四主题、16关、每关10题及阶梯积分',()=>{
  assert.deepEqual(THEMES.map(t=>t.name),['十步芳草','千年文脉','金色产业','青山绿水']);
  const levels=THEMES.flatMap(t=>getLevels(t.id));assert.equal(levels.length,16);
  for(const theme of THEMES){const l=getLevels(theme.id);assert.deepEqual(l.map(x=>x.points),[10,15,20,30]);assert.ok(l.every(x=>x.questionCount===10));}
  assert.equal(new Set(levels.map(x=>x.id)).size,16);
});
test('未确认规则不带默认值，正式题池为空且不开局',()=>{
  const rules=require('../js/data/rules');const {inspectPool}=require('../js/data/content');
  for(const key of ['questionTimeSeconds','timeoutPolicy','reviveResetPeriod','dayBoundary','replayPointsPolicy','accuracyPolicy','shareVerificationPolicy'])assert.equal(rules[key],null);
  assert.equal(inspectPool('ecology-1').ready,false);
});
test('页面历史返回、不接受未知页面、不重复压栈',()=>{
  const r=new Router();r.replace('home');r.navigate('map',{themeId:'ecology'});r.navigate('map',{themeId:'ecology'});assert.equal(r.history.length,1);r.back();assert.equal(r.current.name,'home');r.navigate('result');assert.equal(r.current.name,'result');assert.throws(()=>r.navigate('anything'));
});
test('拖出、取消、多指、重复抬起不会误触发',()=>{
  const actions=[];const input=new Input(x=>actions.push(x));input.setTargets([{id:'a',x:10,y:20,w:100,h:48,action:'go'}]);
  input.start({x:20,y:30},1);input.move({x:200,y:30},1);input.end({x:20,y:30},1);assert.equal(actions.length,0);
  input.start({x:20,y:30},1);input.cancel();input.end({x:20,y:30},1);assert.equal(actions.length,0);
  input.start({x:20,y:30},1);input.end({x:20,y:30},2);assert.equal(actions.length,0);input.end({x:20,y:30},1);input.end({x:20,y:30},1);assert.deepEqual(actions,['go']);
});
test('安全区和各个关键画面的可操作区域不越界、没有重叠',()=>{
  const sizes=[[320,568],[375,812],[414,896],[430,932]];
  for(const [width,height] of sizes){
    const v=createViewport({windowWidth:width,windowHeight:height,pixelRatio:3,statusBarHeight:24,safeArea:{top:24,bottom:height-12}},{bottom:56});
    assert.ok(v.top*v.scale>=68);assert.ok(v.bottom*v.scale<=height-16);
    for(const screen of F.screens){
      const renderer=new Renderer(context());const targets=renderer.render(screen.route,v,{...screen.view,question:F.question});
      for(const target of targets){assert.ok(target.x>=0&&target.y>=v.top,`${width} ${screen.id} ${target.id} top`);assert.ok(target.x+target.w<=375,`${target.id} right`);assert.ok(target.y+target.h<=v.bottom+5,`${width} ${screen.id} ${target.id} bottom:${target.y+target.h}/${v.bottom}`);}
      for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++){
        const a=targets[i],b=targets[j];const area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));assert.equal(area,0,`${width} ${screen.id}: ${a.id}/${b.id} overlap`);
      }
    }
  }
});
test('未配置后端或未验证分享时不伪造成功',async()=>{
  const api=new Backend();await assert.rejects(api.getRanking('day'),/BACKEND_NOT_CONFIGURED/);await assert.rejects(api.claimRevive('challenge',null),/VERIFIED_SHARE_REQUIRED/);
});
test('存储异常返回失败，只保存偏好，不写通关/积分/证书',()=>{
  let stored;const storage=new Storage({getStorageSync(){throw new Error('denied');},setStorageSync(k,v){stored=v;}});assert.deepEqual(storage.loadPreferences(),{muted:false});assert.equal(storage.savePreferences({muted:true,score:300}).ok,true);assert.deepEqual(stored,{version:1,muted:true});assert.equal(new Storage({setStorageSync(){throw new Error();}}).savePreferences({}).ok,false);
});
test('微信入口和业务模块的相对引用均存在',()=>{
  const root=path.resolve(__dirname,'..');function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())walk(p);else if(d.name.endsWith('.js')){const s=fs.readFileSync(p,'utf8');for(const m of s.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)){const dest=path.resolve(path.dirname(p),m[1]);assert.ok(fs.existsSync(dest)||fs.existsSync(dest+'.js'),`${p} -> ${m[1]}`);}}}}walk(path.join(root,'js'));assert.ok(fs.existsSync(path.join(root,'game.js')));
});
test('生命周期隐藏停帧、显示不重置页面、销毁移除监听',async()=>{
  const App=require('../js/main');let id=0;const frames=new Map(),listeners=new Map();const platform={
    canvas:{getContext:()=>context()},api:{getStorageSync:()=>null},
    viewport:()=>createViewport({windowWidth:375,windowHeight:812,pixelRatio:2}),
    requestFrame(cb){frames.set(++id,cb);return id;},cancelFrame(i){frames.delete(i);},
    on(n,cb){listeners.set(n,cb);},off(n,cb){const original=n.replace(/^off/,'on');if(listeners.get(original)===cb)listeners.delete(original);},
    createImage(){return {set src(_){queueMicrotask(()=>this.onerror());}};},
  };
  const app=new App(platform);app.start();app.start();await new Promise(resolve=>setImmediate(resolve));assert.equal(app.router.current.name,'home');assert.equal(frames.size,1);
  app.handle({type:'theme',themeId:'ecology'});listeners.get('onHide')();assert.equal(frames.size,0);listeners.get('onShow')();assert.equal(frames.size,1);assert.equal(app.router.current.name,'map');
  const [frameId,callback]=[...frames.entries()][0];frames.delete(frameId);callback(16);assert.equal(frames.size,1);
  app.destroy();assert.equal(frames.size,0);assert.equal(listeners.size,0);
});
