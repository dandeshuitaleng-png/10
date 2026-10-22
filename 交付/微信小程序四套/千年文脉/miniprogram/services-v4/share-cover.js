'use strict';
// Compose the current versioned theme artwork at the share-card ratio.
const layout=require('./home-layout');
const actors=require('./visual-feedback').contextActors;
const captions={culture:['读一段湖湘往事','和智小谷一起探寻文脉'],red:['寻访家乡红色记忆','和智小谷一起读懂故事'],industry:['从一粒稻谷出发','和智小谷一起发现丰饶'],ecology:['认识一方青山绿水','和智小谷一起探索自然']};
function configured(image,base){return image?(/^https?:/.test(image)?image:(base||'')+image):'';}
async function render(wx,page,skin){
 if(!wx.createSelectorQuery||!wx.canvasToTempFilePath)return '';
 const canvas=await new Promise((resolve,reject)=>wx.createSelectorQuery().in(page).select('#share-cover-canvas').fields({node:true,size:true}).exec(rows=>rows&&rows[0]&&rows[0].node?resolve(rows[0].node):reject(Error('SHARE_CANVAS_MISSING'))));
 if(!canvas.createImage)return '';
 const load=src=>new Promise((resolve,reject)=>{const image=canvas.createImage(),timer=setTimeout(()=>reject(Error('SHARE_ART_TIMEOUT')),4000);image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=()=>{clearTimeout(timer);reject(Error('SHARE_ART_UNAVAILABLE'));};image.src=src;});
 const id=skin.gameId,header=require('./visual-feedback').header(id);
 const [scene,ribbon,actor]=await Promise.all([load(require('./visual-feedback').scene(id)),load(header),load('/assets/brand/original-extensions/'+(actors[id]||actors.culture)+'.png')]);
 canvas.width=600;canvas.height=480;const ctx=canvas.getContext('2d');
 // Keep the illustrated horizon and river, rather than the middle of the tall map.
 ctx.drawImage(scene,0,0,scene.width,Math.min(scene.height,scene.width*.8),0,0,600,480);
 const wash=ctx.createLinearGradient(0,250,0,480);wash.addColorStop(0,'rgba(255,255,255,0)');wash.addColorStop(1,skin.light);ctx.fillStyle=wash;ctx.fillRect(0,250,600,230);
 const b=layout.artBounds[id]||layout.artBounds.culture,fit=500/b.w,x=50,y=18;
 ctx.drawImage(ribbon,b.x,b.y,b.w,b.h,x,y,500,b.h*fit);
 const faces={culture:152,red:160,industry:172,ecology:116};
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 40px sans-serif';ctx.fillStyle=id==='industry'?skin.ink:'#FFFFFF';
 ctx.fillText(skin.name,300,y+((faces[id]||163)-b.y)*fit-2,320);
 const lines=captions[id]||captions.culture;ctx.textAlign='left';ctx.fillStyle=skin.ink;ctx.font='bold 30px sans-serif';ctx.fillText(lines[0],30,360,340);ctx.font='24px sans-serif';ctx.fillText(lines[1],30,405,340);
 ctx.drawImage(actor,383,240,187,222);
 return new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvas,fileType:'jpg',quality:.92,destWidth:600,destHeight:480,success:r=>resolve(r.tempFilePath),fail:reject},page));
}
module.exports={render,configured,actors};
