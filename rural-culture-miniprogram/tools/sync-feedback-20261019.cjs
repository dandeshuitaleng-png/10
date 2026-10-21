'use strict';
// Sync shared presentation and the remote resume-selection fix. Preserve project connection and account configuration.
const fs=require('node:fs'),path=require('node:path');
const project=path.resolve(__dirname,'..'),root=path.dirname(project),source=path.join(project,'miniprogram');
const targets=['千年文脉','十步芳草','金色产业','青山绿水'].map(name=>path.join(root,'交付/微信小程序四套',name));
const parts=['pages/game','components/game-button','components/mascot-actor','services-v4/visual-feedback.js','services-v4/share-cover.js','services-v4/remote.js','services-v4/audio.js','services-v4/press-feedback.js','services-v4/certificate-art.js','assets/audio','services-v4/theme-content.js','services-v4/journey.js','services-v4/mascot-motion.js','services-v4/mascot-rig.js','services-v4/mascot-extensions.js','services-v4/home-layout.js','services-v4/home-designs.js','services-v4/title-contours.js','assets/red/banner-folded-v2.png','assets/culture/banner-folded-v2.png','assets/red/banner-themed-v3.png','assets/culture/banner-themed-v3.png','assets/industry/banner-wheat-gold-v1.png','assets/brand/original-poses','assets/brand/original-extensions','assets/icons','assets/journey'];
for(const target of targets){
 for(const file of ['v4.html','v4-runtime.js']){const dest=path.join(target,'preview',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(project,'preview',file),dest);}
 for(const part of parts){const dest=path.join(target,'miniprogram',part);if(part==='assets/audio')fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(path.join(source,part),dest,{recursive:true});}
 if(path.basename(target)==='青山绿水')fs.cpSync(path.join(source,'assets/ecology/banner-cartoon-v2.png'),path.join(target,'miniprogram/assets/ecology/banner-cartoon-v2.png'));
 const filename=path.join(target,'project.config.json'),config=JSON.parse(fs.readFileSync(filename));
 const ignores=config.packOptions?.ignore||[];for(const value of ['assets/brand/reference','assets/brand/actor','assets/brand/ip-original.png','assets/brand/nature.png','assets/ecology/header.png','assets/ecology/banner.png','assets/culture/scene.jpg','assets/red/scene.jpg','assets/industry/scene.jpg','assets/ecology/scene.jpg']){if(!ignores.some(x=>x.value===value))ignores.push({type:/\.(png|jpe?g)$/.test(value)?'file':'folder',value});}if(!ignores.some(x=>x.value==='assets/brand/actions'))ignores.push({type:'folder',value:'assets/brand/actions'});
 for(const rule of ignores)if(/\.(png|jpe?g)$/.test(rule.value))rule.type='file';
 config.packOptions={...config.packOptions,ignore:ignores};fs.writeFileSync(filename,JSON.stringify(config,null,2)+'\n');
}
// Every delivered app is fixed to one theme; keep unused journey maps in source, outside its package.
function isolateThemeMaps(dir){const file=path.join(dir,'project.config.json'),config=JSON.parse(fs.readFileSync(file)),id=require(path.join(dir,'miniprogram/game-config.js')).gameId,ids=['culture','red','industry','ecology'];if(!ids.includes(id))throw Error('Fixed theme is required');const ignore=config.packOptions.ignore.filter(r=>!/^assets\/journey\/(culture|red|industry|ecology)(-a-v4\.jpg|-node-a-v4\.png|\.jpg)$/.test(r.value));for(const theme of ids){ignore.push({type:'file',value:'assets/journey/'+theme+'.jpg'});if(theme!==id)for(const suffix of ['-a-v4.jpg','-node-a-v4.png'])ignore.push({type:'file',value:'assets/journey/'+theme+suffix});}config.packOptions.ignore=ignore;fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');}
const filename=path.join(project,'project.config.json'),config=JSON.parse(fs.readFileSync(filename));
for(const value of ['assets/brand/reference','assets/brand/actor','assets/brand/ip-original.png','assets/brand/nature.png','assets/ecology/header.png','assets/ecology/banner.png','assets/culture/scene.jpg','assets/red/scene.jpg','assets/industry/scene.jpg','assets/ecology/scene.jpg']){if(!config.packOptions.ignore.some(x=>x.value===value))config.packOptions.ignore.push({type:/\.(png|jpe?g)$/.test(value)?'file':'folder',value});}
if(!config.packOptions.ignore.some(x=>x.value==='assets/brand/actions'))config.packOptions.ignore.push({type:'folder',value:'assets/brand/actions'});
for(const rule of config.packOptions.ignore)if(/\.(png|jpe?g)$/.test(rule.value))rule.type='file';
fs.writeFileSync(filename,JSON.stringify(config,null,2)+'\n');
[project,...targets].forEach(isolateThemeMaps);
// Versioned title sources stay in Git; packages contain only the current theme title.
for(const dir of [project,...targets]){
 const file=path.join(dir,'project.config.json'),cfg=JSON.parse(fs.readFileSync(file)),id=require(path.join(dir,'miniprogram/game-config.js')).gameId;
 const ignore=cfg.packOptions.ignore.filter(r=>!/^assets\/(red|culture)\/banner-themed-v3\.png$/.test(r.value));
 for(const theme of ['red','culture']){
  const old='assets/'+theme+'/banner-folded-v2.png';if(!ignore.some(r=>r.value===old))ignore.push({type:'file',value:old});
  if(theme!==id)ignore.push({type:'file',value:'assets/'+theme+'/banner-themed-v3.png'});
 }
 cfg.packOptions.ignore=ignore;fs.writeFileSync(file,JSON.stringify(cfg,null,2)+'\n');
}
console.log(JSON.stringify({copiedTo:targets,scope:'Shared presentation and HTTP resume-selection fix; no configuration mode, API contract, identity, catalog or player-data writes.'},null,2));
