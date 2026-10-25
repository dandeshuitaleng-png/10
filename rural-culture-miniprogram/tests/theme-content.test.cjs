'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const content=require('../miniprogram/services-v4/theme-content');
const skins=require('../miniprogram/services-v4/skins');
test('chapter presentation stays theme-specific without replacing configured layout or business names',()=>{
 const base={key:'custom-chapter-layout',companion:'/client/art.png',name:'服务配置的章节名称'},before=structuredClone(base);
 for(const id of ['culture','red','industry','ecology']){
  const copies=Array.from({length:4},(_,i)=>content.chapter(id,base,i));
  assert.equal(new Set(copies.map(x=>x.eyebrow)).size,4);
  for(const item of copies){assert.equal(item.key,base.key);assert.equal(item.companion,base.companion);assert.equal(item.name,base.name);assert(item.line.length<=24);}
  assert.equal(content.chapter(id,base,4).line,copies[0].line);
 }
 assert.deepEqual(base,before);
});
test('generic share defaults become themed while authored campaign copy remains intact',()=>{
 for(const skin of Object.values(skins)){
  const defaults={share:{title:'乡村知识之旅',text:'一起探索乡村知识，挑战趣味关卡！'},reviveShare:{text:'一起挑战乡村知识，开启下一关！'}};
  assert(content.share(skin,defaults).title.includes(skin.name));assert.equal(content.share(skin,defaults,true).text,content.get(skin.gameId).shareText);
  const custom={share:{title:'客户活动标题',text:'客户活动介绍'},reviveShare:{text:'客户复活邀请'}};
  assert.deepEqual(content.share(skin,custom),{title:'客户活动标题',text:'客户活动介绍'});
  assert.equal(content.share(skin,custom,true).text,'客户复活邀请');
 }
});
test('map topic headings preserve authored server names and never mutate the canonical level',()=>{
 const level={id:'configured-id',name:'基础认知',questionCount:17,points:23},before=structuredClone(level);
 assert.equal(content.chapterLabel('ecology',level,0),'山水初识');
 assert.equal(content.chapterLabel('industry',level,1),'产地寻访');
 assert.equal(content.chapterLabel('red',{...level,name:'客户指定的史料专题'},0),'客户指定的史料专题');
 assert.deepEqual(level,before);
});
test('four themes share to their own home and earned certificates do not hijack other page links',()=>{
 for(const skin of Object.values(skins)){
  const data={certificate:{name:'已获得的学习证书'},configuration:{},route:'home',modal:''};
  for(const route of ['home','levels','profile','points','ranking','quiz','result']){
   data.route=route;const message=content.shareMessage(skin,data,'/cover.jpg');assert.equal(message.path,'/pages/game/index?theme='+skin.gameId+'&route=home');assert(!message.title.startsWith('我获得了'));assert.equal(message.imageUrl,'/cover.jpg');
  }
  data.route='certificate';assert.equal(content.shareMessage(skin,data).path,'/pages/game/index?theme='+skin.gameId+'&route=certificate');
  data.route='home';data.modal='certificate-share';assert(content.shareMessage(skin,data).title.startsWith('我获得了'));
  data.modal='share';assert.equal(content.shareMessage(skin,data).path,'/pages/game/index?theme='+skin.gameId+'&route=home');
 }
});
