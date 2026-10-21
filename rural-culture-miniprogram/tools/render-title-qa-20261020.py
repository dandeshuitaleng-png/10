"""Compose full real captures and title crops for the targeted alignment fix."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,shutil
p=Path(__file__).resolve().parents[1];q=p/'qa/title-centering-20261020';r=p/'qa/reference-unified-20261020'
e={x['name']:x for x in json.loads((q/'captures.json').read_text())};f=ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',20)
for x in e.values():
 im=Image.open(x['raw']).convert('RGB');w,h=x['target'].values();assert abs(im.width-w*x['browserZoom'])<2 and abs(im.height-h*x['browserZoom'])<2
 im.resize((w,h),Image.Resampling.LANCZOS).save(x['file'],quality=94)
for kind in ['home','rules','quiz']:
 out=Image.new('RGB',(1532,215),'#f4f7ef');d=ImageDraw.Draw(out)
 for i,(t,n) in enumerate([('red','十步芳草'),('culture','千年文脉'),('industry','金色产业'),('ecology','青山绿水')]):
  x=e[f'{t}-{kind}-375'];im=Image.open(x['file']);y=max(0,round(x['text']['y']-(38 if kind=='home' else 55)))
  out.paste(im.crop((0,y,375,y+160)),(i*383,45));d.text((i*383+10,10),n,font=f,fill='#304529')
 out.save(q/f'{kind}-title-check.png')
out=Image.new('RGB',(1338,540),'#f4f7ef');d=ImageDraw.Draw(out)
for row,(w,h) in enumerate([(320,568),(375,812),(430,932)]):
 for col,(t,n) in enumerate([('red','十步芳草'),('culture','千年文脉'),('industry','金色产业'),('ecology','青山绿水')]):
  x=e[f'{t}-home-{w}'];im=Image.open(x['file']);y=round(x['text']['y']-38);im=im.crop((0,y,w,y+130));im.thumbnail((324,130));d.text((col*334+8,row*180+8),f'{n} {w}px',font=f,fill='#304529');out.paste(im,(col*334,row*180+42))
out.save(q/'三尺寸标题检查.png')
# Refresh linked current overview boards; retain the unaffected previous state evidence.
old=r/'exact-captures.json';backup=q/'before/reference-captures.json'
if not backup.exists():shutil.copy2(old,backup)
b=json.loads(old.read_text())
for x in e.values():
 n=x['name'];group='homes' if '-home-' in n else 'inners' if n.endswith('-375') else 'states';x=dict(x);x['file']=str((r/(n+'.jpg')).resolve());b[group]=[y for y in b[group] if y['name']!=n];b[group].append(x)
old.write_text(json.dumps(b,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'currentTitleCaptures':len(e),'homeSizes':12,'contexts':['home','rules','quiz','correct']},ensure_ascii=False))
