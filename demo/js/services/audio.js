class Audio {
  constructor(api, muted = false) { this.api = api; this.muted = muted; this.tracks = new Map(); }
  register(name, src) {
    if (!src) return;
    const track = this.api.createInnerAudioContext(); track.src = src;
    this.tracks.set(name, track);
  }
  play(name) {
    if (this.muted) return;
    const track = this.tracks.get(name);
    if (track) { track.stop(); track.play(); }
  }
  stopAll() { this.tracks.forEach((track) => track.stop()); }
  destroy() { this.stopAll(); this.tracks.forEach((track) => track.destroy()); this.tracks.clear(); }
}

module.exports = { Audio };
