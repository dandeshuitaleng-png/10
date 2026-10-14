const test=require('node:test');const assert=require('node:assert/strict');
const {Challenge}=require('../js/core/challenge');const {PRACTICE_QUESTIONS}=require('../js/data/practice');const {getLevels}=require('../js/data/themes');
const options={questions:PRACTICE_QUESTIONS,level:{...getLevels('ecology')[0],themeName:'青山绿水'},random:()=>0.5};
function answer(c,right=true){const q=c.questions[c.position];c.select(right?q.answer:(q.answer+1)%4);return c.submit(q.id);}
test('随机抽10题且不重复、不改变题源、非法题库拒绝开局',()=>{
const before=JSON.stringify(PRACTICE_QUESTIONS),c=new Challenge(options);assert.equal(c.questions.length,10);assert.equal(new Set(c.questions.map(q=>q.id)).size,10);assert.notDeepEqual(c.questions.map(q=>q.id),PRACTICE_QUESTIONS.slice(0,10).map(q=>q.id));assert.equal(JSON.stringify(PRACTICE_QUESTIONS),before);
assert.throws(()=>new Challenge({...options,questions:PRACTICE_QUESTIONS.slice(0,9)}),/INSUFFICIENT/);assert.throws(()=>new Challenge({...options,questions:[...PRACTICE_QUESTIONS,PRACTICE_QUESTIONS[0]]}),/INVALID/);
});
test('十题全对才完成，重复提交和旧题事件不增加成绩',()=>{
const c=new Challenge(options);assert.equal(c.submit(c.question.id),false);const first=c.question.id;answer(c);c.select(c.questions[c.position].answer);assert.equal(c.submit(first),false);assert.equal(c.correct,1);
for(let i=1;i<10;i++){answer(c);assert.equal(c.state,i===9?'complete':'answering');}
assert.equal(c.correct,10);assert.equal(c.attempts,10);assert.equal(answer(c),false);assert.equal(c.result.points,null);assert.equal(c.result.accuracyPercent,null);
});
test('答错停在原题，验证失败/取消/异常不消耗复活、不前进',async()=>{
const c=new Challenge({...options,verifyShare:async e=>e});answer(c);const original=c.question;answer(c,false);assert.equal(c.state,'revive');assert.equal(c.correct,1);assert.deepEqual(c.question,original);
assert.equal(await c.revive(null),false);assert.equal(await c.revive({verified:false}),false);assert.equal(c.revived,false);c.verifyShare=async()=>{throw new Error('cancelled')};await assert.rejects(c.revive({}),/cancelled/);assert.equal(c.pending,false);assert.equal(c.state,'revive');
});
test('只复活一次、保留当前题和已答对题，再错只锁本挑战',async()=>{
let resolve;const c=new Challenge({...options,verifyShare:()=>new Promise(r=>resolve=r)}),other=new Challenge(options);answer(c);answer(c,false);const id=c.question.id;const pending=c.revive('evidence');assert.equal(await c.revive('duplicate'),false);resolve({verified:true});assert.equal(await pending,true);assert.equal(c.question.id,id);assert.equal(c.correct,1);assert.equal(c.selected,null);answer(c,false);assert.equal(c.state,'locked');assert.equal(await c.revive('again'),false);assert.equal(other.state,'answering');
});
test('未配置验证器不授予复活，离开页面后迟到验证不改变状态',async()=>{
const unavailable=new Challenge(options);answer(unavailable,false);await assert.rejects(unavailable.revive('callback'),/UNAVAILABLE/);assert.equal(unavailable.revived,false);
let resolve;const c=new Challenge({...options,verifyShare:()=>new Promise(r=>resolve=r)});answer(c,false);const pending=c.revive({});c.close();resolve({verified:true});assert.equal(await pending,false);assert.equal(c.select(0),false);
});
test('中文题干换行不把结束标点单独留在下一行',()=>{
const D=require('../js/ui/draw'),rows=[];const ctx={measureText:s=>({width:s.length*10}),fillText:s=>rows.push(s)};D.wrap(ctx,'为什么不应随意放生外来动物？',0,0,140);assert.ok(rows.every(r=>! /^[，。！？]/.test(r)));assert.ok(rows.every(r=>r.length*10<=140));
});
