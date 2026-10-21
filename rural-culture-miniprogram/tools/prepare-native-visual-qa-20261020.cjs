'use strict';
// Disposable offline visual fixture; never changes six delivered projects or their account storage.
const fs=require('node:fs'),path=require('node:path');
const project=path.resolve(__dirname,'..'),workspace=path.dirname(project),out=path.join(workspace,'.rural-quiz-runtime/native-visual-review');
fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(project,'miniprogram'),path.join(out,'miniprogram'),{recursive:true});
const skins=structuredClone(require('../miniprogram/services-v4/skins'));for(const skin of Object.values(skins)){skin.mode='mock';skin.reviewEnabled=true;skin.allowThemeSwitch=true;delete skin.connection;}
const catalog={timerSeconds:30,reviveLimit:1,questionApproval:'Isolated native visual fixture only',themes:Object.values(skins).map(s=>({id:s.gameId,name:s.name,enabled:true,certificateName:s.name+'排版样例'})),levels:[],questions:[]};
for(const theme of Object.keys(skins))for(let i=0;i<4;i++){const id=theme+'-'+(i+1);catalog.levels.push({id,themeId:theme,order:i+1,label:'第'+(i+1)+'关',name:['基础认知','进阶理解','深度应用','综合挑战'][i],enabled:true,questionCount:1,points:[10,15,20,30][i]});catalog.questions.push({id:id+'-visual-q',themeId:theme,levelId:id,title:i%2?'湖南主要水系以哪个湖泊为中心组织？':'新宁崀山以哪类地貌著称？',options:['视觉排版样例选项一','视觉排版样例选项二','视觉排版样例选项三','视觉排版样例选项四'],answer:0,explanation:'隔离排版检查，不是业务题库或正式答案。',sourceTitle:'用户截图题干，仅供排版'});}
for(const [name,value] of Object.entries({'game-config.js':skins.ecology,'services-v4/skins.js':skins,'services-v4/catalog.js':catalog}))fs.writeFileSync(path.join(out,'miniprogram',name),'module.exports='+JSON.stringify(value,null,2)+';\n');
const serviceFile=path.join(out,'miniprogram/services-v4/index.js');fs.writeFileSync(serviceFile,fs.readFileSync(serviceFile,'utf8').replace('const clock = opts.clock || Date.now;', 'const clock = opts.clock || (()=>1792468800000); // fixed visual-fixture time only'));
const config=JSON.parse(fs.readFileSync(path.join(project,'project.config.json')));config.projectname='visual-review-offline-only';config.description='隔离排版样例；无真实账号与联网判题';fs.writeFileSync(path.join(out,'project.config.json'),JSON.stringify(config,null,2)+'\n');
fs.writeFileSync(path.join(out,'README.md'),'Temporary native visual QA. Mock catalog and review-memory state only. Does not connect to the actual backend. Do not ship this fixture.\n');console.log(out);
