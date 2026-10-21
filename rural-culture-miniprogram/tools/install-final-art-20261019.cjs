'use strict';
// Production normalization only: resize/compress generated images, preserve raw sources.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=path.join(root,'design-source/final-20261019'),target=path.join(root,'miniprogram/assets/journey'),sharp=require('./asset-runtime.cjs').sharp();
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{const manifest={method:'Built-in imagegen edits; production resizing/compression; original reference files preserved in design-source and QA backup.',assets:[]};
 const map=path.join(source,'culture-map-neutral-parchment-fullsize.png'),dest=path.join(target,'culture.jpg');
 await sharp(map).resize(750,1280,{fit:'cover',position:'centre'}).jpeg({quality:87,mozjpeg:true,chromaSubsampling:'4:4:4'}).toFile(dest);
 manifest.assets.push({source:path.relative(root,map),runtime:path.relative(root,dest),width:750,height:1280,bytes:fs.statSync(dest).size,sha256:digest(dest)});
 for(const [state,file] of [['current','current-node-raw.png'],['locked','locked-node-clean.png'],['completed','completed-node-clean.png']]){const src=path.join(source,file);if(!fs.existsSync(src))throw Error('Missing approved generated asset: '+src);const dst=path.join(target,'node-'+state+'.png');await sharp(src).resize(220,147,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({palette:true,quality:95,colours:192,dither:.5,compressionLevel:9}).toFile(dst);manifest.assets.push({source:path.relative(root,src),runtime:path.relative(root,dst),width:220,height:147,bytes:fs.statSync(dst).size,sha256:digest(dst)});}
 fs.writeFileSync(path.join(source,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
})().catch(err=>{console.error(err.message);process.exitCode=1;});
