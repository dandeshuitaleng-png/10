/* 本地模拟服务；正式接入时由服务端持有答案、时钟、复活资格和积分账本。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QuizEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const failure = code => {const error=new Error(code);error.code=code;return error;};
  const day = time => new Date(time + 8 * 3600000).toISOString().slice(0, 10);
  const nextMidnight = time => Date.parse(day(time) + 'T00:00:00+08:00') + 86400000;
  function createGameService({ gameId, catalog, clock = Date.now, delay = ms => new Promise(r => setTimeout(r, ms)), initial = {}, random = Math.random }) {
    if (!catalog.themes.some(t => t.id === gameId)) throw failure('INVALID_GAME');
    const baseTheme=clone(catalog.themes.find(t=>t.id===gameId));
    let source = clone(catalog), generation = 0, sequence = 0;
    const own = records => clone(records || []).filter(r => r.gameId === gameId);
    let completed = own(initial.completed), ledger = own(initial.ledger), locks = own(initial.locks), issued = own(initial.certificates).filter(c=>c.scope==='game'||c.scope===gameId).map(c=>({...c,scope:'game'}));
    let challenges = new Map(), activeId = null, pausedAt = null;
    const theme = () => source.themes.find(t => t.id === gameId)||{...baseTheme,enabled:false};
    const levels = () => theme().enabled === false ? [] : source.levels.filter(l => l.themeId === gameId && l.enabled !== false && !l.deleted).sort((a,b) => a.order - b.order);
    const now = () => pausedAt === null ? clock() : pausedAt;
    const scopedLevel = id => { const l = levels().find(l => l.id === id); if (!l) throw failure('INVALID_GAME_LEVEL'); return l; };
    const completedIds = () => new Set(completed.map(c => c.levelId));
    const totalPoints = () => ledger.reduce((s,l) => s + l.points, 0);
    function certify(){const list=levels(),ids=completedIds();if(list.length&&list.every(l=>ids.has(l.id))&&!issued.length)issued.push({gameId,id:'DEMO-'+gameId.toUpperCase(),name:theme().certificateName,completedAt:Math.max(...completed.filter(c=>list.some(l=>l.id===c.levelId)).map(c=>c.at)),userName:'乡村阅读者',scope:'game',levelIds:list.map(l=>l.id)});}
    function levelState(l) {
      if (locks.some(x => x.levelId === l.id && x.until > now())) return 'today-locked';
      if (completedIds().has(l.id)) return 'completed';
      const list = levels(), index=list.findIndex(x=>x.id===l.id);
      return index===0||completedIds().has(list[index-1]?.id)?'current':'locked';
    }
    function snapshot() {
      const list = levels(), ids = completedIds(), done = list.filter(l => ids.has(l.id)).length;certify();
      return { gameId, theme: clone(theme()), levels: list.map(l => ({...clone(l), status: levelState(l), resumable: challenges.has(l.id) && ['playing','revive','correct'].includes(challenges.get(l.id).status)})),
        progress: { completed: done, total: list.length, ratio: list.length ? done/list.length : 0 },
        points: totalPoints(), ledger: clone(ledger), activeLevelId: activeId,
        certificates: clone(issued) };
    }
    function active() { const c = challenges.get(activeId); if (!c) throw failure('NO_CHALLENGE'); return c; }
    function fail(c, reason) {
      if (c.status !== 'playing') return;
      c.frozenRemaining=Math.max(0,Math.min(source.timerSeconds,Math.ceil((c.deadline-now())/1000)));
      const index = c.index;
      if (c.first[index] === undefined) c.first[index] = false;
      c.feedback = { type: 'incorrect', reason, answer: null, explanation: null };
      if (c.used < source.reviveLimit) c.status = 'revive';
      else { c.status = 'locked'; const until = nextMidnight(now()); locks = locks.filter(l => l.levelId !== c.levelId); locks.push({gameId, levelId: c.levelId, until}); }
    }
    function expire() { challenges.forEach(c => { if (c.status === 'playing' && now() >= c.deadline) fail(c, 'timeout'); }); }
    function publicChallenge(c) {
      const q = c.questions[c.index];
      return { gameId, id:c.id, levelId:c.levelId, level:clone(scopedLevel(c.levelId)), index:c.index, total:c.questions.length, status:c.status,
        selected:c.selected, busy:c.busy, remaining:c.status==='playing'?Math.max(0, Math.min(source.timerSeconds, Math.ceil((c.deadline-now())/1000))):(c.frozenRemaining||0),
        reviveRemaining:Math.max(0, source.reviveLimit-c.used), feedback:clone(c.feedback), result:clone(c.result),
        question:{id:q.id, title:q.title, options:clone(q.options), media:q.media ? clone(q.media) : null} };
    }
    function challenge() { expire(); return publicChallenge(active()); }
    function start(levelId) {
      expire(); const l = scopedLevel(levelId), state = levelState(l);
      if (state === 'today-locked') throw failure('TODAY_LOCKED');
      if (state === 'locked') throw failure('LEVEL_LOCKED');
      activeId = levelId;
      const existing = challenges.get(levelId);
      if (existing && ['playing','revive','correct'].includes(existing.status)) return publicChallenge(existing);
      const pool = source.questions.filter(q => q.themeId === gameId && q.levelId === levelId);
      for (let i=pool.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      const questions = pool.slice(0, l.questionCount);
      if (!questions.length) throw failure('NO_QUESTIONS');
      if (questions.length !== l.questionCount || questions.some(q => q.options.length < 2 || q.answer < 0 || q.answer >= q.options.length)) throw failure('INVALID_QUESTIONS');
      const c = {gameId, id:gameId + '-' + (++sequence), levelId, questions, index:0, status:'playing', selected:null, busy:false,
        deadline:now()+source.timerSeconds*1000, first:[], used:0, feedback:null, result:null};
      challenges.set(levelId,c); return publicChallenge(c);
    }
    function select(index) {
      expire(); const c = active();
      if (c.status !== 'playing' || c.busy) return challenge();
      if (!Number.isInteger(index) || index < 0 || index >= c.questions[c.index].options.length) throw failure('INVALID_OPTION');
      c.selected = index; return challenge();
    }
    async function submit() {
      expire(); const c = active();
      if (c.status !== 'playing' || c.busy || c.selected === null) return challenge();
      c.busy = true; const version = generation, target = c.id, index = c.index;
      await delay(280);
      if (generation !== version || !challenges.has(c.levelId) || challenges.get(c.levelId).id !== target) return null;
      c.busy = false;
      if (c.status !== 'playing' || c.index !== index) return publicChallenge(c);
      if (now() >= c.deadline) { fail(c,'timeout'); return publicChallenge(c); }
      const q = c.questions[c.index];
      if (c.selected !== q.answer) { fail(c,'answer'); return publicChallenge(c); }
      if (c.first[c.index] === undefined) c.first[c.index] = true;
      c.frozenRemaining=Math.max(0,Math.min(source.timerSeconds,Math.ceil((c.deadline-now())/1000)));c.status = 'correct'; c.feedback = {type:'correct', answer:q.answer, explanation:q.explanation, sourceTitle:q.sourceTitle || '演示样题', sourceUrl:q.sourceUrl || ''};
      if (c.index === c.questions.length-1) {
        const l = scopedLevel(c.levelId), firstCompletion = !completedIds().has(l.id), at = now();
        const accuracy = Math.round(c.first.filter(Boolean).length/c.questions.length*100);
        if (firstCompletion) { completed.push({gameId,levelId:l.id,at,accuracy,correct:c.first.filter(Boolean).length,total:c.questions.length}); ledger.push({gameId,levelId:l.id,at,points:l.points}); }
        c.result = {gameId,levelId:l.id,accuracy,correct:c.first.filter(Boolean).length,total:c.questions.length,points:firstCompletion?l.points:0,cumulative:totalPoints(),firstCompletion};certify();
      }
      return publicChallenge(c);
    }
    function next() {
      const c = active(); if (c.status !== 'correct') throw failure('ANSWER_REQUIRED');
      if (c.result) { c.status = 'result'; return challenge(); }
      c.index++; c.selected = null; c.feedback = null; c.status = 'playing'; c.deadline = now()+source.timerSeconds*1000; return challenge();
    }
    function revive(verified) {
      const c = active(); if (c.status !== 'revive') throw failure('NO_REVIVE');
      if (verified !== true) return challenge();
      if (c.used >= source.reviveLimit) throw failure('REVIVE_EXHAUSTED');
      c.used++; c.status = 'playing'; c.selected = null; c.feedback = null; c.deadline = now()+source.timerSeconds*1000; return challenge();
    }
    function rankings(period = 'total', empty = false) {
      if (!['daily','total'].includes(period)) throw failure('INVALID_PERIOD');
      const list = levels(), count = list.length;
      if (!count || empty) return {gameId, period, rows:[], me:null};
      const records = completed.filter(c => list.some(l => l.id === c.levelId) && (period === 'total' || day(c.at) === day(now())));
      const points = ledger.filter(c => period === 'total' || day(c.at) === day(now())).reduce((s,l) => s+l.points,0);
      const fixtureNames = ['书香伴行','山间一页','稻田读书人','清风来信','湘里乡亲'];
      let rows = fixtureNames.map((name,i) => ({gameId,id:gameId+'-fixture-'+i,name,completed:Math.min(count,Math.max(1,count-Math.floor(i/2))),accuracy:100-i*5,at:now()-(i+1)*60000,points:list.slice(0,Math.min(count,Math.max(1,count-Math.floor(i/2)))).reduce((s,l)=>s+l.points,0),sample:true}));
      const answered=records.reduce((s,c)=>s+(c.total||list.find(l=>l.id===c.levelId)?.questionCount||1),0), correct=records.reduce((s,c)=>s+(c.correct??c.accuracy/100*(c.total||list.find(l=>l.id===c.levelId)?.questionCount||1)),0);
      const me = {gameId,id:'me',name:'乡村阅读者',completed:records.length,accuracy:answered?Math.round(correct/answered*100):0,at:records.length?Math.min(...records.map(c=>c.at)):Infinity,points,me:true};
      const accuracyOf=row=>row.me?(answered?correct/answered:0):row.accuracy/100;
      if(records.length)rows.push(me); rows.sort((a,b)=>b.completed-a.completed || accuracyOf(b)-accuracyOf(a) || a.at-b.at);
      rows = rows.map((r,i)=>({...r,rank:i+1})); return {gameId,period,rows,me:rows.find(r=>r.me)||{...me,rank:null}};
    }
    function reset() { generation++; completed=[];ledger=[];locks=[];issued=[];challenges=new Map();activeId=null;source=clone(catalog);pausedAt=null; }
    function seedCompleted(ids) { ids.forEach(id=>{const l=scopedLevel(id);if(!completedIds().has(id)){const at=now()-60000;completed.push({gameId,levelId:id,at,accuracy:100,correct:l.questionCount,total:l.questionCount});ledger.push({gameId,levelId:id,at,points:l.points});}});certify(); }
    function pause(value) {
      if (value && pausedAt === null) pausedAt=clock();
      else if (!value && pausedAt !== null) {const delta=clock()-pausedAt;challenges.forEach(c=>c.deadline+=delta);pausedAt=null;}
    }
    // 评审场景仅供本地原型，不存在生产接口或跨游戏聚合能力。
    async function scenario(name) {
      reset(); const list=levels(), first=list[0]; if (!first) return snapshot();
      if (['home','failure','ranking-empty','ranking-failure','save-failure'].includes(name)) return snapshot();
      if (name==='empty') {source.levels.forEach(l=>{if(l.themeId===gameId)l.enabled=false;});return snapshot();}
      if (name==='journey') {seedCompleted(list.slice(0,Math.min(2,list.length-1)).map(level=>level.id));return snapshot();}
      const chapterMatch=/^chapter-([2-4])$/.exec(name);
      if(chapterMatch){const index=Math.min(Number(chapterMatch[1])-1,list.length-1);seedCompleted(list.slice(0,index).map(l=>l.id));start(list[index].id);pause(true);return challenge();}
      if (name==='disabled') {seedCompleted([first.id]);source.levels.find(l=>l.id===first.id).enabled=false;return snapshot();}
      if (['certificate','all-complete'].includes(name)) {seedCompleted(list.map(l=>l.id));return snapshot();}
      if (['result','complete'].includes(name)) {
        const target=name==='complete'?list.at(-1):first;
        if(name==='complete')seedCompleted(list.slice(0,-1).map(l=>l.id));
        start(target.id);
        const c=active(); c.first=Array(c.questions.length).fill(true); c.index=c.questions.length-1; select(c.questions[c.index].answer); const checked=await submit(); if(!checked)return snapshot(); next(); pause(true); return challenge();
      }
      start(first.id); const c=active(), q=c.questions[0];
      if (name==='selected') select(0);
      if (['revive','locked'].includes(name)) {fail(c,'answer');if(name==='locked'){revive(true);fail(c,'answer');}}
      if (['long','image','video','long-explanation'].includes(name)) {
        q.title='阅读湖南乡村文化的相关材料后，下列哪种做法更有助于保护地方文化，并让更多人了解家乡的故事？';
        q.options=['记录乡村故事，尊重原有文化，并以合适的方式分享','只关注建筑外观，忽略当地的生活与历史','将所有地方文化统一改造成同一种形式','只在节日开展活动，平时不需要记录和保护'];
        q.answer=0;q.explanation='记录乡村故事，尊重原有文化，并注意资料的时间、地点和出处，有助于保护地方文化。这是一道布局演示样题，待业务审核。';q.sourceTitle='自拟布局演示情境';q.sourceUrl='';
        if(['image','video'].includes(name))q.media={type:name,src:'assets/scene.png',alt:'当前游戏专题插画，演示媒体区域'};
      }
      if(name==='long-explanation')q.explanation='以下为长解析排版演示，样题内容仍待业务审核。记录乡村故事应尊重原有文化，并留意材料的时间、地点、人物和出处。'+ '阅读材料时，留意其中的时间、地点和出处；遇到不熟悉的词语，可回到原文继续查阅。将知识与家乡的生活联系起来，也能帮助我们理解地方文化的延续与变化。'.repeat(5);
      if(['correct','long-explanation'].includes(name)) { select(q.answer); if(!await submit())return snapshot(); }
      pause(true); return challenge();
    }
    // Checkpoints contain identifiers and attempt state only. Answers remain in this local
    // mock service's catalog and must move to the server before production deployment.
    function fingerprint(value) {
      const input=JSON.stringify(value);let hash=2166136261;
      for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619);}
      return (hash>>>0).toString(16);
    }
    let restoreWarning=null;
    function restoreChallenges(saved) {
      if (!saved || !Array.isArray(saved.challenges)) return;
      if (saved.schemaVersion!==1 || saved.gameId!==gameId) {restoreWarning='INVALID_CHECKPOINT';return;}
      if (saved.catalogFingerprint!==fingerprint(source)) {restoreWarning='CATALOG_CHANGED';return;}
      sequence=Number.isInteger(saved.sequence)&&saved.sequence>=0?saved.sequence:0;
      for (const entry of saved.challenges) {
        const l=entry&&levels().find(item=>item.id===entry.levelId);
        if (!entry || typeof entry.id!=='string' || !l || entry.gameId!==gameId || !Array.isArray(entry.questionIds) || entry.questionIds.length!==l.questionCount || new Set(entry.questionIds).size!==entry.questionIds.length) {restoreWarning='INVALID_CHECKPOINT';continue;}
        const questions=entry.questionIds.map(id=>source.questions.find(q=>q.id===id&&q.themeId===gameId&&q.levelId===l.id));
        if (questions.some(q=>!q) || !Number.isInteger(entry.index) || entry.index<0 || entry.index>=questions.length || !Number.isFinite(entry.deadline) || !['playing','correct','revive','locked','result'].includes(entry.status)) {restoreWarning='INVALID_CHECKPOINT';continue;}
        if (!Array.isArray(entry.first) || entry.first.some(value=>value!==null&&typeof value!=='boolean') || !Number.isInteger(entry.used) || entry.used<0 || entry.used>source.reviveLimit) {restoreWarning='INVALID_CHECKPOINT';continue;}
        const q=questions[entry.index];
        const feedback=entry.status==='correct'||entry.status==='result'?{type:'correct',answer:q.answer,explanation:q.explanation,sourceTitle:q.sourceTitle||'演示样题',sourceUrl:q.sourceUrl||''}:entry.status==='revive'||entry.status==='locked'?{type:'incorrect',reason:entry.feedback&&entry.feedback.reason==='timeout'?'timeout':'answer',answer:null,explanation:null}:null;
        const first=entry.first.map(value=>value===null?undefined:value);
        const selected=Number.isInteger(entry.selected)&&entry.selected>=0&&entry.selected<q.options.length?entry.selected:null;
        challenges.set(l.id,{gameId,id:String(entry.id),levelId:l.id,questions,index:entry.index,status:entry.status,selected,busy:false,deadline:entry.deadline,first,used:entry.used,feedback,result:entry.result&&entry.result.gameId===gameId?clone(entry.result):null,frozenRemaining:Number.isFinite(entry.frozenRemaining)?entry.frozenRemaining:0});
      }
      if (challenges.has(saved.activeLevelId)) activeId=saved.activeLevelId;
      expire();
    }
    restoreChallenges(initial);
    function exportState() {
      expire();
      return {schemaVersion:1,gameId,catalogFingerprint:fingerprint(source),sequence,
        completed:clone(completed),ledger:clone(ledger),locks:clone(locks),certificates:clone(issued),activeLevelId:activeId,
        challenges:Array.from(challenges.values()).map(c=>({gameId,id:c.id,levelId:c.levelId,questionIds:c.questions.map(q=>q.id),index:c.index,status:c.status,selected:c.selected,deadline:c.deadline,first:c.first.map(value=>value===undefined?null:value),used:c.used,frozenRemaining:c.frozenRemaining||0,feedback:c.feedback?{type:c.feedback.type,reason:c.feedback.reason||null}:null,result:clone(c.result)}))};
    }
    return {gameId,snapshot,start,challenge,select,submit,next,revive,rankings,expire,pause,reset,scenario,exportState,
      restoration(){return {warning:restoreWarning};},
      configuration(){return {gameId,timerSeconds:source.timerSeconds,reviveLimit:source.reviveLimit,levels:clone(levels()),questionCount:source.questions.filter(q=>q.themeId===gameId).length};},
      updateCatalog(nextCatalog){source=clone(nextCatalog);generation++;challenges=new Map();activeId=null;},
      debugRecords(){return {gameId,completed:clone(completed),ledger:clone(ledger),locks:clone(locks)};}};
  }
  return {createGameService,day,nextMidnight};
});
