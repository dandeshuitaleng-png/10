const fs=require('fs'),path=require('path');
const sharp=require('/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),q=path.join(root,'qa/map-unification'),dest=path.join(root,'preview/home-pixels');
const ids=['culture','red','industry','ecology'];
(async()=>{
for(const stage of ['after','top']){
 const comps=[];
 for(let i=0;i<4;i++){
  const id=ids[i],buf=await sharp(path.join(q,id+'-'+stage+'.png')).resize(390,844).png().toBuffer();
  comps.push({input:buf,left:i*406,top:0});
  await sharp(buf).jpeg({quality:90}).toFile(path.join(dest,id+(stage==='after'?'':'-map-top')+'.jpg'));
 }
 await sharp({create:{width:1608,height:844,channels:3,background:'#e8edf0'}}).composite(comps).png().toFile(path.join(q,'overview-'+stage+'.png'));
 await sharp(path.join(q,'overview-'+stage+'.png')).jpeg({quality:90}).toFile(path.join(dest,'map-overview-'+stage+'.jpg'));
}
const before=await sharp(path.join(q,'culture-before.png')).resize(390,844).toBuffer(),after=await sharp(path.join(q,'culture-after.png')).resize(390,844).toBuffer();
await sharp({create:{width:800,height:844,channels:3,background:'#e8edf0'}}).composite([{input:before,left:0,top:0},{input:after,left:410,top:0}]).png().toFile(path.join(q,'culture-comparison.png'));
await sharp(path.join(q,'culture-comparison.png')).jpeg({quality:90}).toFile(path.join(dest,'culture-map-comparison.jpg'));
fs.copyFileSync(path.join(q,'overview-after.png'),path.join(root,'../交付/微信小程序四套/原生四套首页对照.png'));
console.log('Review images exported');
})().catch(e=>{console.error(e);process.exit(1)});
