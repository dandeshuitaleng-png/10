from pathlib import Path
import zipfile,json,hashlib,datetime
project=Path(__file__).resolve().parent.parent
root=project.parent
out=root/'交付'/'微信小程序四套'
games=['千年文脉','十步芳草','金色产业','青山绿水']
manifest={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'原生微信小程序联网客户端交付；须配合统一后端，不包含数据库、账号凭据或运行存档。','packages':[]}
excluded_parts={'.git','.codex','.agents','node_modules','qa-v4','__pycache__'}
def native_files(base):
 return sorted(f for f in base.rglob('*') if f.is_file() and not excluded_parts.intersection(f.relative_to(base).parts) and f.name not in {'.DS_Store','project.private.config.json'} and not f.name.startswith('.env') and f.suffix not in {'.log','.db','.sqlite','.sqlite3'})
def include_native(z,base,prefix):
 for f in native_files(base):z.write(f,str(Path(prefix)/f.relative_to(base)))
def verify_source(z,base,prefix):
 files=native_files(base)
 for f in files:
  entry=str(Path(prefix)/f.relative_to(base))
  assert hashlib.sha256(z.read(entry)).digest()==hashlib.sha256(f.read_bytes()).digest(),entry
 return len(files)
portal=root/'平台总入口'
portal_package=out/'平台总入口-微信原生项目.zip'
portal_temp=portal_package.with_suffix('.zip.tmp')
with zipfile.ZipFile(portal_temp,'w',zipfile.ZIP_DEFLATED) as z:include_native(z,portal,'平台总入口')
with zipfile.ZipFile(portal_temp) as z:
 assert not z.testzip()
 portal_count=verify_source(z,portal,'平台总入口')
portal_temp.replace(portal_package)
manifest['platformEntry']={'file':portal_package.name,'bytes':portal_package.stat().st_size,'sha256':hashlib.sha256(portal_package.read_bytes()).hexdigest(),'scope':'已集成四主题原生页的总入口；进度从共同后端读取。','sourceFileCount':portal_count,'matchesCurrentSource':True}
for name in games:
 dest=out/(name+'-微信原生项目.zip')
 temp=dest.with_suffix('.zip.tmp')
 with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED) as z:include_native(z,out/name,name)
 with zipfile.ZipFile(temp) as z:
  assert not z.testzip()
  assert name+'/miniprogram/app.json' in z.namelist()
  count=verify_source(z,out/name,name)
 temp.replace(dest)
 manifest['packages'].append({'name':name,'file':dest.name,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'sourceFileCount':count,'matchesCurrentSource':True})
combined=out/'四套微信原生项目-完整交付.zip'
combined_temp=combined.with_suffix('.zip.tmp')
with zipfile.ZipFile(combined_temp,'w',zipfile.ZIP_DEFLATED) as z:
 include_native(z,portal,'平台总入口')
 launcher=zipfile.ZipInfo('启动总首页预览.command');launcher.external_attr=0o100755<<16;launcher.compress_type=zipfile.ZIP_DEFLATED
 z.writestr(launcher,'#!/bin/zsh\ncd -- "$(dirname -- "$0")/共享开发工具与验收" || exit 1\nnode tools/v4-start-preview.cjs || exit 1\nopen "http://127.0.0.1:6493/preview/评审入口.html"\n')
 for name in games:include_native(z,out/name,'原生项目/'+name)
 for part in ['package.json','project.config.json','README.md','docs','design-source','qa/v8','qa/culture-home','qa/red-scene','qa/theme-unification','qa/ranking-tabs','qa/home-pixel-alignment','qa/title-safe','qa/ecology-water-colors','qa/theme-home-colors','qa/map-unification','qa/home-polish','qa/question-review-removal','qa/catalog-notice-hidden','qa/network-integration','preview','tools','tests','design-qa.md','qa-v4']:
  p=project/part
  for f in p.rglob('*') if p.is_dir() else [p]:
   if f.is_file() and f.name!='.DS_Store' and not f.name.endswith('.log'):
    if part=='qa/v8' and ('before' in f.relative_to(p).parts or 'export-backup' in f.relative_to(p).parts or f.name in ['export-report.json','zip-verification.json']):continue
    if part in ['tools','tests'] and not f.name.startswith(('v4-','v5-','v6-','red-scene-aspect')):continue
    if part=='qa-v4' and f.suffix not in ['.json']:continue
    z.write(f,'共享开发工具与验收/'+str(f.relative_to(project)))
 for part in ['app.js','app.json','app.wxss','sitemap.json','game-config.js','services-v4','components/game-button','components/game-icon','pages/game','assets/icons','assets/brand','assets/journey','assets/culture','assets/red','assets/industry','assets/ecology']:
  p=project/'miniprogram'/part
  for f in p.rglob('*') if p.is_dir() else [p]:
   if f.is_file():z.write(f,'共享开发工具与验收/miniprogram/'+str(f.relative_to(project/'miniprogram')))
 for f in (root/'品牌素材/客户提供-20261016').rglob('*'):
  if f.is_file() and '预览' not in f.parts:z.write(f,'客户品牌素材/'+str(f.relative_to(root/'品牌素材/客户提供-20261016')))
 if (out/'原生版验收说明.md').exists():z.write(out/'原生版验收说明.md','原生版验收说明.md')
 if (out/'原生四套首页对照.png').exists():z.write(out/'原生四套首页对照.png','原生四套首页对照.png')
 for name in ['交付入口.md','构建清单.json']:
  if (out/name).exists():z.write(out/name,name)
with zipfile.ZipFile(combined_temp) as z:
 assert not z.testzip()
 for name in games:verify_source(z,out/name,'原生项目/'+name)
 verify_source(z,portal,'平台总入口')
 assert '共享开发工具与验收/preview/评审入口.html' in z.namelist()
combined_temp.replace(combined)
manifest['combined']={'file':combined.name,'bytes':combined.stat().st_size,'sha256':hashlib.sha256(combined.read_bytes()).hexdigest(),'matchesCurrentSource':True,'reviewEntry':'共享开发工具与验收/preview/评审入口.html'}
(out/'打包校验.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
