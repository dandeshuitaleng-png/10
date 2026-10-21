'use strict';
const fs=require('node:fs'),path=require('node:path');
let sharp;try{sharp=require('sharp');}catch(_){sharp=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
const project=path.resolve(__dirname,'..'),stage=process.argv[2]||'title-current';
(async()=>{
 const checks=[];
 for(const [name,id] of [['千年文脉','culture'],['十步芳草','red'],['金色产业','industry'],['青山绿水','ecology']]){
  const d=JSON.parse(fs.readFileSync(path.join(project,'qa/home-pixel-alignment',name+'-'+stage+'.json'),'utf8')),box=d.elements['.activity-title-art'][0],window=d.elements['.title-art-window']&&d.elements['.title-art-window'][0],menu=d.menu;
  const {data,info}=await sharp(path.join(project,'miniprogram/assets',id,id==='ecology'&&stage==='ecology-fresh'?'header-water-v1.png':'header.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  function count(shift){let overlap=0,clipped=0,croppedImportant=0,visibleTop=Infinity;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   if(!data[(y*info.width+x)*4+3])continue;
   const px=box.left+(x+.5)/info.width*box.width,py=box.top+(y+.5)/info.height*box.height+shift;
   if(window&&(px<window.left-.05||px>window.right+.05||py<window.top-.05||py>window.bottom+.05)){if(data[(y*info.width+x)*4+3]>=8)croppedImportant++;continue;}
   if(data[(y*info.width+x)*4+3]>=8)visibleTop=Math.min(visibleTop,py);
   if(py<d.window.statusBarHeight||px<0||px>d.window.windowWidth)clipped++;
   if(menu&&px>menu.left-8&&px<menu.right+8&&py>menu.top-8&&py<menu.bottom+8)overlap++;
  }return {overlap,clipped,croppedImportant,visibleGap:visibleTop-menu.bottom};}
  const current=id==='ecology'&&!box?{overlap:window.right>menu.left-8&&window.top<menu.bottom+8?1:0,clipped:window.top<d.window.statusBarHeight?1:0,croppedImportant:0,visibleGap:window.top-menu.bottom}:count(0);
  const title=d.elements['.activity-title'][0],titleCenter=(title.left+title.right)/2,centerError=Math.abs(titleCenter-d.window.windowWidth/2),artCenterError=window?Math.abs((window.left+window.right)/2-d.window.windowWidth/2):null;
  const horizontalGap=window?menu.left-window.right:null,topOffset=window?window.top-d.window.statusBarHeight:null;
  const inline=horizontalGap!==null&&horizontalGap>=7.9;
  const composed=stage==='composed'||stage==='ecology-fresh',titleOverlap=title.right>menu.left-8&&title.top<menu.bottom+8?1:0;
  checks.push({theme:name,menu,artBox:box,alphaThreshold:1,clearancePx:8,...current,horizontalGap,topOffset,titleCenter,centerError,artCenterError,titleOverlap,passed:centerError<=.1&&artCenterError<=.1&&!titleOverlap&&!current.overlap&&!current.clipped&&!current.croppedImportant&&(composed?window.width>=270&&title.width===112&&title.height===36:(inline?topOffset>=0&&topOffset<=24.5:current.visibleGap>=8&&current.visibleGap<=24.5))});
 }
 const report={stage,passed:checks.every(x=>x.passed),checks};
 const out=path.join(project,'qa/title-safe');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,stage+'.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));process.exitCode=report.passed?0:1;
})().catch(e=>{console.error(e);process.exitCode=1});
