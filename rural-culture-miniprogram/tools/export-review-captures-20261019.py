from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
root=Path(__file__).resolve().parents[1];qa=root/'qa/visual-plan-20261019';src=qa/'screenshots'
for index in ['capture-boxes.json','state-capture-boxes.json']:
    for c in json.loads((qa/index).read_text()):
        full=Image.open(qa/'full-captures'/f"{c['filename']}.png");scale=full.width/c['width']
        for b in c['frames']:
            if index.startswith('state') and b['id']!='a':continue
            x=round(b['left']*scale);y=round((b['top']+c['scrollTop'])*scale);w=round(b['width']*scale);h=round(b['height']*scale)
            assert x>=0 and y>=0 and x+w<=full.width and y+h<=full.height,(c['filename'],b,full.size)
            cropped=full.crop((x,y,x+w,y+h))
            filename=f"{c['filename']}.png" if index.startswith('state') else c['filename'].replace('-',f"-{b['id']}-",1)+'.png'
            cropped.save(src/filename)
font=ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',22)
board=Image.new('RGB',(1368,1590),'#f0f2ed');draw=ImageDraw.Draw(board)
for col,(theme,name) in enumerate({'red':'十步芳草','culture':'千年文脉','industry':'金色产业','ecology':'青山绿水'}.items()):
    for row,v in enumerate(['a','b']):
        im=Image.open(src/f'{theme}-{v}-375.png').convert('RGB');im.thumbnail((300,690));x=30+col*327;y=55+row*780;draw.text((x,y-37),name+' · '+v.upper(),fill='#28523a',font=font);board.paste(im,(x,y))
board.save(qa/'八张首页设计稿.png')
a=Image.open(src/'ecology-a-375.png').convert('RGB');b=Image.open(src/'ecology-b-375.png').convert('RGB');pair=Image.new('RGB',(a.width+b.width+30,max(a.height,b.height)+45),'#f3f5ef');d=ImageDraw.Draw(pair);d.text((12,5),'A · 插画漫游',font=font,fill='#28523a');d.text((a.width+28,5),'B · 清新手记',font=font,fill='#28523a');pair.paste(a,(0,45));pair.paste(b,(a.width+30,45));pair.save(qa/'青山绿水-卡通风格对照.png')
print('Exported 24 complete home screenshots and 48 complete inner-state screenshots from full browser captures.')
