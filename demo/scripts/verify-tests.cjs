'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {identity}=require('./lib/runtime-evidence.cjs');
const root=path.resolve(__dirname,'..'),files=fs.readdirSync(path.join(root,'tests')).filter(n=>n.endsWith('.test.cjs')).sort().map(n=>'tests/'+n);
const result=spawnSync(process.execPath,['--test','--test-reporter=tap',...files],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,NO_COLOR:'1'}});
const count=name=>Number(result.stdout?.match(new RegExp('^# '+name+' (\\d+)$','m'))?.[1]||0);
const report={date:new Date().toISOString(),...identity(),passed:result.status===0&&count('tests')>0,tests:count('tests'),pass:count('pass'),fail:count('fail'),cancelled:count('cancelled'),skipped:count('skipped'),scope:'Node功能、客户端状态、服务端HTTP与SQLite、备份及微信API分支测试；不替代平台、真机与内容签审。'};
fs.mkdirSync(path.join(root,'design/full-development/evidence'),{recursive:true});fs.writeFileSync(path.join(root,'design/full-development/evidence/unit-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
