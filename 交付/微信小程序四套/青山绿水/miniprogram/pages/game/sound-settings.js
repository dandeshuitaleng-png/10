'use strict';
// The page owns lifecycle and audio state; these handlers only manage settings.
function createSoundSettings() {
  return {
    toggleSound(e) {
      this.pressTap(e);
      if (this._audio) this._audio.toggle();
    },
    openSoundSettings(e) {
      this.pressTap(e);
      if (!this._audio || this.data.modal || this.data.busy) return;
      this._audio.gesture();
      this.setData({ soundSettingsOpen: true });
      this.syncMotion();
    },
    closeSoundSettings(e) {
      this.pressTap(e);
      if (this._audio) this._audio.save();
      this.setData({ soundSettingsOpen: false });
      this.syncMotion();
    },
    toggleSoundChannel(e) {
      const channel = e.currentTarget.dataset.channel;
      if (this._audio)
        this._audio.setChannel(
          channel,
          channel === 'music' ? !this.data.musicEnabled : !this.data.effectsEnabled
        );
    },
    changeSoundChannel(e) {
      if (this._audio) this._audio.setChannel(e.currentTarget.dataset.channel, !!e.detail.value);
    },
    changeSoundVolume(e) {
      if (this._audio)
        this._audio.setVolume(e.currentTarget.dataset.channel, Number(e.detail.value) / 100, {
          preview: e.currentTarget.dataset.channel === 'effects'
        });
    },
    changingSoundVolume(e) {
      if (this._audio)
        this._audio.setVolume(e.currentTarget.dataset.channel, Number(e.detail.value) / 100, {
          persist: false
        });
    }
  };
}
module.exports = { createSoundSettings };
