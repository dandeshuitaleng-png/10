const {validateQuestion} = require('../../js/core/question');
const {THEMES, getLevels} = require('../../js/data/themes');
function selectApprovedPools(data) {
  if (!data || !Array.isArray(data.questions)) throw new Error('Missing questions');
  const levels = THEMES.flatMap(t => getLevels(t.id));
  const known = new Map(levels.map(l => [l.id,l]));
  const grouped = {}; const ids = new Set();
  for (const q of data.questions) {
    validateQuestion(q);
    if (ids.has(q.id)) throw new Error('Duplicate question id: '+q.id);
    ids.add(q.id);
    const level = known.get(q.levelId);
    if (!level || q.themeId !== level.themeId || q.levelOrder !== level.order) throw new Error('Invalid level mapping: '+q.id);
    if (q.enabled === false) continue;
    (grouped[q.levelId] ||= []).push(q);
  }
  return Object.fromEntries(levels.filter(l => (grouped[l.id] || []).length >= l.questionCount).map(l => [l.id, grouped[l.id]]));
}
module.exports = {selectApprovedPools};
