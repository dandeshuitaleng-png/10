const ART = Object.freeze({ red:'images/v2-quality-20261010/theme-red-runtime.png',culture:'images/v2-style03/theme-culture.png',industry:'images/v2-style03/theme-industry.png',ecology:'images/v2-style03/theme-ecology.png' });
const DEFAULT_MAP_ART = Object.freeze({ red:'images/v2-quality-20261010/map-red-runtime.jpg',culture:'images/v2-style03/map-culture.jpg',industry:'images/v2-style03/map-industry.jpg',ecology:'images/v2-style03/ecology-map.jpg' });

class Resources {
  constructor(platform, { mapArt, extraArt = {} } = {}) {
    this.platform = platform; this.images = {}; this.failures = [];
    this.mapArt = Object.freeze({ ...DEFAULT_MAP_ART, ...mapArt });
    this.extraArt = Object.freeze({ ...extraArt });
  }
  load(onProgress) {
    const maps = Object.keys(DEFAULT_MAP_ART).filter((id) => typeof this.mapArt[id] === 'string' && this.mapArt[id].length).map((id) => [`map-${id}`,this.mapArt[id]]);
    const entries = Object.entries(ART).concat(maps, Object.entries(this.extraArt)); let completed = 0;
    return Promise.all(entries.map(([key, src]) => new Promise((resolve) => {
      const image = this.platform.createImage(); let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (ok) { this.images[key] = image; if (key === 'map-ecology') this.images.map = image; }
        else this.failures.push(src);
        completed++; if(onProgress) onProgress(completed / entries.length); resolve();
      };
      const timer = setTimeout(() => finish(false), 4000);
      image.onload = () => finish(true); image.onerror = () => finish(false); image.src = src;
    })));
  }
}

module.exports = { Resources, ART, DEFAULT_MAP_ART };
