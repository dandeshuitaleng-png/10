'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const project=path.resolve(__dirname,'..'),workspace=path.dirname(project),qa=path.join(project,'qa/four-theme-finish-20261020');
fs.mkdirSync(qa,{recursive:true});
const tasks=[
 ['services',['tests/v4-services.cjs']],
 ['page',['tests/v4-page.cjs']],
 ['network-page',['--test','tests/v4-network-page.cjs']],
 ['native-network',['--test','../demo/tests/native-network.test.cjs']],
 ['layout',['--test','tests/v4-map-cues.cjs','tests/v4-map-unification.cjs','tests/v4-home-pixels.cjs']],
 ['presentation',['--test','tests/theme-content.test.cjs','tests/share-cover.test.cjs','tests/mascot-motion.test.cjs','tests/red-scene-aspect.cjs']],
 ['title-silhouette',['tools/v4-title-silhouette-check.cjs',path.join(qa,'silhouette.json')]]
];
function run(name,args){return new Promise(resolve=>{const c=spawn(process.execPath,args,{cwd:project});let out='';c.stdout.on('data',b=>out+=b);c.stderr.on('data',b=>out+=b);c.on('error',e=>out+=e.stack);c.on('close',code=>{fs.writeFileSync(path.join(qa,name+'-tests.log'),out);resolve({name,passed:code===0,exitCode:code,tests:Number(out.match(/ℹ tests (\d+)/)?.[1]||out.match(/"checks":(\d+)/)?.[1]||out.match(/"passed":(\d+)/)?.[1]||0)});});});}
(async()=>{
 const tests=await Promise.all(tasks.map(([name,args])=>run(name,args)));console.log(JSON.stringify({tests},null,2));
 const roots=['rural-culture-miniprogram','交付/微信小程序四套/十步芳草','交付/微信小程序四套/千年文脉','交付/微信小程序四套/金色产业','交付/微信小程序四套/青山绿水'];
 const compile=await Promise.all(roots.map(async(r,i)=>{const absolute=path.join(workspace,r),result=await run('compile-'+i,['tools/v4-check.cjs',absolute]);const report=JSON.parse(fs.readFileSync(path.join(absolute,'qa-v4/compile-report.json')));return{project:r,passed:result.passed&&report.passed,bytes:report.bytes,mainPackageUnder2MiB:report.mainPackageUnder2MiB};}));
 const result={generatedAt:new Date().toISOString(),scope:'Steps 1 and 2: actual Page/service regression, isolated HTTP/SQLite tests, source geometry and native WXML/WXSS compiler. Native screenshots are separate. No device or external trusted sharing acceptance.',tests,compile,passed:tests.every(x=>x.passed)&&compile.every(x=>x.passed&&x.mainPackageUnder2MiB)};
 fs.writeFileSync(path.join(qa,'regression.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:result.passed,compile},null,2));if(!result.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
