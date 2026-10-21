"""Four independent applications, editable certificate renderer and native PNG previews."""
from pathlib import Path
import datetime,hashlib,json,zipfile,shutil
root=Path(__file__).resolve().parent.parent
delivery=root.parent/'交付';qa=root/'qa/certificate-20261021'
target=delivery/'四主题独立工程-证书样式修订版-20261021.zip'
preview=delivery/'证书样式修订-20261021';preview.mkdir(exist_ok=True)
native=json.loads((qa/'native-checks.json').read_text());assert native['passed'] and len(native['checks'])==17
comp=json.loads((qa/'compile.json').read_text());assert comp['passed'] and len(comp['records'])==5
assert all(r['mainPackageUnder2MiB'] for r in comp['records'])
entries={}
def add(p,name):
    assert p.is_file() and name not in entries,(p,name)
    entries[name]=p
for theme,theme_id in [('十步芳草','red'),('千年文脉','culture'),('金色产业','industry'),('青山绿水','ecology')]:
    base=delivery/'微信小程序四套'/theme
    assert json.loads((base/'miniprogram/app.json').read_text())['pages']==['pages/game/index']
    for name in ['project.config.json','README.md']:add(base/name,f'独立工程/{theme}/{name}')
    for f in sorted((base/'miniprogram').rglob('*')):
        if f.is_file() and f.name!='.DS_Store' and not f.name.startswith('.env'):
            assert f.suffix not in {'.db','.sqlite','.sqlite3','.log'}
            add(f,f'独立工程/{theme}/{f.relative_to(base)}')
    source=qa/'artwork'/f'{theme_id}-荣誉证书.png';assert source.read_bytes()[:8]==b'\x89PNG\r\n\x1a\n'
    dest=preview/f'{theme}-荣誉证书.png';shutil.copy2(source,dest);add(dest,'证书预览/'+dest.name)
add(delivery/'微信小程序四套/交付入口.md','说明/交付入口.md')
for name in ['20261021-正式荣誉证书视觉修订.md','20261021-答题布局与按钮交互修正.md','20261020-声音设置面板.md','20261020-自然材质声音修订.md']:add(root/'docs'/name,'说明/'+name)
shutil.copy2(root/'docs/20261021-正式荣誉证书视觉修订.md',preview/'说明.md')
add(root/'miniprogram/services-v4/certificate-art.js','设计源/证书绘制源.js')
for name in ['native-checks.json','compile.json','sync.json','source-changes.json','regression.log','page-regression.log','network-page-regression.log']:add(qa/name,'验证记录/'+name)
for f in sorted(qa.glob('*-certificate-*.png')):add(f,'验证记录/原生截图/'+f.name)
add(qa/'artwork/ecology-long-荣誉证书.png','验证记录/长姓名长说明.png')
for name in ['check-certificate-native-20261021.cjs','sync-feedback-20261019.cjs','package-certificate-20261021.py','prepare-theme-content-review-20261020.cjs']:add(root/'tools'/name,'开发参考/tools/'+name)
for name in ['certificate-art.test.cjs','v4-page.cjs','v4-network-page.cjs']:add(root/'tests'/name,'开发参考/tests/'+name)
add(root/'preview/v4-runtime.js','开发参考/preview/v4-runtime.js')
assert all('平台总入口' not in name for name in entries)
manifest={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Four independent native applications and four certificate-style previews from isolated review records. Local/native-container evidence only; no real-user record changes, private configs, portal, database, phone album acceptance or publication.','files':[{'path':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for name,p in sorted(entries.items())]}
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
