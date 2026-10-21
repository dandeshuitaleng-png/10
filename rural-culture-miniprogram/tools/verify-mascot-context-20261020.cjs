'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),qa=path.join(root,'qa/mascot-context-20261020'),source=path.join(root,'design-source/mascot-context-20261020');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const manifest=read(path.join(source,'asset-manifest.json'));
assert.equal(sha(fs.readFileSync(path.join(root,'..',manifest.source))),manifest.sourceSha256);
const assets=[];for(const [pose,p] of Object.entries(manifest.poses)){
 assert.equal(sha(fs.readFileSync(path.join(source,pose+'.svg'))),p.svgSha256);
 for(const item of [p.full,p.base,...p.parts]){
  const data=fs.readFileSync(path.join(root,'miniprogram/assets/brand/original-extensions',item.file));assert.equal(sha(data),item.sha256,item.file);
  assert.equal(data.readUInt32BE(16),270);assert.equal(data.readUInt32BE(20),320);assets.push({pose,file:item.file,bytes:data.length});
 }
}
const reference=read(path.join(root,'qa/reference-unified-20261020/verification.json'));assert(reference.synced.every(x=>x.identical));assert(reference.compiled.every(x=>x.passed));assert(reference.originalPoses.every(x=>x.sourceUnchanged&&x.runtimeUnchanged));
const scenes=['profile','quiz','revive','locked','result','certificate'],screenshots=[];
for(const theme of ['culture','red','industry','ecology'])for(const scene of scenes){const name=theme+'-'+scene+'.png',data=fs.readFileSync(path.join(qa,name));assert.equal(data.readUInt32BE(16),696);assert.equal(data.readUInt32BE(20),1504);screenshots.push({theme,scene,file:name,sha256:sha(data)});}
const interactions=read(path.join(qa,'native-interactions.json'));assert.equal(interactions.length,6);assert.equal(new Set(interactions.map(x=>x.pose)).size,6);assert(interactions.every(x=>x.tap&&x.responseObserved&&x.after.sequence>x.before.sequence));
const page=read(path.join(root,'qa/v4/page-service-checks.json'));assert.equal(page.result,'passed');assert.equal(page.checks,22);
for(const [name,count] of [['motion-tests.log',11],['map-tests.log',3]]){const text=fs.readFileSync(path.join(qa,name),'utf8');assert(new RegExp('tests '+count+'\\b').test(text));assert(/fail 0\b/.test(text));}
const result={generatedAt:new Date().toISOString(),status:'passed',sourcePdf:manifest.source,sourcePdfSha256:manifest.sourceSha256,extensionPoses:6,originalSeasonalPosesUnchanged:4,totalOriginal2DPoses:10,assets,runtimeAssetBytes:assets.reduce((s,a)=>s+a.bytes,0),protectedOriginalsAndConfigurations:reference.protectedFiles.length,sharedFilesPerProject:reference.synced[0].files,projects:reference.compiled,tests:{page:22,motion:11,mapLayout:3,total:36},nativeScreenshots:screenshots,nativeInteractions:interactions,legacyHarness:{file:'map-cues-legacy-failed.log',result:'not-counted',reason:'Legacy stub lacks presentation.apply; fails before Page construction. Current actual-Page and standalone map-layout regressions are separately checked.'},automationRecovery:'One screenshot lost its top page instance during repeated IDE compilations; reopening the disposable window and re-capturing completed all 24 cases. Later checks use reLaunch navigation.',scope:'Current native simulator and local source/compiler evidence only. Isolated mock catalog and fixed service clock for screenshots; no actual answer/progress writes. Browser control disabled; browser and phone acceptance are not asserted.'};
fs.writeFileSync(path.join(qa,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,poses:10,newPoses:6,projects:result.projects.length,maxPackageBytes:Math.max(...result.projects.map(x=>x.bytes)),logicChecks:36,nativeScreenshots:screenshots.length,nativeResponses:interactions.length},null,2));
