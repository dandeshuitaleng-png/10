'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const project = path.resolve(__dirname, '..');
const source = path.join(project, 'miniprogram');
const destination = path.resolve(process.argv[2] || path.join(project, '../交付/微信小程序四套'));
const games = { culture: '千年文脉', red: '十步芳草', industry: '金色产业', ecology: '青山绿水' };
const designSource = path.join(project, 'design-source');
const sandbox = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(designSource, 'catalog.js'), 'utf8'), sandbox);
const catalog = JSON.parse(JSON.stringify(sandbox.window.PROTOTYPE_CONFIG));
vm.runInNewContext(fs.readFileSync(path.join(designSource, 'games.js'), 'utf8'), sandbox);
const skins = JSON.parse(JSON.stringify(sandbox.window.GAME_SKINS));
const originalProject = JSON.parse(fs.readFileSync(path.join(project, 'project.config.json'), 'utf8'));
const originalGame = require(path.join(source, 'game-config.js'));
const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const report = { date: new Date().toISOString(), source: project, scope: 'Four fixed-gameId native mini program projects; local mock; no upload or production backend changes', games: [] };
fs.mkdirSync(destination, { recursive: true });
for (const [gameId, name] of Object.entries(games)) {
  const target = path.join(destination, name), mini = path.join(target, 'miniprogram'); fs.mkdirSync(mini, { recursive: true });
  // Replace only this generated directory. The original project and stored player
  // records are never removed; no simulator cache or database operation occurs.
  for (const part of ['app.js', 'app.json', 'app.wxss', 'sitemap.json', 'services-v4', 'components/game-button', 'components/game-icon', 'pages/game', 'assets/icons', 'assets/brand', 'assets/journey/'+gameId+'.jpg', 'assets/journey/node-current.png', 'assets/journey/node-completed.png', 'assets/journey/node-locked.png', 'assets/' + gameId]) {
    const input = path.join(source, part); if (!fs.existsSync(input)) throw Error('Missing native delivery input: ' + part); fs.cpSync(input, path.join(mini, part), { recursive: true });
  }
  const config = { ...originalGame, ...skins[gameId], gameId, name, mode: 'mock', reviewEnabled: false };
  // Explicit override paths must follow the fixed game rather than host skin.
  for (const [key, value] of Object.entries(config)) if (typeof value === 'string' && value.includes('/assets/' + originalGame.gameId + '/')) config[key] = value.replace('/assets/' + originalGame.gameId + '/', '/assets/' + gameId + '/');
  fs.writeFileSync(path.join(mini, 'game-config.js'), "'use strict';\nmodule.exports = " + JSON.stringify(config, null, 2) + ';\n');
  const ownCatalog = { ...catalog, themes: catalog.themes.filter(theme => theme.id === gameId), levels: catalog.levels.filter(level => (level.themeId || level.gameId) === gameId), questions: catalog.questions.filter(question => (question.themeId || question.gameId) === gameId) };
  fs.writeFileSync(path.join(mini, 'services-v4/catalog.js'), "'use strict';\n// This package contains only its own configured catalog and mock question bank.\nmodule.exports = " + JSON.stringify(ownCatalog, null, 2) + ';\n');
  // The host excludes the other three skins. Those host-only ignore rules must
  // not hide the selected skin in an independently generated package.
  fs.writeFileSync(path.join(target, 'project.config.json'), JSON.stringify({ ...originalProject, projectname: 'rural-quiz-' + gameId, miniprogramRoot: 'miniprogram/', compileType: 'miniprogram', packOptions: { ignore: [{ type: 'file', value: 'services-v4/SERVICE-CONTRACT.md' }], include: [] } }, null, 2) + '\n');
  fs.writeFileSync(path.join(target, 'README.md'), '# ' + name + ' · 微信小程序原型\n\n使用微信开发者工具导入本目录。固定 gameId：`' + gameId + '`。仅本游戏题库、目录和资产；进度、积分、排行榜与证书按 gameId 隔离存储。\n\n当前为本地模拟模式，题库仅用于演示，客户端模拟判题不作为正式安全方案。正式 AppID、接口、分享资格和服务端权威计时需甲方联调。沿用原工程 AppID 仅为本机开发，不代表已注册四个正式应用。\n\n浏览器对应原生源码预览：在母工程运行 `node tools/v4-serve.cjs "' + target + '" 6493`。该浏览器运行结果与微信模拟器、真机分别验收。\n');
  const outputs = files(mini), bytes = outputs.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  report.games.push({ gameId, name, directory: target, files: outputs.length, bytes, mib: Number((bytes / 1048576).toFixed(3)), mainPackageUnder2MiB: bytes < 2 * 1048576, themes: ownCatalog.themes.length, levels: ownCatalog.levels.length, questions: ownCatalog.questions.length, filesSha256: Object.fromEntries(outputs.map(file => [path.relative(target, file), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])) });
}
fs.writeFileSync(path.join(destination, '构建清单.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ destination, games: report.games.map(({ gameId, mib, levels, questions, mainPackageUnder2MiB }) => ({ gameId, mib, levels, questions, mainPackageUnder2MiB })) }, null, 2));
