"""Current four independent A projects, review images and bounded QA evidence."""
from pathlib import Path
import hashlib,json,shutil,zipfile

root=Path(__file__).resolve().parents[1]
workspace=root.parent
qa=root/'qa/theme-details-20261022'
association=root/'qa/chapter-association-20261022'
delivery=workspace/'交付/四主题页面精修-20261022'
target=workspace/'交付/四主题独立工程-A方案页面精修-20261022.zip'
native=json.loads((qa/'native-checks.json').read_text())
browser=json.loads((qa/'browser-checks.json').read_text())
compile_report=json.loads((qa/'compile-checks.json').read_text())
assert native['passed'] and len(native['checks'])==32
assert browser['passed'] and len(browser['checks'])==120
assert compile_report['passed'] and len(compile_report['checks'])==5
assert all(c['mainPackageUnder2MiB'] for c in compile_report['checks'])
assert 'ℹ pass 56' in (qa/'regression.log').read_text()
# The earlier checks cover inner-page styling; this later report owns the
# changed chapter geometry and its native/browser evidence.
for name,count in [('native-checks.json',52),('browser-checks.json',72),('browser-scroll-checks.json',8),('compile-checks.json',5)]:
    report=json.loads((association/name).read_text())
    assert report['passed'] and len(report['checks'])==count
assert 'ℹ pass 46' in (association/'regression.log').read_text()

images=root/'preview/theme-details-20261022'
images.mkdir(exist_ok=True)
delivery.mkdir(exist_ok=True)
for theme in ['red','culture','industry','ecology']:
    shutil.copyfile(association/(theme+'-home.png'),images/(theme+'-home.png'))
    for scene in ['quiz','correct','profile']:
        shutil.copyfile(qa/(theme+'-'+scene+'.png'),images/(theme+'-'+scene+'.png'))
shutil.copytree(images,delivery/images.name,dirs_exist_ok=True)
html=(root/'preview/四主题页面精修-20261022.html').read_text()
html=html.replace('</head>','<style>.links{display:none!important}</style></head>')
(delivery/'评审.html').write_text(html)
shutil.copyfile(root/'docs/20261022-四主题A方案页面精修.md',delivery/'修改说明.md')
shutil.copyfile(root/'docs/20261022-关卡卡片对齐与遮挡修正.md',delivery/'关卡对齐说明.md')
# Keep the existing A-only offline review in sync with its live counterpart.
a_delivery=workspace/'交付/首页方案A-20261021'
(a_delivery/'home-directions-20261021').mkdir(exist_ok=True)
for theme in ['red','culture','industry','ecology']:
    shutil.copyfile(root/'preview/home-directions-20261021'/(theme+'-map.png'),a_delivery/'home-directions-20261021'/(theme+'-map.png'))
a_html=(root/'preview/首页方案A-20261021.html').read_text().replace('</head>','<style>.experience{display:none!important}</style></head>')
(a_delivery/'评审.html').write_text(a_html)

entries={}
def add(file,name):
    assert file.is_file() and name not in entries,(file,name)
    entries[name]=file

for theme in ['十步芳草','千年文脉','金色产业','青山绿水']:
    base=workspace/'交付/微信小程序四套'/theme
    assert json.loads((base/'miniprogram/app.json').read_text())['pages']==['pages/game/index']
    for name in ['project.config.json','README.md']:
        add(base/name,'独立工程/'+theme+'/'+name)
    for f in sorted((base/'miniprogram').rglob('*')):
        if f.is_file() and f.name!='.DS_Store' and not f.name.startswith('.env'):
            assert f.suffix not in {'.db','.sqlite','.sqlite3','.log','.pem','.key','.p12'}
            add(f,'独立工程/'+theme+'/'+f.relative_to(base).as_posix())
    for name in ['v4.html','v4-runtime.js']:
        add(base/'preview'/name,'独立工程/'+theme+'/preview/'+name)

for f in sorted(delivery.rglob('*')):
    if f.is_file():add(f,'离线评审/'+f.relative_to(delivery).as_posix())
for f in sorted(qa.iterdir()):
    if f.is_file() and (f.suffix in {'.png','.json'} or f.name=='regression.log') and f.name!='package-verification.json':
        add(f,'验证记录/'+f.name)
for f in sorted(association.iterdir()):
    if f.is_file() and f.suffix in {'.png','.json','.log'} and f.name!='package-verification.json':
        add(f,'验证记录/关卡对齐/'+f.name)
for name in ['20261022-四主题A方案页面精修.md','20261022-关卡卡片对齐与遮挡修正.md','20261021-地图滚动人物对齐修正.md']:
    add(root/'docs'/name,'说明/'+name)
add(workspace/'交付/微信小程序四套/交付入口.md','说明/交付入口.md')

manifest={'scope':'Four fixed-theme independent A projects, aligned chapter cards and inner-page detail QA. Earlier inner-page and current chapter evidence are separately dated. No portal, private config, account data, physical-phone or publication acceptance.','files':[{'path':name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for name,f in sorted(entries.items())]}
temp=target.with_suffix('.zip.tmp')
with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED) as archive:
    for name,f in sorted(entries.items()):archive.write(f,name)
    archive.writestr('文件校验清单.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(temp) as archive:
    assert archive.testzip() is None
    for item in manifest['files']:
        assert hashlib.sha256(archive.read(item['path'])).hexdigest()==item['sha256'],item['path']
temp.replace(target)
report={'passed':True,'file':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceReadbackVerified':True,'portalIncluded':False,'physicalDeviceVerified':False,'files':len(entries)+1}
(qa/'package-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(association/'package-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
