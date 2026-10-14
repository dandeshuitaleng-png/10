const { createViewport } = require('../core/viewport');

function createWechatPlatform(api = wx) {
  const canvas = api.createCanvas();
  const frameRequest = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame : (callback) => setTimeout(() => callback(Date.now()), 16);
  const frameCancel = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout;
  return {
    api, canvas,
    viewport() {
      const info = api.getWindowInfo ? api.getWindowInfo() : api.getSystemInfoSync();
      let capsule = null;
      try { capsule = api.getMenuButtonBoundingClientRect ? api.getMenuButtonBoundingClientRect() : null; } catch (_) { /* safe fallback */ }
      return createViewport(info, capsule);
    },
    requestFrame: (callback) => frameRequest(callback), cancelFrame: (id) => frameCancel(id),
    createImage: () => api.createImage(),
    on(name, callback) { if (typeof api[name] === 'function') api[name](callback); },
    off(name, callback) { if (typeof api[name] === 'function') api[name](callback); },
  };
}

module.exports = { createWechatPlatform };
