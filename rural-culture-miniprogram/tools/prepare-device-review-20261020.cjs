'use strict';
// Isolated visual/device package. No shared-account backend or production configuration is changed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),workspace=path.dirname(root),id=process.argv[2]||'ecology';
const names={red:'十步芳草',culture:'千年文脉',industry:'金色产业',ecology:'青山绿水'};if(!names[id])throw Error('Unknown theme');
const previewAppId=process.argv[3];if(previewAppId&&!/^wx[0-9a-f]{16}$/i.test(previewAppId))throw Error('Invalid preview AppID');
const source=path.join(workspace,'交付/微信小程序四套',names[id]),out=path.join(workspace,'.rural-quiz-runtime/device-review-'+id+(previewAppId?'-'+previewAppId.slice(-6):''));
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'miniprogram'),{recursive:true,force:true});fs.cpSync(path.join(source,'miniprogram'),path.join(out,'miniprogram'),{recursive:true});
const skins=structuredClone(require('../miniprogram/services-v4/skins'));for(const skin of Object.values(skins)){skin.mode='mock';skin.reviewEnabled=true;skin.allowThemeSwitch=false;delete skin.connection;}
const bank=JSON.parse(fs.readFileSync(path.join(workspace,'demo/design/content-intake/current/bank.json'))),box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'design-source/catalog.js'),'utf8'),box);
const theme=box.window.PROTOTYPE_CONFIG.themes.find(t=>t.id===id),levels=Array.from({length:4},(_,i)=>({id:id+'-'+(i+1),themeId:id,order:i+1,label:'第'+(i+1)+'关',name:['基础认知','进阶理解','深度应用','综合挑战'][i],enabled:true,questionCount:10,points:[10,15,20,30][i]}));
const catalog={timerSeconds:30,reviveLimit:1,themes:[{id,name:names[id],enabled:true,certificateName:theme.certificateName}],levels,questions:levels.flatMap(l=>bank.questions.filter(q=>q.levelId===l.id).slice(0,10).map(q=>({...q,enabled:true})))};
for(const [file,value]of Object.entries({'game-config.js':skins[id],'services-v4/skins.js':skins,'services-v4/catalog.js':catalog}))fs.writeFileSync(path.join(out,'miniprogram',file),'module.exports='+JSON.stringify(value)+';\n');
const config=JSON.parse(fs.readFileSync(path.join(source,'project.config.json')));config.projectname='device-review-'+id;if(previewAppId)config.appid=previewAppId;fs.writeFileSync(path.join(out,'project.config.json'),JSON.stringify(config,null,2)+'\n');
fs.writeFileSync(path.join(out,'README.md'),'手机视觉检查包；独立保存检查进度，不连接真实账户。检查主题：'+names[id]+'。\n');
console.log(out);
