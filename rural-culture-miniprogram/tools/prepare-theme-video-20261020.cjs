'use strict';
// Dedicated offline recording fixture. Never copy its catalog or configuration back.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),out=path.join(workspace,'.rural-quiz-runtime/theme-demo-video');
fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(root,'miniprogram'),path.join(out,'miniprogram'),{recursive:true});
const skins=structuredClone(require('../miniprogram/services-v4/skins'));for(const skin of Object.values(skins)){skin.mode='mock';skin.reviewEnabled=true;skin.allowThemeSwitch=true;delete skin.connection;}
const bank=JSON.parse(fs.readFileSync(path.join(workspace,'demo/design/content-intake/current/bank.json'))),sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'design-source/catalog.js'),'utf8'),sandbox);
const themes=sandbox.window.PROTOTYPE_CONFIG.themes.map(t=>({id:t.id,name:t.name,enabled:true,certificateName:t.certificateName}));
const levels=themes.flatMap(t=>Array.from({length:4},(_,i)=>({id:t.id+'-'+(i+1),themeId:t.id,order:i+1,label:'第'+(i+1)+'关',name:['基础认知','进阶理解','深度应用','综合挑战'][i],enabled:true,questionCount:10,points:[10,15,20,30][i]})));
const questions=levels.flatMap(l=>bank.questions.filter(q=>q.levelId===l.id).slice(0,10).map(q=>({...q,enabled:true})));
const catalog={timerSeconds:30,reviveLimit:1,questionApproval:'Recording fixture with repository example bank; not production content approval',themes,levels,questions};
for(const [file,value] of Object.entries({'game-config.js':skins.culture,'services-v4/skins.js':skins,'services-v4/catalog.js':catalog}))fs.writeFileSync(path.join(out,'miniprogram',file),'module.exports='+JSON.stringify(value,null,2)+';\n');
const page=path.join(out,'miniprogram/pages/game/index.js');fs.writeFileSync(page,fs.readFileSync(page,'utf8').replace("if(p.scenario==='home'&&['profile','points','ranking','certificate'].includes(p.route))","if(['profile','points','ranking','certificate'].includes(p.route))"));
const config=JSON.parse(fs.readFileSync(path.join(root,'project.config.json')));config.projectname='theme-demo-video';config.description='独立视频录制项目';config.packOptions.ignore=config.packOptions.ignore.filter(x=>!['assets/ecology','assets/industry','assets/red'].includes(x.value));fs.writeFileSync(path.join(out,'project.config.json'),JSON.stringify(config,null,2)+'\n');
for(const id of ['culture','red','industry'])fs.mkdirSync(path.join(root,'qa/'+id+'-natural-video-20261020'),{recursive:true});
console.log(JSON.stringify({project:out,themes:themes.length,levels:levels.length,questions:questions.length},null,2));
