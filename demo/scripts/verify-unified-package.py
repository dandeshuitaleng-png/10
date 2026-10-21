"""Extract the delivered system to a fresh directory and run the actual tests."""
from pathlib import Path
import tempfile,zipfile,subprocess,json,hashlib,shutil,os
r=Path(__file__).resolve().parents[2];zpath=r/'交付/趣味闯关-联网整合交付-20261018.zip';folder=Path(tempfile.mkdtemp(prefix='quiz-unified-package-'))
node=os.environ.get('NODE_BINARY') or shutil.which('node')
bundled=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
if not node or subprocess.run([node,'-e',"require('node:sqlite')"],capture_output=True).returncode:
 node=str(bundled) if bundled.exists() else None
assert node,'Node with node:sqlite required'
try:
 with zipfile.ZipFile(zpath) as z:z.extractall(folder)
 base=folder/'趣味闯关-联网整合版';manifest=json.loads((base/'MANIFEST.json').read_text());assert all(hashlib.sha256((base/p).read_bytes()).hexdigest()==digest for p,digest in manifest['files'].items())
 tests=sorted(str(p.relative_to(base)) for p in (base/'demo/tests').glob('*.test.cjs'))+['rural-culture-miniprogram/tests/v4-network-page.cjs']+sorted(str(p.relative_to(base)) for p in (base/'quiz-admin/tests').glob('*.test.js'))
 q=subprocess.run([node,'--test',*tests],cwd=base,capture_output=True,text=True)
 (r/'交付/联网整合验收-2026-10-18/交付包解压实跑.log').write_text(q.stdout+q.stderr)
 report={'archive':zpath.name,'archiveSha256':hashlib.sha256(zpath.read_bytes()).hexdigest(),'manifestVerified':True,'fileCount':manifest['fileCount'],'testExitCode':q.returncode,'scope':'Extracted source archive in a new temporary directory; server tests, HTTP native Page and management unit tests; live data not copied.'}
 (r/'交付/联网整合验收-2026-10-18/解压实跑结果.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(report,ensure_ascii=False));print('\n'.join(q.stdout.splitlines()[-10:]));assert q.returncode==0
finally:shutil.rmtree(folder)
