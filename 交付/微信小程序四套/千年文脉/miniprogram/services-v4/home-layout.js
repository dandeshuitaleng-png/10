'use strict';
const contours=require('./title-contours');
// Logical CSS px. All skins consume one geometry contract; artwork keeps its aspect ratio.
const spec=Object.freeze({header:195,title:115,row:36,gutter:16,footerTop:8,footerBorder:1,button:52,cardHeight:90,cardGap:10,guideWidth:60,guideHeight:70,guideBottom:60,titleFont:20,titleLine:24});
function mapMetrics(width=375){
 const w=Number(width)||375,scale=Math.max(88/96,Math.min(110/96,w/375)),small=w<=350;
 const nodeWidth=Math.round(96*scale),nodeHeight=Math.round(86*scale),cardWidth=Math.round(Math.max(124,Math.min(150,w*.35)));
 const guideWidth=small?48:spec.guideWidth,guideHeight=small?58:spec.guideHeight,guideLabelWidth=small?60:64,overhang=(guideLabelWidth-guideWidth)/2;
 return {nodeWidth,nodeHeight,cardWidth,cardHeight:spec.cardHeight,cardGap:spec.cardGap,guideWidth,guideHeight,guideBottom:small?48:spec.guideBottom,guideLabelWidth,guideFont:small?10:11,guideRight:Math.min(nodeWidth+(small?8:-8),Math.floor(w*.33+nodeWidth/2-guideWidth-8-overhang)),guideLeft:Math.max(-28,8+overhang-(w*.26-nodeWidth/2))};
}
function metrics(info={},menu,gameId){
 const width=Math.min(Number(info.windowWidth)||375,430),height=Number(info.windowHeight)||812,status=Number(info.statusBarHeight)||44;
 const safe=info.safeArea?Math.max(0,(Number(info.screenHeight)||height)-info.safeArea.bottom):34;
 // Wide artwork shares a center below the capsule; only intersecting silhouette pixels add clearance.
 const capsuleLeft=menu&&Number(menu.left)>0?Number(menu.left):width-94;
 const capsuleBottom=menu&&Number(menu.bottom)>0?Number(menu.bottom):status+36;
 const titleAreaWidth=width-32,titleArtWidth=Math.min(width-48,286);
 let titleCenterY=73;
 for(const id of ['culture','red','industry']){
  const b=artBounds[id],fit=titleArtWidth/b.w,left=(width-titleArtWidth)/2;
  const start=Math.max(0,Math.floor((capsuleLeft-8-left)/titleArtWidth*48));
  if(start<48){const upper=Math.min(...contours[id].slice(start)),offset=(upper-b.centerY)*fit;titleCenterY=Math.max(titleCenterY,Math.ceil(capsuleBottom-status+8-offset));}
 }
 const row=spec.row;
 const artworkBottom=Math.max(...Object.values(artBounds).map(b=>titleCenterY+(b.y+b.h-b.centerY)*titleArtWidth/b.w));
 const navigationClearance=0,title=Math.max(spec.title,Math.ceil(artworkBottom)),header=title+row+44;
 const safeBottom=Math.max(24,safe+10),footer=spec.footerBorder+spec.footerTop+spec.button+safeBottom;
 const map=mapMetrics(width),{cardWidth,nodeWidth,nodeHeight}=map,artWidth=Math.min(348,width+20);
 const vars={'home-header-h':header+'px','home-title-h':title+'px','home-nav-clearance':navigationClearance+'px','home-title-area-w':titleAreaWidth+'px','home-title-label-top':(titleCenterY-spec.titleLine/2)+'px','home-row-h':row+'px','home-gutter':spec.gutter+'px','home-card-w':cardWidth+'px','home-card-h':map.cardHeight+'px','home-card-gap':map.cardGap+'px','home-guide-w':map.guideWidth+'px','home-guide-h':map.guideHeight+'px','home-guide-bottom':map.guideBottom+'px','home-guide-right':map.guideRight+'px','home-guide-left':map.guideLeft+'px','home-guide-label-w':map.guideLabelWidth+'px','home-guide-font':map.guideFont+'px','home-node-w':nodeWidth+'px','home-node-h':nodeHeight+'px','culture-card-width':cardWidth+'px','culture-node-w':nodeWidth+'px','culture-node-h':nodeHeight+'px','map-card-width':cardWidth+'px','map-node-w':nodeWidth+'px','map-node-h':nodeHeight+'px','culture-title-art-w':artWidth+'px','culture-title-art-h':(artWidth/3)+'px'};
 return {width,height,status,safeBottom,footer,navigationClearance,header,title,titleAreaWidth,titleArtWidth,titleCenterY,mapViewport:Math.max(120,height-status-header-footer),smallScreen:height<700,style:Object.keys(vars).map(k=>'--'+k+':'+vars[k]).join(';')+';'};
}
// Alpha>=8 source bounds; faint export noise outside these bounds is visually transparent.
const artBounds={culture:{"width":1050,"height":350,"x":25,"y":40,"w":1000,"h":264,"centerY":152},red:{"width":1050,"height":350,"x":27,"y":33,"w":995,"h":280,"centerY":160},industry:{width:1050,height:355,x:32,y:27,w:988,h:289,centerY:170.4},ecology:{width:750,height:250,x:31,y:10,w:688,h:221,centerY:122.5}};
// Midpoint of the usable front face at the central lettering area, in source pixels.
// Leaves, scroll ends and water are outside that face. Glyph ink sits below its line-box center.
const titleFaces={culture:{centerY:152,optical:-1.5,frame:2,width:540,height:94},red:{centerY:160,optical:-1.5,frame:1,width:540,height:94},industry:{centerY:172,optical:0,frame:4,width:540,height:94},ecology:{centerY:116,optical:2.5,frame:4,width:380,height:74}};
// Compact lettering leaves visible ribbon above and below the glyphs. These
// metrics are shared by home, inner pages and dialogs, independent of old CSS.
const titleType=Object.freeze({home:{font:spec.titleFont,line:spec.titleLine},heading:{font:22,line:28},modal:{font:20,line:24}});
function typeStyle(type){return 'font-size:'+type.font+'px;line-height:'+type.line+'px;height:'+type.line+'px;letter-spacing:1px;font-weight:800;';}
function faceLabelTop(b,face,width,height,line,optical){
 const fit=Math.min(width/b.width,height/b.height);
 return height/2+(face.centerY-b.height/2)*fit-line/2-optical;
}
function titleArtwork(gameId,width,artWidth,centerY=73){
 const target=artWidth===undefined?Math.min(width-48,286):artWidth,b=artBounds[gameId]||artBounds.culture;
 const fit=target/b.w,w=b.w*fit,h=b.h*fit,left=(width-32-w)/2,top=centerY-(b.centerY-b.y)*fit;
 const face=titleFaces[gameId]||titleFaces.culture;
 const labelTop=centerY+(face.centerY-b.centerY)*fit-titleType.home.line/2-face.optical;
 const wide=gameId==='industry'||gameId==='ecology',headingWidth=width-24-2*face.frame+(wide?40:26);
 const modalWidth=width-40-2*face.frame+(gameId==='ecology'?24:16),modalHeight=gameId==='ecology'?116:126;
 return {visible:true,plain:false,native:false,frameStyle:'left:'+left+'px;top:'+top+'px;width:'+w+'px;height:'+h+'px;',imageStyle:'left:'+(-b.x*fit)+'px;top:'+(-b.y*fit)+'px;width:'+(b.width*fit)+'px;height:'+(b.height*fit)+'px;',labelStyle:'top:'+labelTop+'px;height:'+titleType.home.line+'px;',homeTextStyle:typeStyle(titleType.home),headingLabelStyle:'top:'+faceLabelTop(b,face,headingWidth,126,titleType.heading.line,face.optical*.8)+'px;'+typeStyle(titleType.heading),modalLabelStyle:'top:'+faceLabelTop(b,face,modalWidth,modalHeight,titleType.modal.line,face.optical*.8)+'px;'+typeStyle(titleType.modal),bounds:b};
}
module.exports={spec,metrics,mapMetrics,titleArtwork,artBounds,titleFaces,titleType};
