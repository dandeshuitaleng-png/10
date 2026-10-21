'use strict';
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const project = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const runner = path.resolve(__dirname, '../preview');
const port = Number(process.argv[3] || process.env.RURAL_V4_PREVIEW_PORT || 6493);
const config = JSON.parse(fs.readFileSync(path.join(project, 'project.config.json'), 'utf8'));
const miniRoot = path.resolve(project, config.miniprogramRoot || 'miniprogram');
const types = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.wxml': 'text/plain;charset=utf-8', '.wxss': 'text/plain;charset=utf-8', '.json': 'application/json;charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.md': 'text/plain;charset=utf-8' };
http.createServer((request, response) => {
  let pathname; try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400); response.end(); return; }
  const native = pathname.startsWith('/miniprogram/');
  const base = native ? miniRoot : runner;
  const suffix = native ? pathname.slice('/miniprogram/'.length) : pathname === '/' ? 'v4.html' : pathname.replace(/^\/preview\//, '').replace(/^\//, '');
  const file = path.resolve(base, suffix);
  if (!file.startsWith(base + path.sep)) { response.writeHead(403); response.end(); return; }
  fs.readFile(file, (error, body) => { if (error) { response.writeHead(404); response.end('File not found'); return; } response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(body); });
}).listen(port, '127.0.0.1', () => console.log(JSON.stringify({ url: 'http://127.0.0.1:' + port + '/preview/v4.html', project, source: 'Actual native miniprogram WXML/WXSS/Page/Component, browser API shim only' })));
