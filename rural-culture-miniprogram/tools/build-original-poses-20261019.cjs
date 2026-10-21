'use strict';
// Re-encode supplied PNGs losslessly. Artwork and transparent pixel data stay exact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('./asset-runtime.cjs').sharp();
const project=path.resolve(__dirname,'..'),root=path.join(project,'miniprogram/assets/brand');
const names=['spring','autumn','winter','summer'];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
 const out=path.join(root,'original-poses');fs.mkdirSync(out,{recursive:true});
 const records=[];
 for(const name of names){
  const source=path.join(root,'reference',name+'.png'),target=path.join(out,name+'.png');
  const original=fs.readFileSync(source);
  const encoded=await sharp(original).png({compressionLevel:9,adaptiveFiltering:false}).toBuffer();
  const a=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const b=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(JSON.stringify(a.info)!==JSON.stringify(b.info)||!a.data.equals(b.data))throw Error('RGBA changed: '+name);
  fs.writeFileSync(target,encoded);
  records.push({name,source:'assets/brand/reference/'+name+'.png',runtime:'assets/brand/original-poses/'+name+'.png',sourceBytes:original.length,runtimeBytes:encoded.length,sourceSha256:hash(original),runtimeSha256:hash(encoded),rgbaSha256:hash(a.data),rgbaPixelIdentical:true,width:a.info.width,height:a.info.height});
 }
 fs.writeFileSync(path.join(project,'design-source/original-poses.json'),JSON.stringify({method:'Lossless PNG re-encoding; all RGBA pixels identical, including transparent pixels.',poses:records},null,2)+'\n');
 console.log(JSON.stringify(records,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
