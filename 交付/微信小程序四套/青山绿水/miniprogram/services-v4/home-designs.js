'use strict';
const layout=require('./home-layout');
const presentation=require('./visual-feedback');
const keys=['current','map','guide'];
function resolve(config={},query={},review=false){return review&&keys.includes(query.homeDesign)?query.homeDesign:keys.includes(config.homeDesign)?config.homeDesign:'current';}
function metrics(base,design){
 const guide=design==='guide',map=design==='map',width=base.width,m=layout.mapMetrics(width);
 const extra=guide?-8:map?48:0,frame=0;
 // Match footer padding and border; focus scrolling uses the visible map height.
 const footerSpace=guide?1:map?-1:0;
 const vars=design==='current'?{}:{'home-header-h':base.header+extra+'px','home-card-w':m.cardWidth+'px','home-node-w':m.nodeWidth+'px','home-node-h':m.nodeHeight+'px','home-guide-w':m.guideWidth+'px','home-guide-h':m.guideHeight+'px','home-guide-bottom':m.guideBottom+'px','home-guide-left':m.guideLeft+'px','home-guide-right':m.guideRight+'px'};
 return {mapWidth:width,mapViewport:Math.max(120,base.mapViewport-extra-frame+footerSpace),style:Object.entries(vars).map(([k,v])=>'--'+k+':'+v+';').join('')};
}
// B follows the selected Figma color-block dashboard. Catalog order and state
// remain authoritative; one reached chapter is featured, the rest form a grid.
function chapters(levels,width=375,viewportHeight=640){
 const feature=levels.find(l=>l.status==='current')||levels.find(l=>l.status==='today-locked')||levels.filter(l=>l.status==='completed').slice(-1)[0];
 const widthPx=Number(width)||375,view=Math.max(120,Number(viewportHeight)||640),gap=12,cardWidth=(widthPx-44)/2;
 const others=levels.filter(l=>l!==feature);
 const units=text=>Array.from(String(text||'')).reduce((n,c)=>n+(c.charCodeAt(0)>255?1:.55),0);
 const lines=(text,space,size)=>Math.max(1,Math.ceil(units(text)*size/Math.max(32,space)));
 const featureHeight=feature?164+(lines(feature.name,widthPx-32-36-94,widthPx<=350?23:26)-1)*34:0;
 const gridTop=feature?130+featureHeight:118,rowHeights=[];
 others.forEach((level,index)=>{const hasActor=level.status==='completed',space=cardWidth-28-(hasActor?44:0),nameLines=lines(level.name,space,widthPx<=350?16:17);const h=116+(nameLines-1)*23+(hasActor?Math.max(0,lines('已完成 · 可重温',space,11)-1)*17:0);rowHeights[Math.floor(index/2)]=Math.max(rowHeights[Math.floor(index/2)]||0,h);});
 const rowTop=index=>gridTop+rowHeights.slice(0,index).reduce((n,h)=>n+h+gap,0);
 const height=levels.length?Math.max(view,rowTop(rowHeights.length)+16):0;
 const nodes=levels.map((level,index)=>{
  const featured=level===feature,slot=others.indexOf(level),top=featured?88:rowTop(Math.floor(slot/2)),h=featured?featureHeight:rowHeights[Math.floor(slot/2)];
  const actorHeight=featured?112:64,actorBottom=top+h-14;
  return Object.assign({},level,presentation.nodePose(index),{featured,number:String(index+1).padStart(2,'0'),top,height:h,left:featured?16:16+(slot%2)*(cardWidth+gap),width:featured?widthPx-32:cardWidth,reached:['current','today-locked'].includes(level.status),showMascot:['current','today-locked','completed'].includes(level.status),actorTop:actorBottom-actorHeight,actorBottom,distance:height-actorBottom,anchorId:'chapter-'+index,anchorTop:0});
 });
 return {height,nodes,tiles:[],gridTop,sectionTop:gridTop-30,focusTop:feature?Math.max(0,88+featureHeight+16-view):0,focusId:feature?'chapter-'+levels.indexOf(feature):'page-content-top',guideId:feature&&feature.id,maxScroll:Math.max(0,height-view),canScroll:height>view};
}
module.exports={resolve,metrics,chapters,keys};
