'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dest=path.resolve(root,'../交付/首页两款设计-20261021'),images=path.join(dest,'home-directions-20261021');fs.mkdirSync(images,{recursive:true});
const captures=require('../qa/home-designs-20261021/review-captures.json').captures;assert.equal(captures.length,8);
for(const item of captures){const from=path.join(root,'preview/home-directions-20261021',item.file);assert(fs.existsSync(from));fs.copyFileSync(from,path.join(images,item.file));}
let html=fs.readFileSync(path.join(root,'preview/首页两款评审-20261021.html'),'utf8');
html=html.replace('</head>','<style>.experience{display:none!important}</style></head>').replace('交互体验采用相同页面源码；手机微信中的最终显示与触摸效果仍需复核。','可切换四个主题查看两款首页，并下载单张原图。手机微信中的最终显示与触摸效果仍需复核。');
fs.writeFileSync(path.join(dest,'评审.html'),html);
fs.writeFileSync(path.join(dest,'设计说明.md'),'# 首页两款设计\n\n直接打开“评审.html”，切换四个主题查看 A、B 两款。每张图均来自微信开发者工具实际页面。\n\n- A「插画漫游」：以插画地图为主，顶部集中呈现进度与常用入口。\n- B「柔彩绘本」：柔和的主题色、暖纸底板和哑光按钮，顶部不再重复人物插画。\n\n两款沿用原有主题横幅、插画、智小谷和对应主题色。四个主题仍是独立工程。\n\n当前版已保留在 GitHub 的 main 分支及 baseline-20261021-before-home-options 标签中；新设计保存在 design/home-two-directions 分支，等待领导选型后再切换正式首页。\n\n浏览器评审工具可体验相同源码中的章节入口。离线文件用于图片评审，手机微信的真机效果需继续复核。\n');
const zip=path.join(path.dirname(dest),'首页两款设计-20261021.zip'),result=spawnSync('/usr/bin/ditto',['-c','-k','--norsrc','--keepParent',dest,zip],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
console.log(JSON.stringify({directory:dest,zip,images:captures.length,bytes:fs.statSync(zip).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex')},null,2));
