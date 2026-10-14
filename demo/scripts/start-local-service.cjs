'use strict';
// Keep the local experience service independent of a terminal/tool session.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const url = 'http://127.0.0.1:63112/api/health';
async function healthy() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    const data = await response.json();
    return response.ok && data.data?.ok === true && data.data?.mode === 'experience';
  } catch { return false; }
}
async function main() {
  if (await healthy()) { console.log('本机体验服务已在运行：http://127.0.0.1:63112/web/play.html'); return; }
  const runtime = path.resolve(root, '../.rural-quiz-runtime');
  fs.mkdirSync(runtime, { recursive: true, mode: 0o700 });
  const logPath = path.join(runtime, 'service.log');
  const log = fs.openSync(logPath, 'a', 0o600);
  fs.chmodSync(logPath, 0o600);
  const child = spawn(process.execPath, [path.join(root, 'server/start.cjs')], {
    cwd: root, detached: true, stdio: ['ignore', log, log],
    env: { ...process.env, PORT: '63112', QUIZ_HOST: '127.0.0.1', QUIZ_MODE: 'experience' }
  });
  fs.closeSync(log);
  await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  child.unref();
  for (let i = 0; i < 10; i++) {
    if (await healthy()) { console.log('本机体验服务已在后台运行：http://127.0.0.1:63112/web/play.html'); return; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('服务尚未就绪，请检查本机端口占用及私有运行目录中的service.log；不要清除存档。');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
