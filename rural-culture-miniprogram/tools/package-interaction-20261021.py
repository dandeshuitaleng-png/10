"""Current four independent applications and bounded evidence for answer/press fixes."""
from pathlib import Path
import datetime,hashlib,json,zipfile
root=Path(__file__).resolve().parent.parent
delivery=root.parent/'交付';qa=root/'qa/interaction-20261021'
target=delivery/'四主题独立工程-答题交互修正版-20261021.zip'
native=json.loads((qa/'native-checks.json').read_text());assert native['passed'] and len(native['checks'])==14
compile=json.loads((qa/'compile.json').read_text());assert compile['passed'] and len(compile['records'])==5
assert all(r['mainPackageUnder2MiB'] for r in compile['records'])
entries={}
def add(p,name):
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
for name in ['20261021-答题布局与按钮交互修正.md','20261020-声音设置面板.md','20261020-自然材质声音修订.md']:add(root/'docs'/name,'说明/'+name)
for f in sorted((root/'design-source/audio-natural-20261020').rglob('*')):
    if f.is_file():add(f,'声音来源/'+str(f.relative_to(root/'design-source/audio-natural-20261020')))
for name in ['native-checks.json','compile.json','sync.json','source-changes.json','baseline-failing-regression.log','interaction-regression.log','page-regression.log','audio-regression.log','network-page-regression.log']:
    add(qa/name,'验证记录/'+name)
for f in sorted(qa.glob('*.png')):add(f,'验证记录/原生截图/'+f.name)
for name in ['check-interaction-native-20261021.cjs','sync-feedback-20261019.cjs','package-interaction-20261021.py','prepare-theme-content-review-20261020.cjs']:add(root/'tools'/name,'开发参考/tools/'+name)
for name in ['option-measurement.test.cjs','press-feedback.test.cjs','v4-page.cjs','audio.test.cjs','v4-network-page.cjs']:add(root/'tests'/name,'开发参考/tests/'+name)
add(root/'preview/v4-runtime.js','开发参考/preview/v4-runtime.js')
assert all('平台总入口' not in name for name in entries)
manifest={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Four independent native projects; answer layout and repeatable press feedback. Current local/native-container QA only. No portal, private config, database, player data, phone acceptance or publication.','files':[{'path':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for name,p in sorted(entries.items())]}
temp=target.with_suffix('.zip.tmp')
with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED) as z:
    for name,p in sorted(entries.items()):z.write(p,name)
    z.writestr('文件校验清单.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(temp) as z:
    assert z.testzip() is None
    for f in manifest['files']:assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256'],f['path']
temp.replace(target)
result={'passed':True,'file':str(target),'bytes':target.stat().st_size,'files':len(entries)+1,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceReadbackVerified':True,'portalIncluded':False,'physicalDeviceVerified':False}
(qa/'package-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
