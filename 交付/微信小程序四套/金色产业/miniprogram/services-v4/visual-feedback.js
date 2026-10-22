'use strict';
// Presentation only. Rules, catalog, progress and identities stay with the service.
const palettes={
 culture:{ink:'#59371E',accent:'#9E561D',light:'#FFF6E7',theme:'明亮木棕',top:'#A85F2A',bottom:'#8D451B',buttonText:'#FFFFFF',buttonEdge:'#C98245',muted:'#795633',edge:'#F0DEC6',panelEdge:'#D49958',paper:'#FFFFFF',fill:'#EDB576',shadow:'#A3632630',panelTop:'#FFE8C6',panelBottom:'#FFF9ED',frameWidth:2,buttonAngle:'180deg'},
 red:{ink:'#57251F',accent:'#CF3E16',light:'#FFF3F0',theme:'明亮朱红',top:'#FF7201',bottom:'#F03D17',buttonText:'#FFFFFF',buttonEdge:'#F88B52',muted:'#885143',edge:'#F7DDD4',panelEdge:'#FFC0AB',paper:'#FFFFFF',fill:'#FF9B76',shadow:'#EF4F242B',panelTop:'#FFF5DA',panelBottom:'#FFF2F3',frameWidth:1,buttonAngle:'180deg'},
 industry:{ink:'#674310',accent:'#98640D',light:'#FFFBE5',theme:'清亮谷金',top:'#FFDE1C',bottom:'#FFE84D',buttonText:'#674310',buttonEdge:'#F3CB26',muted:'#82652C',edge:'#F0E8BD',panelEdge:'#FEC620',paper:'#FFFFFF',fill:'#FFE86A',shadow:'#D6A91A2B',panelTop:'#FFF0A6',panelBottom:'#F9F8E7',frameWidth:4,buttonAngle:'100deg'},
 ecology:{ink:'#254C16',accent:'#34841C',light:'#F1FFF1',theme:'清亮草绿',top:'#E4FFC2',bottom:'#B6FFD9',buttonText:'#254C16',buttonEdge:'#B1E6A0',muted:'#58764B',edge:'#D9EED3',panelEdge:'#52D228',paper:'#FFFFFF',fill:'#C5F59D',shadow:'#59B62B25',panelTop:'#E0FFB8',panelBottom:'#F1FFF0',frameWidth:4,buttonAngle:'100deg'}
};
const base='/assets/brand/original-poses/';
const poses=['welcome','celebrate','observe','think'];
const seasons=['春','夏','秋','冬'];
const artwork={welcome:base+'spring.png',observe:base+'autumn.png',think:base+'winter.png',celebrate:base+'summer.png'};
const actions={welcome:artwork.welcome,guide:artwork.observe,think:artwork.think,cheer:artwork.celebrate,achievement:artwork.celebrate,rest:artwork.think};
// Names in the original export are not subject labels: "scholar" is the
// wheat-and-harvest figure, while "reader" carries books and reading glasses.
const contextActors={red:'drummer',culture:'reader',industry:'scholar',ecology:'lotus'};
function apply(skin){return Object.assign({},skin,palettes[skin.gameId]||palettes.culture);}
function nodePose(index){const pose=poses[index%poses.length];return {mascot:artwork[pose],pose,season:seasons[index%seasons.length]};}
// Scene roles stay stable across timer updates and themes, separate from map progress.
function sceneActor(route,state,gameId){return route==='result'?(contextActors[gameId]||'drummer'):'';}

function modalActor(modal,rulePose){return {rules:rulePose||'welcome',revive:'heart',locked:'lotus'}[modal]||'';}
function header(gameId){if(gameId==='red'||gameId==='culture')return '/assets/'+gameId+'/banner-themed-v3.png';return '/assets/'+gameId+(gameId==='ecology'?'/banner-cartoon-v2.png':gameId==='industry'?'/banner-wheat-gold-v1.png':'/header.png');}
function scene(gameId){return '/assets/journey/'+gameId+'-a-v4.jpg';}
function nodeBase(gameId){return '/assets/journey/'+gameId+'-node-a-v4.png';}
// User-facing labels do not expose connection modes or fixture account names.
function readerName(name){return /^(本地联调用户|本地联网用户|本地联网体验者|演示用户|演示账号)$/.test(name||'')?'乡村阅读者':name;}
function readerProfile(value){return Object.assign({},value,{nickname:readerName(value.nickname),badge:/本地|模拟|演示|联调|体验/.test(value.badge||'')?'阅读探索者':value.badge});}
function certificateLabel(value){return Object.assign({},value,{userName:readerName(value.userName),displayId:/^DEMO-/i.test(value.id||'')?'':value.id,footer:!value.footer||/本地|模拟|演示|联调|非正式/.test(value.footer)?'学习活动纪念，不代表学历或教育资格':value.footer});}
function errorMessage(message){return /BACKEND_NOT_CONFIGURED/.test(message||'')?'服务暂不可用，请稍后重试。':message;}
module.exports={palettes,actions,contextActors,apply,nodePose,sceneActor,modalActor,header,scene,nodeBase,readerName,readerProfile,certificateLabel,errorMessage,motionReady:true};
