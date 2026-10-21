'use strict';
const sharp=require('/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs=require('fs'),path=require('path'),p=path.resolve(__dirname,'..'),q=path.join(p,'qa/home-polish'),dest=path.join(p,'preview/home-pixels');
(async()=>{
for(const stage of ['after','top']){
 let comps=[];
 for(const [i,id]of ['culture','red','industry','ecology'].entries()){
  const input=await sharp(path.join(q,id+'-'+stage+'.png')).resize(390,844).png().toBuffer();comps.push({input,left:i*406,top:0});
  await sharp(input).jpeg({quality:90}).toFile(path.join(dest,id+(stage==='top'?'-map-top':'')+'.jpg'));
 }
 await sharp({create:{width:1608,height:844,channels:3,background:'#e8edf0'}}).composite(comps).png().toFile(path.join(q,'overview-'+stage+'.png'));
 await sharp(path.join(q,'overview-'+stage+'.png')).jpeg({quality:90}).toFile(path.join(dest,'map-overview-'+stage+'.jpg'));
}
const before=await sharp(path.join(q,'culture-before.png')).resize(390,844).png().toBuffer(),after=await sharp(path.join(q,'culture-after.png')).resize(390,844).png().toBuffer();
await sharp({create:{width:800,height:844,channels:3,background:'#e8edf0'}}).composite([{input:before,left:0,top:0},{input:after,left:410,top:0}]).png().toFile(path.join(q,'reading-comparison.png'));
await sharp(path.join(q,'reading-comparison.png')).jpeg({quality:90}).toFile(path.join(dest,'reading-comparison.jpg'));
fs.copyFileSync(path.join(q,'overview-after.png'),path.join(p,'../交付/微信小程序四套/原生四套首页对照.png'));
console.log('Latest map and reading screenshots exported');
})().catch(e=>{console.error(e);process.exit(1)});
