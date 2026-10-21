'use strict';
// Lossless raster exports of supplied PDF vectors. No generated or repainted IP.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let sharp;try{sharp=require('sharp');}catch{sharp=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}
const root=path.resolve(__dirname,'..'),source=path.join(root,'design-source/mascot-context-20261020'),runtime=path.join(root,'miniprogram/assets/brand/original-extensions');
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const definitions={
 reader:{label:'即刻阅行',page:5,scene:'答题阅读',duration:2200,parts:[{key:'glasses',indices:[61,62,63],pivot:[995,330]}]},
 scholar:{label:'刻谷钻研',page:6,scene:'我的学习',duration:2400,parts:[{key:'book',indices:range(324,333),pivot:[790,653]}]},
 heart:{label:'爱你老己',page:7,scene:'答错复活',duration:2100,parts:[{key:'heart',indices:[33,34],pivot:[1322,590]}]},
 lotus:{label:'好运莲连',page:3,scene:'今日锁定与休息',duration:2600,parts:[{key:'fish',indices:range(38,45),pivot:[1150,595]}]},
 drummer:{label:'欢欣谷舞',page:6,scene:'本关完成',duration:2000,parts:[{key:'stick-left',indices:range(195,204),pivot:[1120,485]},{key:'stick-right',indices:range(330,340),pivot:[1321,564]}]},
 skater:{label:'谷谷比耶',page:7,scene:'学习证书',duration:1900,parts:[{key:'peace',indices:range(115,121),pivot:[889,557]}]}
};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 fs.mkdirSync(runtime,{recursive:true});const manifest={source:'品牌素材/客户提供-20261016/智小谷IP形象延展设计.pdf',sourceSha256:hash(fs.readFileSync(path.join(root,'../品牌素材/客户提供-20261016/智小谷IP形象延展设计.pdf'))),method:'Original PDF vector paths only; slide text/background excluded; transparent normalized exports; parts reference original path indices.',canvas:{width:270,height:320},poses:{}};
 for(const [name,definition] of Object.entries(definitions)){
  const original=fs.readFileSync(path.join(source,name+'.svg'),'utf8'),paths=original.match(/<path[^>]*\/>/g),empty=original.replace(/<path[^>]*\/>/g,''),originalView=original.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const trimmed=await sharp(Buffer.from(original)).trim().png().toBuffer({resolveWithObject:true});
  const bounds=[originalView[0]-trimmed.info.trimOffsetLeft-10,originalView[1]-trimmed.info.trimOffsetTop-10,trimmed.info.width+20,trimmed.info.height+20];
  const normalized=empty.replace(/viewBox="[^"]+"/,'viewBox="'+bounds.join(' ')+'"').replace(/width="[^"]+"/,'width="'+bounds[2]+'"').replace(/height="[^"]+"/,'height="'+bounds[3]+'"');
  async function output(suffix,selected){const svg=normalized.replace('</g>',selected.join('')+'</g>'),file=name+suffix+'.png',bytes=await sharp(Buffer.from(svg)).resize(270,320,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png({compressionLevel:9}).toBuffer();fs.writeFileSync(path.join(runtime,file),bytes);return {file,bytes:bytes.length,sha256:hash(bytes)};}
  const full=await output('',paths),moving=new Set(definition.parts.flatMap(p=>p.indices)),base=await output('-base',paths.filter((_,i)=>!moving.has(i)));
  const scale=Math.min(270/bounds[2],320/bounds[3]),offset=[(270-bounds[2]*scale)/2,(320-bounds[3]*scale)/2];
  const parts=[];for(const part of definition.parts){const exported=await output('-'+part.key,part.indices.map(i=>{if(!paths[i])throw Error(name+' path '+i);return paths[i];}));parts.push({...part,...exported,pivotPercent:[(offset[0]+(part.pivot[0]-bounds[0])*scale)/270*100,(offset[1]+(part.pivot[1]-bounds[1])*scale)/320*100]});}
  manifest.poses[name]={...definition,svgSha256:hash(Buffer.from(original)),bounds,full,base,parts};
 }
 fs.writeFileSync(path.join(source,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const config=Object.fromEntries(Object.entries(manifest.poses).map(([name,p])=>[name,{label:p.label,duration:p.duration,source:'/assets/brand/original-extensions/'+p.full.file,baseSource:'/assets/brand/original-extensions/'+p.base.file,extension:true,gestureStyle:'transform-origin:50% 85%;',layers:p.parts.map(a=>({key:a.key,source:'/assets/brand/original-extensions/'+a.file,style:'transform-origin:'+a.pivotPercent.map(n=>n.toFixed(4)+'%').join(' ')+';'}))}]));
 fs.writeFileSync(path.join(root,'miniprogram/services-v4/mascot-extensions.js'),"'use strict';\n// Generated from original PDF path selections. Rebuild with install-mascot-context-20261020.cjs.\nmodule.exports="+JSON.stringify(config,null,2)+';\n');
 console.log(JSON.stringify({poses:Object.keys(config),runtimeBytes:Object.values(manifest.poses).reduce((n,p)=>n+p.full.bytes+p.base.bytes+p.parts.reduce((s,a)=>s+a.bytes,0),0)},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
