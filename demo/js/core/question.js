// Common four-choice schema and immutable rendering snapshot. Answers stay in the challenge.
const DIFFICULTIES = ['基础', '进阶', '综合'];
function validateQuestion(q) {
  if (!q || typeof q.id !== 'string' || !q.id.trim() || typeof q.title !== 'string' || !q.title.trim() ||
      !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(s => typeof s !== 'string' || !s.trim()) ||
      !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3 ||
      (q.explanation != null && typeof q.explanation !== 'string') ||
      (q.difficulty != null && !DIFFICULTIES.includes(q.difficulty))) throw new Error('INVALID_QUESTION');
  if (q.media && (q.media.type !== 'image' || typeof q.media.src !== 'string' || !q.media.src.trim() ||
      ['alt','caption'].some(k => q.media[k] != null && typeof q.media[k] !== 'string'))) throw new Error('INVALID_QUESTION_MEDIA');
  return q;
}
function copyQuestion(q) { validateQuestion(q); return {...q,options:q.options.slice(),media:q.media?{...q.media}:null}; }
function questionView(q, context) {
  const media=q.media?Object.freeze({...q.media}):null;
  return Object.freeze({id:q.id,title:q.title,options:Object.freeze(q.options.slice()),media,
    kind:media?'image-choice':'text-choice',difficulty:q.difficulty||null,
    position:context.position,total:context.total,levelOrder:context.levelOrder,
    difficultyLabel:context.difficultyLabel,themeName:context.themeName,practice:context.practice===true});
}
module.exports={validateQuestion,copyQuestion,questionView};
