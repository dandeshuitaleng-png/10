import json,subprocess,sys
from pathlib import Path
project=Path(__file__).resolve().parent.parent;root=project.parent;out=project/'qa/home-pixel-alignment';out.mkdir(parents=True,exist_ok=True);stage=sys.argv[1] if len(sys.argv)>1 else 'current'
selectors=['.game-device','.activity-header','.activity-title-block','.activity-title','.activity-title-art','.title-art-window','.activity-hud','.activity-progress-row','.activity-progress-copy','.activity-points','.activity-links','.activity-shortcut','.panel-body','.route-canvas','.route-stop','.route-caption','.route-caption-name','.route-node','.route-guide','.route-guide image','#footer-primary','.panel-footer']
script='function(){return new Promise(function(resolve){var q=wx.createSelectorQuery();var keys='+json.dumps(selectors)+';keys.forEach(function(s){q.selectAll(s).boundingClientRect();});q.exec(function(r){var data={};keys.forEach(function(s,i){data[s]=r[i];});resolve({window:wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync(),menu:wx.getMenuButtonBoundingClientRect?wx.getMenuButtonBoundingClientRect():null,elements:data});});});}'
all=[]
for name in sys.argv[2:] or ['千年文脉','十步芳草','金色产业','青山绿水']:
 project=root/'交付/微信小程序四套'/name
 r=subprocess.run(['/usr/local/bin/wechatide','-c','Codex','automation_evaluate','--project',str(project),'--fn-source',script],capture_output=True,text=True,timeout=45)
 if r.returncode: print(r.stdout,r.stderr);sys.exit(1)
 d=json.loads(r.stdout)
 while 'elements' not in d:d=d['result']
 (out/(name+'-'+stage+'.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');all.append({'name':name,'data':d});print(name,json.dumps({s:d['elements'][s] for s in ['.activity-header','.activity-title-block','.activity-hud','.activity-links','.panel-body','.panel-footer']},ensure_ascii=False),flush=True)
if len(all)>1:
 baseline=all[0]['data']['elements'];diff=[]
 for x in all[1:]:
  for s in ['.activity-header','.activity-title-block','.activity-hud','.activity-progress-row','.activity-links','.activity-title','.activity-shortcut','#footer-primary','.panel-body','.panel-footer']:
   a,b=baseline[s],x['data']['elements'][s]
   if not a or not b:diff.append({'theme':x['name'],'selector':s,'missing':True});continue
   if len(a)!=len(b):diff.append({'theme':x['name'],'selector':s,'countMismatch':True});continue
   for index,(ra,rb) in enumerate(zip(a,b)):
    for k in ['top','left','width','height']:
     if abs(ra[k]-rb[k])>0.1:diff.append({'theme':x['name'],'selector':s,'index':index,'key':k,'baseline':ra[k],'actual':rb[k],'delta':rb[k]-ra[k]})
  for s in ['.route-caption','.route-node','.route-guide']:
   a,b=baseline[s],x['data']['elements'][s]
   for index,(ra,rb) in enumerate(zip(a,b)):
    for k in ['width','height']:
     if abs(ra[k]-rb[k])>0.1:diff.append({'theme':x['name'],'selector':s,'index':index,'key':k,'baseline':ra[k],'actual':rb[k]})
 (out/(stage+'-comparison.json')).write_text(json.dumps({'passed':not diff,'differences':diff},ensure_ascii=False,indent=2)+'\n');print('DIFFERENCES',len(diff));sys.exit(bool(diff))
