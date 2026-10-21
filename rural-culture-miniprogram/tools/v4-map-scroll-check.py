import json,subprocess
from pathlib import Path
p=Path(__file__).resolve().parent.parent;out=p/'qa/map-unification';projects=p.parent/'交付/微信小程序四套'
results=[]
def call(project,tool,*args):
 r=subprocess.run(['/usr/local/bin/wechatide','-c','Codex',tool,'--project',str(project),*map(str,args)],capture_output=True,text=True,timeout=55)
 if r.returncode:raise RuntimeError(r.stdout+r.stderr)
 d=json.loads(r.stdout)
 return d
for name,id in [('千年文脉','culture'),('十步芳草','red'),('金色产业','industry'),('青山绿水','ecology')]:
 project=projects/name;d=json.loads((out/(name+'-after.json')).read_text())['elements'];v=d['.panel-body'][0];c=d['.route-canvas'][0];maximum=c['height']-v['height'];record={'name':name,'viewportTop':v['top'],'maxScroll':maximum,'checks':[]}
 for label,y,expected in [('top',0,v['top']),('bottom',100000,v['top']-maximum)]:
  action=call(project,'automation_element_action','--action','scrollTo','--selector','.panel-body','--x',0,'--y',y)
  offset=call(project,'automation_element_action','--action','offset','--selector','.route-canvas');value=offset
  while 'top' not in value:value=value['result']
  check={'edge':label,'expectedCanvasTop':expected,'canvasTop':value['top'],'passed':abs(value['top']-expected)<1,'action':action,'offset':offset};record['checks'].append(check)
  call(project,'simulator_screenshot','--path',out/(id+'-'+label+'.png'),'--optimize','false','--wait-for-selector','.route-canvas')
 call(project,'simulator_open_page','--page','pages/game/index','--query','route=home')
 record['passed']=all(x['passed'] for x in record['checks']);results.append(record);print(name,record['passed'],flush=True)
 (out/'scroll-verification.json').write_text(json.dumps({'passed':all(x['passed'] for x in results),'projects':results},ensure_ascii=False,indent=2)+'\n')
assert all(x['passed'] for x in results)
