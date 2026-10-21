'use strict';
const path=require('node:path'),os=require('node:os');
function sharp(){try{return require('sharp');}catch{return require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));}}
module.exports={sharp};
