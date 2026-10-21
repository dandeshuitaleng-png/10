'use strict';
const layout=require('./home-layout');
const keys=['current','map','guide'];
function resolve(config={},query={},review=false){return review&&keys.includes(query.homeDesign)?query.homeDesign:keys.includes(config.homeDesign)?config.homeDesign:'current';}
function metrics(base,design){
 const guide=design==='guide',map=design==='map',width=guide?base.width-36:base.width,m=layout.mapMetrics(width);
 const extra=guide?54:map?48:0,frame=guide?24:0;
 // Match footer padding and border; focus scrolling uses the visible map height.
 const footerSpace=guide?1:map?-1:0;
 const vars=design==='current'?{}:{'home-header-h':base.header+extra+'px','home-card-w':m.cardWidth+'px','home-node-w':m.nodeWidth+'px','home-node-h':m.nodeHeight+'px','home-guide-w':m.guideWidth+'px','home-guide-h':m.guideHeight+'px','home-guide-bottom':m.guideBottom+'px','home-guide-left':m.guideLeft+'px','home-guide-right':m.guideRight+'px'};
 return {mapWidth:width,mapViewport:Math.max(120,base.mapViewport-extra-frame+footerSpace),style:Object.entries(vars).map(([k,v])=>'--'+k+':'+v+';').join('')};
}
module.exports={resolve,metrics,keys};
