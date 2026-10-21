'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dest=path.resolve(root,'../交付/首页方案A-20261021'),images=path.join(dest,'home-directions-20261021');fs.mkdirSync(images,{recursive:true});
const captures=require('../qa/home-designs-20261021/review-captures.json').captures;assert.equal(captures.length,4);assert(captures.every(c=>c.design==='map'));
for(const item of captures){const from=path.join(root,'preview/home-directions-20261021',item.file);assert(fs.existsSync(from));fs.copyFileSync(from,path.join(images,item.file));}
let html=fs.readFileSync(path.join(root,'preview/首页方案A-20261021.html'),'utf8');
html=html.replace('</head>','<style>.experience{display:none!important}</style></head>').replace('交互入口采用相同页面源码；本轮以微信模拟器核查为准，实体 iPhone、安卓微信效果仍需复核。','切换四个主题查看 A 方案，并下载单张原图。手机微信中的最终显示与触摸效果仍需复核。');
fs.writeFileSync(path.join(dest,'评审.html'),html);
fs.copyFileSync(path.join(root,'docs/20261021-A方案确认与四项细化.md'),path.join(dest,'设计说明.md'));
fs.copyFileSync(path.join(root,'docs/20261021-人物点击动作与轮廓接缝修正.md'),path.join(dest,'20261021-人物点击动作与轮廓接缝修正.md'));
fs.copyFileSync(path.join(root,'docs/20261021-横幅标题字号与留白修正.md'),path.join(dest,'20261021-横幅标题字号与留白修正.md'));
fs.copyFileSync(path.join(root,'docs/20261021-人物画布越界与底部遮挡修正.md'),path.join(dest,'20261021-人物画布越界与底部遮挡修正.md'));
const old=path.resolve(root,'../交付/首页两款设计-20261021/评审.html');if(fs.existsSync(old))fs.writeFileSync(old,'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../首页方案A-20261021/评审.html"><title>A方案已确认</title></head><body><a href="../首页方案A-20261021/评审.html">查看已确认 A 方案</a></body></html>\n');
const zip=path.join(path.dirname(dest),'首页方案A-20261021.zip');
const script='import sys, zipfile\nfrom pathlib import Path\nroot=Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2], "w", compression=zipfile.ZIP_DEFLATED) as archive:\n for source in sorted(root.rglob("*")):\n  if source.is_file() and source.name != ".DS_Store": archive.write(source, source.relative_to(root.parent).as_posix())\n';
const result=spawnSync('python3',['-c',script,dest,zip],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
const record={directory:dest,zip,images:captures.length,bytes:fs.statSync(zip).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex')};fs.writeFileSync(path.join(root,'qa/home-designs-20261021/approved-a-delivery.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));
