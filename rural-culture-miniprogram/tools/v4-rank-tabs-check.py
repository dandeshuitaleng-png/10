"""Native geometry regression check; run while the ranking page is visible."""
import argparse,json,subprocess,sys,tempfile
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--project',required=True)
p.add_argument('--output')
p.add_argument('--period',choices=['daily','total'])
a=p.parse_args()
if a.period:
 event=[{'currentTarget':{'dataset':{'action':'period','period':a.period}}}]
 with tempfile.NamedTemporaryFile(mode='w',suffix='.json') as event_file:
  json.dump(event,event_file);event_file.flush()
  tap=subprocess.run(['/usr/local/bin/wechatide','-c','Codex','automation_page_action','--project',a.project,'--action','callMethod','--method','action','--args-file',event_file.name],capture_output=True,text=True,timeout=45)
 if tap.returncode:print(tap.stdout);print(tap.stderr);sys.exit(tap.returncode)
probe='''function(){return new Promise(function(resolve){wx.createSelectorQuery().select(".segmented").boundingClientRect().selectAll(".segmented .tab").boundingClientRect().select(".segmented .active").boundingClientRect().exec(function(r){resolve({container:r[0],tabs:r[1],active:r[2]});});});}'''
r=subprocess.run(['/usr/local/bin/wechatide','-c','Codex','automation_evaluate','--project',a.project,'--fn-source',probe],capture_output=True,text=True,timeout=45)
if r.returncode:
 print(r.stdout);print(r.stderr);sys.exit(r.returncode)
data=json.loads(r.stdout)
while 'container' not in data:
 if not isinstance(data,dict) or 'result' not in data:raise RuntimeError('Missing native geometry: '+str(data))
 data=data['result']
c,t=data['container'],data['tabs']
if not c or len(t)!=2:raise RuntimeError('Open the ranking page before running this check')
errors=[]
for i,b in enumerate(t):
 if b['left']<c['left']+3.5 or b['right']>c['right']-3.5:errors.append('tab %d exceeds padded container: right %.2f > %.2f'%(i,b['right'],c['right']-3.5))
 if b['height']<44:errors.append('tab %d click target is below 44px'%i)
if abs(t[0]['width']-t[1]['width'])>1:errors.append('tab widths differ')
if t[0]['right']>t[1]['left']:errors.append('tabs overlap')
if a.period and (not data.get('active') or data['active']['dataset'].get('period')!=a.period):errors.append('selected period did not update')
report={'project':a.project,'passed':not errors,'periodSetup':'page action handler with synthetic dataset' if a.period else 'current rendered state','geometry':data,'errors':errors}
if a.output:
 Path(a.output).parent.mkdir(parents=True,exist_ok=True)
 Path(a.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(bool(errors))
