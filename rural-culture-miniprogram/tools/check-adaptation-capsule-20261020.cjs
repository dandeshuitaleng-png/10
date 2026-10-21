'use strict';
const fs=require('node:fs'),path=require('node:path');
const sharp=require('./asset-runtime.cjs').sharp(),home=require('../miniprogram/services-v4/home-layout'),art=require('../miniprogram/services-v4/visual-feedback');
const root=path.resolve(__dirname,'..'),out=path.join(root,'qa/adaptation-20261020/capsule.json');
(async()=>{const checks=[];for(const id of ['culture','red','industry','ecology']){
 const b=home.artBounds[id],{data,info}=await sharp(path.join(root,'miniprogram',art.header(id))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(const size of [{w:320,h:568,status:20,safe:0},{w:375,h:812,status:44,safe:34},{w:430,h:932,status:59,safe:34}])for(const offset of [94,110]){
 const menu={left:size.w-offset,right:size.w-7,top:size.status+6,bottom:size.status+38},m=home.metrics({windowWidth:size.w,windowHeight:size.h,screenHeight:size.h,statusBarHeight:size.status,safeArea:{bottom:size.h-size.safe}},menu,id);
 for(const route of ['home','inner']){
 const border={culture:2,red:1,industry:4,ecology:4}[id],wide=id==='industry'||id==='ecology',frameW=size.w-24-2*border+(wide?40:26),fit=route==='home'?m.titleArtWidth/b.w:Math.min(frameW/b.width,126/b.height);
 const panelTop=Math.max(size.status+(m.smallScreen?68:98),m.smallScreen?112:142),top=route==='home'?size.status+m.titleCenterY-b.centerY*fit:panelTop+border-77+(126-b.height*fit)/2,left=(size.w-b.width*fit)/2;
 let overlap=0,minGap=Infinity;
 for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){if(data[(y*info.width+x)*4+3]<128)continue;const px=left+(x+.5)*fit,py=top+(y+.5)*fit;if(px>menu.left-8&&px<menu.right+8){minGap=Math.min(minGap,py-menu.bottom);if(py>menu.top-8&&py<menu.bottom+8)overlap++;}}
 checks.push({theme:id,route,width:size.w,height:size.h,capsuleOffset:offset,overlap,minGap});
 }
 }}const r={scope:'Source alpha mapped through production home/inner heading geometry; 8px capsule padding. Computed evidence, not physical-device evidence.',passed:checks.every(x=>!x.overlap),checks};fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(r,null,2));console.log(JSON.stringify({passed:r.passed,checks:checks.length,failures:checks.filter(x=>x.overlap)},null,2));if(!r.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
