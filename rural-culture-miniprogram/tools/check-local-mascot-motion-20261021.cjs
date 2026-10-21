'use strict';
// Isolated native fixture only. Freeze original-pixel arm keyframes for visual inspection.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),mini=path.join(project,'miniprogram'),out=path.join(root,'qa/home-designs-20261021');
function call(tool,args=[]){const r=spawnSync('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args],{encoding:'utf8',timeout:45000});assert.equal(r.status,0,r.stdout+r.stderr);let v=JSON.parse(r.stdout.slice(r.stdout.indexOf('{'),r.stdout.lastIndexOf('}')+1));assert(v.ok,JSON.stringify(v));v=v.result;assert(v?.success!==false,JSON.stringify(v));for(let i=0;i<6&&v?.result!==undefined;i++)v=v.result;return v;}
call('close_project_window');
fs.cpSync(path.join(root,'miniprogram/components/mascot-actor'),path.join(mini,'components/mascot-actor'),{recursive:true});for(const file of ['mascot-rig.js','mascot-mesh.js','mascot-canvas.js'])fs.copyFileSync(path.join(root,'miniprogram/services-v4',file),path.join(mini,'services-v4',file));
const dir=path.join(mini,'pages/local-motion-qa');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify({navigationStyle:'custom',usingComponents:{'mascot-actor':'../../components/mascot-actor/index'}}));
fs.writeFileSync(path.join(dir,'index.js'),`Page({data:{playing:false,cycle:1,poses:['welcome','celebrate','observe','think']}});`);
fs.writeFileSync(path.join(dir,'index.wxml'),'<view class="qa"><view class="title">原像素局部动作核查</view><view class="grid"><view wx:for="{{poses}}" wx:key="*this" class="card"><view class="actor-host"><mascot-actor id="{{item}}" pose="{{item}}" playing="{{playing}}" responding="{{playing}}" cycle="{{cycle}}" /></view><text>{{item}}</text></view></view></view>');
fs.writeFileSync(path.join(dir,'index.wxss'),'.qa{padding:55px 12px 20px;background:#E7F5DF;height:100vh;box-sizing:border-box}.title{height:36px;font-size:18px;color:#254C16}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.card{display:flex;flex-direction:column;align-items:center;padding:16px 0;background:#D8E7BF;border-radius:12px}.actor-host{width:140px;height:166px}.card text{font-size:13px;color:#254C16;margin-top:8px}');
const appFile=path.join(mini,'app.json'),app=JSON.parse(fs.readFileSync(appFile));if(!app.pages.includes('pages/local-motion-qa/index'))app.pages.push('pages/local-motion-qa/index');fs.writeFileSync(appFile,JSON.stringify(app,null,2));
const cssFile=path.join(mini,'components/mascot-actor/index.wxss'),original=fs.readFileSync(path.join(root,'miniprogram/components/mascot-actor/index.wxss'),'utf8');
fs.writeFileSync(cssFile,original+'\n.mesh-triangle,.eye-copy,.prop-glint,.extension-part,.response-mark{animation-delay:-180ms!important;animation-play-state:paused!important}\n');
try{
 call('open_project_window',['--window-mode','liteMode']);call('simulator_screenshot',['--path',path.join(project,'motion-ready.png'),'--optimize','false']);
 call('automation_page_action',['--action','getData','--data-path','route','--wait-for-selector','.game-device']);
 call('automation_navigate',['--action','reLaunch','--url','/pages/local-motion-qa/index']);
 for(const [label,progress] of [['still',null],['peak',.10],['mid',.42],['return',.72]]){
  const playing=progress!==null;
  const result=call('automation_evaluate',['--fn-source','async function(){const p=getCurrentPages().slice(-1)[0];p.setData({playing:'+playing+'});await new Promise(r=>setTimeout(r,600));const states=[];for(const pose of p.data.poses){const c=p.selectComponent("#"+pose);if('+playing+'){c.inspectFrame('+JSON.stringify(progress)+');}states.push({pose,ready:c.data.canvasReady});}return states;}']);
  if(playing)assert(result.every(c=>c.ready),'all original-image canvases must be ready');
  const file='local-motion-'+label+'.png';call('simulator_screenshot',['--path',path.join(out,file),'--optimize','false','--wait-for-selector','.actor-host']);console.log('CAPTURE '+file);
 }

 const css=fs.readFileSync(path.join(root,'miniprogram/components/mascot-actor/index.wxss'),'utf8');assert(!/\.gesture-plane\{animation-name|\.extension-plane\{animation-name/.test(css));assert(css.includes('.canvas-ready.is-playing .gesture-original{opacity:0}'));
 fs.writeFileSync(path.join(out,'local-motion-checks.json'),JSON.stringify({date:new Date().toISOString(),passed:true,scope:'Actual native Canvas 2D original-pixel deformation: still, 10%, 42% and 72% frames. Shared continuous renderer, no cutout arm layers. Requires visual inspection; separate from physical device performance.',wholeBodyAnimationBindings:0,images:['local-motion-still.png','local-motion-peak.png','local-motion-mid.png','local-motion-return.png']},null,2)+'\n');
}finally{fs.writeFileSync(cssFile,original);}
