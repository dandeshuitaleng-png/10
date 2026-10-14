module.exports = {
  mode: 'mock',
  baseURL: '',
  requestTimeout: 10000,
  mockLatency: 180,
  storageKey: 'rural-culture-ui-v1',
  rules: { questionsPerChapter: 3, secondsPerQuestion: 60, revivalLimit: 1, lockAfterFailure: true, chapterPoints: [10, 15, 20, 30] }
};
