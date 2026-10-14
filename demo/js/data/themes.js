const LEVEL_POINTS = Object.freeze([10, 15, 20, 30]);
const DIFFICULTIES = Object.freeze(['基础认知', '进阶理解', '深度应用', '综合挑战']);
const THEMES = Object.freeze([
  { id: 'red', name: '十步芳草', description: '走近乡村红色故事', motif: 'village' },
  { id: 'culture', name: '千年文脉', description: '读懂家乡人文历史', motif: 'book' },
  { id: 'industry', name: '金色产业', description: '发现乡土物产特色', motif: 'field' },
  { id: 'ecology', name: '青山绿水', description: '认识身边生态风光', motif: 'water' },
]);

function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) || null;
}

function getLevels(themeId) {
  if (!getTheme(themeId)) throw new Error('Unknown theme');
  return LEVEL_POINTS.map((points, index) => ({
    id: `${themeId}-${index + 1}`, themeId, order: index + 1,
    label: `第${index + 1}关`, difficulty: DIFFICULTIES[index], points,
    questionCount: 10,
  }));
}

module.exports = { THEMES, LEVEL_POINTS, DIFFICULTIES, getTheme, getLevels };
