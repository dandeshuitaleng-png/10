from pathlib import Path
from PIL import Image
import sys
src,out=map(Path,sys.argv[1:])
for pose in ['welcome','observe','think','celebrate']:
    frames=[]
    for f in sorted(src.glob(pose+'-*.png')):
        im=Image.open(f).convert('RGBA');p=im.convert('RGB').quantize(colors=255)
        palette=[0,0,0]+p.getpalette()[:765];p.putpalette(palette)
        values=[v+1 if a>=16 else 0 for v,a in zip(p.getdata(),im.getchannel('A').getdata())]
        p.putdata(values);p.info['transparency']=0;frames.append(p)
    duration=[50]*len(frames);duration[-1]=8000-(len(frames)-1)*50
    frames[0].save(out/(pose+'.gif'),save_all=True,append_images=frames[1:],duration=duration,loop=0,transparency=0,disposal=2,optimize=False)
