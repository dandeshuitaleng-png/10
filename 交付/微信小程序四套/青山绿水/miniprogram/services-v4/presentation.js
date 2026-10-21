'use strict';
// 视觉变体跟随当前启用目录顺序；只负责展示，不参与判题、关卡或积分规则。
const styles=[
  {key:'bookmark',eyebrow:'乡土见闻',line:'跟着智小谷，发现家乡的故事',companion:'reader'},
  {key:'fieldnote',eyebrow:'乡野寻访',line:'把观察到的知识，记在心里',companion:'nature'},
  {key:'postcard',eyebrow:'文化拾趣',line:'从一个问题，看见更多家乡细节',companion:'reader'},
  {key:'collection',eyebrow:'知识收集',line:'带着一路的收获，继续探索',companion:'nature'}
];
const fallbackProfile={nickname:'乡村阅读者',avatarUrl:'/assets/brand/reader.png',badge:'体验用户',source:'preview'};
function identity(value){
  if(!value||value.source!=='platform')return Object.assign({},fallbackProfile);
  return {nickname:String(value.nickname||'阅读者').slice(0,24),avatarUrl:value.avatarUrl||fallbackProfile.avatarUrl,badge:'平台用户',source:'platform'};
}
function chapter(level,index){
  const configured=level&&level.uiStyle;
  const chosen=styles.find(item=>item.key===configured)||styles[Math.max(0,index)%styles.length];
  return Object.assign({},chosen,{companion:'/assets/brand/'+chosen.companion+'.png'});
}
module.exports={chapter,identity};
