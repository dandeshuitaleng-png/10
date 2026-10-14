#!/usr/bin/env python3
"""Package only reproducible source, approved artwork and current verification evidence."""
import hashlib
import json
from pathlib import Path
import sys
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent / '交付'
VERSION = json.loads((ROOT / 'package.json').read_text())['version']
STAMP = '20261013'
FILES = set()
for folder in ['js', 'web', 'tests', 'scripts', 'audio', 'media']:
    FILES.update(p for p in (ROOT / folder).rglob('*') if p.is_file() and p.name != '.DS_Store' and '__pycache__' not in p.parts)
FILES.update((ROOT / 'server').glob('*.cjs'))
FILES.update((ROOT / 'docs/full-development').glob('*.md'))
for name in ['README.md', 'package.json', 'game.js', 'game.json', 'project.config.json', '.gitignore', 'design/fixtures.js', 'design/runtime-bundle.js', 'design/content-intake/current/bank.json']:
    FILES.add(ROOT / name)
for name in ['v2-quality-20261010/theme-red-runtime.png', 'v2-quality-20261010/map-red-runtime.jpg', 'v2-style03/theme-culture.png', 'v2-style03/theme-industry.png', 'v2-style03/theme-ecology.png', 'v2-style03/map-culture.jpg', 'v2-style03/map-industry.jpg', 'v2-style03/ecology-map.jpg', 'v2-style03/wetland-observation.jpg']:
    FILES.add(ROOT / 'images' / name)

EVIDENCE = ROOT / 'design/full-development/evidence'
CURRENT_SHA = subprocess.check_output(['node', '-e', 'process.stdout.write(require("./scripts/lib/runtime-evidence.cjs").runtimeFingerprint())'], cwd=ROOT, text=True)
REPORTS = {}
for name in ['unit-report.json', 'browser-report.json', 'media-report.json', 'operations-report.json', 'performance-report.json', 'dynamic-report.json', 'wechat-report.json']:
    p = EVIDENCE / name
    report = json.loads(p.read_text())
    if name != 'wechat-report.json' and report.get('passed') is not True:
        raise ValueError(f'Current verification failed: {name}')
    if name != 'wechat-report.json' and (report.get('runtimeSha256') != CURRENT_SHA or report.get('version') != VERSION):
        raise ValueError(f'Verification does not match current runtime: {name}')
    REPORTS[name] = report
    FILES.add(p)
    FILES.update(EVIDENCE / n for n in report.get('screenshots', []))
FILES.add(EVIDENCE / 'verified-certificate.svg')
FILES.add(EVIDENCE / 'dynamic-certificate.png')

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

for p in FILES:
    p.relative_to(ROOT)
    if not p.is_file() or p.is_symlink():
        raise ValueError(f'Missing/unsafe package file: {p.name}')
    if 'server/data' in str(p.relative_to(ROOT)) or p.name in ['.admin-credentials.json', 'project.private.config.json']:
        raise ValueError('Private runtime file cannot be packaged')

manifest = {
    'date': '2026-10-13', 'version': VERSION, 'runtimeSha256': CURRENT_SHA,
    'scope': '1012合同动态配置体验版：主题/关卡/题数/复活/奖励/日上限/证书与分享配置；原四主题16关为初始实例。正式规则变更批准、内容审核、外部接入、真机及发布验收分别记录。',
    'files': [{'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size, 'sha256': digest(p)} for p in sorted(FILES)],
    'validation': {'sourceTests': {'passed': REPORTS['unit-report.json']['pass'], 'failed': REPORTS['unit-report.json']['fail']}, 'browser': {'passed': True, 'processAssertions': len(REPORTS['browser-report.json']['checks']), 'screenshots': len(REPORTS['browser-report.json']['screenshots'])}, 'media': {'passed': True, 'checks': len(REPORTS['media-report.json']['checks'])}, 'recovery': {'passed': True, 'checks': len(REPORTS['operations-report.json']['checks'])}, 'dynamic': {'passed': True, 'processAssertions': len(REPORTS['dynamic-report.json']['checks']), 'screenshots': len(REPORTS['dynamic-report.json']['screenshots'])}, 'wechat': {'version': REPORTS['wechat-report.json']['version'], 'status': REPORTS['wechat-report.json']['status']}},
}
OUT.mkdir(parents=True, exist_ok=True)
target = OUT / f'趣味闯关_全功能体验版_v{VERSION}_{STAMP}.zip'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for p in sorted(FILES):
        archive.write(p, '趣味闯关/' + str(p.relative_to(ROOT)))
    archive.writestr('趣味闯关/delivery-manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2))
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    for item in manifest['files']:
        assert hashlib.sha256(archive.read('趣味闯关/' + item['path'])).hexdigest() == item['sha256']
manifest['archive'] = {'name': target.name, 'bytes': target.stat().st_size, 'sha256': digest(target), 'zipCheck': 'PASS'}
(OUT / f'趣味闯关_交付清单_v{VERSION}_{STAMP}.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'version': VERSION, 'files': len(FILES), 'zipCheck': 'PASS', 'privateRuntimeExcluded': True, 'archive': str(target)}, ensure_ascii=False))
