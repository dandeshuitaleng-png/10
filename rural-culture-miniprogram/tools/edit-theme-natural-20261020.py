"""Cut command/read waits, then gently accelerate native UI footage to 60 seconds."""
from pathlib import Path
import json, subprocess, re, hashlib, sys

root=Path(__file__).resolve().parents[1]
theme=sys.argv[1]
assert theme in ['culture','red','industry']
names={'culture':'千年文脉','red':'十步芳草','industry':'金色产业'}
qa=root/('qa/'+theme+'-natural-video-20261020')
ff=(root/'qa/ecology-demo-video-20261020/ffmpeg-path.txt').read_text().strip()
recording=json.loads((qa/'recording.json').read_text())
events=json.loads((qa/'actions.json').read_text())['events']
geometry=json.loads((qa/'native-geometry.json').read_text())['groups']
pieces=[]
for scene in recording['sections']:
    # Keep actions and their immediate visual response. Remove gaps occupied by
    # assertions/reads; all retained frames are actual window-capture frames.
    windows=[[scene['start'],scene['start']+(.75 if scene['name']=='home' else .25)]]
    for event in events:
        if event['tool']!='automation_element_action' or not scene['start']<=event['start']<scene['end']:
            continue
        note=event['note']
        hold=1.1 if note=='actor' else .8 if note in ['submit','open-share','result','start','certificate-detail','certificate-top'] else .55
        windows.append([max(scene['start'],event['start']-.15),min(scene['end'],event['end']+hold)])
    merged=[]
    for start,end in sorted(windows):
        if merged and start-merged[-1][1]<.2:
            merged[-1][1]=max(merged[-1][1],end)
        else:
            merged.append([start,end])
    for start,end in merged:
        group=next(g for g in geometry if g['start']<=start and end<=g['end'])
        pieces.append({'scene':scene['name'],'start':start,'end':end,'crop':group['rect']})

retained=sum(p['end']-p['start'] for p in pieces)
speed=retained/60
assert 1<=speed<=1.3, f'Revise cuts rather than excessively accelerating movement: {speed}'
filters=[f'[0:v]split={len(pieces)}'+''.join(f'[s{i}]' for i in range(len(pieces)))]
for i,piece in enumerate(pieces):
    x,y,w,h=piece['crop']
    filters.append(f"[s{i}]trim=start={piece['start']:.6f}:end={piece['end']:.6f},setpts=(PTS-STARTPTS)/{speed:.9f},crop={w}:{h}:{x}:{y}:exact=1,scale=696:1504:flags=lanczos,setsar=1,fps=30[v{i}]")
filters.append(''.join(f'[v{i}]' for i in range(len(pieces)))+f'concat=n={len(pieces)}:v=1:a=0,tpad=stop_mode=clone:stop_duration=1.0,trim=duration=60,fps=30[outv]')
filterfile=qa/'natural-edit-filter.txt'
filterfile.write_text(';\n'.join(filters)+'\n')
out=root.parent/('交付/'+names[theme]+'-一分钟自然节奏-无字幕-20261020.mp4')
cmd=[ff,'-hide_banner','-y','-i',recording['raw'],'-filter_complex_script',str(filterfile),'-map','[outv]','-an','-sn','-dn','-frames:v','1800','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-map_metadata','-1',str(out)]
with (qa/'encode.log').open('w') as log:
    subprocess.run(cmd,stdout=log,stderr=log,check=True)
check=subprocess.run([ff,'-hide_banner','-i',str(out),'-vf','blackdetect=d=0.2:pix_th=0.10:pic_th=0.95','-an','-f','null','-'],capture_output=True,text=True,check=True)
(qa/'decode-check.log').write_text(check.stderr)
assert 'Duration: 00:01:00.00' in check.stderr
assert re.search(r'frame=\s*1800',check.stderr)
assert 'black_start:' not in check.stderr and 'Subtitle:' not in check.stderr and 'Audio:' not in check.stderr
for second in [1,7,12,18,24,30,36,42,48,54,59]:
    subprocess.run([ff,'-v','error','-y','-ss',str(second),'-i',str(out),'-frames:v','1',str(qa/f'final-{second:02d}.png')],check=True)
report={'output':str(out),'durationSeconds':60,'frames':1800,'fps':30,'width':696,'height':1504,'sourceSelectedSeconds':retained,'movementSpeedMultiplier':speed,'subtitles':False,'addedOverlays':False,'audio':False,'edit':'Cut repeated questions, read/assertion waits and pauses, then apply a slight acceleration selected from the retained duration. All frames come from the current native recording.','pieces':pieces,'fullDecodePassed':True,'blackIntervals':[],'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
(qa/'delivery.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['output','durationSeconds','movementSpeedMultiplier','bytes','fullDecodePassed']},ensure_ascii=False,indent=2))
