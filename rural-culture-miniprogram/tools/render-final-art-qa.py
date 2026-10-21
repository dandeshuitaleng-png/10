"""Compose actual browser captures for art review; never modifies runtime assets."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
project=Path(__file__).resolve().parents[1]
qa=project/'qa/final-art-20261019'
before=project/'qa/art-direction-review-20261019'
font='/System/Library/Fonts/STHeiti Medium.ttc'
def f(s):return ImageFont.truetype(font,s)
themes=[('red','十步芳草','朱红 · 乡土故事'),('culture','千年文脉','棕纸 · 文化阅读'),('industry','金色产业','谷金 · 丰收探索'),('ecology','青山绿水','草绿 · 自然漫游')]
def panel(src,dst,title_a='统稿前',title_b='本轮定稿',crop=None):
 a,b=Image.open(src).convert('RGB'),Image.open(dst).convert('RGB')
 assert a.size==b.size,(src,a.size,dst,b.size)
 if crop:a=a.crop(crop);b=b.crop(crop)
 w,h=a.size;out=Image.new('RGB',(w*2+36,h+66),'#f3f0e8');d=ImageDraw.Draw(out)
 d.text((12,14),title_a,font=f(20),fill='#5c503d');d.text((w+24,14),title_b,font=f(20),fill='#5c503d')
 out.paste(a,(12,54));out.paste(b,(w+24,54));return out
sources=['01-red-home.jpg','02-culture-home.jpg','03-industry-home.jpg','04-ecology-home.jpg']
comparison=[]
for (theme,_,_),source in zip(themes,sources):
 p=qa/f'comparison-{theme}-home.png';panel(before/source,qa/f'{theme}-home-375.jpg').save(p);comparison.append(str(p.relative_to(project)))
panel(before/'05-ecology-rules.jpg',qa/'ecology-rules-375.jpg').save(qa/'comparison-ecology-rules.png')
panel(before/'04-ecology-home.jpg',qa/'ecology-home-375.jpg',crop=(30,545,365,788)).save(qa/'comparison-focus-current-and-button.png')
panel(before/'05-ecology-rules.jpg',qa/'ecology-rules-375.jpg',crop=(20,80,355,453)).save(qa/'comparison-focus-banner-and-rules.png')
# One final design across four themes. No alternate concept or selection UI.
out=Image.new('RGB',(1600,1016),'#f3f0e8');d=ImageDraw.Draw(out)
d.text((32,24),'趣味闯关｜四主题美术定稿',font=f(30),fill='#4a4232')
d.text((32,67),'保留原始 IP 与标题 · 统一温润石质底座、纸面卡片和主题按钮',font=f(18),fill='#786e5b')
for i,(theme,name,desc) in enumerate(themes):
 x=32+i*391;d.text((x,112),name,font=f(23),fill='#4a4232');d.text((x,145),desc,font=f(16),fill='#786e5b')
 out.paste(Image.open(qa/f'{theme}-home-375.jpg').convert('RGB'),(x,179))
out.save(qa/'四主题美术定稿.png')
inner=Image.new('RGB',(1600,910),'#f3f0e8');d=ImageDraw.Draw(inner)
for i,(theme,name,_) in enumerate(themes):
 x=32+i*391;d.text((x,22),name+' · 闯关须知',font=f(23),fill='#4a4232')
 inner.paste(Image.open(qa/f'{theme}-rules-375.jpg').convert('RGB'),(x,66))
inner.save(qa/'四主题内页定稿.png')
matrix=Image.new('RGB',(1024,3072),'#f3f0e8');d=ImageDraw.Draw(matrix)
for row,(theme,name,_) in enumerate(themes):
 for col,(w,h) in enumerate([(320,568),(375,812),(430,932)]):
  im=Image.open(qa/f'{theme}-home-{w}.jpg').convert('RGB');assert im.size==(w,h)
  x=16+col*336;y=14+row*765;d.text((x,y),f'{name} {w}×{h}',font=f(18),fill='#4a4232')
  im.thumbnail((320,710));matrix.paste(im,(x,y+34))
matrix.save(qa/'适配检查汇总.png')
record={'sourceViewport':[375,812],'implementationViewport':[375,812],'sourceAndImplementationPixels':[375,812],'captureDensity':1,'comparisonNormalization':'equal CSS viewport and pixels; no device frame','homeComparisons':comparison,'rulesComparison':'qa/final-art-20261019/comparison-ecology-rules.png','focusedComparisons':['qa/final-art-20261019/comparison-focus-current-and-button.png','qa/final-art-20261019/comparison-focus-banner-and-rules.png'],'responsiveCaptureCount':12}
(qa/'comparison-evidence.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(record,ensure_ascii=False,indent=2))
