'use strict';
const {mapMetrics}=require('./home-layout');
const presentation=require('./visual-feedback');
// Four art bends per scene; the enabled service catalog still owns level count,
// order, IDs and states. Extra levels append another illustrated scene.
const bends = [[.67,.85],[.30,.64],[.67,.42],[.26,.24]];
const grounds = {culture:'#F7CC76',red:'#F2B5A0',industry:'#F6D48A',ecology:'#C4DEA6'};
function layout(levels,gameId,width=375,viewportHeight=640){
 const ground=grounds[gameId]||grounds.culture;
 if(!levels.length)return {height:0,nodes:[],tiles:[],focusId:'page-content-top',focusTop:0,ground,maxScroll:0,canScroll:false};
 // Every theme uses a 750×1280 map; viewport height controls scrolling, never art proportions.
 const tileHeight=(Number(width)||375)*1280/750;
 const geometry=mapMetrics(width),halfNode=geometry.nodeHeight/2;
 const nodes=levels.map((level,index)=>{
  const slot=index%bends.length,group=Math.floor(index/bends.length),[x,y]=bends[slot];
  const sceneY=y;
  const distance=(group+1-sceneY)*tileHeight;
  const state=level.status==='completed'?'completed':['current','today-locked'].includes(level.status)?'current':'locked';
  return Object.assign({},level,presentation.nodePose(index),{reached:['current','today-locked'].includes(level.status),showMascot:['current','completed','today-locked'].includes(level.status),number:String(index+1),side:x>.5?'right':'left',left:(x*100).toFixed(3)+'%',distance,bottom:distance-halfNode,anchorId:'journey-anchor-'+index,nodeImage:'/assets/journey/node-'+state+'.png',selected:level.status==='current'});
 });
 const groups=Math.ceil(levels.length/bends.length);
 const height=groups*tileHeight;
 const viewHeight=Math.max(120,Number(viewportHeight)||640),maxScroll=Math.max(0,height-viewHeight);
 nodes.forEach(node=>{const cardBottom=height-node.distance+Math.max(halfNode,geometry.cardHeight/2);node.anchorTop=Math.max(0,Math.min(maxScroll,Math.ceil(cardBottom+16-viewHeight)));});
 const tiles=Array.from({length:groups},(_,index)=>({id:index,src:'/assets/journey/'+gameId+'.jpg',height:tileHeight,bottom:index*tileHeight}));
 const guide=nodes.find(node=>node.status==='current')||nodes.find(node=>node.status==='today-locked');
 const focus=guide||nodes[nodes.length-1];
 return {height,nodes,tiles,focusId:focus.anchorId,focusTop:focus.anchorTop,guideId:guide&&guide.id,ground,maxScroll,canScroll:maxScroll>0};
}
module.exports={layout};
