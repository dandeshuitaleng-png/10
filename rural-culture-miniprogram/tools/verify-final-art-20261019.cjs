'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..'),root=path.dirname(project),qa=path.join(project,'qa/final-art-20261019');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const previous=JSON.parse(fs.readFileSync(path.join(qa,'protected-before.json')));
const protectedFiles=Object.entries(previous.files).map(([p,hash])=>({path:p,expected:hash,actual:sha(path.join(root,p))}));
for(const x of protectedFiles)assert.equal(x.actual,x.expected,x.path);
const poses=previous.originalPoseDigests.poses.map(x=>({name:x.name,sourceUnchanged:sha(path.join(project,'miniprogram',x.source))===x.sourceSha256,runtimeUnchanged:sha(path.join(project,'miniprogram',x.runtime))===x.runtimeSha256}));
for(const x of poses)assert(x.sourceUnchanged&&x.runtimeUnchanged,x.name);
const targets=[project,...['千年文脉','十步芳草','金色产业','青山绿水'].map(n=>path.join(root,'交付/微信小程序四套',n)),path.join(root,'平台总入口')];
const relativeFiles=['pages/game/index.wxml','pages/game/index.wxss','pages/game/feedback-20261019.wxss','pages/game/final-art-20261019.wxss','components/game-button/index.wxml','components/game-button/index.wxss','components/mascot-actor/index.wxml','components/mascot-actor/index.wxss','services-v4/visual-feedback.js','services-v4/journey.js','services-v4/mascot-motion.js','services-v4/mascot-rig.js','services-v4/home-layout.js',...['culture.jpg','red.jpg','industry.jpg','ecology.jpg','node-current.png','node-locked.png','node-completed.png'].map(f=>'assets/journey/'+f),...['spring','autumn','winter','summer'].map(n=>'assets/brand/original-poses/'+n+'.png')];
const synced=targets.map(p=>({project:path.relative(root,p),files:relativeFiles.length,identical:relativeFiles.every(f=>sha(path.join(p,'miniprogram',f))===sha(path.join(project,'miniprogram',f)))}));
for(const x of synced)assert(x.identical,x.project);
const untouchedPresentation=['pages/game/index.wxml','components/mascot-actor/index.wxml','components/mascot-actor/index.wxss',...['red.jpg','industry.jpg','ecology.jpg'].map(f=>'assets/journey/'+f)].map(f=>({path:f,unchanged:sha(path.join(project,'miniprogram',f))===sha(path.join(qa,'before',f))}));
for(const x of untouchedPresentation)assert(x.unchanged,x.path);
const compiled=targets.map(p=>{const d=JSON.parse(fs.readFileSync(path.join(p,'qa-v4/compile-report.json')));return {project:path.relative(root,p),passed:d.passed,checks:d.checks,bytes:d.bytes,mib:d.mib,headroomBytes:2097152-d.bytes,mainPackageUnder2MiB:d.mainPackageUnder2MiB};});
for(const x of compiled)assert(x.passed&&x.mainPackageUnder2MiB,x.project);
const {palettes}=require('../miniprogram/services-v4/visual-feedback');
function luminance(s){let n=s.replace('#','');return [.2126,.7152,.0722].reduce((sum,w,i)=>{let v=parseInt(n.slice(i*2,i*2+2),16)/255;return sum+w*(v<=.04045?v/12.92:((v+.055)/1.055)**2.4);},0);}
function contrast(a,b){let x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const colors=Object.entries(palettes).map(([theme,p])=>({theme,ink:p.ink,accent:p.accent,paper:p.paper,light:p.light,ctaText:p.buttonText,ctaGradient:[p.top,p.bottom],ctaMinimumContrast:+Math.min(contrast(p.buttonText,p.top),contrast(p.buttonText,p.bottom)).toFixed(2),bodyContrast:+contrast(p.ink,p.light).toFixed(2),secondaryContrast:+contrast(p.ink,'#fffdf6').toFixed(2)}));
for(const c of colors)assert(c.ctaMinimumContrast>=4.5&&c.bodyContrast>=4.5&&c.secondaryContrast>=4.5,c.theme);
fs.writeFileSync(path.join(qa,'protected-source.json'),JSON.stringify({protectedFiles,originalPoses:poses,untouchedPresentation,synced},null,2)+'\n');
fs.writeFileSync(path.join(qa,'compilation.json'),JSON.stringify(compiled,null,2)+'\n');
fs.writeFileSync(path.join(qa,'contrast.json'),JSON.stringify(colors,null,2)+'\n');
console.log(JSON.stringify({protectedFiles:protectedFiles.length,originalPoses:poses.length,identicalProjects:synced.length,matchedFilesPerProject:relativeFiles.length,compiles:compiled.length,maxMainPackageBytes:Math.max(...compiled.map(x=>x.bytes)),minimumCtaContrast:Math.min(...colors.map(x=>x.ctaMinimumContrast))},null,2));
