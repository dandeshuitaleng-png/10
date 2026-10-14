function createViewport(info, capsule) {
  const width = info.windowWidth || info.screenWidth || 375;
  const height = info.windowHeight || info.screenHeight || 812;
  const scale = width / 375;
  const safe = info.safeArea || { top: 0, bottom: height };
  const top = Math.max(44, info.statusBarHeight || 0, (capsule && capsule.bottom + 12) || 0, safe.top || 0);
  const bottom = Math.min(height, Number.isFinite(safe.bottom) ? safe.bottom : height);
  return { width: 375, height: height / scale, scale, pixelRatio: Math.min(info.pixelRatio || 1, 3),
    physicalWidth: width, physicalHeight: height, top: top / scale, bottom: (bottom - 16) / scale };
}

function toLogical(touch, viewport) {
  const x = Number.isFinite(touch.clientX) ? touch.clientX : touch.x;
  const y = Number.isFinite(touch.clientY) ? touch.clientY : touch.y;
  return { x: x / viewport.scale, y: y / viewport.scale };
}

module.exports = { createViewport, toLogical };
