"""Package the four verified one-minute native videos without changing their media."""
from pathlib import Path
import json, hashlib, zipfile

root=Path(__file__).resolve().parents[1]
names={'red':'十步芳草','culture':'千年文脉','industry':'金色产业','ecology':'青山绿水'}
reports=[]
for theme,name in names.items():
    meta=json.loads((root/('qa/'+theme+'-natural-video-20261020/delivery.json')).read_text())
    file=Path(meta['output'])
    assert meta['durationSeconds']==60 and meta['frames']==1800 and meta['fps']==30
    assert meta['fullDecodePassed'] and not meta['subtitles'] and not meta['audio'] and not meta['addedOverlays']
    assert file.stat().st_size==meta['bytes'] and hashlib.sha256(file.read_bytes()).hexdigest()==meta['sha256']
    reports.append({'theme':theme,'name':name,'file':str(file),'durationSeconds':60,'subtitles':False,'movementSpeedMultiplier':meta['movementSpeedMultiplier'],'bytes':meta['bytes'],'sha256':meta['sha256']})

output=root.parent/'交付/四主题-一分钟展示视频-无字幕-20261020.zip'
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_STORED) as bundle:
    for report in reports:
        file=Path(report['file']);bundle.write(file,file.name)
with zipfile.ZipFile(output) as bundle:
    assert len(bundle.infolist())==4 and bundle.testzip() is None
report={'videos':reports,'archive':str(output),'archiveBytes':output.stat().st_size,'scope':'Current native window recordings. Independent recording data; source catalog, accounts, business API and real player progress are untouched. Only cuts, crops, scaling and light acceleration. No subtitles or overlays.'}
(root/'qa/theme-videos-20261020.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'archive':str(output),'files':len(reports),'bytes':output.stat().st_size},ensure_ascii=False,indent=2))
