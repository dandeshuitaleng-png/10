"""Edit recorded paper/wood/leaf textures; no synthesized UI tones."""
from pathlib import Path
import array, hashlib, json, math, shutil, subprocess

root = Path(__file__).resolve().parent.parent
workspace = root.parent
ff = workspace / '.rural-quiz-runtime/audio-tools/imageio_ffmpeg/binaries/ffmpeg-macos-x86_64-v7.1'
raw = workspace / '.rural-quiz-runtime/audio-natural-20261020'
out = root / 'miniprogram/assets/audio'
source = root / 'design-source/audio-natural-20261020'
source.mkdir(exist_ok=True)
(source / 'originals').mkdir(exist_ok=True)
# Each cue remains a recording. Fades tame physical transients; no pitch sweeps or oscillators.
recipes = [
 ('paper.mp3', raw/'pages/book_flip.4.ogg', 'silenceremove=start_periods=1:start_threshold=-45dB:start_duration=0.008,atrim=duration=0.50,highpass=f=180,lowpass=f=3000,afade=t=in:d=0.025,afade=t=out:st=0.30:d=0.20', 'StarNinjas', 'https://opengameart.org/content/10-book-page-flips'),
 ('wood.mp3', raw/'steps/wood02.ogg', 'highpass=f=180,lowpass=f=2200,afade=t=in:d=0.012,afade=t=out:st=0.12:d=0.12', 'TinyWorlds', 'https://opengameart.org/content/different-steps-on-wood-stone-leaves-gravel-and-mud'),
 ('confirm-wood.mp3', raw/'steps/wood01.ogg', 'highpass=f=150,lowpass=f=2600,afade=t=in:d=0.018,afade=t=out:st=0.12:d=0.12', 'TinyWorlds', 'https://opengameart.org/content/different-steps-on-wood-stone-leaves-gravel-and-mud'),
 ('leaf-rustle.mp3', raw/'steps/leaves02.ogg', 'highpass=f=220,lowpass=f=3200,afade=t=in:d=0.04,afade=t=out:st=0.23:d=0.24', 'TinyWorlds', 'https://opengameart.org/content/different-steps-on-wood-stone-leaves-gravel-and-mud'),
 ('piano-close.mp3', workspace/'.rural-quiz-runtime/audio-source-20261020/JRPG-Piano.mp3', 'atrim=start=0.025:end=1.035,asetpts=PTS-STARTPTS,highpass=f=100,lowpass=f=4500,afade=t=in:d=0.045,afade=t=out:st=0.65:d=0.36', 'Joth', 'https://opengameart.org/content/jrpg-piano'),
]
credits = {'revision':'natural-20261020','license':'CC0 1.0','direction':'Recorded paper, wood and leaf textures; no electronic beeps. Ordinary navigation and wrong-answer alerts stay silent.', 'files':[]}
for name, original, filters, author, page in recipes:
    pcm = subprocess.run([str(ff),'-v','error','-i',str(original),'-af',filters,'-f','f32le','-ac','1','-ar','44100','pipe:1'],capture_output=True,check=True).stdout
    samples=array.array('f');samples.frombytes(pcm)
    rms=math.sqrt(sum(x*x for x in samples)/len(samples));peak=max(abs(x) for x in samples)
    gain=min(.065/rms,.34/peak)
    edited=filters+',volume='+str(gain)
    subprocess.run([str(ff),'-v','error','-y','-i',str(original),'-af',edited,'-ac','1','-ar','44100','-codec:a','libmp3lame','-b:a','64k',str(out/name)],check=True)
    shutil.copy2(original,source/'originals'/original.name)
    credits['files'].append({'file':name,'source':str(original.relative_to(workspace)),'author':author,'page':page,'sourceSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'sha256':hashlib.sha256((out/name).read_bytes()).hexdigest(),'bytes':(out/name).stat().st_size,'filter':edited,'encoding':'MP3 mono 44100Hz 64k'})
prior=json.loads((out/'credits.json').read_text())
bg=next(x for x in prior['files'] if x['file']=='ambient-piano.mp3');bg.update(author='Joth',page='https://opengameart.org/content/jrpg-piano');credits['files'].insert(0,bg)
for name in ['click.mp3','select.mp3','correct.mp3','wrong.mp3','complete.mp3','mascot.mp3']:
    (out/name).unlink(missing_ok=True)
(out/'credits.json').write_text(json.dumps(credits,ensure_ascii=False,indent=2)+'\n')
(source/'credits.json').write_text(json.dumps(credits,ensure_ascii=False,indent=2)+'\n')
(source/'README.md').write_text('''# 自然材质声音修订

本次选用真实翻书、木质和树叶录音，替代原电子短音。来源均标注 CC0；源文件未改动保存在 originals/，编辑参数和哈希见 credits.json。钢琴片段与背景音乐出自同一首 Joth 的 JRPG Piano，保持音色一致。

- StarNinjas，10 Book Page Flips：https://opengameart.org/content/10-book-page-flips
- TinyWorlds，Different steps：https://opengameart.org/content/different-steps-on-wood-stone-leaves-gravel-and-mud
- Joth，JRPG Piano：https://opengameart.org/content/jrpg-piano

来源页于 2026-10-20 核对。处理只使用裁切、滤波、增益和淡入淡出，没有添加合成振荡音。试听合成用于声音选型，不是手机录音。
''')
# An in-context, sparse 12-second audition at runtime gain. No dense effect montage.
inputs=['ambient-piano.mp3','wood.mp3','paper.mp3','confirm-wood.mp3','leaf-rustle.mp3','piano-close.mp3']
cmd=[str(ff),'-v','error','-y']
for f in inputs:cmd+=['-i',str(out/f)]
filters=['[0:a]atrim=duration=12,volume=0.12,afade=t=in:d=1.2,afade=t=out:st=10.8:d=1.2[a0]']
for i,(gain,delay) in enumerate([(.30,1800),(.25,3800),(.28,6000),(.26,8100),(.26,10000)],1):
    filters.append(f'[{i}:a]volume={gain},adelay={delay}:all=1[a{i}]')
filters.append(''.join(f'[a{i}]' for i in range(6))+'amix=inputs=6:normalize=0:duration=first[mix]')
cmd+=['-filter_complex',';'.join(filters),'-map','[mix]','-t','12','-codec:a','libmp3lame','-b:a','96k',str(workspace/'交付/声音试听-自然材质修订-20261020.mp3')]
subprocess.run(cmd,check=True)
print(json.dumps({'runtimeFiles':len(credits['files']),'audioBytes':sum(x['bytes'] for x in credits['files']),'auditionSeconds':12}))
