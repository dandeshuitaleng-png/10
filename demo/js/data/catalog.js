const { THEMES, getLevels } = require('./themes');

// The old four-theme dataset is an initial instance, never a restriction on a
// received activity. An intentionally empty catalogue must remain empty.
function catalogThemes(catalog, { includeDisabled = false } = {}) {
  const source = catalog == null ? THEMES : catalog.themes || catalog.config?.themes || [];
  return source.map((theme, index) => {
    const original = THEMES.find(item => item.id === theme.id);
    return { description: '开启新的乡村知识旅程', motif: 'book', defaultart: original?.id || null, ...original, ...theme, order: Number.isFinite(theme.order) ? theme.order : index + 1 };
  }).filter(theme => !theme.deleted && (includeDisabled || theme.enabled !== false)).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
function catalogTheme(catalog, id) {
  return catalogThemes(catalog, { includeDisabled: true }).find(theme => theme.id === id) || null;
}
function catalogLevels(catalog, themeId, { includeDisabled = false } = {}) {
  const source = catalog == null ? THEMES.flatMap(theme => getLevels(theme.id)) : catalog.levels || [];
  return source.filter(level => !level.deleted && level.themeId === themeId && (includeDisabled || level.enabled !== false))
    .slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((level, index) => ({ ...level, displayOrder: index + 1, label: `第${index + 1}关`, difficulty: level.difficultyLabel || level.name || level.difficulty || '知识挑战', questionCount: Number.isInteger(level.questionCount) ? level.questionCount : 10 }));
}
function catalogLevel(catalog, id) {
  const themes = catalogThemes(catalog, { includeDisabled: true });
  for (const theme of themes) {
    const level = catalogLevels(catalog, theme.id, { includeDisabled: true }).find(item => item.id === id);
    if (level) return level;
  }
  return null;
}
function usesOriginalMap(catalog, themeId) {
  if (!THEMES.some(theme => theme.id === themeId)) return false;
  const levels = catalogLevels(catalog, themeId);
  return levels.length === 4 && levels.every((level, index) => level.id === `${themeId}-${index + 1}` && level.order === index + 1);
}
module.exports = { catalogThemes, catalogTheme, catalogLevels, catalogLevel, usesOriginalMap };
