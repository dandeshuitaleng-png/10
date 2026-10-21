const {catalogThemes, catalogLevels} = require('./catalog');

// Progress is a join of the current enabled catalogue with saved level IDs.
// Historical aggregate counts may include disabled levels; never use them here.
function learningProgress(catalog, progress = {}) {
  if (catalog == null) return {ready:false, completed:0, total:null, themes:[], label:'正在读取学习进度…', ariaLabel:'正在读取学习进度'};
  const themes = catalogThemes(catalog).map(theme => {
    const levels = catalogLevels(catalog, theme.id), saved = progress[theme.id] || {};
    const states = new Map((saved.levelIds || []).map((id, index) => [id, saved.nodes?.[index]]));
    const completed = levels.filter(level => ['complete','completed'].includes(saved.levelStates?.[level.id] ?? states.get(level.id))).length;
    const total = levels.length, state = !total ? 'empty' : completed === total ? 'complete' : completed ? 'partial' : 'idle';
    return {...theme, levelIds:levels.map(level=>level.id), completed, total, state,
      ariaLabel:theme.name + (total ? '，已完成'+completed+' / '+total+'关' : '，暂无可参与关卡')};
  });
  const completed = themes.reduce((sum,theme)=>sum+theme.completed,0), total = themes.reduce((sum,theme)=>sum+theme.total,0);
  const label = total ? '已完成 '+completed+' / '+total+' 关' : '主题内容正在准备中';
  return {ready:true, completed, total, themes, label, ariaLabel:themes.length ? '我的学习进度，'+themes.map(theme=>theme.ariaLabel).join('；') : label};
}

module.exports = {learningProgress};
