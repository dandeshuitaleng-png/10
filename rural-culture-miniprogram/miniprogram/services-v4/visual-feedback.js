'use strict';
// Presentation only. Rules, catalog, progress and identities stay with the service.
const palettes={
  "culture": {
    "ink": "#543B26",
    "accent": "#8E592F",
    "light": "#FBF2E2",
    "theme": "木棕文脉",
    "top": "#F3E3CD",
    "bottom": "#EDDAC0",
    "buttonText": "#674524",
    "buttonEdge": "#E3CAAA",
    "muted": "#776049",
    "edge": "#E4D6C3",
    "panelEdge": "#C9B292",
    "paper": "#FFFAF2",
    "fill": "#EEE1C9",
    "shadow": "#6A4D2414",
    "panelTop": "#FFFAF2",
    "panelBottom": "#FBF2E2",
    "frameWidth": 1,
    "buttonAngle": "180deg"
  },
  "red": {
    "ink": "#532E28",
    "accent": "#AE432E",
    "light": "#FCF0EA",
    "theme": "朱红记忆",
    "top": "#F5DFD6",
    "bottom": "#F0D4CA",
    "buttonText": "#7B3B2D",
    "buttonEdge": "#EDC3B3",
    "muted": "#805B50",
    "edge": "#EAD8D0",
    "panelEdge": "#D5A491",
    "paper": "#FFFAF7",
    "fill": "#F2D9CB",
    "shadow": "#763B2814",
    "panelTop": "#FFFAF7",
    "panelBottom": "#FCF0EA",
    "frameWidth": 1,
    "buttonAngle": "180deg"
  },
  "industry": {
    "ink": "#5A431D",
    "accent": "#8A681F",
    "light": "#FCF6E3",
    "theme": "麦金物产",
    "top": "#F7E9BA",
    "bottom": "#F0DDA6",
    "buttonText": "#674310",
    "buttonEdge": "#EAD493",
    "muted": "#78643B",
    "edge": "#E5DABF",
    "panelEdge": "#C7B171",
    "paper": "#FFFCF3",
    "fill": "#EBDCAB",
    "shadow": "#76602214",
    "panelTop": "#FFFCF3",
    "panelBottom": "#FCF6E3",
    "frameWidth": 1,
    "buttonAngle": "180deg"
  },
  "ecology": {
    "ink": "#2B4C3A",
    "accent": "#416D4D",
    "light": "#F2F7EB",
    "theme": "山林生态",
    "top": "#E5EED9",
    "bottom": "#DCE8CF",
    "buttonText": "#315C3C",
    "buttonEdge": "#C8DFBC",
    "muted": "#5E735B",
    "edge": "#D8E3D2",
    "panelEdge": "#A9C19C",
    "paper": "#F9FCF4",
    "fill": "#DFEBD6",
    "shadow": "#3B5A3214",
    "panelTop": "#F9FCF4",
    "panelBottom": "#F2F7EB",
    "frameWidth": 1,
    "buttonAngle": "180deg"
  }
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
function certificateLabel(value){return Object.assign(require('./certificate-copy').present(value),{userName:readerName(value.userName),displayId:/^DEMO-/i.test(value.id||'')?'':value.id,footer:!value.footer||/本地|模拟|演示|联调|非正式/.test(value.footer)?'学习活动纪念，不代表学历或教育资格':value.footer});}
function errorMessage(message){return /BACKEND_NOT_CONFIGURED/.test(message||'')?'服务暂不可用，请稍后重试。':message;}
module.exports={palettes,actions,contextActors,apply,nodePose,sceneActor,modalActor,header,scene,nodeBase,readerName,readerProfile,certificateLabel,errorMessage,motionReady:true};
