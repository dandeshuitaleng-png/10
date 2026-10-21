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
// B: equal chapter cards in catalog order. State changes emphasis, never size.
function chapters(levels,width=375,viewportHeight=640){
 const feature=levels.find(l=>l.status==='current')||levels.find(l=>l.status==='today-locked')||levels.filter(l=>l.status==='completed').slice(-1)[0];
 const widthPx=Number(width)||375,view=Math.max(120,Number(viewportHeight)||640),gap=12,cardWidth=(widthPx-44)/2,gridTop=114;
 const units=text=>Array.from(String(text||'')).reduce((n,c)=>n+(c.charCodeAt(0)>255?1:.55),0);
 const lines=(text,size)=>Math.max(1,Math.ceil(units(text)*size/Math.max(32,cardWidth-28)));
 // One shared height accommodates the longest label, even after progression.
 const cardHeight=Math.max(160,...levels.map(l=>160+(lines(l.name,widthPx<=350?16:17)-1)*23));
 const height=levels.length?Math.max(view,gridTop+Math.ceil(levels.length/2)*(cardHeight+gap)-gap+16):0;
 const nodes=levels.map((level,index)=>{
  const top=gridTop+Math.floor(index/2)*(cardHeight+gap),actorBottom=top+cardHeight-14;
  return Object.assign({},level,presentation.nodePose(index),{featured:level===feature,number:String(index+1).padStart(2,'0'),top,height:cardHeight,left:16+(index%2)*(cardWidth+gap),width:cardWidth,reached:['current','today-locked'].includes(level.status),showMascot:['current','today-locked','completed'].includes(level.status),actorTop:actorBottom-64,actorBottom,distance:height-actorBottom,anchorId:'chapter-'+index,anchorTop:0});
 });
 const focus=nodes.find(n=>n.featured),maxScroll=Math.max(0,height-view);
 return {height,nodes,tiles:[],gridTop,sectionTop:84,focusTop:focus?Math.min(maxScroll,Math.max(0,focus.top+focus.height+12-view)):0,focusId:focus?focus.anchorId:'page-content-top',guideId:feature&&feature.id,maxScroll,canScroll:height>view};
}
module.exports={resolve,metrics,chapters,keys};
