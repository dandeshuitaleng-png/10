'use strict';
const fs = require('node:fs'), path = require('node:path'), { spawn } = require('node:child_process');
const projectRoot = path.resolve(__dirname, '../../交付/微信小程序四套');
const out = path.resolve(__dirname, '../qa/v4/微信'); fs.mkdirSync(out, { recursive: true });
const only = process.argv.find(argument => argument.startsWith('--only='))?.slice(7).split(',');
const games = [['culture', '千年文脉'], ['red', '十步芳草'], ['industry', '金色产业'], ['ecology', '青山绿水']].filter(([gameId]) => !only || only.includes(gameId));
const previous = only && fs.existsSync(path.join(out, 'four-native-homes-report.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'four-native-homes-report.json'))) : null;
const events = previous?.events || [], checks = previous?.checks || [], screenshots = previous?.screenshots || []; let failure = null;
async function call(project, tool, args = []) { return new Promise((resolve, reject) => { const began = Date.now(), child = spawn('/usr/local/bin/wechatide', ['-c', 'Codex', tool, '--project', project, ...args]); let stdout = '', stderr = ''; const timer = setTimeout(() => { child.kill('SIGTERM'); reject(Error(tool + ': timeout')); }, 55000); child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; }); child.on('error', reject); child.on('close', code => { clearTimeout(timer); let result; try { result = JSON.parse(stdout.slice(stdout.indexOf('{'))); } catch { reject(Error((stdout + stderr).slice(-600))); return; } events.push({ project, tool, args, elapsedMs: Date.now() - began, ok: result.ok && !code, result: result.ok ? result.result : result.message }); if (code || !result.ok || result.result?.success === false) reject(Error(tool + ': ' + (result.message || result.result?.error || 'failed'))); else resolve(result.result); }); }); }
const check = (name, passed) => { checks.push({ name, passed: !!passed }); console.log((passed ? 'PASS ' : 'FAIL ') + name); if (!passed) throw Error(name); };
(async () => { try {
  for (const [gameId, name] of games) {
    const project = path.join(projectRoot, name);
    await call(project, 'open_project_window', ['--window-mode', 'liteMode']);
    const context = await call(project, 'automation_runtime_info', ['--action', 'currentPage']);
    if (context.currentPage?.path !== 'pages/game/index') await call(project, 'simulator_open_page', ['--page', 'pages/game/index']);
    const filename = '20-native-' + gameId + '-home.png';
    const captureArgs = ['--path', path.join(out, filename), '--optimize', 'false', '--wait-for-selector', '.scene-frame', '--wait', '2'];
    try { await call(project, 'simulator_screenshot', captureArgs); } catch (error) { events.push({ project, note: 'One bounded read-only screenshot retry after initial automator warm-up timeout', initialError: error.message }); await call(project, 'automation_runtime_info', ['--action', 'currentPage']); await call(project, 'simulator_screenshot', captureArgs); }
    if (!screenshots.includes(filename)) screenshots.push(filename);
    const game = await call(project, 'automation_page_action', ['--action', 'getData', '--data-path', 'skin.gameId', '--wait-for-selector', '.scene-frame']); check(name + '原生项目固定gameId', game.data === gameId);
    const route = await call(project, 'automation_page_action', ['--action', 'getData', '--data-path', 'route']); check(name + '独立首页可运行', route.data === 'home');
    const scene = await call(project, 'automation_element_action', ['--action', 'offset', '--selector', '.scene-frame']);
    const width = await call(project, 'automation_element_action', ['--action', 'size', '--selector', '.progress-card']); check(name + '原生进度卡完整宽度', width.width > 300);
    checks.push({ name: name + '原生插画offset记录', passed: true, offset: scene });
  }
} catch (error) { failure = error.message; }
  const report = { date: new Date().toISOString(), passed: !failure && screenshots.length === 4, scope: 'Four independently generated fixed-gameId WeChat mini program projects, actual Developer Tools simulator home rendering only; no upload, backend or physical device test', initialFailures: [...(previous?.initialFailures || []), ...(previous?.failure ? [previous.failure] : [])], checks, events, screenshots, failure, physicalDeviceVerified: false };
  fs.writeFileSync(path.join(out, 'four-native-homes-report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ passed: report.passed, checks: checks.length, screenshots: screenshots.length, failure })); if (failure) process.exitCode = 1;
})();
