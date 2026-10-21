'use strict';
const {affine}=require('./mascot-mesh');
const stops=[0,.10,.30,.49,.68,.84,1];
function geometry(rig){
 const {box,pivot}=rig.gesture,[x,y,w,h]=box,vertices=[],triangles=[];
 const ramp=n=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
 for(let row=0;row<=4;row++)for(let col=0;col<=4;col++)vertices.push({point:[x+w*col/4,y+h*row/4],weight:ramp(Math.min(col/4,1-col/4)*5)*ramp(Math.min(row/4,1-row/4)*5)});
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){const a=row*5+col,b=a+1,c=a+5,d=c+1;triangles.push([a,b,d],[a,d,c]);}
 return {box,pivot,vertices,triangles};
}
function angleAt(progress,angles,amount=1){
 const p=Math.max(0,Math.min(1,progress)),values=[0,...angles,0];
 for(let i=1;i<stops.length;i++)if(p<=stops[i]){const t=(p-stops[i-1])/(stops[i]-stops[i-1]),ease=1-Math.pow(1-t,3);return (values[i-1]+(values[i]-values[i-1])*ease)*amount;}
 return 0;
}
function deform(mesh,angle){
 const rad=angle*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad),pivot=mesh.pivot;
 return mesh.vertices.map(({point:[px,py],weight})=>{const dx=px-pivot[0],dy=py-pivot[1];return [px+weight*(dx*cos-dy*sin-dx),py+weight*(dx*sin+dy*cos-dy)];});
}
function paint(ctx,image,rig,mesh,angle){
 const {width,height}=rig,{box}=mesh,[x,y,w,h]=box;
 ctx.clearRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
 if(Math.abs(angle)<.00001)return;
 ctx.clearRect(x,y,w,h);
 const targets=deform(mesh,angle);
 for(const ids of mesh.triangles){
  const src=ids.map(i=>mesh.vertices[i].point),dest=ids.map(i=>targets[i]),center=dest.reduce((v,p)=>[v[0]+p[0]/3,v[1]+p[1]/3],[0,0]);
  // Adjacent cells share one destination vertex. One-source-pixel overlap
  // covers raster antialiasing; there are no independently timed CSS layers.
  const clip=dest.map(p=>{const dx=p[0]-center[0],dy=p[1]-center[1],length=Math.hypot(dx,dy);return [p[0]+dx/length,p[1]+dy/length];});
  ctx.save();ctx.beginPath();ctx.moveTo(...clip[0]);ctx.lineTo(...clip[1]);ctx.lineTo(...clip[2]);ctx.closePath();ctx.clip();ctx.transform(...affine(src,dest));ctx.drawImage(image,0,0,width,height);ctx.restore();
 }
}
function createAnimator({canvas,image,rig,width,height,pixelRatio=2,clock=()=>Date.now(),onError=()=>{}}){
 const ctx=canvas.getContext('2d'),mesh=geometry(rig),ratio=Math.max(1,Math.min(3,pixelRatio||2));
 canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));ctx.scale(canvas.width/rig.width,canvas.height/rig.height);
 let frame=null,active=false,key='',started=0,duration=rig.duration,amount=.55,lastFrame=-Infinity;
 const schedule=fn=>canvas.requestAnimationFrame?canvas.requestAnimationFrame(fn):setTimeout(fn,33),cancel=id=>canvas.cancelAnimationFrame?canvas.cancelAnimationFrame(id):clearTimeout(id);
 function stop(){active=false;if(frame!==null)cancel(frame);frame=null;key='';}
 function render(progress){paint(ctx,image,rig,mesh,angleAt(progress,rig.gesture.angles,amount));}
 function tick(){frame=null;if(!active)return;try{const now=clock(),p=Math.min(1,(now-started)/duration);if(now-lastFrame>=30||p===1){render(p);lastFrame=now;}if(p<1)frame=schedule(tick);else active=false;}catch(e){stop();onError(e);}}
 return {update({playing,responding,cycle}){if(!playing){stop();render(0);return;}const next=String(cycle)+':'+!!responding;if(next===key)return;stop();key=next;duration=responding?rig.responseDuration:rig.duration;amount=responding?1:.55;active=true;started=clock();lastFrame=-Infinity;tick();},stop,drawFrame(progress,responding=true){amount=responding?1:.55;render(progress);},state(){return {active,key,framePending:frame!==null};}};
}
module.exports={geometry,deform,angleAt,paint,createAnimator};
