'use strict';
// Read rendered colors through native element style inspection in the isolated fixture.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),project=path.resolve(root,'../.rural-quiz-runtime/theme-content-review');
const {palettes}=require('../miniprogram/services-v4/visual-feedback');
function call(tool,args){const r=spawnSync('/usr/local/bin/wechatide',['-c','Codex',tool,'--project',project,...args],{encoding:'utf8',timeout:45000});assert.equal(r.status,0,r.stdout+r.stderr);const s=r.stdout;let v=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));assert(v.ok,JSON.stringify(v));if(v.result?.success===false)throw Error(JSON.stringify(v));return v.result;}
const rgb=hex=>'rgb('+hex.slice(1).match(/../g).map(s=>parseInt(s,16)).join(',')+')';
const compact=value=>String(value||'').replace(/\s+/g,'').toLowerCase();
const style=(selector,name)=>call('automation_element_action',['--action','style','--selector',selector,'--name',name]);
const checks=[];
for(const theme of ['ecology','red','culture','industry']){
 call('automation_navigate',['--action','reLaunch','--url','/pages/game/index?theme='+theme+'&review=1&controls=0&scenario=home&homeDesign=guide']);
 const p=palettes[theme],rendered={page:style('.game-device','background-color'),board:style('.chapter-board','background-image'),card:style('.chapter-card.locked .chapter-open','background-color'),currentEdge:style('.chapter-active .chapter-open','border-top-color')},issues=[];
 const test=(ok,message)=>{if(!ok)issues.push(message);};
 test(compact(rendered.page)===rgb(p.light),'page uses approved light background');
 const board=compact(rendered.board);
 test(board.includes(rgb(p.panelTop))&&board.includes(rgb(p.panelBottom)),'board uses approved panel gradient');
 test(compact(rendered.card)==='rgb(255,255,255)','ordinary cards use white stock');
 test(compact(rendered.currentEdge)===rgb(p.panelEdge),'current card uses theme edge');
 checks.push({theme,passed:!issues.length,issues,expected:p,rendered});
 console.log((issues.length?'FAIL ':'PASS ')+theme+' reference palette '+issues.join('; '));
}
const report={date:new Date().toISOString(),passed:checks.every(c=>c.passed),scope:'Fresh native element styles for four B themes: page, board, white card and current edge. Buttons are separately reviewed in fresh native screenshots. Original three-width geometry is retained from the prior unchanged layout. This is not browser or physical phone acceptance.',checks};
fs.writeFileSync(path.join(root,'qa/home-designs-20261021/reference-palette-checks.json'),JSON.stringify(report,null,2)+'\n');
if(!report.passed)process.exitCode=1;
