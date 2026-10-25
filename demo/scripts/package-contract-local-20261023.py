"""Build a source kit from tracked and explicitly maintained files, never live data."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]


def excluded(relative):
    parts = relative.parts
    name = relative.name
    return (
        any(part in {'.git', 'node_modules', '__pycache__', '.rural-quiz-runtime'} for part in parts)
        or parts[:3] == ('demo', 'server', 'data')
        or name in {'.DS_Store', 'project.private.config.json', '.admin-credentials.json', '.local-player.json'}
        or name.startswith('.env') and name != '.env.example'
        or any(name.endswith(suffix) for suffix in ('.sqlite', '.sqlite-wal', '.sqlite-shm', '.db', '.db-wal', '.db-shm', '.sqlite3', '.pem', '.key', '.p12', '.pyc', '.zip', '.log'))
    )


def collect(root):
    git_root = Path(subprocess.check_output(['git', '-C', str(root), 'rev-parse', '--show-toplevel'], text=True).strip()).resolve()
    if git_root != root.resolve():
        raise ValueError('Source root must be the Git checkout root')
    tracked = subprocess.check_output(['git', '-C', str(root), 'ls-files', '-z']).decode().split('\0')
    names = set(filter(None, tracked))
    maintenance = root / 'tools/maintenance-files.json'
    if maintenance.exists():
        names.update(json.loads(maintenance.read_text())['files'])
    files = {}
    for name in sorted(names):
        relative = Path(name)
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('Invalid source path')
        file = root / relative
        if not excluded(relative) and file.is_file() and not file.is_symlink():
            files[relative.as_posix()] = file
    built = root / 'quiz-admin/dist'
    if not (built / 'index.html').is_file():
        raise ValueError('Build quiz-admin before packaging')
    for file in built.rglob('*'):
        if file.is_file() and not file.is_symlink():
            files[file.relative_to(root).as_posix()] = file
    required = ['package.json', 'package-lock.json', '.node-version', 'eslint.config.cjs', '.prettierrc.json', 'tools/quality-format.cjs', 'tools/quality-files.json', 'tools/check-maintenance.cjs', 'tools/maintenance-files.json']
    for name in required:
        if name not in files:
            raise ValueError('Missing quality entry: ' + name)
    return files


def build(root, output):
    root, output = root.resolve(), output.resolve()
    if output.exists():
        raise FileExistsError('Use a new archive path; existing archives are preserved')
    files = collect(root)
    manifest = {
        'schemaVersion': 2,
        'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'scope': 'Tracked source, maintained tooling and built admin. No live databases, sessions or local archives. Platform/device/DM8 acceptance is separate.',
        'files': {name: hashlib.sha256(file.read_bytes()).hexdigest() for name, file in files.items()},
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(output.suffix + '.tmp')
    if temporary.exists():
        raise FileExistsError('Temporary archive already exists')
    try:
        with zipfile.ZipFile(temporary, 'x', zipfile.ZIP_DEFLATED) as archive:
            for name, file in files.items():
                archive.write(file, name)
            archive.writestr('MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        with zipfile.ZipFile(temporary) as archive:
            if archive.testzip():
                raise ValueError('Archive CRC mismatch')
            for name, expected in manifest['files'].items():
                if hashlib.sha256(archive.read(name)).hexdigest() != expected:
                    raise ValueError('Archive readback mismatch: ' + name)
        temporary.replace(output)
    finally:
        if temporary.exists():
            temporary.unlink()
    return {'passed': True, 'file': str(output), 'bytes': output.stat().st_size, 'fileCount': len(files), 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'manifestFilesReadbackMatched': True}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='New ZIP path; existing archives will not be overwritten')
    parser.add_argument('--root', type=Path, default=ROOT)
    arguments = parser.parse_args()
    print(json.dumps(build(arguments.root, arguments.output), ensure_ascii=False, indent=2))
