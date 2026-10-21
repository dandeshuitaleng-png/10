"""Locate the simulator screen inside the window-only recording; no content replacement."""
from pathlib import Path
import json,subprocess
import numpy as np
root=Path(__file__).resolve().parents[1];qa=root/'qa/ecology-demo-video-20261020';ff=(qa/'ffmpeg-path.txt').read_text()
for name in ['native-window','native-tail']:
 raw=qa/(name+'.mov');metadata=qa/(name+'.mov.json')
 if not raw.exists() or not metadata.exists():continue
 meta=json.loads(metadata.read_text());w=meta['width']//2;h=meta['height']//2;size=w*h*3
 process=subprocess.Popen([ff,'-v','error','-threads','1','-i',str(raw),'-vf',f'fps=1:start_time=0,scale={w}:{h}','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE)
 rows=[]
 while True:
  data=b''
  while len(data)<size:
   chunk=process.stdout.read(size-len(data))
   if not chunk:break
   data+=chunk
  if len(data)<size:break
  a=np.frombuffer(data,dtype=np.uint8).reshape(h,w,3).astype(np.int16);r,g,b=[a[:,:,i] for i in range(3)];mask=(g-r>=4)&(g-b>=4)&(g>60)
  cols=np.flatnonzero(mask[70:-40].sum(0)>70)
  if len(cols)<150:
   rows.append({'time':len(rows),'rect':None});continue
  x0,x1=int(cols[0]),int(cols[-1])+1;ys=np.flatnonzero(mask[:,x0:x1].sum(1)>(x1-x0)*.18);ys=ys[ys>65];y0,y1=int(ys[0]),int(ys[-1])+1
  rows.append({'time':len(rows),'rect':[max(0,x0*2-1),max(0,y0*2-1),(x1-x0)*2+2,(y1-y0)*2+2]})
 assert process.wait()==0
 groups=[];start=0;values=[]
 for i,row in enumerate(rows):
  if row['rect'] is None:
   if values:groups.append({'start':start,'end':i,'rect':[int(np.median([x[k] for x in values])) for k in range(4)]})
   values=[];start=i+1;continue
  if not values:start=i
  if values and max(abs(int(np.median([x[k] for x in values]))-row['rect'][k]) for k in range(4))>10:
   groups.append({'start':start,'end':i,'rect':[int(np.median([x[k] for x in values])) for k in range(4)]});start=i;values=[]
  values.append(row['rect'])
 if values:groups.append({'start':start,'end':meta['elapsedSeconds'],'rect':[int(np.median([x[k] for x in values])) for k in range(4)]})
 (qa/(name+'-geometry.json')).write_text(json.dumps({'source':str(raw),'samples':rows,'groups':groups},indent=2)+'\n')
 print(name,json.dumps(groups))
