"""Compare the feet in the two native frames; do not rewrite either image."""
import json
from pathlib import Path
from PIL import Image
q=Path(__file__).resolve().parents[1]/'qa/home-designs-20261021'
a=Image.open(q/'local-motion-still.png').convert('RGB')
b=Image.open(q/'local-motion-peak.png').convert('RGB')
assert a.size==b.size
regions={'welcome':(145,510,258,543),'observe':(520,510,650,543),'think':(137,973,273,1010),'celebrate':(510,977,650,1010)}
checks=[]
for pose,region in regions.items():
    box=tuple(round(v*(a.width/774 if i%2==0 else a.height/1672)) for i,v in enumerate(region))
    frames=[]
    for im in (a,b):
        pts=[(x,y) for y in range(box[1],box[3]) for x in range(box[0],box[2]) if max(im.getpixel((x,y)))<80]
        assert len(pts)>30
        frames.append({'outlinePixels':len(pts),'bbox':[min(x for x,y in pts),min(y for x,y in pts),max(x for x,y in pts),max(y for x,y in pts)],'centroid':[sum(x for x,y in pts)/len(pts),sum(y for x,y in pts)/len(pts)]})
    displacement=max(abs(x-y) for x,y in zip(frames[0]['centroid'],frames[1]['centroid']))
    bbox_difference=max(abs(x-y) for x,y in zip(frames[0]['bbox'],frames[1]['bbox']))
    # Compositing a moving sibling changes antialiasing at the outline threshold.
    # A single raster pixel is tolerated; body motion is separately prohibited by
    # the source binding test. This does not establish fluid-motion acceptance.
    checks.append({'pose':pose,'region':box,'frames':frames,'maxCentroidDisplacementScreenshotPx':displacement,'bboxDifferenceScreenshotPx':bbox_difference,'passed':displacement<1 and bbox_difference<=1})
report=json.loads((q/'local-motion-checks.json').read_text())
report.pop('footPixelChecks',None)
report['footAnchorChecks']=checks
report['footCriterion']='Dark-outline foot bounding boxes differ by at most 1 screenshot pixel; centroid displacement below 1 screenshot pixel. Native GPU compositing changes thresholded edge antialiasing. Combined with zero body-animation bindings this checks anchored feet in two sampled frames only; not fluid-motion or physical-device acceptance.'
report['visualReview']='Enlarged native frames inspected for fixed bodies/feet, arm joins and local movement; one-pixel edge rasterization tolerance, not exact RGB equality.'
report['passed']=report['wholeBodyAnimationBindings']==0 and all(c['passed'] for c in checks)
(q/'local-motion-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'centroidDisplacements':[round(c['maxCentroidDisplacementScreenshotPx'],3) for c in checks]}))
assert report['passed']
