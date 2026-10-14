const test=require('node:test'),assert=require('node:assert/strict');
const {catalogThemes,catalogTheme,catalogLevels,catalogLevel,usesOriginalMap}=require('../js/data/catalog');
test('目录缺失才回退初始实例，空目录与全停用目录不恢复旧四主题',()=>{
  assert.equal(catalogThemes(null).length,4);assert.equal(catalogLevels(null,'red').length,4);assert.equal(usesOriginalMap(null,'red'),true);
  assert.deepEqual(catalogThemes({themes:[],levels:[]}),[]);assert.deepEqual(catalogThemes({themes:[{id:'new',name:'新主题',enabled:false}],levels:[]}),[]);
  assert.equal(catalogTheme({themes:[],levels:[]},'red'),null);
});
test('目录使用真实ID和排序，数量与初始画面分离且不修改输入',()=>{
  const c={themes:[{id:'new-theme',name:'新主题',order:9}],levels:[{id:'ending',themeId:'new-theme',order:8,name:'终点',questionCount:15,points:27},{id:'intro',themeId:'new-theme',order:2,name:'启程',questionCount:5,points:3}]};
  const before=JSON.stringify(c),levels=catalogLevels(c,'new-theme');
  assert.deepEqual(levels.map(l=>l.id),['intro','ending']);assert.equal(levels[1].label,'第2关');assert.equal(levels[1].difficulty,'终点');assert.equal(catalogLevel(c,'ending').questionCount,15);
  assert.equal(catalogThemes(c)[0].defaultart,null);assert.equal(usesOriginalMap(c,'new-theme'),false);assert.equal(JSON.stringify(c),before);
});
test('原主题第五关、重新排序及停用均不误用四地标坐标',()=>{
  const original={themes:catalogThemes(null),levels:catalogLevels(null,'red')};assert.equal(usesOriginalMap(original,'red'),true);
  assert.equal(usesOriginalMap({...original,levels:[...original.levels,{id:'red-5',themeId:'red',order:5}]},'red'),false);
  assert.equal(usesOriginalMap({...original,levels:original.levels.map(l=>({...l,order:5-l.order}))},'red'),false);
  assert.equal(usesOriginalMap({...original,levels:original.levels.map(l=>({...l,enabled:l.order!==4}))},'red'),false);
});
