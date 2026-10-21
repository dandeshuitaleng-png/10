"""Package the current integrated local system, with source/secret consistency checks."""
from pathlib import Path
import zipfile,json,hashlib,datetime
root=Path(__file__).resolve().parents[2]
out=root/'交付/趣味闯关-视觉反馈修改-20261019-标题修正版.zip'
selections=['启动联网整合.command','demo/package.json','demo/README.md','demo/game.js','demo/game.json','demo/project.config.json','demo/audio','demo/design/fixtures.js','demo/server','demo/web','demo/js','demo/images','demo/media','demo/fixtures','demo/tests','demo/scripts','demo/docs','demo/design/content-intake/current/bank.json','demo/design/runtime-bundle.js','demo/design/accessibility.js','quiz-admin/package.json','quiz-admin/package-lock.json','quiz-admin/vite.config.js','quiz-admin/index.html','quiz-admin/README.md','quiz-admin/src','quiz-admin/dist','quiz-admin/tests','quiz-admin/examples','rural-culture-miniprogram/package.json','rural-culture-miniprogram/project.config.json','rural-culture-miniprogram/README.md','rural-culture-miniprogram/miniprogram','rural-culture-miniprogram/tools','rural-culture-miniprogram/tests','rural-culture-miniprogram/docs','rural-culture-miniprogram/qa-v4/compile-report.json','rural-culture-miniprogram/qa/network-integration','rural-culture-miniprogram/preview/v4.html','rural-culture-miniprogram/preview/v4-runtime.js','rural-culture-miniprogram/preview/联网整合验收.html','rural-culture-miniprogram/preview/首页像素规范.html','rural-culture-miniprogram/preview/home-pixels','rural-culture-miniprogram/preview/network-integration','交付/联网整合验收-2026-10-18']
selections += ['查看反馈修改.command','rural-culture-miniprogram/preview/反馈视觉对照-20261019.html','rural-culture-miniprogram/qa/feedback-20261019']
for n in ['千年文脉','十步芳草','金色产业','青山绿水']:
 for part in ['README.md','project.config.json','miniprogram','qa-v4/compile-report.json']:selections.append('交付/微信小程序四套/'+n+'/'+part)
for part in ['README.md','project.config.json','miniprogram','preview/v4.html','preview/v4-runtime.js','qa-v4/compile-report.json']:selections.append('平台总入口/'+part)
excluded={'title-correction-before','before','.git','node_modules','__pycache__','.rural-quiz-runtime','verification'}
files={}
for part in selections:
 p=root/part
 if not p.exists():continue
 for f in p.rglob('*') if p.is_dir() else [p]:
  rel=f.relative_to(root)
  if rel.parts[:3]==('demo','server','data'):continue
  if not f.is_file() or excluded.intersection(rel.parts) or f.name in {'.DS_Store','project.private.config.json','统一包校验.json','交付包解压实跑.log','解压实跑结果.json','标题修正版校验.json','交付包解压复测.json'} or f.name.startswith('.env') or f.suffix in {'.sqlite','.db','.sqlite3','.pyc','.zip'}:continue
  files[str(rel)]=f
# Ensure all currently used client modules match, and no authored bank ships in the mini program.
for rel in files:
 if rel.endswith('services-v4/catalog.js'):
  raw=files[rel].read_text();catalog=json.loads(raw.split('=',1)[1].strip().rstrip(';'));assert catalog['questions']==[],rel
manifest={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Current local integrated source, assets, built management UI and redacted QA. No live data or credentials.','fileCount':len(files),'files':{rel:hashlib.sha256(f.read_bytes()).hexdigest() for rel,f in sorted(files.items())}}
forbidden=[]
for file,key in [('.rural-quiz-runtime/.admin-credentials.json','password'),('.rural-quiz-runtime/.local-player.json','deviceId')]:
 p=root/file
 if p.exists():forbidden.append(json.loads(p.read_text())[key].encode())
temp=out.with_suffix('.zip.tmp')
prefix='趣味闯关-视觉反馈版/'
with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED) as z:
 for rel,f in sorted(files.items()):
  data=f.read_bytes();assert all(secret not in data for secret in forbidden),'Private runtime value found in '+rel
  z.write(f,prefix+rel)
 z.writestr(prefix+'MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
with zipfile.ZipFile(temp) as z:
 assert not z.testzip()
 for rel,digest in manifest['files'].items():assert hashlib.sha256(z.read(prefix+rel)).hexdigest()==digest,rel
 assert not any('.rural-quiz-runtime' in p or p.endswith(('.sqlite','.db')) for p in z.namelist())
temp.replace(out)
report={'file':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'fileCount':len(files),'matchesCurrentSource':True,'privateRuntimeExcluded':True,'actualPrivateValuesNotPresent':True,'manifest':'趣味闯关-视觉反馈版/MANIFEST.json'}
(root/'rural-culture-miniprogram/qa/feedback-20261019/标题修正版校验.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
