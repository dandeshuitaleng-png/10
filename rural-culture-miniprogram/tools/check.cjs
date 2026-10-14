const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../miniprogram'),qa=path.resolve(__dirname,'../qa');fs.mkdirSync(qa,{recursive:true});
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(root),errors=[];for(const f of files){if(f.endsWith('.json')){try{JSON.parse(fs.readFileSync(f));}catch(e){errors.push(f+': '+e.message);}}if(f.endsWith('.js')){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status)errors.push(r.stderr);}}
const bin='/Applications/wechatwebdevtools.app/Contents/Resources/app.asar.unpacked/node_modules/wcc-exec/';
for(const [ext,compiler] of [['.wxml','wcc'],['.wxss','wcsc']]){const group=files.filter(f=>f.endsWith(ext)).map(f=>path.relative(root,f));const r=spawnSync(bin+compiler,['-o',path.join(qa,'compiled'+(ext==='.wxml'?'.wxml.js':'.wxss.js')),...group],{cwd:root,encoding:'utf8'});if(r.status)errors.push(r.stderr||r.stdout);console.log(compiler+': '+group.length+' files, exit '+r.status);}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log('JSON / JavaScript / WeChat WXML / WXSS checks passed');
