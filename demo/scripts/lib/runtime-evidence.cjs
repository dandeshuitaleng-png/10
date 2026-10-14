'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
function runtimeFingerprint(){
  const files=[];
  function walk(folder){for(const entry of fs.readdirSync(path.join(ROOT,folder),{withFileTypes:true})){const file=path.posix.join(folder,entry.name);if(entry.isDirectory()&&entry.name!=='data')walk(file);else if(entry.isFile()&&/\.(js|cjs|html|css|mp4|wav)$/.test(file))files.push(file);}}
  for(const folder of ['js','web','server','media','audio'])walk(folder);
  files.push('game.js','game.json','project.config.json','package.json','design/runtime-bundle.js','design/content-intake/current/bank.json');
  const {ART,DEFAULT_MAP_ART}=require('../../js/services/resources');files.push(...Object.values(ART),...Object.values(DEFAULT_MAP_ART),'images/v2-style03/wetland-observation.jpg');
  const hash=crypto.createHash('sha256');for(const file of [...new Set(files)].sort()){hash.update(file+'\0');hash.update(fs.readFileSync(path.join(ROOT,file)));}
  return hash.digest('hex');
}
function identity(){return {version:JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version,runtimeSha256:runtimeFingerprint()};}
module.exports={identity,runtimeFingerprint};
