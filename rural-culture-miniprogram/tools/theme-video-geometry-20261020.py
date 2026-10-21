"""Locate the simulator screen inside the window-only recording; no content replacement."""
from pathlib import Path
import json,subprocess,sys
import numpy as np
root=Path(__file__).resolve().parents[1];theme=sys.argv[1];assert theme in ['culture','red','industry'];qa=root/('qa/'+theme+'-natural-video-20261020');ff=(root/'qa/ecology-demo-video-20261020/ffmpeg-path.txt').read_text().strip()
for name in ['native']:
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
  a=np.frombuffer(data,dtype=np.uint8).reshape(h,w,3).astype(np.int16);r,g,b=[a[:,:,i] for i in range(3)];bright=np.maximum(np.maximum(r,g),b);background=a[min(220,h-1),20];mask=(np.max(np.abs(a-background),axis=2)>30)&(bright>30)
  counts=mask[70:-40].sum(0);cols=np.flatnonzero(counts>max(70,counts.max()*.22))
  if len(cols)<150:
   rows.append({'time':len(rows),'rect':None});continue
  runs=np.split(cols,np.flatnonzero(np.diff(cols)>1)+1);cols=max(runs,key=len);x0,x1=int(cols[0]),int(cols[-1])+1;ys=np.flatnonzero(mask[:,x0:x1].sum(1)>(x1-x0)*.18);ys=ys[ys>65];runs=np.split(ys,np.flatnonzero(np.diff(ys)>1)+1);ys=max(runs,key=len);y0,y1=int(ys[0]),int(ys[-1])+1
  rows.append({'time':len(rows),'rect':[max(0,x0*2-1),max(0,y0*2-1),(x1-x0)*2+2,(y1-y0)*2+2]})
 assert process.wait()==0
 # Modal dimming changes the brightness mask near the lower screen edge. The
 # physical phone retains its size while its horizontal bounds stay unchanged.
 # Use the median of frames at that exact window scale, preserving real resizes.
 measured=[row['rect'][:] if row['rect'] else None for row in rows]
 for row in rows:
  if row['rect'] is None:continue
  rect=row['rect'];peers=[r for r in measured if r is not None and abs(r[0]-rect[0])<6 and abs(r[1]-rect[1])<6 and abs(r[2]-rect[2])<6]
  if len(peers)>=3:row['rect']=[int(np.median([r[k] for r in peers])) for k in range(4)]
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
