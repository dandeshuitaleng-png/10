const test=require('node:test'),assert=require('node:assert/strict');
const {selectApprovedPools}=require('../scripts/lib/question-pools.cjs');
const {inspectPool}=require('../js/data/content');
const {Challenge}=require('../js/core/challenge');
const {THEMES,getLevels}=require('../js/data/themes');
const bank=require('../design/content-intake/current/bank.json');
test('240题各关15题，服务端无审核门槛，玩家包不内置标准答案',()=>{
 assert.equal(bank.questions.length,240);const pools=selectApprovedPools(bank);assert.equal(Object.keys(pools).length,16);
 for(const t of THEMES)for(const l of getLevels(t.id)){assert.equal(pools[l.id].length,15);assert.equal(inspectPool(l.id).ready,false);}
});
test('显式停用与题池容量仍生效：9题不可开放，10题可抽10题且不跨关',()=>{
 const rows=bank.questions.filter(q=>q.levelId==='red-1');
 assert.deepEqual(selectApprovedPools({questions:rows.map((q,i)=>({...q,enabled:i<9}))}),{});
 const pools=selectApprovedPools({questions:rows.map((q,i)=>({...q,enabled:i<10}))});assert.equal(pools['red-1'].length,10);
 const c=new Challenge({questions:pools['red-1'],level:getLevels('red')[0]});assert.equal(c.questions.length,10);assert.equal(new Set(c.questions.map(q=>q.id)).size,10);assert.ok(c.questions.every(q=>q.levelId==='red-1'));
});
test('重复编号、非法答案及主题关卡错配仍拒绝导入，旧审核列不再是条件',()=>{
 const q=bank.questions[0];for(const questions of [[q,q],[{...q,answer:9}],[{...q,themeId:'ecology'}]])assert.throws(()=>selectApprovedPools({questions}));
 const rows=bank.questions.filter(q=>q.levelId==='red-1').map(q=>({...q,reviewStatus:'待审核',reviewNote:''}));assert.equal(selectApprovedPools({questions:rows})['red-1'].length,15);
});
test('四主题16关真实题库无放回抽题，并保持示例题库隔离',()=>{
  for(const t of THEMES)for(const l of getLevels(t.id)){
    const questions=bank.questions.filter(q=>q.levelId===l.id);
    for(let n=0;n<30;n++){
      const c=new Challenge({questions,level:{...l,themeName:t.name}});
      assert.equal(new Set(c.questions.map(q=>q.id)).size,10);
      assert.ok(c.questions.every(q=>q.levelId===l.id));
      assert.equal(c.question.answer,undefined);assert.equal(c.result.practice,true);assert.equal(c.result.points,null);
    }
  }
});
