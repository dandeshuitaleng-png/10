'use strict';
const fs=require('node:fs'),path=require('node:path');
const sharp=require('./asset-runtime.cjs').sharp(),project=path.resolve(__dirname,'..');
const home=require('../miniprogram/services-v4/home-layout'),presentation=require('../miniprogram/services-v4/visual-feedback');
(async()=>{
 const checks=[];
 for(const id of ['culture','red','industry','ecology']){
  const b=home.artBounds[id],source=path.join(project,'miniprogram',presentation.header(id));
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(const width of [320,375,390,430])for(const offset of [94,110]){
   const menu={left:width-offset,right:width-7,top:51,bottom:83};
   const m=home.metrics({windowWidth:width,statusBarHeight:47},menu,id),scale=m.titleArtWidth/b.w;let overlap=0;
   for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
    if(data[(y*info.width+x)*4+3]<128)continue;
    const px=width/2+(x+.5-b.x-b.w/2)*scale,py=47+m.titleCenterY+(y+.5-b.centerY)*scale;
    if(px>menu.left-8&&px<menu.right+8&&py>menu.top-8&&py<menu.bottom+8)overlap++;
   }
   checks.push({id,width,capsuleOffset:offset,source:presentation.header(id),overlap});
  }
 }
 const report={scope:'Source alpha >=128 mapped through actual title geometry; eight-pixel capsule clearance. Computed layout evidence, not native multi-device evidence.',passed:checks.every(c=>!c.overlap),checks};
 const out=process.argv[2]?path.resolve(process.argv[2]):path.join(project,'qa/title-safe/composed/responsive-silhouette.json');
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({checks:checks.length,passed:report.passed,out}));if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
