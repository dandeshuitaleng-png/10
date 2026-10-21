'use strict';
// Explicit, loopback-only development adapter. Never enabled by production start.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const loopback=ip=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);
const localOrigin=value=>{try{const u=new URL(value);return ['127.0.0.1','localhost'].includes(u.hostname)&&['5190','63112','6493','6494','6495','6496','6497'].includes(u.port)&&u.protocol==='http:';}catch{return false;}};
function createLocalWorkstation(options){
 let adminToken='',adminExpires=0;
 const fail=(res,status,code,message)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:{code,message}}));};
 async function upstream(route,init={}){return fetch(options.base()+route,init);}
 async function admin(){if(adminToken&&Date.now()<adminExpires)return adminToken;const credentials=JSON.parse(fs.readFileSync(options.credentialPath,'utf8'));const response=await upstream('/api/auth/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});const json=await response.json();if(!response.ok)throw Error('ADMIN_BRIDGE_UNAVAILABLE');adminToken=json.data.token;adminExpires=Date.now()+6*86400000;return adminToken;}
 return async function local(req,res){
  const url=new URL(req.url,'http://localhost'),isLocal=url.pathname.startsWith('/api/local/');
  const host=String(req.headers.host||'').split(':')[0];
  if(!loopback(req.socket.remoteAddress)||!['127.0.0.1','localhost','['].includes(host)){if(isLocal){fail(res,403,'LOCAL_ONLY','此接口仅限本机联调');return true;}return false;}
  const origin=req.headers.origin;
  if(origin&&!localOrigin(origin)){if(url.pathname.startsWith('/api/')){fail(res,403,'ORIGIN_FORBIDDEN','请求来源不受信任');return true;}return false;}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, X-Quiz-Management');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');}
  if(req.method==='OPTIONS'&&url.pathname.startsWith('/api/')){res.writeHead(204);res.end();return true;}
  if(isLocal){
   try{
    if(url.pathname==='/api/local/session'&&req.method==='POST'){
     let identity;
     if(fs.existsSync(options.identityPath))identity=JSON.parse(fs.readFileSync(options.identityPath,'utf8'));
     else{identity={deviceId:crypto.randomBytes(32).toString('base64url'),name:'本地联调用户'};fs.mkdirSync(path.dirname(options.identityPath),{recursive:true,mode:0o700});fs.writeFileSync(options.identityPath,JSON.stringify(identity),{mode:0o600});}
     // Discard supplied bodies: local clients cannot impersonate or change this identity.
     let length=0;for await(const chunk of req){length+=chunk.length;if(length>4096){fail(res,413,'BODY_TOO_LARGE','请求过大');return true;}}
     const response=await upstream('/api/auth/dev',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(identity)});
     const json=await response.json();if(json.data){delete json.data.deviceId;json.data.localSharedIdentity=true;}
     res.writeHead(response.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(json));return true;
    }
    if(url.pathname.startsWith('/api/local/admin/')){
     if(req.headers['x-quiz-management']!=='1'||origin&&!['http://127.0.0.1:5190','http://localhost:5190','http://127.0.0.1:63112','http://localhost:63112'].includes(origin)||req.headers['sec-fetch-site']==='cross-site'){fail(res,403,'MANAGEMENT_ORIGIN_REQUIRED','请从本机管理页面操作');return true;}
     let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024){fail(res,413,'BODY_TOO_LARGE','请求过大');return true;}chunks.push(chunk);}
     const token=await admin(),route=url.pathname.replace('/api/local/admin/','/api/admin/')+url.search;
     const response=await upstream(route,{method:req.method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
     if(response.status===401)adminExpires=0;
     res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'});res.end(Buffer.from(await response.arrayBuffer()));return true;
    }
    fail(res,404,'NOT_FOUND','本地接口不存在');return true;
   }catch{fail(res,503,'LOCAL_SERVICE_UNAVAILABLE','本地服务暂不可用，请重试');return true;}
  }
  // The origin has been checked above; keep the core server's stricter same-origin check.
  if(origin&&url.pathname.startsWith('/api/'))req.headers.origin='http://'+req.headers.host;
  return false;
 };
}
module.exports={createLocalWorkstation,localOrigin};
