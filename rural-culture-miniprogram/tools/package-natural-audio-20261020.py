"""Current four independent sources, natural audio materials and bounded QA."""
from pathlib import Path
import datetime, hashlib, json, zipfile

root=Path(__file__).resolve().parent.parent
delivery=root.parent/'交付'
qa=root/'qa/audio-natural-20261020'
target=delivery/'四主题独立工程-自然声音修订-20261020.zip'
entries={}
def add(source,name):
    source=Path(source)
    assert source.is_file() and name not in entries,(source,name)
    entries[name]=source

for theme in ['十步芳草','千年文脉','金色产业','青山绿水']:
    base=delivery/'微信小程序四套'/theme
    assert json.loads((base/'miniprogram/app.json').read_text())['pages']==['pages/game/index']
    for name in ['project.config.json','README.md']:
        add(base/name,f'独立工程/{theme}/{name}')
    for f in sorted((base/'miniprogram').rglob('*')):
        if f.is_file() and f.name!='.DS_Store' and not f.name.startswith('.env'):
            assert f.suffix not in {'.db','.sqlite','.sqlite3','.log'}
            add(f,f'独立工程/{theme}/{f.relative_to(base)}')
add(delivery/'微信小程序四套/交付入口.md','说明/交付入口.md')
add(root/'docs/20261020-自然材质声音修订.md','说明/20261020-自然材质声音修订.md')
add(delivery/'声音试听-自然材质修订-20261020.mp3','声音试听-自然材质-12秒.mp3')
qr=delivery/'青山绿水-自然声音修订-扫码试听-20261020.png'
if qr.is_file():add(qr,'扫码试听/青山绿水.png')
for f in sorted((root/'design-source/audio-natural-20261020').rglob('*')):
    if f.is_file():add(f,'声音来源/'+str(f.relative_to(root/'design-source/audio-natural-20261020')))
for name in ['audio-analysis.json','compile.json','sync.json','regression.log','page-regression.log','wechat-preview.json','verification.json']:
    add(qa/name,'验证记录/'+name)
checks=json.loads((qa/'native/checks.json').read_text())
assert checks['passed'] and len(checks['checks'])==4
for name in ['checks.json','native-decode.json']:
    add(qa/'native'/name,'验证记录/原生/'+name)
for check in checks['checks']:
    assert check['passed']
    add(qa/'native'/check['screenshot'],'验证记录/原生/'+check['screenshot'])
for name in ['build-natural-audio-20261020.py','package-natural-audio-20261020.py','sync-feedback-20261019.cjs','check-audio-native-20261020.cjs']:
    add(root/'tools'/name,'开发参考/tools/'+name)
add(root/'tests/audio.test.cjs','开发参考/tests/audio.test.cjs')
assert all('平台总入口' not in name for name in entries)
manifest={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Four independent sources; no portal, databases, player data or private devtools config. Current natural-material cues; device listening is not asserted.','files':[{'path':name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for name,f in sorted(entries.items())]}
temp=target.with_suffix('.zip.tmp')
with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED) as z:
    for name,f in sorted(entries.items()):z.write(f,name)
    z.writestr('文件校验清单.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(temp) as z:
    assert z.testzip() is None
    for f in manifest['files']:assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256'],f['path']
temp.replace(target)
result={'passed':True,'file':str(target),'bytes':target.stat().st_size,'files':len(entries)+1,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceReadbackVerified':True,'portalIncluded':False}
(qa/'package-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
