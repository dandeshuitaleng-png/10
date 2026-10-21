'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.join(path.dirname(root),'.rural-quiz-runtime/theme-content-review'),qa=path.join(root,'qa/theme-content-20261020');
const content=require('../miniprogram/services-v4/theme-content'),events=[],checks=[];
async function call(tool,args){return new Promise((resolve,reject)=>{const p=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let out='',err='';const timer=setTimeout(()=>{p.kill();reject(Error(tool+' timeout'));},40000);p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',reject);p.on('close',code=>{clearTimeout(timer);let reply;try{reply=JSON.parse(out.slice(out.indexOf('{')));}catch{return reject(Error(err||out));}events.push({tool,args,ok:reply.ok,result:reply.result});fs.writeFileSync(path.join(qa,'native-events.json'),JSON.stringify(events,null,2)+'\n');if(code||!reply.ok||reply.result?.success===false)return reject(Error(reply.message||reply.result?.error));resolve(reply.result);});});}
const load=(theme,query)=>call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario='+query]);
const tap=s=>call('automation_element_action',['--action','trigger','--selector',s,'--type','action','--detail','{}','--wait-for-selector',s]);
async function inspect(theme,scene,selector){
 const d=(await call('automation_page_action',['--action','getData','--wait-for-selector',selector])).data;
 assert.equal(d.skin.gameId,theme);assert.equal(d.content.profile,content.get(theme).profile);
 if(d.challenge){assert(d.challenge.question.id.startsWith('HN-'+theme.toUpperCase()+'-'));assert.equal(d.chapterStyle.line,content.chapter(theme,{},Number(d.challenge.level.id.split('-').at(-1))-1).line);}
 if(scene==='share'){assert(d.shareCopy.title.includes(d.skin.name));assert.equal(d.shareCopy.text,content.get(theme).shareText);assert(d.sharePreviewImage);}
 const visible=[d.profile.nickname,d.profile.badge,d.modalTitle,d.modalPrimary,d.content.profile,d.shareCopy.title,d.shareCopy.text,d.certificate?.footer].filter(Boolean).join(' ');assert(!/本地|模拟|演示|联调|非正式/.test(visible));
 await call('simulator_screenshot',['--path',path.join(qa,theme+'-'+scene+'.png'),'--optimize','false','--wait-for-selector',selector]);
 checks.push({theme,scene,route:d.route,modal:d.modal,question:d.challenge?.question.id,chapter:d.chapterStyle.eyebrow,copy:d.content.profile,passed:true});fs.writeFileSync(path.join(qa,'native-checks.json'),JSON.stringify(checks,null,2)+'\n');console.log('PASS '+theme+' '+scene);
}
(async()=>{
 for(const theme of (process.argv[2]?process.argv[2].split(','):['red','culture','industry'])){
  await load(theme,'home');await inspect(theme,'home','.route-canvas');await tap('#footer-primary');await inspect(theme,'rules','.chapter-welcome');
  for(const [scene,query,selector] of [['quiz','quiz','.question-title'],['revive','revive','.revive-companion']]){await load(theme,query);await inspect(theme,scene,selector);}
  await tap('#modal-primary');await inspect(theme,'share','.share-cover-image');
  for(const [scene,query,selector] of [['locked','locked','.rest-companion'],['result','result','.result-companion'],['profile','home&route=profile','.profile-card'],['points','home&route=points','.points-hero'],['certificate-unearned','home&route=certificate','.state-block'],['certificate','certificate','.certificate-paper']]){await load(theme,query);await inspect(theme,scene,selector);}
 }
})().catch(e=>{fs.writeFileSync(path.join(qa,'native-error.txt'),e.stack+'\n');console.error(e);process.exitCode=1;});
