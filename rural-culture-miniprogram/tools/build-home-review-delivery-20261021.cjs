'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),dest=path.resolve(root,'../交付/首页两款设计-20261021'),images=path.join(dest,'home-directions-20261021');fs.mkdirSync(images,{recursive:true});
const captures=require('../qa/home-designs-20261021/review-captures.json').captures;assert.equal(captures.length,8);
for(const item of captures){const from=path.join(root,'preview/home-directions-20261021',item.file);assert(fs.existsSync(from));fs.copyFileSync(from,path.join(images,item.file));}
fs.copyFileSync(path.join(root,'design-source/home-b-20261021/figma-1-67-reference.png'),path.join(images,'figma-1-67-reference.png'));
fs.copyFileSync(path.join(root,'design-source/home-b-20261021/figma-image74-story-cards.png'),path.join(images,'figma-image74-story-cards.png'));
let html=fs.readFileSync(path.join(root,'preview/首页两款评审-20261021.html'),'utf8');
html=html.replace('</head>','<style>.experience{display:none!important}</style></head>').replace('交互入口采用相同页面源码；本轮以微信模拟器核查为准，实体 iPhone、安卓微信效果仍需复核。','可切换四个主题查看两款首页，并下载单张原图。手机微信中的最终显示与触摸效果仍需复核。');
fs.writeFileSync(path.join(dest,'评审.html'),html);
fs.writeFileSync(path.join(dest,'设计说明.md'),'# 首页两款设计\n\n直接打开“评审.html”，切换四个主题查看 A、B 两款。每张图均来自微信开发者工具实际页面。\n\n- A「插画漫游」：以插画地图为主，顶部集中呈现进度与常用入口。\n- B「色块章节」：依据 Figma 原参考的色块和人物卡片，取消地图与底座，四关按目录组成等大卡片，加入图74的编号签、完成印章、解锁提示；按钮增加轻渐变和短投影。\n\n两款沿用原有主题横幅、智小谷和对应主题色；A 保留插画地图，B 使用等大色块关卡卡册。四个主题仍是独立工程。\n\n当前版已保留在 GitHub 的 main 分支及 baseline-20261021-before-home-options 标签中；新设计保存在 design/home-two-directions 分支，等待领导选型后再切换正式首页。\n\nB 原参考：https://www.figma.com/design/WYrdxvwRhk0e7k1sj3mK4c/Untitled?node-id=1-67 。故事卡册图74：https://www.figma.com/design/WYrdxvwRhk0e7k1sj3mK4c/Untitled?node-id=1-76 。两张原参考图附在评审页，不是运行界面素材。\n\n浏览器评审工具提供相同源码中的章节入口。本轮浏览器控制在 Work 设置中关闭，未记为本轮浏览器验收通过。离线文件用于图片评审，手机微信的真机效果需继续复核。\n');
// Explicit UTF-8 ZIP member names also unpack correctly outside macOS Finder.
const zip=path.join(path.dirname(dest),'首页两款设计-20261021.zip');
const archiveScript='import sys, zipfile\nfrom pathlib import Path\nroot=Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2], "w", compression=zipfile.ZIP_DEFLATED) as archive:\n for source in sorted(root.rglob("*")):\n  if source.is_file() and source.name != ".DS_Store": archive.write(source, source.relative_to(root.parent).as_posix())\n';
const result=spawnSync('python3',['-c',archiveScript,dest,zip],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
console.log(JSON.stringify({directory:dest,zip,images:captures.length,bytes:fs.statSync(zip).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex')},null,2));
