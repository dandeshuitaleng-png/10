// Valid enabled questions enter the runtime without a review workflow.
const { validateQuestion } = require('../core/question');
const QUESTION_POOLS = require('./approved-pools');

function inspectPool(levelId) {
  const questions = QUESTION_POOLS[levelId] || [];
  if (questions.length < 10) return { ready: false, reason: 'insufficient-content' };
  const ids = new Set();
  try {
    for (const q of questions) {
      validateQuestion(q);
      if (q.levelId !== levelId || q.enabled === false || ids.has(q.id)) return { ready: false, reason: 'invalid-content' };
      ids.add(q.id);
    }
  } catch (_) { return { ready: false, reason: 'invalid-content' }; }
  return { ready: true, questions };
}

module.exports = { QUESTION_POOLS, inspectPool };
