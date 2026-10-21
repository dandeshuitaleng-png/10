"""Four independent projects with their current audio settings UI and evidence."""
from pathlib import Path
import datetime,hashlib,json,zipfile
root=Path(__file__).resolve().parent.parent
delivery=root.parent/'交付'
qa=root/'qa/audio-settings-20261020'
target=delivery/'四主题独立工程-声音设置版-20261020.zip'
entries={}
def add(p,name):
    p=Path(p)
    assert p.is_file() and name not in entries,(p,name)
    entries[name]=p
for theme in ['十步芳草','千年文脉','金色产业','青山绿水']:
    base=delivery/'微信小程序四套'/theme
    assert json.loads((base/'miniprogram/app.json').read_text())['pages']==['pages/game/index']
    for name in ['project.config.json','README.md']:add(base/name,f'独立工程/{theme}/{name}')
    for f in sorted((base/'miniprogram').rglob('*')):
        if f.is_file() and f.name!='.DS_Store' and not f.name.startswith('.env'):
            assert f.suffix not in {'.db','.sqlite','.sqlite3','.log'}
            add(f,f'独立工程/{theme}/{f.relative_to(base)}')
add(delivery/'微信小程序四套/交付入口.md','说明/交付入口.md')
for name in ['20261020-声音设置面板.md','20261020-自然材质声音修订.md']:add(root/'docs'/name,'说明/'+name)
for f in sorted((root/'design-source/audio-natural-20261020').rglob('*')):
    if f.is_file():add(f,'声音来源/'+str(f.relative_to(root/'design-source/audio-natural-20261020')))
add(delivery/'声音试听-自然材质修订-20261020.mp3','声音试听-12秒.mp3')
add(delivery/'青山绿水-声音设置-20261020.png','预览/青山绿水-声音设置.png')
for name in ['compile.json','sync.json','regression.log','page-regression.log','native-interactions.json']:
    add(qa/name,'验证记录/'+name)
layout=root/'qa/adaptation-20261020/sound-settings'
d=json.loads((layout/'checks.json').read_text());assert d['passed'] and len(d['checks'])==8
add(layout/'checks.json','验证记录/原生布局/checks.json')
for check in d['checks']:add(layout/check['screenshot'],'验证记录/原生布局/'+check['screenshot'])
assert json.loads((qa/'native-interactions.json').read_text())['passed']
for name in ['check-audio-settings-native-20261020.cjs','check-adaptation-native-20261020.cjs','sync-feedback-20261019.cjs','package-audio-settings-20261020.py']:add(root/'tools'/name,'开发参考/tools/'+name)
add(root/'tests/audio.test.cjs','开发参考/tests/audio.test.cjs')
add(root/'preview/v4-runtime.js','开发参考/preview/v4-runtime.js')
assert all('平台总入口' not in name for name in entries)
manifest={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Four independent native projects, audio settings and current local QA. No portal, private devtools config, database or player data. No physical phone or release acceptance.','files':[{'path':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for name,p in sorted(entries.items())]}
temp=target.with_suffix('.zip.tmp')
with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED) as z:
    for name,p in sorted(entries.items()):z.write(p,name)
    z.writestr('文件校验清单.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(temp) as z:
    assert z.testzip() is None
    for f in manifest['files']:assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256'],f['path']
temp.replace(target)
result={'passed':True,'file':str(target),'bytes':target.stat().st_size,'files':len(entries)+1,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceReadbackVerified':True,'portalIncluded':False}
(qa/'package-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
