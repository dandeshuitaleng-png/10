const config = require('./config');
const adapter = config.mode === 'mock' ? require('./mock-server/index') : require('./remote');
const api = {};
['getHome','getThemes','getTheme','getProgress','startSession','getSession','submitAnswer','claimRevival','nextQuestion','getResult','getCertificates','getLeaderboard'].forEach(method=>{api[method]=params=>adapter.invoke(method,params||{});});
module.exports=api;
