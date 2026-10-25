'use strict';

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const challengeStates = new Set([
  'answering',
  'feedback',
  'revive',
  'locked',
  'completed',
  'exited'
]);
function validateResponse(route, envelope) {
  const value = record(envelope) ? envelope.data : undefined;
  let valid = record(value);
  if (valid && route === '/api/catalog')
    valid = Array.isArray(value.themes) && Array.isArray(value.levels) && record(value.config);
  else if (valid && route === '/api/me')
    valid =
      record(value.user) &&
      record(value.progress) &&
      Array.isArray(value.ledger) &&
      Array.isArray(value.activeChallenges);
  else if (valid && route === '/api/certificates') valid = Array.isArray(value.certificates);
  else if (valid && route.startsWith('/api/rankings?')) valid = Array.isArray(value.entries);
  else if (valid && (route === '/api/challenges' || route.startsWith('/api/challenges/')))
    valid =
      typeof value.id === 'string' &&
      challengeStates.has(value.state) &&
      Number.isFinite(value.serverTime);
  else if (valid && ['/api/local/session', '/api/auth/platform'].includes(route))
    valid = typeof value.token === 'string' && value.token.length > 0;
  if (!valid)
    throw Object.assign(new Error('服务返回的数据不完整，请重新连接后重试。'), {
      code: 'INVALID_RESPONSE',
      status: 200
    });
  return value;
}

module.exports = { validateResponse };
