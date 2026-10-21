from pathlib import Path
import subprocess,json
p=Path(__file__).resolve().parent.parent;o=p.parent/'交付/微信小程序四套';q=p/'qa/home-polish';records=[]
def call(project,tool,*args):
 r=subprocess.run(['/usr/local/bin/wechatide','-c','Codex',tool,'--project',str(project),*map(str,args)],capture_output=True,text=True,timeout=50)
 if r.returncode:raise RuntimeError(r.stdout+r.stderr)
 return json.loads(r.stdout)
for name,id in [('千年文脉','culture'),('十步芳草','red'),('金色产业','industry'),('青山绿水','ecology')]:
 project=o/name;call(project,'automation_element_action','--action','style','--selector','.route-caption-reward','--name','font-size','--wait-for-selector','.route-caption');geo=json.loads((q/(id+'-geometry.json')).read_text())['elements'];v=geo['.panel-body'][0];c=geo['.route-canvas'][0];maxScroll=c['height']-v['height'];checks=[]
 for edge,y in [('top',0),('bottom',100000)]:
  call(project,'automation_element_action','--action','scrollTo','--selector','.panel-body','--x',0,'--y',y)
  pos=call(project,'automation_element_action','--action','offset','--selector','.route-canvas')['result'];expected=v['top']-(maxScroll if edge=='bottom' else 0)
  flags={k:call(project,'automation_page_action','--action','getData','--data-path',k)['result'] for k in ['mapFadeTop','mapFadeBottom']}
  check={'edge':edge,'expectedCanvasTop':expected,'canvasTop':pos['top'],'flags':flags,'passed':abs(pos['top']-expected)<1 and flags['mapFadeTop']['data']==(edge=='bottom') and flags['mapFadeBottom']['data']==(edge=='top')};checks.append(check)
  if edge=='top':call(project,'simulator_screenshot','--path',q/(id+'-top.png'),'--optimize','false','--wait-for-selector','.route-canvas')
 # Restore the default current-level focus; take the normal screenshot after the hint expires.
 call(project,'simulator_open_page','--page','pages/game/index','--query','route=home')
 result={'name':name,'passed':all(x['passed'] for x in checks),'checks':checks};records.append(result);(q/'scroll-verification.json').write_text(json.dumps({'passed':all(x['passed'] for x in records),'projects':records},ensure_ascii=False,indent=2)+'\n');print(name,result['passed'],flush=True)
