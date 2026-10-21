'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createService}=require('../miniprogram/services-v4/index');
const catalog=structuredClone(require('../miniprogram/services-v4/catalog'));
// Formal catalog deliberately contains no answer bank. Review tests own explicit fixtures.
catalog.questions=catalog.levels.flatMap(l=>Array.from({length:l.questionCount||10},(_,i)=>({id:l.id+'-fixture-'+i,themeId:l.themeId,levelId:l.id,title:'选择测试正确项',options:['正确项','错误项'],answer:0,explanation:'隔离测试解析',enabled:true})));
const make=options=>createService(Object.assign({gameId:'culture',catalog,reviewEnabled:true,clock:()=>1792137600000,delay:async()=>{},storage:{getStorageSync(){return '';},setStorageSync(){}}},options));
test('界面读取体验身份，没有伪造平台账号',()=>{
 const service=make();assert.equal(service.profile().source,'preview');assert.equal(service.profile().badge,'体验用户');assert.equal(service.profile().nickname,'乡村阅读者');
 const copy=service.profile();copy.nickname='changed';assert.equal(service.profile().nickname,'乡村阅读者');
});
test('明确提供的平台资料通过服务层读取',()=>{
 const service=make({profile:{source:'platform',nickname:'湖湘读者',avatarUrl:'https://example.com/reader.png'}});
 assert.equal(service.profile().nickname,'湖湘读者');assert.equal(service.profile().badge,'平台用户');
});
test('四种题板来自目录顺序，不要求固定关卡ID',()=>{
 const service=make(),levels=service.snapshot().levels;
 assert.deepEqual(levels.map((level,index)=>service.chapterPresentation({...level,id:'dynamic-'+index},index).key),['bookmark','fieldnote','postcard','collection']);
 const revised=structuredClone(catalog);revised.levels[0].enabled=false;revised.levels[2].order=-1;service.updateCatalog(revised);
 const active=service.snapshot().levels;assert.equal(active.length,3);assert.equal(active[0].id,revised.levels[2].id);assert.equal(service.chapterPresentation(active[0],0).key,'bookmark');
});
test('配置可指定视觉变体，未知样式回退且不影响关卡规则',()=>{
 const service=make();assert.equal(service.chapterPresentation({uiStyle:'postcard'},0).key,'postcard');assert.equal(service.chapterPresentation({uiStyle:'unknown'},5).key,'fieldnote');
});
test('新增关卡视觉评审不写入玩家存档',async()=>{
 let writes=0;const service=make({storage:{getStorageSync(){return '';},setStorageSync(){writes++;}}});
 service.snapshot();const before=writes;await service.scenario('chapter-3');
 assert.equal(service.challenge().levelId,'culture-3');assert.equal(service.snapshot().progress.completed,2);assert.equal(writes,before);
 service.leaveReview();assert.equal(service.snapshot().progress.completed,0);
});
test('关卡节点展示只跟随当前启用目录',()=>{
 const service=make();const revised=structuredClone(catalog);revised.themes[0].enabled=false;service.updateCatalog(revised);
 assert.equal(service.snapshot().levels.length,0);assert.equal(service.snapshot().progress.total,0);assert.equal(service.snapshot().points,0);
});
