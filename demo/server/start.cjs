'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createApplication } = require('./application.cjs');
const { createLocalWorkstation } = require('./local-workstation.cjs');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
function staticHandler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); res.end(); return; }
  if (pathname === '/') pathname = '/web/play.html';
  if (pathname === '/admin') pathname = '/web/admin.html';
  const allowed = /^\/web\/[\w-]+\.(?:html|js|css)$/.test(pathname) || /^\/(?:images|audio|media)\/[\w./-]+\.(?:png|jpe?g|webp|svg|mp4|webm|mp3|wav|ogg)$/.test(pathname) || ['/design/runtime-bundle.js', '/design/accessibility.js'].includes(pathname);
  if (!allowed || pathname.includes('..')) { res.writeHead(404); res.end('Not found'); return; }
  const filename = path.resolve(ROOT, `.${pathname}`);
  let actual;
  try { actual = fs.realpathSync(filename); } catch { res.writeHead(404); res.end('Not found'); return; }
  if (!actual.startsWith(`${ROOT}${path.sep}`) || !fs.statSync(actual).isFile()) { res.writeHead(404); res.end(); return; }
  const stat = fs.statSync(actual);
  const headers = { 'Content-Type': MIME[path.extname(actual)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache', 'Content-Length': stat.size };
  if (path.extname(actual) === '.html') headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self' https: data: blob:; media-src 'self' https:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'";
  const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
  if(range){const start=Number(range[1]),end=Math.min(stat.size-1,range[2]?Number(range[2]):stat.size-1);if(start>=stat.size||end<start){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}Object.assign(headers,{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});res.writeHead(206,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(actual,{start,end}).pipe(res);return;}
  headers['Accept-Ranges']='bytes';res.writeHead(200, headers);
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(actual).pipe(res);
}
async function start(options = {}) {
  const mode = options.mode || process.env.QUIZ_MODE || 'experience';
  const port = options.port === undefined ? Number(process.env.PORT || 63112) : options.port;
  const host = options.host || process.env.QUIZ_HOST || '127.0.0.1';
  const adminCredentials = options.adminCredentials || (process.env.QUIZ_ADMIN_USERNAME && process.env.QUIZ_ADMIN_PASSWORD ? { username: process.env.QUIZ_ADMIN_USERNAME, password: process.env.QUIZ_ADMIN_PASSWORD } : undefined);
  // Keep live SQLite/WAL files outside the watched mini-game project. Otherwise
  // each answer can trigger a developer-tool recompile and interrupt the player.
  const defaultData=path.resolve(ROOT,'../.rural-quiz-runtime');
  const dbPath=options.dbPath||process.env.QUIZ_DB_PATH||path.join(defaultData,'quiz.sqlite');
  if(!options.dbPath&&!process.env.QUIZ_DB_PATH){
    fs.mkdirSync(defaultData,{recursive:true,mode:0o700});
    for(const name of ['quiz.sqlite','.admin-credentials.json']){
      const old=path.join(__dirname,'data',name),target=path.join(defaultData,name);
      if(fs.existsSync(old)&&!fs.existsSync(target)){fs.copyFileSync(old,target);fs.chmodSync(target,0o600);}
    }
  }
  const app = await createApplication({ ...options, mode, adminCredentials, dbPath });
  let server;
  const localEnabled=mode!=='production'&&['127.0.0.1','localhost','::1'].includes(host)&&process.env.QUIZ_LOCAL_WORKSTATION!=='0'&&options.localWorkstation!==false;
  const local=localEnabled?createLocalWorkstation({base:()=>`http://127.0.0.1:${server.address().port}`,credentialPath:options.credentialPath||path.join(path.dirname(dbPath),'.admin-credentials.json'),identityPath:path.join(path.dirname(dbPath),'.local-player.json')}):null;
  const workspaceStatic=localEnabled?require('./workspace-static.cjs').createWorkspaceStatic(path.resolve(ROOT,'..')):null;
  server = http.createServer(async(req,res)=>{if(local&&await local(req,res))return;if(req.url.startsWith('/api/'))return app.handler(req,res);if(workspaceStatic&&workspaceStatic(req,res))return;staticHandler(req,res);});
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  return { app, server, close: async () => { await new Promise(resolve => server.close(resolve)); await app.close(); } };
}
if (require.main === module) {
  start().then(instance => {
    const address = instance.server.address();
    process.stdout.write(`趣味闯关已启动：http://${address.address}:${address.port}（${instance.app.mode}）\n`);
    const close = () => instance.close().then(() => process.exit(0));
    process.on('SIGINT', close); process.on('SIGTERM', close);
  }).catch(() => { process.stderr.write('启动失败，请检查运行模式、存储路径与管理员凭据配置。\n'); process.exitCode = 1; });
}
module.exports = { start, staticHandler };
