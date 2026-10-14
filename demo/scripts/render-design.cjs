const fs=require('node:fs');const path=require('node:path');
const {createCanvas,loadImage,GlobalFonts}=require(process.env.QUIZ_CANVAS_MODULE||'@napi-rs/canvas');
const previewFont=process.env.QUIZ_PREVIEW_FONT||'/System/Library/Fonts/Hiragino Sans GB.ttc';
if(fs.existsSync(previewFont))GlobalFonts.registerFromPath(previewFont,'Hiragino Sans GB');
const {Renderer}=require('../js/ui/renderer');const D=require('../js/ui/draw');const T=require('../js/ui/tokens');const {THEMES}=require('../js/data/themes');const F=require('../design/fixtures');
const root=path.resolve(__dirname,'..'),out=path.join(root,'design'),C=T.colors;
async function run(){
  const images={landscape:await loadImage(path.join(root,'images/rural-landscape-v1.jpg')),map:await loadImage(path.join(root,'images/ecology-map-v1.jpg'))};
  const frames=[];
  for(const s of F.screens){const canvas=createCanvas(750,1624),ctx=canvas.getContext('2d');ctx.scale(2,2);new Renderer(ctx).render(s.route,{width:375,height:812,top:64,bottom:780},{...s.view,question:F.question,images});fs.writeFileSync(path.join(out,`screen-${s.id}-v1.png`),canvas.toBuffer('image/png'));frames.push(canvas);}
  const board=createCanvas(1800,1200),ctx=board.getContext('2d');ctx.fillStyle=C.paper;ctx.fillRect(0,0,1800,1200);
  D.text(ctx,'趣味闯关 / 视觉风格提案 01',64,56,21,C.lake,600);D.text(ctx,'从家乡出发。',64,110,76,C.ink,700);D.text(ctx,'沿着一条小路，走进四个知识主题。',68,214,26,C.muted);
  D.text(ctx,'湖蓝与暖橙 · 平面套色插画 · 面向10—16岁',68,265,22,C.ink);
  D.imageCover(ctx,images.landscape,780,60,956,440,24);
  D.text(ctx,'色彩 / 控件 / 字体',64,363,27,C.ink,700);
  [['湖蓝',C.lake],['暖橙',C.orange],['纸白',C.paper],['墨色',C.ink]].forEach(([label,color],i)=>{const x=68+i*167;D.rounded(ctx,x,416,140,82,16,color,C.line);D.text(ctx,label,x,518,19,C.ink,600);D.text(ctx,color.toUpperCase(),x,549,17,C.muted);});
  D.line(ctx,[[64,603],[1736,603]],C.line,1);
  D.text(ctx,'共同的形状语言',64,640,31,C.ink,700);D.text(ctx,'瓦屋、书页、稻穗、山水；同一笔触，四种主题。',64,693,22,C.muted);
  THEMES.forEach((theme,i)=>{const x=68+i*171;D.rounded(ctx,x,760,145,139,16,C.surface,C.line);D.motif(ctx,theme.motif,x+45,780,55);D.text(ctx,theme.name,x+72,853,21,C.ink,600,'center');});
  D.text(ctx,'页面标题 32 / 700',68,952,31,C.ink,700);D.text(ctx,'题目正文 24 / 600 · 选项正文 16 / 400',68,1007,23,C.ink);D.text(ctx,'辅助文字 14—16 · 统一12/16圆角 · 胶囊下方保留安全区',68,1054,19,C.muted);
  D.rounded(ctx,790,648,946,475,24,C.surface,C.line);
  D.text(ctx,'界面有反馈，内容留得住',828,686,33,C.ink,700);
  D.rounded(ctx,832,761,389,73,12,C.lake);D.text(ctx,'开始闯关',1026,782,26,C.surface,600,'center');
  D.rounded(ctx,1243,761,451,73,12,C.lakeLight,C.lake);D.text(ctx,'A   把游玩垃圾带走',1267,784,23,C.ink,600);
  D.rounded(ctx,832,871,862,90,16,C.paper,C.line);D.text(ctx,'当前关卡 / 已通关 / 未解锁 / 今日锁定',866,899,24,C.ink,600);
  D.text(ctx,'普通场景不含文字与按钮；交互元素保持独立。',834,1000,21,C.muted);D.text(ctx,'草案供审阅，正式题库、平台行为与真机效果尚待验证。',834,1043,20,C.muted);
  fs.writeFileSync(path.join(out,'styleboard-v1.png'),board.toBuffer('image/png'));
  const sheet=createCanvas(2100,1150),sc=sheet.getContext('2d');sc.fillStyle=C.paper;sc.fillRect(0,0,2100,1150);
  D.text(sc,'趣味闯关 · 五个关键画面',56,48,49,C.ink,700);D.text(sc,'独立状态样板 / 湖蓝＋暖橙 / 单题时限未定 / 未连接真实分享与结算',58,116,23,C.muted);
  frames.forEach((f,i)=>{const x=56+i*403;D.rounded(sc,x-2,191,379,816,24,C.surface,C.line);sc.save();D.rounded(sc,x,193,375,812,22);sc.clip();sc.drawImage(f,x,193,375,812);sc.restore();D.text(sc,F.screens[i].name,x,1034,23,C.ink,600);});
  fs.writeFileSync(path.join(out,'key-screens-v1.png'),sheet.toBuffer('image/png'));
  console.log('Rendered styleboard, five 750×1624 key screens, and overview from the actual renderer.');
}
run().catch(error=>{console.error(error);process.exit(1)});
