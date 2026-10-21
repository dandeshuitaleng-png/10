'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{rigs}=require('../miniprogram/services-v4/mascot-rig');
test('local hand motion cannot reintroduce a whole-body keyframe binding',()=>{
 const css=fs.readFileSync(path.join(root,'miniprogram/components/mascot-actor/index.wxss'),'utf8');
 assert(!/\.gesture-plane\{animation-name|\.extension-plane\{animation-name/.test(css));
 for(const pose of ['welcome','observe','think','celebrate'])assert(css.includes('.pose-'+pose+'.is-playing.phase-0 .limb-pivot{animation-name:'));
 assert(css.includes('.actor-original .limb-pivot,.actor-original .limb-underlay{display:none!important}'));
});
test('all four moving arm cutouts stay above the original feet and reuse untouched PNGs',()=>{
 const source=require('../design-source/original-poses.json');
 for(const pose of ['welcome','observe','think','celebrate']){
  const r=rigs[pose],record=source.poses.find(p=>r.source.endsWith('/'+p.name+'.png'));
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'miniprogram',r.source))).digest('hex'),record.runtimeSha256);
  assert(r.limbBaseStyle.includes('polygon(evenodd,')&&r.limbUnderlays.length);
  const ys=[...r.limb.imageStyle.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(m=>Number(m[2]));
  assert(ys.length>=12&&Math.max(...ys)<77,'the foot region must not enter an arm mask');
 }
});
