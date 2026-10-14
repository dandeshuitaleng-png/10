import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'miniprogram'
components={n:'/components/'+n+'/index' for n in ['ui-button','study-progress','page-state']}
for name,title in [('home','趣味闯关'),('themes','文化专题'),('chapters','章节目录'),('quiz','知识探索')]:
 p=root/'pages'/name;p.mkdir(parents=True,exist_ok=True);(p/'index.json').write_text(json.dumps({'navigationBarTitleText':title,'usingComponents':components},ensure_ascii=False,indent=2))
(root/'app.json').write_text(json.dumps({'pages':['pages/'+n+'/index' for n in ['home','themes','chapters','quiz']],'window':{'navigationBarTitleText':'趣味闯关','navigationBarBackgroundColor':'#F7F3E9','navigationBarTextStyle':'black','backgroundColor':'#F7F3E9'},'sitemapLocation':'sitemap.json','style':'v2','lazyCodeLoading':'requiredComponents'},ensure_ascii=False,indent=2))
