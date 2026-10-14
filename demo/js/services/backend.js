// No endpoint, access token or share reward is fabricated in this framework.
class Backend {
  constructor(transport = null) { this.transport = transport; }
  request(operation, payload) {
    if (!this.transport) return Promise.reject(new Error('BACKEND_NOT_CONFIGURED'));
    return this.transport(operation, payload);
  }
  beginChallenge(levelId) { return this.request('challenge.begin', { levelId }); }
  submitAnswer(challengeId, questionId, optionId) { return this.request('challenge.answer', { challengeId, questionId, optionId }); }
  claimRevive(challengeId, verifiedEvidence) {
    if (!verifiedEvidence) return Promise.reject(new Error('VERIFIED_SHARE_REQUIRED'));
    return this.request('challenge.revive', { challengeId, evidence: verifiedEvidence });
  }
  getRanking(period) { return this.request('ranking.list', { period }); }
  getCertificates() { return this.request('certificates.list', {}); }
}

module.exports = { Backend };
