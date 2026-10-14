const KEY = 'rural-quiz:preferences:v1';

class Storage {
  constructor(api) { this.api = api; }
  loadPreferences() {
    try {
      const value = this.api.getStorageSync(KEY);
      return { muted: !!(value && value.version === 1 && value.muted) };
    } catch (_) { return { muted: false }; }
  }
  savePreferences(preferences) {
    try { this.api.setStorageSync(KEY, { version: 1, muted: !!preferences.muted }); return { ok: true }; }
    catch (_) { return { ok: false, reason: 'storage-unavailable' }; }
  }
}

module.exports = { Storage, KEY };
