// Read the current Excel master, not a stale JSON question snapshot.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {selectApprovedPools}=require('./lib/question-pools.cjs');
function run(args=process.argv.slice(2)) {
  const options={};
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--install') options.install=true;
    else if(['--workbook','--base','--output-dir','--python'].includes(args[i]) && args[i+1]) options[args[i].slice(2)]=args[++i];
    else throw new Error('Unknown or incomplete argument: '+args[i]);
  }
  const root=path.resolve(__dirname,'..');
  const source=path.resolve(root,'../题库交付/湖南乡村知识题库240题');
  const workbook=path.resolve(options.workbook||path.join(source,'湖南乡村知识题库240题.xlsx'));
  const base=path.resolve(options.base||path.join(source,'湖南乡村知识题库240题.json'));
  const output=path.resolve(options['output-dir']||path.join(root,'design/content-intake/current'));
  const extraction=spawnSync(options.python||'python3',['-c',
    'import importlib.util,json,sys\nspec=importlib.util.spec_from_file_location("bank",sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nfrom pathlib import Path\ndata=m.convert(Path(sys.argv[2]),json.loads(Path(sys.argv[3]).read_text(encoding="utf-8")))\nprint(json.dumps(data,ensure_ascii=False))',
    path.join(__dirname,'lib/question-workbook.py'),workbook,base],{encoding:'utf8',maxBuffer:8*1024*1024});
  if(extraction.error||extraction.status!==0) throw new Error(extraction.error?.message||extraction.stderr);
  const data=JSON.parse(extraction.stdout),pools=selectApprovedPools(data);
  const count=(key)=>data.questions.reduce((all,q)=>(all[q[key]]=(all[q[key]]||0)+1,all),{});
  const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  const report={checkedAt:new Date().toISOString(),workbook,workbookSha256:hash(workbook),base,baseSha256:hash(base),
    extractedFrom:'题库总表',questionCount:data.questions.length,themeCounts:count('themeName'),poolCounts:count('levelId'),
    enabledCount:data.questions.filter(q=>q.enabled===true).length,
    eligibleLevelIds:Object.keys(pools),eligibleQuestionCount:Object.values(pools).flat().length,
    installed:options.install===true,backendAndScoring:'not_changed'};
  fs.mkdirSync(output,{recursive:true});
  const write=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n');
  write('bank.json',data);write('approved-pools.json',pools);write('import-report.json',report);
  if(options.install) fs.writeFileSync(path.join(root,'js/data/approved-pools.js'),'// Online questions are loaded from the server; do not embed authoring answers.\nmodule.exports = {};\n');
  console.log(JSON.stringify({questionCount:data.questions.length,eligibleLevels:Object.keys(pools).length,eligibleQuestionCount:report.eligibleQuestionCount,installed:report.installed,output}));
  return report;
}
if(require.main===module)try{run();}catch(error){console.error('题库导入失败：'+error.message);process.exitCode=1;}
module.exports={run};
