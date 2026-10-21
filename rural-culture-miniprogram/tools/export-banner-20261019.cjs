'use strict';
// Runtime-size export from the accepted built-in image_gen output. Design master stays intact.
const path=require('node:path'),fs=require('node:fs'),sharp=require('./asset-runtime.cjs').sharp();
const root=path.resolve(__dirname,'..');
(async()=>{const output=path.join(root,'miniprogram/assets/ecology/banner-cartoon-v2.png');await sharp(path.join(root,'design-source/ecology-banner-cartoon-original.png')).resize({width:750}).png({compressionLevel:9}).toFile(output);console.log({output,bytes:fs.statSync(output).size});})().catch(e=>{console.error(e);process.exitCode=1;});
