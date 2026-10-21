'use strict';
// Presentation copy follows the existing theme and chapter order. Names, question
// pools, correct answers, timing, points and certificate requirements stay in services.
const themes={
 red:{
  chapters:[['红色初识','从人物与旧址，认识红色故事'],['故事寻根','读懂故事背后的选择与精神'],['史料细读','辨别史实、改编与资料出处'],['薪火相传','把阅读收获整理成清晰讲述']],
  welcome:'从红色故事出发，读懂家乡的记忆',
  correct:'答对了，又读懂一段红色记忆',result:'从人物、旧址与史料中，读懂红色记忆。',replay:'再读一遍故事，记住更多人物与细节。',
  profile:'把读过的红色故事，留在学习足迹里',signature:'寻访红色记忆，读懂家乡故事',
  pointsEmpty:'从一个红色故事开始，完成关卡积累学习积分。',certificate:'记录你在「十步芳草」的红色故事学习收获。',
  shareTitle:'一起读懂红色故事',shareText:'和智小谷走近人物与旧址，一起寻访家乡的红色记忆。'
 },
 culture:{
  chapters:[['文脉初识','从书院与古建，认识湖湘文化'],['乡土寻踪','读懂文字、技艺与生活的联系'],['文化细读','分清史料、传说与文学表达'],['传承有方','用阅读与观察，记录地方文化']],
  welcome:'走进湖湘文脉，发现文化里的生活',
  correct:'答对了，又读懂一点湖湘文脉',result:'从书院、古建与技艺中，认识湖湘文脉。',replay:'重读文化线索，发现上次遗漏的细节。',
  profile:'把书院、古建与技艺，记进学习足迹',signature:'读湖湘往事，寻乡土文脉',
  pointsEmpty:'从一段湖湘往事开始，完成关卡积累学习积分。',certificate:'记录你在「千年文脉」的湖湘文化学习收获。',
  shareTitle:'一起探寻湖湘文脉',shareText:'从书院古建到非遗技艺，和智小谷一起探寻湖湘文脉。'
 },
 industry:{
  chapters:[['物产初识','从一方水土，认识特色物产'],['产地寻访','读懂产地、工艺与产业的联系'],['产业观察','留意品质、标签与生产流程'],['丰收答卷','把物产知识，连成产业图景']],
  welcome:'从特色物产出发，发现家乡的丰饶',
  correct:'答对了，又认识一份家乡物产',result:'从特色物产与生产工艺中，认识乡村产业。',replay:'再看产地与工艺，积累新的观察。',
  profile:'把认识的物产与工艺，记进学习足迹',signature:'识一方物产，读家乡丰饶',
  pointsEmpty:'从一份家乡物产开始，完成关卡积累学习积分。',certificate:'记录你在「金色产业」的乡村产业学习收获。',
  shareTitle:'一起发现家乡丰饶',shareText:'认识特色物产与产地，和智小谷一起发现家乡的丰饶。'
 },
 ecology:{
  chapters:[['山水初识','从山川与生物，认识家乡自然'],['自然观察','读懂水、森林与生境的联系'],['生态守护','用观察与证据，判断保护方式'],['绿色同行','把生态知识，带进日常生活']],
  welcome:'沿着山水步道，一起认识家乡自然',
  correct:'答对了，又认识一点身边自然',result:'从山川、水系与生境中，认识家乡自然。',replay:'再观察一次山水，发现更多自然细节。',
  profile:'把山水间的新发现，留在学习足迹里',signature:'认识青山绿水，珍惜身边自然',
  pointsEmpty:'从一次自然观察开始，完成关卡积累学习积分。',certificate:'记录你在「青山绿水」的自然生态学习收获。',
  shareTitle:'一起探索家乡自然',shareText:'沿着山水步道，和智小谷一起认识家乡的自然与生态。'
 }
};
const genericTitles=new Set(['乡村知识之旅','趣味闯关','一起认识家乡的故事']);
const genericText=new Set(['一起认识家乡的故事','一起探索乡村知识，挑战趣味关卡！','一起挑战乡村知识，开启下一关！']);
function get(id){return themes[id]||themes.culture;}
function chapter(id,base,index){const items=get(id).chapters,copy=items[Math.max(0,index)%items.length];return Object.assign({},base,{eyebrow:copy[0],line:copy[1]});}
function share(skin,configuration={},revive=false){const copy=get(skin.gameId),configured=configuration.share||{},revival=configuration.reviveShare||{},text=revive?revival.text||configured.text:configured.text;return {title:configured.title&&!genericTitles.has(configured.title)?configured.title:skin.name+' · '+copy.shareTitle,text:text&&!genericText.has(text)?text:copy.shareText};}
function shareMessage(skin,data,imageUrl){const certificate=data.certificate,sharingCertificate=!!certificate&&(data.route==='certificate'||data.modal==='certificate-share'),copy=share(skin,data.configuration,data.modal==='share');return {title:sharingCertificate?'我获得了「'+certificate.name+'」 · '+copy.title:copy.title,path:'/pages/game/index?theme='+encodeURIComponent(skin.gameId)+'&route='+(sharingCertificate?'certificate':'home'),imageUrl};}
module.exports={get,chapter,share,shareMessage};
