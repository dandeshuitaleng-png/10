import json,subprocess,sys
from pathlib import Path
p=Path(__file__).resolve().parent.parent;o=p.parent/'交付/微信小程序四套';q=p/'qa/home-polish';results=[]
def call(project,tool,*args):
 r=subprocess.run(['/usr/local/bin/wechatide','-c','Codex',tool,'--project',str(project),*map(str,args)],capture_output=True,text=True,timeout=55)
 if r.returncode:raise RuntimeError(r.stdout+r.stderr)
 return json.loads(r.stdout)
def unwrap(d,key):
 while key not in d:d=d['result']
 return d
selectors=['.activity-header','.panel-body','.panel-scroll-frame','.route-canvas','.route-caption','.route-caption-label','.route-caption-name','.route-caption-state','.route-caption-reward','#footer-primary']
fn='function(){return new Promise(function(resolve){var q=wx.createSelectorQuery();var keys='+json.dumps(selectors)+';keys.forEach(function(s){q.selectAll(s).boundingClientRect();});q.exec(function(r){var e={};keys.forEach(function(s,i){e[s]=r[i];});resolve({elements:e});});});}'
for name,id in [('千年文脉','culture'),('十步芳草','red'),('金色产业','industry'),('青山绿水','ecology')]:
 project=o/name;call(project,'simulator_open_page','--page','pages/game/index','--query','route=home')
 style=call(project,'automation_element_action','--action','style','--selector','.route-caption-reward','--name','font-size','--wait-for-selector','.route-caption');(q/(id+'-reward-font.json')).write_text(json.dumps(style,ensure_ascii=False,indent=2)+'\n')
 d=unwrap(call(project,'automation_evaluate','--fn-source',fn),'elements');(q/(id+'-geometry.json')).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 e=d['elements'];baseline=json.loads((p/'qa/map-unification'/(name+'-after.json')).read_text())['elements'];diff=[]
 for selector in ['.activity-header','.panel-body','.route-canvas','#footer-primary']:
  for field in ['left','width','height']+([] if selector=='.route-canvas' else ['top']):
   if abs(e[selector][0][field]-baseline[selector][0][field])>.15:diff.append([selector,field,e[selector][0][field],baseline[selector][0][field]])
 for i,card in enumerate(e['.route-caption']):
  for key in ['.route-caption-label','.route-caption-name','.route-caption-state','.route-caption-reward']:
   r=e[key][i]
   if r['top']<card['top']+3 or r['bottom']>card['bottom']-2 or r['left']<card['left'] or r['right']>card['right']+.1:diff.append(['text outside',i,key,r,card])
  for a,b in zip(['.route-caption-label','.route-caption-name','.route-caption-state'],['.route-caption-name','.route-caption-state','.route-caption-reward']):
   if e[a][i]['bottom']>e[b][i]['top']+.15:diff.append(['text overlap',i,a,b])
 assert style['result']=='12px',style
 call(project,'simulator_screenshot','--path',q/(id+'-after.png'),'--optimize','false','--wait-for-selector','.route-canvas')
 result={'name':name,'passed':not diff,'differences':diff};results.append(result);(q/'native-verification.json').write_text(json.dumps({'passed':all(x['passed'] for x in results),'projects':results,'hintNote':'Automatic 3.5-second timeout and dismissal are covered by Page tests; no player data was changed.'},ensure_ascii=False,indent=2)+'\n');print(name,'passed' if not diff else diff,flush=True)
assert all(x['passed'] for x in results)
