'use strict';
// Small UI symbols only; the accepted illustrations and original IP are untouched.
const fs=require('node:fs'),path=require('node:path'),sharp=require('./asset-runtime.cjs').sharp();
const root=path.resolve(__dirname,'..');
(async()=>{for(const name of ['flag','wheat']){const source=path.join(root,'design-source/theme-details-20261022',name+'.svg'),target=path.join(root,'miniprogram/assets/icons',name+'.png');await sharp(fs.readFileSync(source),{density:288}).resize(96,96).png({palette:true}).toFile(target);console.log(name+' '+fs.statSync(target).size+' bytes');}})().catch(e=>{console.error(e);process.exitCode=1;});
