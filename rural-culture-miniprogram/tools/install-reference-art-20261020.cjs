'use strict';
// Production export only: crop transparent margins, normalize dimensions and compress.
// Original generated RGB and alpha are preserved; no recoloring or hand-drawn replacement.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const project=path.resolve(__dirname,'..'),source=path.join(project,'design-source/reference-unified-20261020'),out=path.join(project,'miniprogram/assets/journey');
const sharp=require('./asset-runtime.cjs').sharp();
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function bodyCrop(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const rows=new Array(info.height).fill(0),cols=new Array(info.width).fill(0);
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=128){rows[y]++;cols[x]++;}
 const yr=rows.map((v,i)=>v>=Math.max(...rows)*.05?i:-1).filter(v=>v>=0),xr=cols.map((v,i)=>v>=Math.max(...cols)*.05?i:-1).filter(v=>v>=0);
 const left=Math.max(0,xr[0]-24),top=Math.max(0,yr[0]-24),right=Math.min(info.width,xr.at(-1)+25),bottom=Math.min(info.height,yr.at(-1)+25);
 return {left,top,width:right-left,height:bottom-top};
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});const assets=[];
 for(const theme of ['ecology','culture','red','industry']){
  const file=path.join(source,theme+'-map-source.png'),buf=await sharp(file).resize(750,1280,{fit:'fill'}).jpeg({quality:85,mozjpeg:true,chromaSubsampling:'4:2:0'}).toBuffer(),runtime=path.join(out,theme+'.jpg');
  fs.writeFileSync(runtime,buf);assets.push({source:path.relative(project,file),runtime:path.relative(project,runtime),width:750,height:1280,quality:85,bytes:buf.length,sha256:hash(buf)});
 }
 for(const state of ['current','locked','completed']){
  const file=path.join(source,'node-'+state+'-source.png'),crop=await bodyCrop(file),buf=await sharp(file).extract(crop).resize(220,147,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({palette:true,colours:192,quality:95,dither:.4,compressionLevel:9}).toBuffer(),runtime=path.join(out,'node-'+state+'.png');
  fs.writeFileSync(runtime,buf);assets.push({source:path.relative(project,file),runtime:path.relative(project,runtime),width:220,height:147,transparentMarginCrop:crop,bytes:buf.length,sha256:hash(buf)});
 }
 const record={method:'Built-in ImageGen edits matched to supplied reference crops. Exports use crop/resize/compression only; original generated sources and prompts retained.',nodeOpacity:'CSS opacity is 1 for every node. Generated source near-opaque alpha and antialias edges are preserved; not asserted to be all alpha255.',assets};
 fs.writeFileSync(path.join(source,'asset-manifest.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
