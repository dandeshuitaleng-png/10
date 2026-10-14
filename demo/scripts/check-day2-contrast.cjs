const fs=require('node:fs'),path=require('node:path');const C=require('../js/ui/tokens').colors;
function lum(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]}
function ratio(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const pairs=[['正文/纸色','ink','paper',4.5],['正文/卡片','ink','surface',4.5],['次要文字/纸色','muted','paper',4.5],['次要文字/浅湖蓝','muted','lakeLight',4.5],['节点状态/浅湖蓝','lake','lakeLight',4.5],['节点状态/浅暖橙','lake','orangeLight',4.5],['锁定文字/浅暖橙','error','orangeLight',4.5],['主按钮文字','surface','lake',4.5],['必要边界/纸色','line','paper',3],['必要边界/浅湖蓝','line','lakeLight',3],['必要边界/卡片','line','surface',3],['通关勾形','surface','lake',3],['今日锁定标记','surface','error',3]];
const checks=pairs.map(([name,a,b,min])=>({name,foreground:C[a],background:C[b],ratio:Number(ratio(C[a],C[b]).toFixed(2)),minimum:min,pass:ratio(C[a],C[b])>=min}));
const report={generatedAt:new Date().toISOString(),scope:'Day2 text and essential UI boundary pairs only; decorative illustration colors excluded',checks,passed:checks.every(c=>c.pass)};
fs.writeFileSync(path.resolve(__dirname,'../design/day2-v2/evidence/contrast-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
