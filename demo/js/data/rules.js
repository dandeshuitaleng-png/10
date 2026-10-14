// Unconfirmed business details stay null; interface examples never become live rules.
module.exports = Object.freeze({
  themeCount: 4, levelsPerTheme: 4, questionsPerLevel: 10, optionsPerQuestion: 4,
  requireAllCorrect: true, reviveCount: 1, lockScope: 'current-level',
  levelPoints: Object.freeze([10, 15, 20, 30]),
  questionTimeSeconds: null, timeoutPolicy: null, reviveResetPeriod: null,
  dayBoundary: null, replayPointsPolicy: null, accuracyPolicy: null,
  shareVerificationPolicy: null,
});
