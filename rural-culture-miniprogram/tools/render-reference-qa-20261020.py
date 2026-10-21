"""Normalize full CDP captures for QA; never edits application art."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
p=Path(__file__).resolve().parents[1];q=p/'qa/reference-unified-20261020';src=p/'design-source/reference-unified-20261020'
e=json.loads((q/'exact-captures.json').read_text());records={x['name']:x for group in ['homes','inners','states'] for x in e[group]}
for name,r in records.items():
 im=Image.open(r['raw']).convert('RGB');w,h=r['target'].values();z=r['browserZoom']
 assert abs(im.width-w*z)<2 and abs(im.height-h*z)<2,(name,im.size,(w,h),z)
 im.resize((w,h),Image.Resampling.LANCZOS).save(r['file'],quality=94)
font='/System/Library/Fonts/STHeiti Medium.ttc'
def f(n):return ImageFont.truetype(font,n)
def label(d,pos,text,size=21,color='#33442b'):d.text(pos,text,font=f(size),fill=color)
themes=[('red','十步芳草','明亮橙红 · 暖白面板'),('culture','千年文脉','焦糖木棕 · 奶油面板'),('industry','金色产业','明黄谷金 · 浅麦面板'),('ecology','青山绿水','鲜叶绿 · 浅绿面板')]
for kind,title,sub in [('home','四主题 · 参考风格修订','同一套卡通材质与组件；保留原有标题和智小谷'),('rules','四主题 · 闯关须知','底色、边框与按钮延续各主题首页'),('quiz','四主题 · 答题页','白色信息卡、主题色边框与统一操作层级')]:
 out=Image.new('RGB',(1600,1008),'#f5f8f0');d=ImageDraw.Draw(out);label(d,(28,22),title,30);label(d,(28,65),sub,18,'#65755d')
 for i,(t,n,desc) in enumerate(themes):
  x=26+i*393;label(d,(x,108),n,23);label(d,(x,141),desc,16,'#65755d');out.paste(Image.open(q/f'{t}-{kind}-375.jpg'),(x,178))
 out.save(q/f'四主题{dict(home="首页",rules="须知",quiz="答题")[kind]}修订.png')
out=Image.new('RGB',(1024,3072),'#f5f8f0');d=ImageDraw.Draw(out)
for row,(t,n,_) in enumerate(themes):
 for col,(w,h) in enumerate([(320,568),(375,812),(430,932)]):
  im=Image.open(q/f'{t}-home-{w}.jpg');assert im.size==(w,h);im.thumbnail((320,710));x=16+col*336;y=14+row*765;label(d,(x,y),f'{n} {w}×{h}',18);out.paste(im,(x,y+34))
out.save(q/'十二组尺寸检查.png')
# Reference and implementation have different layouts. These boards compare style only.
a=Image.open(src/'reference-crops/green-frame-and-title.png').convert('RGB');a.thumbnail((730,650))
out=Image.new('RGB',(1560,990),'#f5f8f0');d=ImageDraw.Draw(out);label(d,(24,20),'参考风格核对 · 非布局复刻 / 非第二套方案',28);label(d,(24,66),'用户原参考：绿色互动面板',20);out.paste(a,(24,108));label(d,(790,66),'实际页面：青山绿水首页与须知',20);out.paste(Image.open(q/'ecology-home-375.jpg'),(780,108));out.paste(Image.open(q/'ecology-rules-375.jpg'),(1169,108));label(d,(24,800),'核对：鲜叶绿外框、浅绿面板、白卡、浅黄绿至薄荷绿按钮',19);label(d,(24,838),'沿用现有手机端布局、主题标题与二维智小谷；参考的是色彩和材质语言。',17);out.save(q/'参考与实际风格核对.png')
out=Image.new('RGB',(1420,930),'#f5f8f0');d=ImageDraw.Draw(out);label(d,(20,20),'局部核对 · 卡通插画 / 面板与按钮',28)
for i,name in enumerate(['farm-tea','farm-garden','farm-orchard','farm-lotus']):
 im=Image.open(src/f'reference-crops/{name}.png').convert('RGB');im.thumbnail((250,190));out.paste(im,(20+i*270,75))
label(d,(20,270),'参考原图中的农场插画缩略图',19)
for i,(t,n,_) in enumerate(themes):
 im=Image.open(q/f'{t}-home-375.jpg').crop((0,250,375,650));im.thumbnail((250,300));out.paste(im,(20+i*270,310));label(d,(20+i*270,610),n+'实际地图',18)
im=Image.open(q/'ecology-rules-375.jpg');out.paste(im.crop((20,450,355,735)).resize((335,285)),(1065,310));label(d,(1065,610),'实际须知与按钮',18)
label(d,(20,700),'材质：圆润边缘、清楚的明暗分区、少量高光和接触阴影；不增加写实石材纹理。',19)
label(d,(20,744),'标题与 IP 保留原素材。参考截图不包含四主题的精确手机稿，未宣称像素级一致。',18)
out.save(q/'局部风格核对.png')
(q/'capture-method.json').write_text(json.dumps({'count':len(records),'homeSizes':12,'method':'CUA scoped CDP capture, complete game-device bounds; raw clip in DIP, normalized to target CSS pixel dimensions for review. Per-capture browser zoom is stored in exact-captures.json (1 or 1.1); no browser zoom preference is changed. No stretched clipped wrapper captures used.','referenceScope':'Supplied desktop panel and farm thumbnails used as palette/material reference, not same-layout pixel clone.','outputs':[str(x.relative_to(p)) for x in q.glob('*修订.png')]},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'screens':len(records),'boards':6},ensure_ascii=False))
