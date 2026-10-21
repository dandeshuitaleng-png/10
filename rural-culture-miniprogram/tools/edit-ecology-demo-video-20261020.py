"""Window recording -> clean simulator crop, no captions or added overlays."""
from pathlib import Path
import json,subprocess,hashlib,re
root=Path(__file__).resolve().parents[1];qa=root/'qa/ecology-demo-video-20261020';ff=(qa/'ffmpeg-path.txt').read_text();out=root.parent/'交付/青山绿水-演示视频-无字幕-20261020.mp4'
inputs=[('native-window','recording.json'),('native-tail','tail-recording.json')];pieces=[]
for index,(name,meta) in enumerate(inputs):
 source=json.loads((qa/meta).read_text());geometry=json.loads((qa/(name+'-geometry.json')).read_text())['groups']
 for scene in source['sections']:
  for gi,g in enumerate(geometry):
   # Exclude a brief adjustment interval around actual simulator-window resize events.
   low=g['start']+(1 if gi else 0);high=g['end']-(1 if gi<len(geometry)-1 else 0)
   a=max(scene['start'],low);b=min(scene['end'],high)
   if b-a>=.5:pieces.append({'input':index,'name':scene['name'],'start':a,'end':b,'crop':g['rect']})
filters=[]
for index in range(len(inputs)):
 ids=[i for i,p in enumerate(pieces) if p['input']==index];filters.append(f'[{index}:v]split={len(ids)}'+''.join(f'[s{i}]' for i in ids))
for i,p in enumerate(pieces):
 x,y,w,h=p['crop'];filters.append(f"[s{i}]trim=start={p['start']:.3f}:end={p['end']:.3f},setpts=PTS-STARTPTS,crop={w}:{h}:{x}:{y}:exact=1,scale=696:1504:flags=lanczos,setsar=1,fps=30[v{i}]")
filters.append(''.join(f'[v{i}]' for i in range(len(pieces)))+f'concat=n={len(pieces)}:v=1:a=0[outv]');(qa/'edit-filter.txt').write_text(';\n'.join(filters)+'\n')
cmd=[ff,'-hide_banner','-y']
for name,_ in inputs:cmd+=['-i',str(qa/(name+'.mov'))]
cmd+=['-filter_complex_script',str(qa/'edit-filter.txt'),'-map','[outv]','-an','-sn','-dn','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-map_metadata','-1',str(out)]
(qa/'selected-pieces.json').write_text(json.dumps(pieces,ensure_ascii=False,indent=2)+'\n')
with (qa/'encode.log').open('w') as log:r=subprocess.run(cmd,stdout=log,stderr=log)
if r.returncode:raise RuntimeError((qa/'encode.log').read_text()[-4000:])
r=subprocess.run([ff,'-hide_banner','-i',str(out),'-f','null','-'],capture_output=True,text=True);(qa/'decode-check.log').write_text(r.stderr);assert r.returncode==0
match=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',r.stderr);duration=int(match[1])*3600+int(match[2])*60+float(match[3]);assert duration>60 and 'Subtitle:' not in r.stderr
subprocess.run([ff,'-v','error','-y','-ss','3','-i',str(out),'-frames:v','1','-update','1',str(qa/'poster.png')],check=True)
report={'output':str(out),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'durationSeconds':duration,'width':696,'height':1504,'fps':30,'subtitles':False,'addedOverlays':False,'audio':False,'source':'Two ScreenCaptureKit window-only recordings of the native WeChat simulator. Independent demo data.','editing':'Only crop, scale, trim and concatenate captured native frames. Repeated questions, failed profile take, setup waits and window-adjustment moments omitted.','pieces':pieces,'fullDecodePassed':True}
(qa/'delivery.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['output','bytes','durationSeconds','subtitles','fullDecodePassed']},ensure_ascii=False,indent=2))
