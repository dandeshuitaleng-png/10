'use strict';

// Old integrations may omit the precondition; the editor sends it on every
// mutation. A supplied revision must always be honored, never silently ignored.
function assertRevision(expected, actual) {
  if (expected === undefined) return;
  if (!Number.isSafeInteger(expected) || expected < 1) {
    throw Object.assign(new Error('数据版本格式不正确'), { status: 400, code: 'INVALID_VERSION' });
  }
  if (expected !== actual) throw conflict();
}

function conflict() {
  return Object.assign(new Error('数据已被其他页面更新，请重新加载后再保存；本次修改尚未提交。'), {
    status: 409,
    code: 'VERSION_CONFLICT'
  });
}

// Complete replacement must also detect entries added or removed since load.
function assertCollectionRevision(expected, entries) {
  if (expected === undefined) return;
  if (
    !expected ||
    typeof expected !== 'object' ||
    Array.isArray(expected) ||
    Object.values(expected).some((version) => !Number.isSafeInteger(version) || version < 1)
  ) {
    throw Object.assign(new Error('题库版本格式不正确'), { status: 400, code: 'INVALID_VERSION' });
  }
  if (
    Object.keys(expected).length !== entries.length ||
    entries.some(
      (entry) => !Object.hasOwn(expected, entry.id) || expected[entry.id] !== entry.version
    )
  ) {
    throw conflict();
  }
}

module.exports = { assertRevision, assertCollectionRevision };
