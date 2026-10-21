"""Package four independent native projects and current audio evidence; no portal."""
from pathlib import Path
import datetime
import hashlib
import json
import zipfile

project = Path(__file__).resolve().parent.parent
workspace = project.parent
delivery = workspace / '交付'
themes = ['十步芳草', '千年文脉', '金色产业', '青山绿水']
qa = project / 'qa/audio-20261020'
target = delivery / '四主题独立工程-声音版-20261020.zip'
entries = {}


def add(source, name):
    source = Path(source)
    assert source.is_file(), source
    assert name not in entries, name
    entries[name] = source


for theme in themes:
    base = delivery / '微信小程序四套' / theme
    assert json.loads((base / 'miniprogram/app.json').read_text())['pages'] == ['pages/game/index']
    for name in ['project.config.json', 'README.md']:
        add(base / name, f'独立工程/{theme}/{name}')
    for f in sorted((base / 'miniprogram').rglob('*')):
        if f.is_file() and f.name != '.DS_Store' and not f.name.startswith('.env'):
            assert f.suffix not in {'.db', '.sqlite', '.sqlite3', '.log'}
            add(f, f'独立工程/{theme}/{f.relative_to(base)}')
    add(delivery / f'{theme}-声音版-扫码试听-20261020.png', f'扫码试听/{theme}.png')

add(delivery / '微信小程序四套/交付入口.md', '说明/交付入口.md')
for name in ['20261020-声音与交互反馈.md', '20261020-第三步适配检查.md']:
    add(project / 'docs' / name, '说明/' + name)
for f in sorted((project / 'design-source/audio-20261020').rglob('*')):
    if f.is_file():
        add(f, '声音来源/' + str(f.relative_to(project / 'design-source/audio-20261020')))
add(delivery / '声音试听-钢琴与交互反馈-20261020.mp3', '声音试听-16秒.mp3')
for name in ['audio-analysis.json', 'compile.json', 'native-checks.json', 'wechat-previews.json', 'sync-and-qr-checks.json', 'regression.log', 'page-regression.log']:
    add(qa / name, '验证记录/声音/' + name)
add(qa / 'native-industry-refit/native-decode.json', '验证记录/声音/native-decode.json')
native = json.loads((qa / 'native-checks.json').read_text())
assert native['passed'] and len(native['checks']) == 16
for check in native['checks']:
    assert check['passed']
    add(qa / check['phase'] / check['screenshot'], '验证记录/原生截图/' + check['screenshot'])
layout = project / 'qa/adaptation-20261020/audio-layout'
checks = json.loads((layout / 'checks.json').read_text())
assert checks['passed'] and len(checks['checks']) == 4
add(layout / 'checks.json', '验证记录/声音开关布局/checks.json')
for check in checks['checks']:
    add(layout / check['screenshot'], '验证记录/声音开关布局/' + check['screenshot'])
for name in ['audio.test.cjs']:
    add(project / 'tests' / name, '开发参考/tests/' + name)
for name in ['check-audio-native-20261020.cjs', 'sync-feedback-20261019.cjs', 'package-audio-20261020.py']:
    add(project / 'tools' / name, '开发参考/tools/' + name)

assert all('平台总入口' not in name for name in entries)
manifest = {
    'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'scope': 'Four independent native sources, current audio assets and evidence. No portal, database, player data or private devtools config.',
    'files': [{'path': name, 'bytes': source.stat().st_size, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()} for name, source in sorted(entries.items())],
}
temp = target.with_suffix('.zip.tmp')
with zipfile.ZipFile(temp, 'w', zipfile.ZIP_DEFLATED) as z:
    for name, source in sorted(entries.items()):
        z.write(source, name)
    z.writestr('文件校验清单.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
with zipfile.ZipFile(temp) as z:
    assert z.testzip() is None
    for item in manifest['files']:
        assert hashlib.sha256(z.read(item['path'])).hexdigest() == item['sha256'], item['path']
    assert len(z.namelist()) == len(entries) + 1
temp.replace(target)
result = {'passed': True, 'file': str(target), 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'files': len(entries) + 1, 'sourceReadbackVerified': True, 'portalIncluded': False}
(qa / 'package-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
