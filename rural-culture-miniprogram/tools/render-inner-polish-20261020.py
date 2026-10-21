"""Compose actual native simulator captures only; no application image edits."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
p=Path(__file__).resolve().parents[1];q=p/'qa/inner-polish-20261020';font='/System/Library/Fonts/STHeiti Medium.ttc'
def f(s):return ImageFont.truetype(font,s)
themes=[('ecology','青山绿水'),('culture','千年文脉'),('red','十步芳草'),('industry','金色产业')]
for state,title in [('quiz','四主题答题 · 字体与图像位置修正'),('revive','四主题复活弹窗 · 字号与间距统一')]:
 out=Image.new('RGB',(1552,960),'#f4f7ef');d=ImageDraw.Draw(out);d.text((20,18),title,font=f(26),fill='#304529');d.text((20,58),'微信模拟器隔离排版样例，不写入真实学习记录',font=f(16),fill='#65755d')
 for i,(t,n) in enumerate(themes):
  im=Image.open(q/f'{t}-{state}.png').convert('RGB');im.thumbnail((370,820));x=20+i*383;d.text((x,97),n,font=f(21),fill='#304529');out.paste(im,(x,131))
 out.save(q/f'四主题{state}检查.png')
out=Image.new('RGB',(800,950),'#f4f7ef');d=ImageDraw.Draw(out);d.text((18,18),'内页细节修正 · 微信模拟器排版样例',font=f(24),fill='#304529')
for i,(state,title) in enumerate([('quiz','题干、顶部留白与角色'),('revive','弹窗字体、角色与间距')]):
 im=Image.open(q/f'ecology-{state}.png').convert('RGB');im.thumbnail((375,840));x=16+i*393;d.text((x,62),title,font=f(18),fill='#65755d');out.paste(im,(x,94))
out.save(q/'内页细节修正.png')
