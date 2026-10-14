// Design fixtures only; excluded from the WeChat package and formal question bank.
module.exports = {
  question: { themeName:'青山绿水',levelOrder:1,position:1,title: '下面哪种做法\n更有利于保护河流？', options: ['把游玩垃圾带走', '把剩饭倒进河里', '往河里扔塑料瓶', '在河边随意丢弃杂物'] },
  screens: [
    { id:'home',name:'01 主题首页',route:{name:'home',params:{}},view:{} },
    { id:'map',name:'02 青山绿水地图',route:{name:'map',params:{themeId:'ecology'}},view:{} },
    { id:'quiz',name:'03 四选一答题',route:{name:'quiz',params:{}},view:{selected:0} },
    { id:'revive',name:'04 分享复活弹窗',route:{name:'quiz',params:{}},view:{selected:1,modal:'revive'} },
    { id:'result',name:'05 通关结算',route:{name:'result',params:{}},view:{result:{themeName:'青山绿水',levelOrder:1,points:10,accuracyPercent:100,nextDifficulty:'进阶理解'}} },
  ],
};
