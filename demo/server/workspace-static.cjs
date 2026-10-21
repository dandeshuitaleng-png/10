'use strict';
const fs=require('node:fs'),path=require('node:path');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.wxml':'text/plain; charset=utf-8','.wxss':'text/plain; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4'};
function createWorkspaceStatic(workspace){
 const mother=path.join(workspace,'rural-culture-miniprogram');
 const names={culture:'千年文脉',red:'十步芳草',industry:'金色产业',ecology:'青山绿水'};
 function serve(req,res,base,relative,htmlRewrite=false){
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return true;}
  try{const actual=fs.realpathSync(path.resolve(base,relative));if(!actual.startsWith(fs.realpathSync(base)+path.sep)||!fs.statSync(actual).isFile())throw Error();
   if(htmlRewrite){res.writeHead(200,{'Content-Type':MIME['.html'],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(fs.readFileSync(actual,'utf8').replaceAll('"/assets/','"/management/assets/'));return true;}
   const stat=fs.statSync(actual),headers={'Content-Type':MIME[path.extname(actual)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
   // Native video seeks must receive byte ranges, not the complete file again.
   const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');if(range){const start=Number(range[1]),end=Math.min(stat.size-1,range[2]?Number(range[2]):stat.size-1);if(start>=stat.size||end<start){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return true;}Object.assign(headers,{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});res.writeHead(206,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(actual,{start,end}).pipe(res);return true;}
   headers['Content-Length']=stat.size;headers['Accept-Ranges']='bytes';res.writeHead(200,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(actual).pipe(res);return true;
  }catch{res.writeHead(404);res.end('Not found');return true;}
 }
 return (req,res)=>{let u;try{u=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return false;}if(u.includes('..')||u.includes('\\')){res.writeHead(400);res.end();return true;}
  if(['/','/play','/web/play.html','/web/series.html'].includes(u))return serve(req,res,path.join(workspace,'demo/web'),'series.html');
  if(['/series.js','/series.css'].includes(u))return serve(req,res,path.join(workspace,'demo/web'),u.slice(1));
  if(['/admin','/manage','/management/'].includes(u))return serve(req,res,path.join(workspace,'quiz-admin/dist'),'index.html',true);
  if(/^\/management\/assets\/[\w.-]+$/.test(u))return serve(req,res,path.join(workspace,'quiz-admin/dist'),u.replace('/management/',''));
  const m=/^\/native\/(culture|red|industry|ecology)\/(.+)$/.exec(u);if(!m)return false;
  const [,theme,relative]=m;
  if(/^preview\/v4(?:-runtime\.js|\.html)$/.test(relative))return serve(req,res,mother,relative);
  if(!/^miniprogram\/(?:app\.(?:js|json|wxss)|game-config\.js|pages\/game\/[\w.-]+|services-v4\/[\w.-]+\.js|components\/(?:game-(?:button|icon)|mascot-actor)\/[\w.-]+|assets\/[\w/.-]+)$/.test(relative)){res.writeHead(404);res.end();return true;}
  const project=theme==='culture'?mother:path.join(workspace,'交付/微信小程序四套',names[theme]);return serve(req,res,project,relative);
 };
}
module.exports={createWorkspaceStatic};
