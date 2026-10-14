const config = require('../config');
const { themes } = require('./catalog');
const bank = require('./bank');
function day() { return new Date(Date.now()+8*3600000).toISOString().slice(0,10); }
function fresh() { return {version:1,user:{id:'demo-reader',name:'乡村文化学习者'},completed:{},points:0,sessions:{},daily:{date:day(),revivals:0,locked:false,points:0},lastChapter:null}; }
function read() { const state=wx.getStorageSync(config.storageKey)||fresh(); if(state.daily.date!==day())state.daily={date:day(),revivals:0,locked:false,points:0}; return state; }
function save(s) { wx.setStorageSync(config.storageKey,s); }
function find(id) { for (const t of themes) { const c=t.chapters.find(c=>c.id===id); if(c)return {theme:t,chapter:c}; } throw Error('找不到这个章节，请返回主题重新选择'); }
function status(s,c,t) { return s.completed[c.id]?'completed':c.order===1||s.completed[t.chapters[c.order-2].id]?'available':'locked'; }
function getThemes(s) { return themes.map(t=>({...t,completedCount:t.chapters.filter(c=>s.completed[c.id]).length,totalChapters:t.chapters.length,chapters:t.chapters.map(c=>({...c,status:status(s,c,t)}))})); }
function summary(s) { const all=themes.reduce((n,t)=>n+t.chapters.length,0);const count=Object.keys(s.completed).length;return {user:s.user,points:s.points,todayPoints:s.daily.points,completedCount:count,totalChapters:all,progress:Math.round(count/all*100),certificateCount:certificates(s).length,lastChapter:s.lastChapter,dailyLocked:s.daily.locked}; }
function certificates(s) { const list=[];for(const t of themes){if(t.chapters.every(c=>s.completed[c.id])){const date=s.completed[t.chapters[t.chapters.length-1].id].date;list.push({id:'cert-'+t.id,themeId:t.id,title:t.name+' · 主题学习证书',name:s.user.name,date,number:'HX-'+t.id.toUpperCase()+'-001',description:'已完成“'+t.name+'”全部章节的文化知识探索。',color:t.color});}}if(list.length===themes.length)list.push({id:'cert-all',themeId:'all',title:'乡村文化知识探索 · 总证书',name:s.user.name,date:list[list.length-1].date,number:'HX-ALL-001',description:'已完成四大文化主题的全部章节，读懂乡村故事，传承湖湘文化。',color:'#315C4C'});return list; }
function sessionOf(s,id) { const x=s.sessions[id];if(!x)throw Error('学习记录已失效，请返回章节重新开始');return x; }
function view(s,x) {
 const {theme,chapter}=find(x.chapterId); const q=bank[x.questionIds[x.index]];
 return {sessionId:x.id,theme:{id:theme.id,name:theme.name,color:theme.color},chapter,position:x.index+1,total:x.questionIds.length,deadline:x.deadline,serverNow:Date.now(),status:x.status,remainingRevivals:Math.max(0,config.rules.revivalLimit-s.daily.revivals),dailyLocked:s.daily.locked,question:q?{id:q.id,text:q.text,options:q.options,media:q.media}:null,feedback:x.feedback||null,revivalToken:x.revivalToken||null};
}
function finish(s,x) {
 const {theme,chapter}=find(x.chapterId);const earned=s.completed[chapter.id]?0:chapter.points;s.points+=earned;s.daily.points+=earned;
 s.completed[chapter.id]=s.completed[chapter.id]||{date:day(),points:earned};x.status='completed';
 const attempts=x.attempts.length; x.result={sessionId:x.id,chapterName:chapter.title,themeId:theme.id,themeName:theme.name,color:theme.color,accuracy:attempts?Math.round(x.correct/attempts*100):0,earned,totalPoints:s.points,nextChapterId:theme.chapters[chapter.order]?theme.chapters[chapter.order].id:null,themeComplete:theme.chapters.every(c=>s.completed[c.id]),certificateId:'cert-'+theme.id};
 return x.result;
}
const handlers={
 getHome(s) {return {summary:summary(s),themes:getThemes(s)};},
 getThemes(s) {return getThemes(s);},
 getTheme(s,p) {const t=getThemes(s).find(t=>t.id===p.themeId);if(!t)throw Error('专题暂不可用');return {...t,dailyLocked:s.daily.locked};},
 getProgress(s) {return {summary:summary(s),themes:getThemes(s)};},
 startSession(s,p) {
  const {theme,chapter}=find(p.chapterId);if(status(s,chapter,theme)==='locked')throw Error('请先完成前一章节');if(s.daily.locked)throw Error('今天的学习挑战已暂停，明天可以继续');
  const existing=Object.values(s.sessions).find(x=>x.chapterId===chapter.id&&['answering','reviewing','revival'].includes(x.status)&&x.date===day());if(existing)return view(s,existing);
  const id='study-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);const questionIds=Array.from({length:chapter.questionCount},(_,i)=>theme.id+'-q'+((chapter.order-1)*chapter.questionCount+i+1));if(questionIds.some(id=>!bank[id]))throw Error('题库配置不完整，请联系维护人员');
  const x={id,date:day(),chapterId:chapter.id,questionIds,index:0,correct:0,attempts:[],requests:{},status:'answering',deadline:Date.now()+config.rules.secondsPerQuestion*1000};s.sessions[id]=x;s.lastChapter={id:chapter.id,title:chapter.title,themeId:theme.id,themeName:theme.name};return view(s,x);
 },
 getSession(s,p) {return view(s,sessionOf(s,p.sessionId));},
 submitAnswer(s,p) {
  const x=sessionOf(s,p.sessionId);if(x.requests[p.requestId])return x.requests[p.requestId];if(x.date!==day())throw Error('本次学习已跨日，请返回章节重新开始');if(x.status!=='answering')throw Error('这道题已提交，请查看反馈后继续');
  const q=bank[x.questionIds[x.index]];if(q.id!==p.questionId)throw Error('题目已经更新，请刷新后再试');if(p.optionId!==null&&!q.options.some(o=>o.id===p.optionId))throw Error('请选择有效的答案');
  const timedOut=Date.now()>=x.deadline;const correct=!timedOut&&p.optionId===q.options[q.answerIndex].id;x.attempts.push({questionId:q.id,optionId:p.optionId,correct});if(correct)x.correct++;
  x.feedback={correct,timedOut,selectedOptionId:p.optionId,correctOptionId:q.options[q.answerIndex].id,explanation:q.explanation};
  if(correct)x.status='reviewing';else if(s.daily.revivals<config.rules.revivalLimit){x.status='revival';x.revivalToken='claim-'+Math.random().toString(36).slice(2);}else{x.status='locked';s.daily.locked=config.rules.lockAfterFailure;}
  const result=view(s,x);x.requests[p.requestId]=result;return result;
 },
 claimRevival(s,p) {
  const x=sessionOf(s,p.sessionId);if(x.lastClaim&&x.lastClaim===p.token)return view(s,x);if(x.date!==day()||s.daily.locked||x.status!=='revival'||p.token!==x.revivalToken)throw Error('当前无法继续，请返回主题查看状态');
  // 本地演示模拟服务发放资格；生产适配器必须依赖后端可验证的业务条件。
  s.daily.revivals++;x.lastClaim=p.token;x.status='answering';x.feedback=null;x.revivalToken=null;x.deadline=Date.now()+config.rules.secondsPerQuestion*1000;return view(s,x);
 },
 nextQuestion(s,p) {const x=sessionOf(s,p.sessionId);if(x.status==='completed')return {completed:true,result:x.result};if(x.status!=='reviewing')throw Error('请先完成当前题目');x.index++;x.feedback=null;if(x.index===x.questionIds.length)return {completed:true,result:finish(s,x)};x.status='answering';x.deadline=Date.now()+config.rules.secondsPerQuestion*1000;return {completed:false,session:view(s,x)};},
 getResult(s,p) {const x=sessionOf(s,p.sessionId);if(!x.result)throw Error('完成本章节后才可查看学习成果');return x.result;},
 getCertificates(s) {return {certificates:certificates(s),summary:summary(s)};},
 getLeaderboard(s,p) {
  const demo=[['书香溪畔',165,45],['湘村读书人',140,35],['田野的风',120,30],['云水之间',105,25],['林间书页',90,20],['稻香小筑',75,15]];
  const scope=p.scope==='daily'?'daily':'total';const own=scope==='daily'?s.daily.points:s.points;const rows=demo.map((r,i)=>({id:'demo-'+i,name:r[0],points:scope==='daily'?r[2]:r[1],isMe:false}));rows.push({id:s.user.id,name:s.user.name,points:own,isMe:true});rows.sort((a,b)=>b.points-a.points||a.id.localeCompare(b.id));rows.forEach((r,i)=>r.rank=i+1);return {scope,rows,me:rows.find(r=>r.isMe),date:day(),isDemo:true};
 }
};
module.exports={async invoke(method,p={}){if(!handlers[method])throw Error('服务暂不可用');const s=read();const result=handlers[method](s,p);save(s);await new Promise(resolve=>setTimeout(resolve,config.mockLatency));return JSON.parse(JSON.stringify(result));}};
