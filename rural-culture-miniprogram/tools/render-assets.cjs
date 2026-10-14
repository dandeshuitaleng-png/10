const sharp=require('/Users/huangnianpeng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const path=require('path');
(async()=>{for(const name of ['landscape','red','history','industry','ecology']){const file=path.resolve(__dirname,'../miniprogram/assets/'+name);await sharp(file+'.svg').png().toFile(file+'.png');}console.log('5 original SVG illustrations rendered to PNG');})();
