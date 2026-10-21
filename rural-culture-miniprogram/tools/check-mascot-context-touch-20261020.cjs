'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {call,qa}=require('./check-mascot-context-native-20261020.cjs');
const scenes=[['profile','home&route=profile','.profile-avatar','scholar','page-profile'],['quiz','quiz','.quest-companion','reader','page-quiz'],['revive','revive','.revive-companion','heart','modal-revive'],['locked','locked','.rest-companion','lotus','modal-locked'],['result','result','.result-companion','drummer','page-result'],['certificate','certificate','.certificate-companion','skater','page-certificate']];
(async()=>{
 const results=[];
 for(const [scene,query,selector,pose,id] of scenes){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme=ecology&review=1&controls=0&scenario='+query]);
  const actual=(await call('automation_page_action',['--action','getData','--data-path',scene==='revive'||scene==='locked'?'modalActorPose':'pageActorPose','--wait-for-selector',selector])).data;assert.equal(actual,pose);
  const before=(await call('automation_page_action',['--action','getData','--data-path','motion'])).data;
  await call('automation_element_action',['--action','tap','--selector',selector]);
  const after=(await call('automation_page_action',['--action','getData','--data-path','motion'])).data;
  assert(after.sequence>before.sequence,scene+' must respond to touch');
  results.push({scene,pose,actorId:id,tap:true,before,after,responseObserved:after.respondingId===id});
  fs.writeFileSync(path.join(qa,'native-interactions.json'),JSON.stringify(results,null,2)+'\n');console.log('Checked native touch '+scene);
 }
 for(const theme of ['ecology','culture','red','industry']){
  await call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario=home&route=profile']);
  await call('simulator_screenshot',['--path',path.join(qa,theme+'-profile.png'),'--optimize','false','--wait-for-selector','.profile-avatar']);console.log('Updated study portrait '+theme);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
