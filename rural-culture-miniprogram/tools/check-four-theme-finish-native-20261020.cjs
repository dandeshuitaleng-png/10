'use strict';
// UI evidence only. All actions stay in the isolated, offline review project.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review');
const phase=process.argv[2]||'before',qa=path.join(root,'qa/four-theme-finish-20261020',phase);
fs.mkdirSync(qa,{recursive:true});
const content=require('../miniprogram/services-v4/theme-content'),events=[],checks=[];
async function call(tool,args){return new Promise((resolve,reject)=>{const p=spawn('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args]);let out='',err='';const timer=setTimeout(()=>{p.kill();reject(Error(tool+' timeout'));},40000);p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',reject);p.on('close',code=>{clearTimeout(timer);let reply;try{reply=JSON.parse(out.slice(out.indexOf('{')));}catch{return reject(Error(err||out));}events.push({tool,args,ok:reply.ok,result:reply.result});fs.writeFileSync(path.join(qa,'native-events.json'),JSON.stringify(events,null,2)+'\n');if(code||!reply.ok||reply.result?.success===false)return reject(Error(reply.message||reply.result?.error));resolve(reply.result);});});}
const load=(theme,query)=>call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario='+query]);
const trigger=s=>call('automation_element_action',['--action','trigger','--selector',s,'--type','action','--detail','{}','--wait-for-selector',s]);
async function inspect(theme,scene,selector){
 const d=(await call('automation_page_action',['--action','getData','--wait-for-selector',selector])).data;
 assert.equal(d.skin.gameId,theme);assert.equal(d.content.profile,content.get(theme).profile);
 if(scene==='home'){assert.equal(d.journey.nodes.filter(n=>n.showMascot).length,1);assert.equal(d.journey.nodes[0].status,'current');}
 if(scene==='quiz')assert.equal(d.pageActorPose,'reader');
 if(scene==='correct')assert.equal(d.pageActorPose,'celebrate');
 if(scene==='revive')assert.equal(d.modalActorPose,'heart');
 if(scene==='locked')assert.equal(d.modalActorPose,'lotus');
 if(scene==='profile')assert.equal(d.pageActorPose,'scholar');
 if(scene==='result')assert.equal(d.pageActorPose,'drummer');
 if(scene==='certificate')assert.equal(d.pageActorPose,'skater');
 const visible=[d.profile.nickname,d.profile.badge,d.modalTitle,d.modalPrimary,d.content.profile,d.shareCopy.title,d.shareCopy.text,d.certificate?.footer].filter(Boolean).join(' ');assert(!/本地|模拟|演示|联调|非正式/.test(visible));
 await call('simulator_screenshot',['--path',path.join(qa,theme+'-'+scene+'.png'),'--optimize','false','--wait-for-selector',selector]);
 checks.push({theme,scene,route:d.route,modal:d.modal,actor:d.modal?d.modalActorPose:d.pageActorPose,passed:true});fs.writeFileSync(path.join(qa,'native-checks.json'),JSON.stringify(checks,null,2)+'\n');console.log('PASS '+theme+' '+scene);
}
(async()=>{for(const theme of process.argv[3]?process.argv[3].split(','):['red','culture','industry','ecology']){
 if(process.argv[4]==='quiz'){for(const [scene,selector]of[['quiz','.question-title'],['correct','.answer-feedback']]){await load(theme,scene);await inspect(theme,scene,selector);}continue;}
 await load(theme,'home');await inspect(theme,'home','.route-canvas');await trigger('#footer-primary');await inspect(theme,'rules','.chapter-welcome');
 for(const [scene,query,selector]of[['quiz','quiz','.question-title'],['correct','correct','.answer-feedback'],['revive','revive','.revive-companion']]){await load(theme,query);await inspect(theme,scene,selector);}
 await trigger('#modal-primary');await inspect(theme,'share','.share-cover-image');
 for(const [scene,query,selector]of[['locked','locked','.rest-companion'],['result','result','.result-companion'],['profile','home&route=profile','.profile-card'],['points','home&route=points','.points-hero'],['ranking-empty','ranking-empty','.my-rank'],['certificate-unearned','home&route=certificate','.state-block'],['certificate','certificate','.certificate-paper']]){await load(theme,query);await inspect(theme,scene,selector);}
 await call('automation_element_action',['--action','tap','--selector','.section-bar .icon-button']);
 await call('automation_element_action',['--action','tap','--selector','.activity-shortcut[data-route="ranking"]','--wait-for-selector','.activity-shortcut']);await inspect(theme,'ranking','.rank-table');
}})().catch(e=>{fs.writeFileSync(path.join(qa,'native-error.txt'),e.stack+'\n');console.error(e);process.exitCode=1;});
