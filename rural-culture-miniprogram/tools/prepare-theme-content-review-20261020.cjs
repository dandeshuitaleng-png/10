'use strict';
// Native content/layout fixture with each theme's own repository questions.
// This directory has no backend connection and never writes to real player accounts.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),out=path.join(workspace,'.rural-quiz-runtime/theme-content-review');
fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(root,'miniprogram'),path.join(out,'miniprogram'),{recursive:true});
const skins=structuredClone(require('../miniprogram/services-v4/skins'));for(const skin of Object.values(skins)){skin.mode='mock';skin.reviewEnabled=true;skin.allowThemeSwitch=true;delete skin.connection;}
const bank=JSON.parse(fs.readFileSync(path.join(workspace,'demo/design/content-intake/current/bank.json'))),sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'design-source/catalog.js'),'utf8'),sandbox);
const themes=sandbox.window.PROTOTYPE_CONFIG.themes.map(t=>({id:t.id,name:t.name,enabled:true,certificateName:t.certificateName}));
const levels=themes.flatMap(t=>Array.from({length:4},(_,i)=>({id:t.id+'-'+(i+1),themeId:t.id,order:i+1,label:'第'+(i+1)+'关',name:['基础认知','进阶理解','深度应用','综合挑战'][i],enabled:true,questionCount:10,points:[10,15,20,30][i]})));
const catalog={timerSeconds:30,reviveLimit:1,questionApproval:'Isolated content QA. Repository example bank, not a production approval.',themes,levels,questions:levels.flatMap(l=>bank.questions.filter(q=>q.levelId===l.id).slice(0,10).map(q=>({...q,enabled:true})))};
for(const [file,value] of Object.entries({'game-config.js':skins.culture,'services-v4/skins.js':skins,'services-v4/catalog.js':catalog}))fs.writeFileSync(path.join(out,'miniprogram',file),'module.exports='+JSON.stringify(value,null,2)+';\n');
const file=path.join(out,'miniprogram/services-v4/index.js');fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('const clock = opts.clock || Date.now;', 'const clock = opts.clock || (()=>1792468800000); // fixed content-QA clock only'));
const config=JSON.parse(fs.readFileSync(path.join(root,'project.config.json')));config.projectname='theme-content-review';config.packOptions.ignore=config.packOptions.ignore.filter(x=>!['assets/ecology','assets/industry','assets/red'].includes(x.value)&&!/^assets\/journey\/(culture|red|industry|ecology)(-a-v4\.jpg|-node-a-v4\.png|\.jpg)$/.test(x.value)&&!/^assets\/(red|culture)\/banner-themed-v3\.png$/.test(x.value));fs.writeFileSync(path.join(out,'project.config.json'),JSON.stringify(config,null,2)+'\n');
console.log(JSON.stringify({project:out,themes:themes.length,questions:catalog.questions.length},null,2));
