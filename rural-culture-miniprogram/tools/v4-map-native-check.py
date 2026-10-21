import json,subprocess,sys
from pathlib import Path
p=Path(__file__).resolve().parent.parent;o=p.parent/'交付/微信小程序四套';stage=sys.argv[1] if len(sys.argv)>1 else 'after';out=p/'qa/map-unification';out.mkdir(parents=True,exist_ok=True)
selectors=['.activity-header','.panel-body','.route-canvas','.route-node','.route-caption','.route-base','.route-number','.route-node-badge','.route-halo','.route-guide','.route-guide-art','#footer-primary','.panel-footer']
fn='function(){return new Promise(function(resolve){var q=wx.createSelectorQuery();var keys='+json.dumps(selectors)+';keys.forEach(function(s){q.selectAll(s).boundingClientRect();});q.exec(function(r){var e={};keys.forEach(function(s,i){e[s]=r[i];});resolve({window:wx.getWindowInfo(),elements:e});});});}'
all=[]
for name in sys.argv[2:] or ['千年文脉','十步芳草','金色产业','青山绿水']:
 r=subprocess.run(['/usr/local/bin/wechatide','-c','Codex','automation_evaluate','--project',str(o/name),'--fn-source',fn],capture_output=True,text=True,timeout=45)
 if r.returncode:raise RuntimeError(r.stdout+r.stderr)
 d=json.loads(r.stdout)
 while 'elements' not in d:d=d['result']
 (out/(name+'-'+stage+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');all.append((name,d));v=d['elements']['.panel-body'][0];c=d['elements']['.route-canvas'][0]
 print(name,json.dumps({'viewport':v['height'],'canvas':c['height'],'maxScroll':max(0,c['height']-v['height']),'offset':v['top']-c['top']},ensure_ascii=False),flush=True)
if len(all)==4 and stage=='after':
 diffs=[];base=all[0][1]['elements'];bc=base['.route-canvas'][0]
 for name,d in all:
  e=d['elements'];c=e['.route-canvas'][0];v=e['.panel-body'][0]
  if c['height']<=v['height']:diffs.append({'name':name,'failure':'no scroll overflow'})
  for s in ['.route-node','.route-caption','.route-base','.route-number','.route-node-badge','#footer-primary']:
   if s=='.route-node-badge':
    for badge in e[s]:
     if abs(badge['width']-26)>.1 or abs(badge['height']-26)>.1:diffs.append({'name':name,'selector':s,'failure':'badge size differs'})
    continue
   if len(e[s])!=len(base[s]):diffs.append({'name':name,'selector':s,'countMismatch':True});continue
   for i,(a,b) in enumerate(zip(base[s],e[s])):
    fields=['width','height']
    if s in ['.route-node','.route-caption']:fields+=['left','relativeTop']
    for k in fields:
     va=a['top']-bc['top'] if k=='relativeTop' else a[k];vb=b['top']-c['top'] if k=='relativeTop' else b[k]
     if abs(va-vb)>.13:diffs.append({'name':name,'selector':s,'index':i,'field':k,'baseline':va,'actual':vb})
 report={'passed':not diffs,'differences':diffs,'note':'Controls compared relative to their map canvas. Approved title heights differ; their visible map viewport heights are preserved.'};(out/'native-comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('UNIFORM',not diffs);sys.exit(bool(diffs))
