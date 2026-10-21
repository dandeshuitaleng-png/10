"""Extract original vector paths from the supplied PDF. No generated replacement art."""
from pathlib import Path
from pypdf import PdfReader
import copy, re, json
from pypdf.generic import ContentStream
root=Path(__file__).resolve().parents[2]
source=root/'品牌素材/客户提供-20261016'
out=source/'提取素材';out.mkdir(exist_ok=True)
r=PdfReader(source/'智小谷IP形象延展设计.pdf')
def mult(a,b):
 A,B,C,D,E,F=a;g,h,i,j,k,l=b
 return [A*g+C*h,B*g+D*h,A*i+C*j,B*i+D*j,A*k+C*l+E,B*k+D*l+F]
def fmt(v):return ('%.4f'%float(v)).rstrip('0').rstrip('.') or '0'
def color(a):return 'rgb('+','.join(str(round(float(x)*255)) for x in a)+')'
def vector(page,start,stop,name,box):
 ops=ContentStream(page.get_contents(),r).operations
 state={'matrix':[1,0,0,1,0,0],'fill':'#000','stroke':'#000','width':1,'join':0,'cap':0};stack=[];paths=[];d=[];last=(0,0)
 for idx,(args,op) in enumerate(ops):
  a=[float(x) for x in args] if op in [b'cm',b'rg',b'RG',b'g',b'G',b'w',b'j',b'J',b'm',b'l',b'c',b'v',b'y',b're'] else args
  if op==b'q':stack.append(copy.deepcopy(state))
  elif op==b'Q':
   if stack:state=stack.pop()
  elif op==b'cm':state['matrix']=mult(state['matrix'],a)
  elif op==b'rg':state['fill']=color(a)
  elif op==b'RG':state['stroke']=color(a)
  elif op==b'g':state['fill']=color(a*3)
  elif op==b'G':state['stroke']=color(a*3)
  elif op==b'w':state['width']=a[0]
  elif op==b'j':state['join']=a[0]
  elif op==b'J':state['cap']=a[0]
  elif op in [b'm',b'l']:
   d.append(op.decode().upper()+' '+' '.join(map(fmt,a)));last=tuple(a)
  elif op==b'c':d.append('C '+' '.join(map(fmt,a)));last=tuple(a[-2:])
  elif op==b'v':d.append('C '+' '.join(map(fmt,[*last,*a])));last=tuple(a[-2:])
  elif op==b'y':d.append('C '+' '.join(map(fmt,[*a,*a[-2:]])));last=tuple(a[-2:])
  elif op==b'h':d.append('Z')
  elif op==b're':
   x,y,w,h=a;d.append(f'M {fmt(x)} {fmt(y)} h {fmt(w)} v {fmt(h)} h {fmt(-w)} Z')
  elif op in [b'f',b'f*',b'F',b'S',b's',b'B',b'B*',b'b',b'b*',b'n']:
   if start<=idx<stop and op!=b'n' and d:
    if op in [b's',b'b',b'b*']:d.append('Z')
    fill=state['fill'] if op not in [b'S',b's'] else 'none'
    stroke=state['stroke'] if op in [b'S',b's',b'B',b'B*',b'b',b'b*'] else 'none'
    paths.append('<path d="'+' '.join(d)+'" transform="matrix('+' '.join(map(fmt,state['matrix']))+')" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+fmt(state['width'])+'" stroke-linejoin="'+{0:'miter',1:'round',2:'bevel'}.get(state['join'],'round')+'" stroke-linecap="'+{0:'butt',1:'round',2:'square'}.get(state['cap'],'round')+'" fill-rule="'+('evenodd' if b'*' in op else 'nonzero')+'"/>')
   d=[]
 x,y,w,h=box
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" width="{w}" height="{h}"><title>智小谷 · 客户提供原始矢量形象</title><g transform="translate(0 1080) scale(1 -1)">'+''.join(paths)+'</g></svg>'
 (out/(name+'.svg')).write_text(svg)
 print(name,len(paths))
vector(r.pages[2],63,960,'智小谷-荷叶探索',(760,130,580,590))
vector(r.pages[4],98,730,'智小谷-阅读同行',(790,130,410,590))
(source/'素材来源.json').write_text(json.dumps({'IP原件':'智小谷IP形象延展设计.pdf','提取方式':'直接提取第3页和第5页二维矢量路径，去除演示版式背景，未生成替代角色。','logo原件':'农家书屋logo转曲(1).zip','用途':'知识探索原型中的引导、反馈与品牌标识'},ensure_ascii=False,indent=2)+'\n')
