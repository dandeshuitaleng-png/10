'use strict';
// CSS windows reuse the exact original pixels. No replacement character art.
const H=796,face='#89D1EB',base='/assets/brand/original-poses/';
const percent=value=>(value*100).toFixed(6)+'%';
function region(width,box,key){const [x,y,w,h]=box;return {key,style:'left:'+percent(x/width)+';top:'+percent(y/H)+';width:'+percent(w/width)+';height:'+percent(h/H)+';',imageStyle:'left:'+percent(-x/w)+';top:'+percent(-y/h)+';width:'+percent(width/w)+';height:'+percent(H/h)+';'};}
// Circle and stem are separated only by CSS windows. Original PNGs stay untouched.
const antennaWindows={spring:[256,111,41,175,150,271,282],autumn:[226,113,41,177,153,241,252],winter:[219,119,41,183,158,234,244],summer:[230,120,41,184,161,244,257]};
function antenna(width,values){
 const [x,y,w,root,circleBottom,stemLeft,stemRight]=values,h=root-y;
 const p=(px,py)=>percent(px/width)+' '+percent(py/H),local=(px,py)=>percent((px-x)/w)+' '+percent((py-y)/h);
 const outside=[[0,0],[x,0],[x,circleBottom],[stemLeft,circleBottom],[stemLeft,root],[stemRight,root],[stemRight,circleBottom],[x+w,circleBottom],[x+w,0],[width,0],[width,H],[0,H]].map(([a,b])=>p(a,b)).join(',');
 const inside=[[x,y],[x+w,y],[x+w,circleBottom],[stemRight,circleBottom],[stemRight,root],[stemLeft,root],[stemLeft,circleBottom],[x,circleBottom]].map(([a,b])=>local(a,b)).join(',');
 return Object.assign(region(width,[x,y,w,h],'antenna'),{baseStyle:'clip-path:polygon('+outside+');',windowStyle:'clip-path:polygon('+inside+');',pivotStyle:'transform-origin:'+percent(((stemLeft+stemRight)/2-x)/w)+' 100%;'});
}
function rig(name,width,eyes,glint,kind,label,duration){return {source:base+name+'.png',width,height:H,face,eyes:eyes.map((box,i)=>region(width,box,'eye-'+i)),antenna:antenna(width,antennaWindows[name]),glint:region(width,glint,'prop'),kind,label,duration,gestureStyle:"transform-origin:50% "+percent(({spring:670,autumn:672,winter:678,summer:679}[name])/H)+";"};}
const rigs={
 welcome:rig('spring',504,[[186,322,46,21],[253,322,46,21]],[322,366,8,15],'wind','笑眼招呼，天线轻摆后自然停稳',1800),
 observe:rig('autumn',475,[[175,312,50,67],[234,318,55,52]],[360,379,20,20],'camera','眼神先定格，再配合一次快门微光',2100),
 think:rig('winter',486,[[141,310,50,66],[202,318,55,46]],[202,410,7,10],'candy','视线下移，稍作停顿后眨眼回应',2300),
 celebrate:rig('summer',457,[[186,325,35,53],[246,330,39,41]],[150,238,170,17],'goggles','轻快回应，泳镜掠光后柔和回稳',1900)
};
// A continuous bitmap mesh replaces cutout arms. No painted underlays or gaps.
const gestures={
 welcome:{box:[76,378,147,169],pivot:[184,503],angles:[12,-8,9,-5,1.5],responseDuration:1350,label:'春季抬手招呼，身体和脚底固定'},
 celebrate:{box:[220,430,156,184],pivot:[332,512],angles:[-9,-9,3,-2,0.5],responseDuration:1350,label:'夏季举起冰淇淋回应，身体和游泳圈固定'},
 observe:{box:[290,332,158,205],pivot:[316,513],angles:[-7,-7,1.5,-0.8,0.3],responseDuration:1450,label:'秋季举相机回应，身体与脚底固定'},
 think:{box:[93,386,157,215],pivot:[131,490],angles:[7,7,-4,3,-1],responseDuration:1500,label:'冬季抬手轻晃糖葫芦，身体与雪人固定'}
};
for(const [pose,g] of Object.entries(gestures)){
 const r=rigs[pose];r.gesture=g;
 r.responseDuration=g.responseDuration;r.label=g.label;
}
Object.assign(rigs,require('./mascot-extensions'));
module.exports={rigs};
