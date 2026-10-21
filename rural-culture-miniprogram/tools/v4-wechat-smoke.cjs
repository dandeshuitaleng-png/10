'use strict';
// Local simulator only: real selector taps and read-only Page inspection.
// Review scenarios live in memory; no storage clearing, page-data mutation,
// real messages, uploads, cloud calls or database operations are used here.
const fs = require('node:fs'), path = require('node:path'), { spawn } = require('node:child_process');
const focusWrong = process.argv.includes('--focus-wrong');
const project = path.resolve(process.argv.slice(2).find(argument => !argument.startsWith('--')) || path.join(__dirname, '..'));
const out = path.resolve(__dirname, '../qa/v4/微信'); fs.mkdirSync(out, { recursive: true });
const events = [], checks = [], shots = []; let failure = null;
async function call(tool, args = []) {
  const began = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/local/bin/wechatide', ['-c', 'Codex', tool, '--project', project, ...args]); let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(Error(tool + ': 50 second timeout')); }, 50000);
    child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; }); child.on('error', reject);
    child.on('close', code => { clearTimeout(timer); const text = stdout.slice(stdout.indexOf('{')); let result; try { result = JSON.parse(text); } catch { reject(Error(tool + ': ' + (stdout + stderr).slice(-700))); return; } events.push({ tool, args: args.filter(argument => argument !== '--fn-source'), elapsedMs: Date.now() - began, ok: !code && result.ok, result: result.ok ? result.result : result.message }); if (code || !result.ok || result.result?.success === false) reject(Error(tool + ': ' + (result.message || result.result?.error || 'failed'))); else resolve(result.result); });
  });
}
async function data(name) { const response = await call('automation_page_action', ['--action', 'getData', '--data-path', name, '--wait-for-selector', '.game-device']); return response.data; }
async function tap(selector) { const componentEvent = /^#(?:footer|modal)-/.test(selector); return call('automation_element_action', ['--action', componentEvent ? 'trigger' : 'tap', ...(componentEvent ? ['--type', 'action'] : []), '--selector', selector, '--wait-for-selector', selector]); }
async function shot(name) { const filename = name + '.png'; await call('simulator_screenshot', ['--path', path.join(out, filename), '--optimize', 'false', '--wait-for-selector', '.game-device']); shots.push(filename); }
const check = (name, pass) => { checks.push({ name, passed: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name); if (!pass) throw Error(name); };
async function open(query) { await call('automation_navigate', ['--action', 'reLaunch', '--url', '/pages/game/index' + (query ? '?' + query : ''), '--wait-for-selector', '.game-device']); }
(async () => {
  try {
    if (focusWrong) {
      await open('review=1&scenario=quiz');
      const challenge = await data('challenge'), catalog = require(path.join(project, 'miniprogram/services-v4/catalog.js'));
      const question = catalog.questions.find(item => item.id === challenge.question.id);
      const wrong = (question.answer + 1) % challenge.question.options.length;
      await tap('.option[data-index="' + wrong + '"]');
      // Submit before taking an expensive screenshot, so this check verifies an
      // incorrect answer rather than a deadline reached during capture.
      await tap('#footer-primary');
      const submitted = await data('challenge');
      check('原生错误答案提交进入复活且reason为answer', submitted.status === 'revive' && submitted.feedback.reason === 'answer');
      check('原生错误反馈不泄露正确答案或解析', submitted.feedback.answer == null && submitted.feedback.explanation == null);
      await shot('12-native-wrong-answer'); await open('');
    } else {
    await open('review=1'); check('原生首页路由', await data('route') === 'home'); await shot('01-native-home');
    const width = await call('automation_element_action', ['--selector', '.progress-card', '--action', 'size']); check('原生进度卡宽度超过300px', width.width > 300);
    await tap('#footer-primary'); check('开始组件公开action事件进入关卡', await data('route') === 'levels'); await shot('02-native-levels');
    await tap('.level-card.current'); check('当前关卡真实触摸打开须知', await data('modal') === 'rules'); await shot('03-native-rules');
    // Deliberate review query: no player checkpoint or existing game history is
    // reset. This is the same user-visible flow with a transient mock challenge.
    await open('review=1&scenario=quiz'); check('评审答题页面可运行', await data('route') === 'quiz');
    const challenge = await data('challenge'); const catalog = require(path.join(project, 'miniprogram/services-v4/catalog.js'));
    const question = catalog.questions.find(item => item.id === challenge.question.id); check('模拟题属于当前游戏题库', !!question);
    const wrong = (question.answer + 1) % challenge.question.options.length;
    await tap('.option[data-index="' + wrong + '"]'); check('真实触摸选中选项', (await data('challenge')).selected === wrong); await shot('04-native-selected');
    await tap('#footer-primary'); check('作答未通过进入复活弹窗', await data('modal') === 'revive'); await shot('05-native-revive');
    await tap('#modal-primary'); check('分享入口为明确模拟流程', await data('modal') === 'share');
    await tap('#modal-secondary'); const cancelled = await data('challenge'); check('取消分享不消耗复活次数', cancelled.reviveRemaining === 1 && cancelled.status === 'revive'); await shot('06-native-share-cancelled');
    await tap('#modal-primary'); await tap('#modal-primary');
    const revived = await data('challenge'); check('模拟复活恢复同题且仅消耗一次', revived.status === 'playing' && revived.reviveRemaining === 0 && revived.question.id === challenge.question.id); await shot('07-native-revived');
    await open('review=1&scenario=correct'); check('正确反馈包含解析', (await data('challenge')).status === 'correct'); await shot('08-native-correct');
    await open('review=1&scenario=result'); check('结算页面完整展示', await data('route') === 'result'); await shot('09-native-result');
    await open('review=1&scenario=certificate'); check('本游戏证书页面可运行', await data('route') === 'certificate'); await shot('10-native-certificate');
    await open('review=1&scenario=locked'); check('次数耗尽显示今日锁定', await data('modal') === 'locked'); await shot('11-native-locked');
    // Leave the review and restore the untouched player checkpoint.
    await open(''); check('退出评审恢复玩家首页', await data('route') === 'home');
    const logs = await call('get_simulator_console', ['--command', 'grep -i "error"']); fs.writeFileSync(path.join(out, 'console-errors.json'), JSON.stringify(logs, null, 2) + '\n');
    }
  } catch (error) { failure = error.message; try { await shot('native-failure'); } catch {} }
  const report = { date: new Date().toISOString(), project, passed: !failure, scope: 'WeChat Developer Tools local miniprogram simulator: actual WXML/WXSS/Page/Component. Native page buttons use selector tap. Custom game-button controls use the registered UI inspector trigger(action) event because the inspector cannot locate their internal button; no Page callMethod/setData. In-memory review scenarios; no real sharing or upload', componentInternalTouchVerified: false, checks, events, screenshots: shots, failure, physicalDeviceVerified: false, realBackendVerified: false, formalShareVerified: false };
  fs.writeFileSync(path.join(out, focusWrong ? 'native-wrong-answer-report.json' : 'native-runtime-report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ passed: report.passed, checks: checks.length, screenshots: shots.length, failure })); if (failure) process.exitCode = 1;
})();
