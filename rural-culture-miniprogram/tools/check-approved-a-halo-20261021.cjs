'use strict';
// Disposable native review fixture only. Does not connect to or alter real accounts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review'),out=path.join(root,'qa/home-designs-20261021');
async function call(tool,args=[]){return new Promise((resolve,reject)=>{const c=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let s='';c.stdout.on('data',b=>s+=b);c.stderr.on('data',b=>s+=b);const timer=setTimeout(()=>{c.kill();reject(Error(tool+' timeout'));},45000);c.on('close',code=>{clearTimeout(timer);let r;try{r=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));}catch{return reject(Error(s.slice(0,500)));}if(code||!r.ok||r.result?.success===false)return reject(Error(r.message||s.slice(0,500)));resolve(r.result);});});}
async function evaluate(fn){let r=await call('automation_evaluate',['--fn-source',fn]);for(let i=0;i<6&&r?.result!==undefined;i++)r=r.result;return r;}
(async()=>{
 const checks=[];
 for(const theme of ['ecology','red','culture','industry']){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario=home']);
  const result=await evaluate('async function(){await new Promise(r=>setTimeout(r,300));const p=getCurrentPages().slice(-1)[0],q=wx.createSelectorQuery();q.select(".route-halo").boundingClientRect();return {theme:p.data.skin.gameId,halo:await new Promise(r=>q.exec(rows=>r(rows[0])))};}');
  assert.equal(result.theme,theme);assert(result.halo.height>0&&result.halo.height<result.halo.width*.6);const css=fs.readFileSync(path.join(root,'miniprogram/pages/game/approved-a-20261021.wxss'),'utf8');assert(css.includes('border:0;border-radius:50%;box-shadow:none;background:radial-gradient'));assert(!css.includes('var(--button-edge)'));checks.push({theme,passed:true,...result});console.log('PASS diffused halo '+theme);
 }
 for(const scenario of ['home','chapter-2','chapter-3','chapter-4','locked','certificate']){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme=ecology&review=1&controls=0&scenario='+scenario]);
  await evaluate('async function(){const p=getCurrentPages().slice(-1)[0];p.go("home");await new Promise(r=>setTimeout(r,300));return p.data.route;}');
  await call('simulator_screenshot',['--path',path.join(out,'a-state-'+scenario+'.png'),'--optimize','false','--wait-for-selector','.route-canvas']);
 }
 fs.writeFileSync(path.join(out,'approved-a-halo-checks.json'),JSON.stringify({date:new Date().toISOString(),passed:true,scope:'Actual native oval bounds and refreshed ecology state screenshots, plus source binding check for zero border/shadow and declared theme gradient. Visual inspection separately confirms no hard ring. Computed style collection was unavailable in automator.',checks},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
