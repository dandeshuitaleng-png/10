'use strict';
const crypto = require('node:crypto');
const clone = value => JSON.parse(JSON.stringify(value));
const DEFAULT_THEMES = [['red','十步芳草','红色故事通'],['culture','千年文脉','千年文脉知识达人'],['industry','金色产业','金色产业知识达人'],['ecology','青山绿水','青山绿水知识达人']];
const DEFAULT_POINTS = [10,15,20,30];
function check(condition, code, message) { if (!condition) throw Object.assign(new Error(message), { status:400, code }); }
function string(value, field, max=100, optional=false) { if(optional && (value===undefined || value===''))return '';check(typeof value==='string'&&value.trim()&&value.length<=max,'INVALID_INPUT',`${field}格式不正确`);return value.trim(); }
function id(value, field) { const result=string(value,field,80);check(/^[a-z][a-z0-9_-]*$/.test(result)&&result!=='all','INVALID_ID',`${field}须为稳定的小写字母、数字、连字符ID`);return result; }
function integer(value,field,min=0,max=Number.MAX_SAFE_INTEGER){check(Number.isSafeInteger(value)&&value>=min&&value<=max,'INVALID_INPUT',`${field}须为${min}至${max}的整数`);return value;}
function boolean(value,field){check(typeof value==='boolean','INVALID_INPUT',`${field}须为布尔值`);return value;}
function url(value){if(!value)return '';check(typeof value==='string'&&value.length<2048&&!value.includes('..')&&(/^https:\/\//.test(value)||/^\/(?:images|media|assets|design)\/[\w./%\-]+$/.test(value)),'INVALID_MEDIA','素材须为HTTPS或受控本地路径');return value;}
function color(value){check(/^#[0-9a-fA-F]{6}$/.test(value),'INVALID_COLOR','背景色须为六位十六进制');return value;}
function normalizeConfigShape(input) {
  const value=clone(input);const fallback=defaultConfig();
  value.schemaVersion=2;value.activityId=value.activityId||'rural-quiz';
  check(Array.isArray(value.themes),'INVALID_THEMES','主题目录须为数组');
  value.themes=value.themes.map((theme,index)=>{check(theme&&typeof theme==='object','INVALID_THEMES','主题须为对象');return({...theme,order:theme.order??index+1,description:theme.description||'',mapImage:theme.mapImage||'',certificateName:theme.certificateName||DEFAULT_THEMES.find(t=>t[0]===theme.id)?.[2]||`${theme.name}知识达人`,certificateText:theme.certificateText||'已完成本主题全部知识关卡',deleted:theme.deleted||false});});
  value.revive={...value.revive,failurePolicy:value.revive.failurePolicy||'until-limit'};
  value.points={...value.points,dailyPointCap:value.points.dailyPointCap??null,capPolicy:value.points.capPolicy||'truncate-reward'};
  value.certificates={...fallback.certificates,...value.certificates};value.share={...fallback.share,...value.share};return value;
}
function defaultConfig(){return{schemaVersion:2,activityId:'rural-quiz',name:'趣味闯关',cover:'',background:'#F5F9F7',themes:DEFAULT_THEMES.map(([id,name,certificateName],index)=>({id,name,order:index+1,description:'',enabled:true,cover:'',mapImage:'',background:'#F5F9F7',certificateName,certificateText:'已完成本主题全部知识关卡',deleted:false})),timer:{seconds:30,timeout:'wrong'},revive:{limit:1,period:'challenge',failurePolicy:'until-limit',shareText:'一起挑战乡村知识，开启下一关！',shareImage:''},points:{byLevel:DEFAULT_POINTS,replay:'first',dailyPointCap:null,capPolicy:'truncate-reward'},certificates:{title:'趣味闯关 · 电子荣誉证书',totalName:'乡村知识闯关王',totalText:'已完成本活动全部乡村知识关卡',footer:'学习活动纪念，不代表学历或教育资格'},share:{title:'乡村知识之旅',text:'一起探索乡村知识，挑战趣味关卡！',image:''},approval:{status:'user-approved',approvedAt:'2026-10-12',source:'user-confirmed-rules'},version:1};}
function ruleSignature(config,levels=[]){return JSON.stringify({themes:config.themes.map(t=>({id:t.id,order:t.order,enabled:t.enabled,deleted:t.deleted})).sort((a,b)=>a.id.localeCompare(b.id)),timer:config.timer,revive:{limit:config.revive.limit,period:config.revive.period,failurePolicy:config.revive.failurePolicy},points:config.points,levels:levels.map(l=>({id:l.id,themeId:l.themeId,order:l.order,enabled:l.enabled,deleted:l.deleted||false,points:l.points,questionCount:l.questionCount})).sort((a,b)=>a.id.localeCompare(b.id))});}
function validateConfig(input,old){
  check(input&&typeof input==='object'&&!Array.isArray(input),'INVALID_CONFIG','配置须为对象');
  const next=normalizeConfigShape({...old,...input,timer:{...old.timer,...input.timer},revive:{...old.revive,...input.revive},points:{...old.points,...input.points},certificates:{...old.certificates,...input.certificates},share:{...old.share,...input.share}});
  next.activityId=old.activityId;next.name=string(next.name,'互动名称');next.cover=url(next.cover);next.background=color(next.background);
  check(Array.isArray(next.themes)&&next.themes.length>=1&&next.themes.length<=100,'INVALID_THEMES','目录须包含1至100个主题（技术资源限制）');
  next.themes=next.themes.map((theme,index)=>({id:id(theme.id,'主题ID'),name:string(theme.name,'主题名称'),order:integer(theme.order??index+1,'主题顺序',1,1000000),description:string(theme.description||'','主题简介',1000,true),enabled:boolean(theme.enabled??true,'主题启用'),cover:url(theme.cover),mapImage:url(theme.mapImage),background:color(theme.background||next.background),certificateName:string(theme.certificateName||`${theme.name}知识达人`,'主题证书名称',100),certificateText:string(theme.certificateText||'已完成本主题全部知识关卡','主题证书正文',1000),deleted:Boolean(theme.deleted)}));
  check(new Set(next.themes.map(t=>t.id)).size===next.themes.length,'DUPLICATE_ID','主题ID重复');check(new Set(next.themes.map(t=>t.order)).size===next.themes.length,'DUPLICATE_ORDER','主题顺序重复');next.themes.sort((a,b)=>a.order-b.order);
  integer(next.timer.seconds,'单题时限',5,600);check(next.timer.timeout==='wrong','INVALID_TIMER','超时按错题处理');integer(next.revive.limit,'复活额度',0,100);check(next.revive.period==='challenge'&&next.revive.failurePolicy==='until-limit','INVALID_REVIVE','复活采用每挑战额度，用尽后再次错误锁定');next.revive.shareText=string(next.revive.shareText,'复活分享语',300);next.revive.shareImage=url(next.revive.shareImage);
  check(Array.isArray(next.points.byLevel)&&next.points.byLevel.length>=1&&next.points.byLevel.length<=1000,'INVALID_POINTS','阶梯积分配置格式不正确');next.points.byLevel.forEach(value=>integer(value,'阶梯积分',0,1000000));check(next.points.replay==='first'&&next.points.capPolicy==='truncate-reward','INVALID_POINTS','积分采用首次通关与上限截断策略');if(next.points.dailyPointCap!==null)integer(next.points.dailyPointCap,'每日积分上限');
  for(const key of ['title','totalName','totalText','footer'])next.certificates[key]=string(next.certificates[key],`证书${key}`,key==='totalText'||key==='footer'?1000:150);
  next.share.title=string(next.share.title,'分享标题',100);next.share.text=string(next.share.text,'分享文案',500);next.share.image=url(next.share.image);
  next.approval=ruleSignature(next)!==ruleSignature(old)?{status:'unapproved',source:'admin-rule-change'}:clone(old.approval);next.version=old.version+1;return next;
}
function validateLevels(levels,config){
  check(Array.isArray(levels)&&levels.length<=1000,'INVALID_LEVELS','最多1000关（技术资源限制）');
  const result=levels.map((level,index)=>{check(level&&typeof level==='object','INVALID_LEVELS','关卡须为对象');return({id:id(level.id,'关卡ID'),themeId:id(level.themeId,'主题ID'),order:integer(level.order,'关卡顺序',1,1000000),name:string(level.name,'关卡名称'),difficultyLabel:string(level.difficultyLabel||'知识挑战','关卡难度描述'),enabled:boolean(level.enabled??true,'关卡启用'),points:integer(level.points,'通关奖励',0,1000000),questionCount:integer(level.questionCount,'每关题数',1,2000),deleted:Boolean(level.deleted)});});
  check(new Set(result.map(l=>l.id)).size===result.length,'DUPLICATE_ID','关卡ID重复');
  for(const level of result)check(config.themes.some(t=>t.id===level.themeId)||!level.enabled,'ORPHAN_LEVEL','移除主题前须停用其关卡');
  for(const themeId of new Set(result.map(l=>l.themeId))){const themeLevels=result.filter(l=>l.themeId===themeId&&!l.deleted).sort((a,b)=>a.order-b.order);check(new Set(themeLevels.map(l=>l.order)).size===themeLevels.length,'DUPLICATE_ORDER','同主题关卡顺序重复');let disabled=false;for(const level of themeLevels){if(!level.enabled||level.deleted)disabled=true;else check(!disabled,'LEVEL_DEPENDENCY','停用前关时须同步停用后续关卡');}}
  return result.sort((a,b)=>(config.themes.find(t=>t.id===a.themeId)?.order||1000000)-(config.themes.find(t=>t.id===b.themeId)?.order||1000000)||a.order-b.order);
}
function manifest(config,levels){const themes=config.themes.filter(t=>t.enabled&&!t.deleted);const active=levels.filter(l=>l.enabled&&!l.deleted&&themes.some(t=>t.id===l.themeId));return{version:config.version,activityId:config.activityId,themes:themes.map(t=>({...clone(t),levelIds:active.filter(l=>l.themeId===t.id).sort((a,b)=>a.order-b.order).map(l=>l.id)})),levels:clone(active),certificates:clone(config.certificates)};}
function ruleSnapshot(config,levels,level){const theme=config.themes.find(t=>t.id===level.themeId);const book=manifest(config,levels);const themeLevels=book.levels.filter(l=>l.themeId===level.themeId);const index=themeLevels.findIndex(l=>l.id===level.id);return{version:config.version,seconds:config.timer.seconds,points:level.points,total:level.questionCount,reviveLimit:config.revive.limit,dailyPointCap:config.points.dailyPointCap,capPolicy:config.points.capPolicy,failurePolicy:config.revive.failurePolicy,approval:clone(config.approval),levelName:level.name,themeName:theme.name,levelOrder:level.order,difficultyLabel:level.difficultyLabel,nextLevelId:themeLevels[index+1]?.id||null,certificateRequirements:book,share:clone(config.share),reviveShare:{text:config.revive.shareText,image:config.revive.shareImage}};}
function requirementHash(ids){return crypto.createHash('sha256').update([...ids].sort().join('\n')).digest('hex').slice(0,20);}
module.exports={defaultConfig,normalizeConfigShape,validateConfig,validateLevels,ruleSignature,manifest,ruleSnapshot,requirementHash};
