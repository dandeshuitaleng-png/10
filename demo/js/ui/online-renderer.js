const { Renderer } = require('./renderer');
const T = require('./tokens');
const D = require('./draw');
const { catalogThemes, catalogTheme, catalogLevels, catalogLevel, usesOriginalMap } = require('../data/catalog');
const { MAP_LAYOUTS, landmarkRegion } = require('./map-layout');
const C = T.colors;

// Online scenes share the approved artwork with the original practice renderer.
// A separate class keeps the older, explicitly local demonstration intact.
class OnlineRenderer extends Renderer {
  constructor(ctx) { super(ctx); this.clipRegion = null; this.modalActive = false; this.semanticTargets = []; }
  scrollBy(delta) { super.scrollBy(delta); if (this.modalActive) this.modalScroll = this.scroll; }
  size(value, minimum = 12) { return Math.max(value, minimum / this.v.scale); }
  fit(value, width, size, weight = 400, family = T.font) {
    const ctx = this.ctx, full = String(value == null ? '' : value); ctx.save(); ctx.font = `${weight} ${size}px ${family}`;
    let text = full;
    if (ctx.measureText(text).width > width) {
      const chars = Array.from(full);
      while (chars.length && ctx.measureText(chars.join('') + '…').width > width) chars.pop();
      text = chars.join('') + '…';
    }
    ctx.restore(); return text;
  }
  themes(options) { return catalogThemes(this.view.catalog, options); }
  theme(id = this.route.params.themeId) { return catalogTheme(this.view.catalog, id); }
  levels(id = this.route.params.themeId, options) { return catalogLevels(this.view.catalog, id, options); }
  motif(theme) { return ['village', 'book', 'field', 'water'].includes(theme?.motif) ? theme.motif : 'book'; }
  themeImage(theme) {
    if (!theme) return null;
    return this.view.configuredImages?.[theme.id] || this.view.images?.[theme.defaultart || theme.id] || null;
  }
  sceneImage(theme) {
    if (!theme) return null;
    return this.view.configuredImages?.['map-' + theme.id] || this.view.images?.['map-' + (theme.defaultart || theme.id)] || null;
  }
  reviveLimit() {
    const value = this.view.reviveLimit ?? this.view.catalog?.config?.revive?.limit ?? 1;
    return Number.isInteger(value) && value >= 0 ? value : 0;
  }
  remainingRevives() {
    const value = this.view.revivesRemaining ?? Math.max(0, this.reviveLimit() - (this.view.reviveUsed ? 1 : 0));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  }
  seconds() { return this.view.countdownTotal ?? this.view.catalog?.config?.timer?.seconds ?? 30; }
  nodeState(level, index, progress) {
    const value = progress?.levelStates?.[level.id] ?? this.view.levelStates?.[level.id] ?? this.view.nodeStates?.[index] ?? progress?.nodes?.[index] ?? (index === 0 ? 'current' : 'locked');
    return { available: 'current', completed: 'complete' }[value] || value;
  }
  measure(value, width, size, weight = 400) {
    const ctx = this.ctx; ctx.save(); ctx.globalAlpha = 0;
    const height = D.wrap(ctx, value, 0, 0, width, size, C.ink, weight);
    ctx.restore(); return height;
  }
  heading(value, x, y, size = 30, align = 'left', maxWidth = 313) {
    const ctx = this.ctx;
    const family = `"Kaiti SC", "STKaiti", ${T.font}`, text = this.fit(value, maxWidth, size, 700, family);
    ctx.font = `700 ${size}px ${family}`;
    ctx.fillStyle = C.ink; ctx.textBaseline = 'top'; ctx.textAlign = align; ctx.fillText(text, x, y);
  }
  target(id, x, y, w, h, action, disabled = false, label = '') {
    if (h * this.v.scale >= 43.99 && w * this.v.scale >= 43.99) this.semanticTargets.push({ id, x, y, w, h, action, disabled, label: label || id });
    if (this.clipRegion) {
      const top = Math.max(y, this.clipRegion.y), bottom = Math.min(y + h, this.clipRegion.y + this.clipRegion.h);
      y = top; h = bottom - top;
    }
    if (h * this.v.scale < 43.99 || w * this.v.scale < 43.99) return;
    super.target(id, x, y, w, h, action, disabled);
    this.targets[this.targets.length - 1].label = label || id;
  }
  button(id, label, x, y, w, action, secondary = false, disabled = false) {
    const ctx = this.ctx, h = Math.max(52, 44 / this.v.scale), pressed = this.view.pressedId === id;
    const blocked = disabled || !!this.view.submitting || !!this.view.loadingRemote && !this.view.connectionError;
    const yy = y + (pressed && !blocked ? 2 : 0);
    D.rounded(ctx, x, yy + 3, w, h, 13, secondary ? 'rgba(38,61,52,.13)' : C.ink);
    D.rounded(ctx, x, yy, w, h, 13, blocked ? C.lakeLight : secondary ? C.surface : C.lake, secondary ? C.line : null);
    D.text(ctx, this.fit(label, w - 24, this.size(17, 14), 600), x + w / 2, yy + (h - this.size(17, 14)) / 2 - 1, this.size(17, 14), secondary || blocked ? C.ink : C.surface, 600, 'center');
    this.target(id, x, y, w, h, action, blocked, label);
  }
  smallControl(id, label, x, y, w, action, active = false, disabled = false, a11yLabel = label) {
    const h = Math.max(52, 44 / this.v.scale), pressed = this.view.pressedId === id;
    D.rounded(this.ctx, x, y + (pressed ? 2 : 0), w, h, 12, active || pressed ? C.lakeLight : C.surface, active ? C.lake : C.line);
    D.text(this.ctx, this.fit(label, w - 16, this.size(15), active ? 600 : 500), x + w / 2, y + 17, this.size(15), active ? C.lake : C.ink, active ? 600 : 500, 'center');
    this.target(id, x, y, w, h, action, disabled || !!this.view.submitting || !!this.view.loadingRemote && !this.view.connectionError, a11yLabel);
  }
  render(route, viewport, view = {}) {
    this.v = viewport; this.view = view; this.route = route; this.targets = []; this.semanticTargets = []; this.layout = {};
    this.scrollRegion = null; this.clipRegion = null; this.modalActive = false;
    this.t = Math.max(viewport.top + 12, 68 / viewport.scale);
    const ctx = this.ctx;
    ctx.clearRect(0, 0, viewport.width, viewport.height); ctx.fillStyle = view.catalog?.config?.themes?.find(t=>t.id===route.params.themeId)?.background || view.catalog?.config?.background || C.paper; ctx.fillRect(0, 0, viewport.width, viewport.height);
    this.sceneBackdrop(route.name);
    if (route.name === 'loading') this.loading();
    else if (route.name === 'home') this.home();
    else if (route.name === 'map') this.map();
    else if (route.name === 'level-ready') this.levelReady();
    else if (route.name === 'quiz' && view.challengeState === 'locked') this.locked();
    else if (route.name === 'quiz' && (view.question || view.feedback)) this.quiz();
    else if (route.name === 'result' && view.result) this.result();
    else if (route.name === 'ranking') this.ranking();
    else if (route.name === 'certificates') this.certificates();
    else if (route.name === 'settings') this.settings();
    else this.empty(route.name);
    if (view.modal === 'revive') this.revive();
    if (view.exitRequested) this.exitDialog();
    if (view.connectionError) this.remoteError();
    if(view.videoActive){
      this.targets=[];this.semanticTargets=[];this.scrollRegion=null;ctx.fillStyle='rgba(33,54,47,.55)';ctx.fillRect(0,this.t+70,375,this.v.bottom-this.t-70);
      this.button('close-video','关闭视频 · 返回答题',24,this.v.bottom-52,327,{type:'close-video'});
    }
    if (view.loadingRemote && route.name !== 'loading' && !view.connectionError) {
      D.rounded(ctx, 93, this.t - 39, 189, 31, 15, C.ink);
      D.text(ctx, '正在连接，请稍候…', 187.5, this.t - 32, this.size(13), C.surface, 500, 'center');
    }
    if (view.toast && !view.connectionError) {
      const font = this.size(14), height = this.measure(view.toast, 303, font) + 22;
      const y = view.modal || view.exitRequested ? this.t - 47 : this.v.bottom - 128 - height;
      D.rounded(ctx, 20, y, 335, height, 12, C.ink); D.wrap(ctx, view.toast, 36, y + 11, 303, font, C.surface);
    }
    return this.targets;
  }
  sceneBackdrop(name) {
    const theme = this.theme(), homeTheme = this.themes().find(item => item.id === 'ecology');
    const scene = name === 'home' ? this.view.configuredImages?.cover || (homeTheme && usesOriginalMap(this.view.catalog, homeTheme.id) ? this.sceneImage(homeTheme) : null) : this.sceneImage(theme);
    if (scene && ['home', 'quiz', 'result'].includes(name)) {
      D.imageCover(this.ctx, scene, 0, 0, 375, this.v.height, 0);
      this.ctx.fillStyle = 'rgba(239,234,217,.43)'; this.ctx.fillRect(0, 0, 375, this.v.height);
      this.layout.backdrop = { source: name === 'home' ? 'activity-environment' : 'theme-' + theme.id + '-environment', decorative: true };
    }
  }
  pageTitle(title, caption = '', extra = null) {
    const ctx = this.ctx, t = this.t;
    D.rounded(ctx, 16, t - 8, 343, 94, 16, C.surface, C.line);
    D.text(ctx, this.fit(caption, 313, this.size(13), 600), 30, t + 4, this.size(13), C.lake, 600);
    this.heading(title, 30, t + 30, 29, 'left', extra ? 254 : 313);
    if (extra) D.text(ctx, extra, 344, t + 39, this.size(13), C.muted, 500, 'right');
  }
  beginContent(key, top, bottom, total) {
    const region = { x: 20, y: top, w: 335, h: Math.max(40, bottom - top) };
    if (this.scrollKey !== key) { this.scrollKey = key; this.scroll = 0; }
    this.scrollMax = Math.max(0, total - region.h); this.scroll = Math.max(0, Math.min(this.scroll || 0, this.scrollMax));
    this.scrollRegion = region; this.clipRegion = region;
    this.ctx.save(); this.ctx.beginPath(); this.ctx.rect(region.x, region.y, region.w, region.h); this.ctx.clip();
    return top - this.scroll;
  }
  endContent(total) {
    this.ctx.restore(); this.clipRegion = null;
    const r = this.scrollRegion;
    if (this.scrollMax > 0 && r) {
      const rail = r.h - 16, thumb = Math.max(28, rail * r.h / total);
      D.rounded(this.ctx, 352, r.y + 8, 3, rail, 2, C.lakeLight);
      D.rounded(this.ctx, 352, r.y + 8 + (rail - thumb) * this.scroll / this.scrollMax, 3, thumb, 2, C.lake);
    }
  }
  home() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, points = Number(this.view.totalPoints) || 0;
    D.rounded(ctx, 16, t - 8, 343, 104, 16, C.surface, C.line);
    D.text(ctx, '乡村知识之旅', 30, t + 3, this.size(13), C.lake, 600);
    const name=this.view.catalog?.config?.name || '趣味闯关';
    this.heading(name, 30, t + 28, name.length>5?27:33, 'left', 205);
    const dayCap = this.view.dailyPointCap;
    D.text(ctx, Number.isFinite(dayCap) ? `今日 ${this.view.dailyPoints || 0} / ${dayCap} 积分` : '沿着小路，发现家乡。', 30, t + 73, this.size(14), C.muted);
    const player = this.view.userName || '旅人';
    D.text(ctx, player.length > 7 ? player.slice(0, 6) + '…' : player, 273, t + 5, this.size(12), C.muted, 500, 'right');
    D.text(ctx, `${points} 积分`, 273, t + 28, this.size(15), C.lake, 700, 'right');
    this.smallControl('settings', '设置', 287, t + 17, 56, { type: 'settings' });
    const themes = this.themes(), cardH = 180, rows = Math.ceil(themes.length / 2), total = themes.length ? rows * (cardH + 14) - 12 : 245;
    const start = this.beginContent('online-home', t + 110, b - 132, total);
    const artBoxes = [], artRects = [];
    themes.forEach((theme, i) => {
      const x = 24 + i % 2 * 170, y = start + Math.floor(i / 2) * (cardH + 14), pressed = this.view.pressedId === `theme-${theme.id}`;
      const yy = y + (pressed ? 2 : 0), progress = this.view.themeProgress && this.view.themeProgress[theme.id];
      const levels = this.levels(theme.id), enabled = levels.length > 0;
      const complete = progress ? progress.completed : 0, image = this.themeImage(theme);
      D.rounded(ctx, x, yy + 3, 157, cardH, 16, 'rgba(38,61,52,.2)');
      D.rounded(ctx, x, yy, 157, cardH, 16, pressed ? C.lakeLight : C.surface, C.line);
      const box = { themeId: theme.id, x: x + 9, y: yy + 8, w: 139, h: 120 }; artBoxes.push(box);
      if (image) artRects.push(this.art(theme.id, image, box.x, box.y, box.w, box.h));
      else D.motif(ctx, this.motif(theme), x + 53, yy + 35, 52);
      D.text(ctx, this.fit(theme.name, 139, this.size(19, 15), 700), x + 78.5, yy + 129, this.size(19, 15), C.ink, 700, 'center');
      D.text(ctx, enabled ? `${Math.min(complete, levels.length)} / ${levels.length} 关已完成` : '关卡准备中', x + 78.5, yy + 155, this.size(12), C.muted, 500, 'center');
      this.target(`theme-${theme.id}`, x, y, 157, cardH, { type: 'theme', themeId: theme.id }, false, `${theme.name}，${enabled ? '已完成' + complete + '关，共' + levels.length + '关' : '关卡准备中'}`);
    });
    if (!themes.length) {
      D.rounded(ctx, 24, start, 327, 232, 16, C.surface, C.line); D.motif(ctx, 'book', 158, start + 30, 58);
      D.text(ctx, '新的旅程正在准备', 187.5, start + 119, 24, C.ink, 700, 'center');
      D.wrap(ctx, '当前没有开放的主题，请稍后再来。', 48, start + 164, 279, this.size(16, 14), C.muted);
    }
    this.endContent(total);
    D.rounded(ctx, 16, b - 124, 343, 130, 16, C.surface, C.line);
    this.smallControl('ranking', '排行榜', 24, b - 119, 155, { type: 'route', name: 'ranking' });
    this.smallControl('certificates', '我的证书', 195, b - 119, 156, { type: 'route', name: 'certificates' });
    this.button('practice', this.view.continueLabel || (this.view.localDestination && this.view.localDestination.label) || (this.view.hasActiveChallenge ? '继续当前挑战' : '开启乡村之旅'), 24, b - 55, 327, { type: 'practice' }, false, !themes.some(theme => this.levels(theme.id).length) && !this.view.hasActiveChallenge);
    this.layout.home = { cardH, themes: themes.map(theme => theme.id), rows, artBoxes, artRects, region: this.scrollRegion, scrollMax: this.scrollMax };
  }
  map() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, theme = this.theme(), levels = this.levels();
    if (!theme || theme.enabled === false) { this.empty('theme-unavailable'); return; }
    if (!levels.length) { this.empty('levels-empty'); return; }
    const progress = this.view.themeProgress && this.view.themeProgress[theme.id];
    const states = levels.map((level, index) => this.nodeState(level, index, progress));
    this.pageTitle(theme.name, `${levels.length}关旅程 · ${theme.description || '发现更多乡村知识'}`);
    D.text(ctx, `${progress ? Math.min(progress.completed, levels.length) : 0} / ${levels.length} 关已完成`, 30, t + 69, this.size(13), C.muted);
    if (!usesOriginalMap(this.view.catalog, theme.id)) { this.genericMap(theme, levels, states); return; }
    const top = t + 105, h = b - 75 - top, scene = this.sceneImage(theme);
    const worldH = scene ? 335 * scene.height / scene.width : 502.5, frame = { x: 20, y: top, w: 335, h: Math.min(worldH, h) };
    const sites = MAP_LAYOUTS[theme.id], max = Math.max(0, worldH - frame.h), focus = Math.max(0, states.indexOf('current'));
    const key = `online-map-${theme.id}-${this.v.physicalWidth}-${this.v.physicalHeight}`;
    if (this.scrollKey !== key) { this.scrollKey = key; this.scroll = Math.max(0, Math.min(max, worldH * sites[focus].entry[1] - frame.h * .58)); }
    this.scrollMax = max; this.scroll = Math.max(0, Math.min(max, this.scroll || 0)); this.scrollRegion = frame; this.clipRegion = frame;
    D.rounded(ctx, 20, top, 335, frame.h, 16, C.lakeLight);
    ctx.save(); D.rounded(ctx, 20, top, 335, frame.h, 16); ctx.clip();
    const originY = top - this.scroll;
    if (scene) ctx.drawImage(scene, 20, originY, 335, worldH);
    const coords = sites.map(site => [20 + 335 * site.entry[0], originY + worldH * site.entry[1]]);
    ctx.beginPath(); ctx.moveTo(...coords[0]);
    for (let i = 1; i < coords.length; i++) { const a = coords[i - 1], z = coords[i]; ctx.bezierCurveTo(a[0], (a[1] + z[1]) / 2, z[0], (a[1] + z[1]) / 2, ...z); }
    ctx.strokeStyle = C.paper; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.setLineDash([2, 6]); ctx.stroke(); ctx.setLineDash([]);
    const nodes = [];
    levels.forEach((level, i) => {
      const [cx, cy] = coords[i], state = states[i] || 'locked', complete = state === 'complete', current = state === 'current', today = state === 'today-locked';
      const left = sites[i].side ? sites[i].side === 'left' : sites[i].entry[0] > .5, lx = left ? cx - 132 : cx + 26, ly = cy + (sites[i].signY || -22);
      D.rounded(ctx, lx, ly, 108, 49, 12, complete ? C.lakeLight : current || today ? C.orangeLight : C.surface, today ? C.error : current || complete ? C.lake : C.line);
      if (current) D.circle(ctx, cx, cy, 23, C.orangeLight, C.lake);
      D.circle(ctx, cx, cy, 18, complete ? C.lake : today ? C.error : C.surface, current || complete ? C.lake : C.line);
      if (complete) D.line(ctx, [[cx - 8, cy], [cx - 2, cy + 6], [cx + 9, cy - 7]], C.surface, 2);
      else D.text(ctx, today ? '!' : String(i + 1), cx, cy - 11, 21, today ? C.surface : C.ink, 700, 'center');
      D.text(ctx, this.fit(level.name || level.difficulty, 88, this.size(14), 600), lx + 10, ly + 6, this.size(14), C.ink, 600);
      const label = today ? '今日锁定' : complete ? '已通关 · 可重玩' : current ? '从这里出发' : '完成上关解锁';
      D.text(ctx, label, lx + 10, ly + 29, this.size(11, 11), today ? C.error : complete || current ? C.lake : C.muted, 500);
      const hot = { x: Math.min(lx - 4, cx - 25), y: Math.min(ly - 4, cy - 27), w: Math.max(lx + 112, cx + 25) - Math.min(lx - 4, cx - 25), h: Math.max(ly + 53, cy + 27) - Math.min(ly - 4, cy - 27) };
      nodes.push({ id: `level-${i + 1}`, levelId: level.id, x: cx, y: cy, hotRect: hot, state });
      this.target(`level-${i + 1}`, hot.x, hot.y, hot.w, hot.h, { type: 'level', themeId: theme.id, levelId: level.id, index: i }, false, `${level.label}，${level.name || level.difficulty}，${label}`);
    });
    ctx.restore(); this.clipRegion = null;
    if (max > 0) { const rail = frame.h - 32, thumb = Math.max(28, rail * frame.h / worldH); D.rounded(ctx, 349, top + 16, 3, rail, 2, C.surface); D.rounded(ctx, 349, top + 16 + (rail - thumb) * this.scroll / max, 3, thumb, 2, C.lake); }
    this.mapFooter(theme, levels, states);
    this.layout.map = { style: 'original', frame, scene: { x: 20, y: originY, w: 335, h: worldH }, nodes, scroll: this.scroll, scrollMax: max, scaleX: scene ? 335 / scene.width : null, scaleY: scene ? worldH / scene.height : null };
  }
  mapFooter(theme, levels, states) {
    const b = this.v.bottom; this.button('back', '返回', 24, b - 52, 80, { type: 'back' }, true);
    const allComplete = states.length > 0 && states.every(state => state === 'complete');
    let next = states.indexOf('current');
    if (next < 0) next = states.indexOf('today-locked');
    if (next < 0) next = allComplete ? levels.length - 1 : 0;
    const level = levels[next];
    this.button('begin', allComplete ? `回顾${level.label}` : states[next] === 'today-locked' ? '查看今日锁定说明' : `前往${level.label}`, 116, b - 52, 235, { type: 'level', themeId: theme.id, levelId: level.id, index: next });
  }
  genericMap(theme, levels, states) {
    const ctx = this.ctx, top = this.t + 105, bottom = this.v.bottom - 75, stride = 103, coverH = 122, total = coverH + levels.length * stride + 12;
    const key = `online-journey-${theme.id}-${levels.map(level => level.id).join('|')}`, changed = this.scrollKey !== key;
    let start = this.beginContent(key, top, bottom, total);
    const focus = Math.max(0, states.indexOf('current'));
    if (changed && focus > 0) { this.scroll = Math.min(this.scrollMax, coverH + focus * stride - this.scrollRegion.h / 2); ctx.restore(); this.clipRegion = null; start = this.beginContent(key, top, bottom, total); }
    D.rounded(ctx, 24, start, 327, 108, 16, C.lakeLight, C.line);
    D.text(ctx, `${levels.length} 段旅程`, 42, start + 21, 28, C.lake, 700);
    D.text(ctx, '沿着小路，逐关发现。', 42, start + 68, this.size(13), C.muted);
    const image = this.themeImage(theme);
    if (image) this.art(theme.id, image, 225, start + 6, 113, 96);
    else D.motif(ctx, this.motif(theme), 262, start + 26, 52);
    const nodes = [];
    levels.forEach((level, index) => {
      const y = start + coverH + index * stride, cx = 43, cy = y + 43, state = states[index], complete = state === 'complete', current = state === 'current', today = state === 'today-locked';
      const label = complete ? '已通关 · 可重玩' : today ? '今日锁定' : current ? '从这里出发' : '完成上关解锁';
      if (index < levels.length - 1) { ctx.save(); ctx.setLineDash([2, 5]); D.line(ctx, [[cx, cy + 19], [cx, cy + stride - 19]], C.line, 2); ctx.restore(); }
      D.rounded(ctx, 74, y, 263, 86, 14, complete ? C.lakeLight : current || today ? C.orangeLight : C.surface, today ? C.error : current || complete ? C.lake : C.line);
      if (current) D.circle(ctx, cx, cy, 23, C.orangeLight, C.lake);
      D.circle(ctx, cx, cy, 18, complete ? C.lake : today ? C.error : C.surface, current || complete ? C.lake : C.line);
      if (complete) D.line(ctx, [[cx - 8, cy], [cx - 2, cy + 6], [cx + 9, cy - 7]], C.surface, 2);
      else D.text(ctx, today ? '!' : String(index + 1), cx, cy - 10, 19, today ? C.surface : C.ink, 700, 'center');
      D.text(ctx, this.fit(level.name || `${level.label} · ${level.difficulty}`, 231, this.size(17), 600), 90, y + 15, this.size(17), C.ink, 600);
      D.text(ctx, label, 90, y + 40, this.size(12), today ? C.error : complete || current ? C.lake : C.muted, 500);
      D.text(ctx, this.fit(`${level.questionCount}题 · 首次奖励${level.points ?? 0}分`, 231, this.size(12)), 90, y + 63, this.size(12), C.muted);
      const hotRect = { x: 24, y, w: 313, h: 86 };
      nodes.push({ id: `level-${index + 1}`, levelId: level.id, x: cx, y: cy, hotRect, state });
      this.target(`level-${index + 1}`, hotRect.x, hotRect.y, hotRect.w, hotRect.h, { type: 'level', themeId: theme.id, levelId: level.id, index }, false, `${level.label}，${level.name || level.difficulty}，${level.questionCount}题，${level.points ?? 0}分，${label}`);
    });
    this.endContent(total); this.mapFooter(theme, levels, states);
    this.layout.map = { style: 'generic', frame: this.scrollRegion, scene: null, nodes, scroll: this.scroll, scrollMax: this.scrollMax, contentHeight: total, scaleX: null, scaleY: null };
  }
  levelReady() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, level = catalogLevel(this.view.catalog, this.route.params.levelId), theme = level && this.theme(level.themeId);
    if (!theme || theme.enabled === false || !level || level.enabled === false) { this.empty('level-unavailable'); return; }
    const currentLevel = this.levels(theme.id).find(item => item.id === level.id);
    this.pageTitle(level.name || `${currentLevel.label} · ${level.difficulty}`, theme.name + ' / 关卡准备');
    D.text(ctx, this.fit(theme.description, 311, this.size(14)), 30, t + 69, this.size(14), C.muted);
    const limit = this.reviveLimit(), font = this.size(15, 14), rule = `${level.questionCount}题全部答对，完成本关旅程。每题${this.seconds()}秒，超时算答错。${limit ? `本次挑战最多复活${limit}次，机会用完后再次答错，当前关卡当日锁定。` : '本关没有复活机会，答错后当前关卡当日锁定。'}`;
    const ruleH = this.measure(rule, 287, font), panelH = 150 + ruleH, heroH = 155, total = heroH + 14 + panelH + 12;
    const y = this.beginContent('online-ready-' + level.id, t + 104, b - 91, total);
    const scene = this.sceneImage(theme), site = usesOriginalMap(this.view.catalog, theme.id) && MAP_LAYOUTS[theme.id]?.[currentLevel.displayOrder - 1];
    const hero = { x: 24, y, w: 327, h: heroH }; D.rounded(ctx, hero.x, hero.y, hero.w, hero.h, 16, C.lakeLight);
    let source = null;
    if (scene && site) source = landmarkRegion(scene, site, hero.w, hero.h);
    if (source) { ctx.save(); D.rounded(ctx, hero.x, hero.y, hero.w, hero.h, 16); ctx.clip(); ctx.drawImage(scene, source.sx, source.sy, source.sw, source.sh, hero.x, hero.y, hero.w, hero.h); ctx.restore(); }
    else if (this.themeImage(theme)) this.art(theme.id, this.themeImage(theme), 66, y + 10, 245, 135);
    else D.motif(ctx, this.motif(theme), 158, y + 46, 60);
    const py = y + heroH + 14; D.rounded(ctx, 24, py, 327, panelH, 16, C.surface, C.line);
    D.text(ctx, `${level.questionCount} 题`, 98, py + 16, 28, C.lake, 700, 'center'); D.text(ctx, '四选一知识挑战', 98, py + 54, this.size(12), C.muted, 400, 'center');
    D.line(ctx, [[186, py + 20], [186, py + 71]], C.line, 1);
    D.text(ctx, `${level.points} 分`, 271, py + 16, 28, C.lake, 700, 'center'); D.text(ctx, '首次通关获得', 271, py + 54, this.size(12), C.muted, 400, 'center');
    D.line(ctx, [[40, py + 86], [335, py + 86]], C.line, 1); D.text(ctx, '出发前，记住三件事', 44, py + 100, this.size(14), C.lake, 600); D.wrap(ctx, rule, 44, py + 129, 287, font, C.ink);
    this.endContent(total);
    D.text(ctx, '正确率按首次作答统计 · 日锁北京时间零点解除', 187.5, b - 79, this.size(11, 11), C.muted, 400, 'center');
    this.button('back', '返回地图', 24, b - 52, 100, { type: 'back' }, true);
    this.button('ready-start', this.view.loadingRemote ? '准备中…' : '开始挑战', 136, b - 52, 215, { type: 'formal-start', themeId: theme.id, levelId: level.id });
    this.layout.ready = { hero, source, levelId: level.id, questionCount: level.questionCount, points: level.points, landmark: site ? currentLevel.displayOrder - 1 : null, panel: { x: 24, y: py, w: 327, h: panelH }, scrollMax: this.scrollMax };
  }
  countdown(seconds, x, y, active = true) {
    const ctx = this.ctx, total = this.view.countdownTotal || 30, left = Math.max(0, Math.min(total, Number(seconds) || 0)), urgent = active && left <= 5;
    D.circle(ctx, x, y, 25, urgent ? C.orangeLight : C.paper);
    ctx.beginPath(); ctx.arc(x, y, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left / total);
    ctx.strokeStyle = urgent ? C.error : C.lake; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    D.text(ctx, active ? String(Math.ceil(left)) : '✓', x, y - 12, 23, urgent ? C.error : C.lake, 700, 'center');
    return { seconds: left, urgent, active, total };
  }
  quiz() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, feedback = this.view.feedback, q = feedback ? feedback.question : this.view.question;
    if (!q) { this.empty('quiz'); return; }
    const submitting = !!this.view.submitting, totalQuestions = q.total || 10, key = `online-${q.id}-${feedback ? 'feedback' : 'answer'}`;
    const changed = this.scrollKey !== key, small = this.size(13), optionSize = this.size(17, 14), bodySize = this.size(15, 14), titleSize = this.size(23, 18);
    D.rounded(ctx, 16, t - 8, 343, 81, 16, C.surface, C.line);
    D.text(ctx, this.fit(`${q.themeName} · ${q.levelName || `第${q.levelOrder}关`}`, 255, this.size(16), 600), 28, t + 3, this.size(16), C.ink, 600);
    const remainingRevives = this.remainingRevives();
    D.text(ctx, this.fit(`第 ${q.position} / ${totalQuestions} 题 · 剩余${remainingRevives}次复活`, 255, small), 28, t + 31, small, C.muted);
    D.rounded(ctx, 28, t + 59, 252, 5, 3, C.lakeLight); D.rounded(ctx, 28, t + 59, 252 * q.position / totalQuestions, 5, 3, C.lake);
    const timer = this.countdown(this.view.remainingSeconds, 320, t + 32, !feedback && this.view.modal !== 'revive');
    const media = q.media && (q.media.type === 'image' || q.media.type === 'video'), video = media && q.media.type === 'video', caption = media ? q.media.caption || (video ? '题目视频' : '题目配图') : '';
    const title = this.balancedTitle(q.title, 303, titleSize), titleH = this.measure(title, 303, titleSize, 600), captionH = media ? this.measure(caption, 303, small) : 0;
    const heights = q.options.map(option => Math.max(58, this.measure(option, 253, optionSize) + 26)), gap = 10, mediaH = video ? 92 : 146;
    const explanation = feedback && (feedback.explanation || '继续下一题，认识更多家乡知识。');
    const feedbackH = feedback ? this.measure(explanation, 287, bodySize) + 65 : 0;
    const total = titleH + 52 + (media ? mediaH + captionH + 21 : 0) + heights.reduce((sum, h) => sum + h + gap, 0) + feedbackH + 16;
    let y = this.beginContent(key, t + 86, b - 100, total);
    if (changed && feedback) { this.scroll = this.scrollMax; this.ctx.restore(); this.clipRegion = null; y = this.beginContent(key, t + 86, b - 100, total); }
    const titleRect = { x: 24, y, w: 327, h: titleH + 42 };
    D.rounded(ctx, 24, y, 327, titleRect.h, 16, C.surface, C.line);
    D.text(ctx, q.difficultyLabel || q.difficulty || '知识答题', 36, y + 10, small, C.lake, 600);
    D.wrap(ctx, title, 36, y + 35, 303, titleSize, C.ink, 600); y += titleH + 52;
    let mediaRect = null;
    if (media) {
      mediaRect = { x: 24, y, w: 327, h: mediaH };
      D.rounded(ctx, 24, y, 327, mediaH, 14, C.surface, C.line);
      if (video) {
        D.circle(ctx, 55, y + 42, 21, C.lake); ctx.beginPath(); ctx.moveTo(50, y + 32); ctx.lineTo(64, y + 42); ctx.lineTo(50, y + 52); ctx.closePath(); ctx.fillStyle = C.surface; ctx.fill();
        D.text(ctx, '播放题目视频', 91, y + 21, optionSize, C.lake, 600); D.text(ctx, '观看时倒计时继续', 91, y + 52, small, C.muted);
        this.target('play-video', 24, y, 327, mediaH, { type: 'play-video', src: q.media.src, url: q.media.url }, false, '播放题目视频，观看时倒计时继续');
      } else if (this.view.mediaImage) {
        const image = this.view.mediaImage, scale = Math.min(311 / image.width, (mediaH - 16) / image.height), w = image.width * scale, h = image.height * scale;
        ctx.drawImage(image, 24 + (327 - w) / 2, y + (mediaH - h) / 2, w, h);
        mediaRect.image = { w, h, sourceW: image.width, sourceH: image.height };
      } else {
        D.text(ctx, this.view.mediaFailed ? '图片未能加载' : '图片加载中…', 40, y + 36, bodySize, C.ink);
        if (this.view.mediaFailed) { D.text(ctx, '点击重试', 40, y + 86, optionSize, C.lake, 600); this.target('media-retry', 24, y, 327, mediaH, { type: 'retry-media' }, false, '重新加载题目图片'); }
      }
      D.rounded(ctx, 24, y + mediaH + 3, 327, captionH + 12, 8, C.surface); D.wrap(ctx, caption, 36, y + mediaH + 8, 303, small, C.muted); y += mediaH + captionH + 21;
    }
    const optionRects = [];
    q.options.forEach((option, index) => {
      const selectedIndex = this.view.modal === 'revive' ? this.view.incorrectSelected : feedback ? feedback.selected : this.view.selected;
      const selected = selectedIndex === index, correct = !!feedback && (Number.isInteger(feedback.answer) ? feedback.answer === index : feedback.right !== false && selected), wrong = selected && (this.view.modal === 'revive' || feedback && feedback.right === false);
      const pressed = this.view.pressedId === `option-${index}`, h = heights[index], yy = y + (pressed ? 2 : 0);
      D.rounded(ctx, 24, yy + 2, 327, h, 12, 'rgba(38,61,52,.16)');
      D.rounded(ctx, 24, yy, 327, h, 12, correct ? C.lakeLight : selected ? C.orangeLight : C.surface, wrong ? C.error : selected || correct ? C.lake : C.line);
      D.circle(ctx, 47, yy + 27, 14, correct ? C.lake : wrong ? C.error : selected ? C.lake : C.paper);
      D.text(ctx, correct ? '✓' : wrong ? '×' : 'ABCD'[index], 47, yy + 18, 14, selected || correct ? C.surface : C.ink, 600, 'center');
      D.wrap(ctx, option, 71, yy + 13, 253, optionSize, C.ink, selected || correct ? 600 : 400);
      this.target(`option-${index}`, 24, y, 327, h, { type: 'option', index, questionId: q.id }, !!feedback || submitting || this.view.modal === 'revive', `${'ABCD'[index]}，${option}`);
      optionRects.push({ index, x: 24, y, w: 327, h, selected, state: correct ? 'correct' : wrong ? 'wrong' : selected ? 'selected' : 'idle' }); y += h + gap;
    });
    let feedbackRect = null;
    if (feedback) {
      feedbackRect = { x: 24, y, w: 327, h: feedbackH };
      D.rounded(ctx, 24, y, 327, feedbackH, 14, C.lakeLight, C.lake);
      D.text(ctx, feedback.right === false ? '知识解析' : '答对了 · 知识解析', 44, y + 15, optionSize, C.lake, 700);
      D.wrap(ctx, explanation, 44, y + 48, 287, bodySize, C.ink);
    }
    this.endContent(total);
    D.rounded(ctx, 16, b - 96, 343, 103, 16, C.surface, C.line);
    const hint = submitting ? '正在提交答案…' : feedback ? '看完解析，继续旅程' : timer.urgent ? '还剩几秒，选好后确认' : this.scrollMax > this.scroll + 2 ? '上下滑动，查看全部选项' : '选好一项，再确认答案';
    D.text(ctx, hint, 187.5, b - 82, bodySize, timer.urgent ? C.error : C.muted, timer.urgent ? 600 : 400, 'center');
    this.button('quiz-exit', '退出', 24, b - 52, 80, { type: 'exit-request' }, true, submitting);
    this.button('confirm', submitting ? '提交中…' : feedback ? q.position === totalQuestions ? '查看结果' : '下一题' : '确认答案', 116, b - 52, 235, { type: feedback ? 'continue' : 'confirm', questionId: q.id }, false, submitting || !feedback && this.view.selected == null);
    this.layout.quiz = { kind: video ? 'video-choice' : media ? 'image-choice' : 'text-choice', position: q.position, total: totalQuestions, region: this.scrollRegion, title: titleRect, media: mediaRect, options: optionRects, feedback: feedbackRect, timer, scroll: this.scroll, scrollMax: this.scrollMax, submitting };
  }
  modal(title, copy, actions, tone = C.ink) {
    const ctx = this.ctx, font = this.size(15, 14), copyH = this.measure(copy, 279, font), naturalH = 85 + copyH + actions.length * 62 + 18;
    const h = Math.min(naturalH, this.v.bottom - this.t);
    const y = Math.max(this.t, (this.t + this.v.bottom - h) / 2);
    ctx.fillStyle = 'rgba(24,45,39,.62)'; ctx.fillRect(0, 0, 375, this.v.height);
    D.rounded(ctx, 28, y, 319, h, 18, C.surface, C.ink); D.text(ctx, title, 48, y + 23, this.size(25, 20), tone, 700);
    this.targets = []; this.semanticTargets = []; this.scrollRegion = null; this.clipRegion = null;
    const actionY = y + h - actions.length * 62 - 18, bodyTop = y + 67, bodyBottom = actionY - 12;
    if (this.modalKey !== title) { this.modalKey = title; this.modalScroll = 0; }
    this.modalActive = true; this.scrollMax = Math.max(0, copyH - (bodyBottom - bodyTop));
    this.scroll = this.modalScroll = Math.max(0, Math.min(this.modalScroll || 0, this.scrollMax));
    this.scrollRegion = this.scrollMax ? { x: 48, y: bodyTop, w: 279, h: bodyBottom - bodyTop } : null;
    ctx.save(); ctx.beginPath(); ctx.rect(48, bodyTop, 279, bodyBottom - bodyTop); ctx.clip();
    D.wrap(ctx, copy, 48, bodyTop - this.scroll, 279, font, C.muted); ctx.restore();
    if (this.scrollMax) {
      const rail = bodyBottom - bodyTop, thumb = Math.max(28, rail * rail / copyH);
      D.rounded(ctx, 333, bodyTop, 3, rail, 2, C.lakeLight); D.rounded(ctx, 333, bodyTop + (rail - thumb) * this.scroll / this.scrollMax, 3, thumb, 2, C.lake);
    }
    actions.forEach((a, i) => this.button(a.id, a.label, 48, actionY + i * 62, 279, a.action, !!a.secondary, !!a.disabled));
    return { x: 28, y, w: 319, h, scrollMax: this.scrollMax };
  }
  revive() {
    const selected = this.view.incorrectSelected, choice = Number.isInteger(selected) ? `你选择了 ${'ABCD'[selected]}，本题未通过。` : '本题超时，未能完成作答。';
    const remaining = this.remainingRevives(), test = this.view.testShare || ['development', 'experience'].includes(this.view.mode), ready = this.view.shareReady !== false && remaining > 0;
    const copy = `${choice}\n${remaining ? `分享后可重答当前题，本次挑战还剩${remaining}次复活。机会用完后再次答错，当前关卡今日锁定。` : '本次挑战的复活机会已用完，可返回地图继续其他旅程。'}${test && remaining ? '\n体验版使用测试复活。' : ''}`;
    this.layout.revive = { ...this.modal('再试一次，继续旅程', copy, [
      { id: 'revive-share', label: !remaining ? '复活机会已用完' : this.view.submitting ? '复活中…' : test ? '测试复活 · 重答本题' : '分享并复活', action: { type: 'share' }, disabled: !ready || !!this.view.submitting },
      { id: 'revive-back', label: '返回关卡地图', action: { type: 'back' }, secondary: true, disabled: !!this.view.submitting }
    ], C.error), selected, answerRevealed: false, testShare: !!test, revivesRemaining: remaining };
  }
  exitDialog() {
    this.layout.exit = this.modal('先休息一下吗？', '当前挑战会保存，可以回到首页继续。倒计时仍会继续，本题答题时间到后会按答错处理。', [
      { id: 'exit-cancel', label: '继续作答', action: { type: 'exit-cancel' } },
      { id: 'exit-confirm', label: '保存并返回地图', action: { type: 'exit-confirm' }, secondary: true }
    ]);
  }
  locked() {
    const theme = this.theme(), themeName = this.view.question?.themeName || theme?.name || '本次旅程';
    this.pageTitle('今日先到这里', themeName + ' / 当前关卡锁定');
    const y = this.t + 119, font = this.size(16, 14), copy = '本次挑战未通过，当前关卡今日锁定。北京时间零点后可以再次挑战已开放的关卡。其他主题仍可继续。', total = 310;
    const start = this.beginContent('online-locked', y, this.v.bottom - 75, total);
    D.rounded(this.ctx, 24, start, 327, total - 10, 16, C.surface, C.line); D.motif(this.ctx, this.motif(theme), 158, start + 27, 58);
    D.text(this.ctx, '旅程还可以继续', 187.5, start + 110, 24, C.ink, 700, 'center'); D.wrap(this.ctx, copy, 44, start + 158, 287, font, C.muted);
    this.endContent(total); this.button('locked-back', '返回关卡地图', 24, this.v.bottom - 52, 327, { type: 'back' });
  }
  result() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, r = this.view.result, theme = this.theme(), levels = theme ? this.levels(theme.id) : [];
    const completeTheme = r.themeComplete ?? (this.view.catalog == null && levels.length > 0 && r.levelOrder === levels.length);
    const nextLevel = r.nextLevelId ? catalogLevel(this.view.catalog, r.nextLevelId) : null;
    this.pageTitle(r.passed === false ? '旅程暂告一段落' : completeTheme ? '主题旅程，完成！' : `第${r.levelOrder}关，通关！`, `${r.themeName || theme?.name || '本次旅程'} / 挑战结果`);
    const title = r.passed === false ? '回到地图，继续其他主题。' : completeTheme ? '主题证书已收进你的旅程。' : '本关已完成，继续发现家乡。';
    const points = Number(r.points) || 0, requested = r.requestedPoints == null ? null : Number(r.requestedPoints);
    const rewardNote = r.passed === false ? '本次挑战未通关，未获得积分。' : r.dailyCapReached ? points ? `本关奖励${requested ?? points}分，今日额度内获得${points}分。通关进度已保存。` : '今日积分额度已用完，通关进度和证书照常保存。' : points === 0 ? requested === 0 && !r.alreadyRewarded ? '本关奖励为0积分，通关进度已保存。' : '本关已领过积分，重玩不重复发放。' : '进度与奖励已保存。';
    const noteH = this.measure(rewardNote, 287, this.size(13)), recapH = r.finalExplanation ? 70 + this.measure(r.finalExplanation, 287, this.size(15, 14)) : 0;
    const total = 330 + noteH + recapH, y = this.beginContent('online-result-' + (this.route.params.levelId || r.themeName + r.levelOrder), t + 104, b - 139, total);
    D.rounded(ctx, 24, y, 327, total - 12, 16, C.surface, C.line);
    if (this.themeImage(theme)) this.art(theme.id, this.themeImage(theme), 130, y + 4, 115, 98);
    else D.motif(ctx, this.motif(theme), 157, y + 20, 60);
    D.text(ctx, title, 187.5, y + 111, this.size(15, 14), C.lake, 600, 'center');
    D.rounded(ctx, 40, y + 154, 295, 95, 13, C.paper, C.line);
    D.text(ctx, '本关获得', 111, y + 170, this.size(13), C.muted, 500, 'center'); D.text(ctx, '首次作答正确率', 262, y + 170, this.size(13), C.muted, 500, 'center');
    D.text(ctx, `+${Number(r.points) || 0}`, 111, y + 199, 31, C.ink, 700, 'center'); D.text(ctx, `${Math.round(Number(r.accuracyPercent) || 0)}%`, 262, y + 199, 31, C.ink, 700, 'center');
    D.text(ctx, `累计 ${Number(this.view.totalPoints) || 0} 积分`, 187.5, y + 268, this.size(17), C.lake, 700, 'center');
    D.wrap(ctx, rewardNote, 44, y + 303, 287, this.size(13), C.muted);
    if(r.finalExplanation){const recapY=y+320+noteH;D.line(ctx,[[44,recapY],[331,recapY]],C.line,1);D.text(ctx,'最后一题 · 知识回顾',44,recapY+18,this.size(15),C.lake,600);D.wrap(ctx,r.finalExplanation,44,recapY+47,287,this.size(15,14),C.ink);}
    if (!this.view.reducedMotion && r.passed !== false) {
      const elapsed = Math.max(0, (this.view.time || 0) - (this.resultStart || 0));
      if (this.resultKey !== this.scrollKey) { this.resultKey = this.scrollKey; this.resultStart = this.view.time || 0; }
      if (elapsed < 1200) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - elapsed / 1200); for (let i = 0; i < 12; i++) { const angle = i * Math.PI / 6, distance = 30 + elapsed / 15; D.circle(ctx, 187.5 + Math.cos(angle) * distance, y + 57 + Math.sin(angle) * distance, 2.5, i % 2 ? C.orange : C.lake); } ctx.restore(); }
    }
    this.endContent(total);
    this.button('next', r.passed === false ? '返回主题地图' : completeTheme ? '查看主题证书' : nextLevel ? `进入${nextLevel.label}` : this.view.catalog == null && r.levelOrder < levels.length ? `进入第${r.levelOrder + 1}关` : '查看主题地图', 24, b - 115, 327, { type: r.passed === false ? 'back' : 'next', levelId: r.nextLevelId || null });
    this.button('replay', '再玩一次', 24, b - 52, 155, { type: 'replay' }, true);
    this.button('share-result', '分享旅程', 195, b - 52, 156, { type: 'share' }, true);
    this.layout.result = { region: this.scrollRegion, scrollMax: this.scrollMax, total, passed: r.passed !== false, themeComplete: !!completeTheme, nextLevelId: r.nextLevelId || null, rewardNote };
  }
  ranking() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, rankings = this.view.rankings || { entries: [], period: 'total' }, entries = rankings.entries || [];
    this.pageTitle('乡村知识榜', '和旅人们一起，读懂家乡');
    this.smallControl('ranking-day', '今日榜', 24, t + 100, 155, { type: 'ranking-period', period: 'day' }, rankings.period === 'day');
    this.smallControl('ranking-total', '总榜', 195, t + 100, 156, { type: 'ranking-period', period: 'total' }, rankings.period !== 'day');
    D.text(ctx, '先比通关数，再比首次作答正确率', 187.5, t + 168, this.size(13), C.muted, 400, 'center');
    const total = entries.length ? 45 + entries.length * 78 : 270, y = this.beginContent('online-ranking-' + rankings.period, t + 195, b - 76, total);
    if (entries.length) {
      D.rounded(ctx, 24, y, 327, 33, 10, C.lakeLight);
      D.text(ctx, '名次 / 旅人', 36, y + 9, this.size(12), C.muted, 600); D.text(ctx, '关数', 241, y + 9, this.size(12), C.muted, 600, 'center'); D.text(ctx, '正确率', 314, y + 9, this.size(12), C.muted, 600, 'center');
      entries.forEach((entry, i) => {
        const ry = y + 45 + i * 78, name = String(entry.name || '旅人');
        D.rounded(ctx, 24, ry, 327, 68, 12, entry.isMe ? C.lakeLight : C.surface, entry.isMe ? C.lake : C.line);
        D.circle(ctx, 48, ry + 26, 14, Number(entry.rank) <= 3 ? C.orangeLight : C.paper);
        D.text(ctx, String(entry.rank || i + 1), 48, ry + 17, 14, C.ink, 700, 'center');
        D.text(ctx, (name.length > 7 ? name.slice(0, 6) + '…' : name) + (entry.isMe ? ' · 我' : ''), 74, ry + 14, this.size(15), C.ink, 600);
        D.text(ctx, `${Number(entry.points) || 0} 积分`, 74, ry + 42, this.size(12), C.muted);
        D.text(ctx, String(entry.completedLevels || 0), 241, ry + 21, 22, C.lake, 700, 'center');
        const accuracy = Number(entry.accuracy) || 0, accuracyPercent = Math.round(accuracy <= 1 ? accuracy * 100 : accuracy);
        D.text(ctx, `${accuracyPercent}%`, 314, ry + 25, this.size(15), C.ink, 600, 'center');
      });
    } else {
      D.rounded(ctx, 24, y, 327, 248, 16, C.surface, C.line); D.motif(ctx, 'field', 158, y + 32, 58);
      D.text(ctx, '榜单等你来开启', 187.5, y + 114, 24, C.ink, 700, 'center');
      D.wrap(ctx, '完成一关，留下你的旅程。榜单按北京时间计算每日成绩。', 48, y + 161, 279, this.size(16, 14), C.muted);
    }
    this.endContent(total); this.button('ranking-back', '返回', 24, b - 52, 327, { type: 'back' }, true);
    this.layout.ranking = { period: rankings.period, entries: entries.length, rows: entries.map((entry, i) => ({ rank: entry.rank || i + 1, y: y + 45 + i * 78, h: 68 })), scrollMax: this.scrollMax };
  }
  stamp(theme, x, y, achieved) {
    const ctx = this.ctx; D.circle(ctx, x, y, 30, achieved ? C.orangeLight : C.paper, achieved ? C.orange : C.line);
    ctx.save(); ctx.setLineDash([1, 4]); D.circle(ctx, x, y, 25, null, achieved ? C.orange : C.line); ctx.restore();
    D.motif(ctx, this.motif(theme), x - 17, y - 18, 34);
  }
  certificates() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, owned = this.view.certificates || [], themes = this.themes().filter(theme => this.levels(theme.id).length), used = new Set();
    const items = themes.map(theme => {
      const levels = this.levels(theme.id), match = owned.find(cert => cert.themeId === theme.id);
      if (match) used.add(match.id);
      return { theme, count: levels.length, title: match?.name || match?.title || theme.certificateName || theme.name + ' · 知识证书', match, condition: match ? match.description || match.certificateText || '已收藏，留下这段乡村旅程。' : theme.certificateText || `完成本主题${levels.length}关获得` };
    });
    const overall = owned.find(cert => !cert.themeId || cert.themeId === 'all');
    if (themes.length) {
      if (overall) used.add(overall.id);
      const count = themes.reduce((sum, theme) => sum + this.levels(theme.id).length, 0);
      items.push({ theme: null, count, title: overall?.name || overall?.title || this.view.catalog?.config?.certificates?.totalName || '乡村知识闯关王', match: overall, condition: overall ? overall.description || overall.certificateText || '已收藏，留下完整的知识之旅。' : this.view.catalog?.config?.certificates?.totalText || `完成${themes.length}主题，共${count}关获得` });
    }
    for (const certificate of owned) {
      if (!used.has(certificate.id)) items.push({ theme: null, count: null, historical: true, title: certificate.name || certificate.title || '历史旅程证书', match: certificate, condition: certificate.description || certificate.certificateText || '已收藏的历史旅程，仍可保存和分享。' });
    }
    this.pageTitle('我的旅程印章', '完成主题旅程，收藏学习纪念', `${owned.length} / ${items.length}`);
    const font = this.size(13), cardHeights = items.map(item => 184 + this.measure(item.condition, 287, font));
    const total = items.length ? cardHeights.reduce((sum, height) => sum + height + 14, 0) : 240;
    const y = this.beginContent('online-certificates-' + items.map(item => item.match?.id || item.theme?.id || 'all').join('|'), t + 103, b - 75, total);
    let offset = 0; const cards = [];
    items.forEach((item, i) => {
      const ry = y + offset, achieved = !!item.match, h = cardHeights[i], conditionH = this.measure(item.condition, 287, font);
      offset += h + 14;
      D.rounded(ctx, 24, ry, 327, h, 16, C.surface, achieved ? C.lake : C.line);
      this.stamp(item.theme, 69, ry + 49, achieved);
      this.heading(item.title, 113, ry + 21, 20, 'left', 222);
      D.text(ctx, achieved ? item.historical ? '已收藏 · 历史证书' : '已收藏 · 旅程留念' : '旅程中的下一枚印章', 113, ry + 57, font, achieved ? C.lake : C.muted, achieved ? 600 : 400);
      D.wrap(ctx, item.condition, 42, ry + 91, 287, font, C.muted);
      if (achieved) {
        const raw = item.match.issuedAt, date = raw ? new Date(new Date(raw).getTime() + 8 * 3600 * 1000) : null, valid = date && !Number.isNaN(date.getTime());
        const label = valid ? `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日获得` : '证书可下载保存';
        D.text(ctx, label, 42, ry + 101 + conditionH, this.size(11, 11), C.muted);
        const buttonY = ry + h - 58;
        this.smallControl(`certificate-${item.match.id}`, '保存证书', 42, buttonY, 137, { type: 'certificate-download', id: item.match.id }, false, false, `保存证书，${item.title}`);
        this.smallControl(`certificate-share-${item.match.id}`, '分享证书', 195, buttonY, 134, { type: 'certificate-share', id: item.match.id }, false, !this.view.canShareCertificate, `分享证书，${item.title}`);
      } else {
        D.line(ctx, [[42, ry + 110 + conditionH], [333, ry + 110 + conditionH]], C.lakeLight, 1);
        const progress = item.theme && this.view.themeProgress && this.view.themeProgress[item.theme.id];
        const completed = item.theme ? Math.min(progress?.completed || 0, item.count) : themes.reduce((sum, theme) => sum + Math.min(this.view.themeProgress?.[theme.id]?.completed || 0, this.levels(theme.id).length), 0);
        D.text(ctx, `旅程进度 ${completed} / ${item.count} 关`, 42, ry + 123 + conditionH, this.size(12), C.muted);
      }
      cards.push({ themeId: item.theme?.id || null, certificateId: item.match?.id || null, historical: !!item.historical, x: 24, y: ry, w: 327, h });
    });
    if (!items.length) { D.rounded(ctx, 24, y, 327, 225, 16, C.surface, C.line); D.motif(ctx, 'book', 158, y + 29, 58); D.text(ctx, '旅程印章正在准备', 187.5, y + 117, 23, C.ink, 700, 'center'); D.wrap(ctx, '主题开放后，可查看相应的证书条件。', 48, y + 162, 279, this.size(15, 14), C.muted); }
    this.endContent(total); this.button('certificates-back', '返回', 24, b - 52, 327, { type: 'back' }, true);
    this.layout.certificates = { owned: owned.length, total: items.length, cards, scrollMax: this.scrollMax };
  }
  settings() {
    const ctx = this.ctx, t = this.t, b = this.v.bottom, enabled = this.view.soundEnabled != null ? !!this.view.soundEnabled : !this.view.muted;
    this.pageTitle('旅程设置', this.view.userName || '我的旅程');
    const counts = [...new Set(this.themes().flatMap(theme => this.levels(theme.id).map(level => level.questionCount)))];
    const font = this.size(15, 14), cap = this.view.dailyPointCap, limit = this.reviveLimit();
    const rule = `${counts.length === 1 ? `每关${counts[0]}题` : '各关题数以准备页为准'}，单题${this.view.catalog?.config?.timer?.seconds ?? 30}秒。超时算答错；${limit ? `每次挑战最多复活${limit}次，机会用完后再次答错，当前关卡当日锁定` : '没有复活机会，答错后当前关卡当日锁定'}，北京时间零点解除。首次通关获得积分，重玩不重复发分；正确率按首次作答统计。${Number.isFinite(cap) ? `\n今日已获${this.view.dailyPoints || 0}分，每日上限${cap}分，还可获得${this.view.dailyRemaining ?? Math.max(0, cap - (this.view.dailyPoints || 0))}分。` : ''}\n规则调整从后续挑战生效，当前挑战沿用开始时规则。`;
    const ruleH = this.measure(rule, 287, font), total = 380 + ruleH;
    const y = this.beginContent('online-settings', t + 105, b - 75, total);
    D.rounded(ctx, 24, y, 327, 96, 16, C.surface, C.line); D.text(ctx, '声音反馈', 44, y + 18, this.size(18), C.ink, 600); D.text(ctx, '按压与答题时播放轻提示', 44, y + 57, this.size(13), C.muted);
    this.smallControl('toggle-sound', enabled ? '已开启' : '已关闭', 255, y + 14, 80, { type: 'toggle-sound' }, enabled);
    D.rounded(ctx, 24, y + 110, 327, 96, 16, C.surface, C.line); D.text(ctx, '减少动画', 44, y + 128, this.size(18), C.ink, 600); D.text(ctx, '保留清晰反馈，关闭结算粒子', 44, y + 167, this.size(13), C.muted);
    this.smallControl('toggle-motion', this.view.reducedMotion ? '已开启' : '已关闭', 255, y + 124, 80, { type: 'toggle-motion' }, !!this.view.reducedMotion);
    D.rounded(ctx, 24, y + 220, 327, 65 + ruleH, 16, C.surface, C.line); D.text(ctx, '挑战规则', 44, y + 239, this.size(18), C.ink, 600); D.wrap(ctx, rule, 44, y + 277, 287, font, C.muted);
    D.rounded(ctx, 24, y + 297 + ruleH, 327, 68, 14, C.lakeLight); D.text(ctx, ['development', 'experience'].includes(this.view.mode) ? '本地体验版' : '乡村知识挑战', 44, y + 310 + ruleH, this.size(14), C.lake, 600); D.text(ctx, this.view.reducedMotion ? '已开启减少动画' : '声音偏好会保存到当前设备', 44, y + 337 + ruleH, this.size(12), C.muted);
    this.endContent(total); this.button('settings-back', '返回', 24, b - 52, 327, { type: 'back' }, true);
    this.layout.settings = { soundEnabled: enabled, scrollMax: this.scrollMax };
  }
  remoteError() {
    const message = typeof this.view.connectionError === 'string' ? this.view.connectionError : '暂时连接不到游戏。进度已保存，请检查网络后再试。';
    this.layout.remoteError = this.modal('连接需要再试一次', message, [
      { id: 'retry-remote', label: '重新连接', action: { type: 'retry-remote' } },
      { id: 'connection-back', label: '返回', action: { type: 'back' }, secondary: true }
    ]);
  }
  empty(name) {
    const unavailable = ['theme-unavailable', 'level-unavailable', 'levels-empty'].includes(name);
    const title = name === 'quiz' ? '正在准备题目' : name === 'levels-empty' ? '关卡正在准备' : unavailable ? '旅程已更新' : name === 'error' ? '暂时无法打开' : '乡村之旅';
    this.pageTitle(title, '趣味闯关');
    const copy = name === 'quiz' ? '题目准备好后即可继续，请稍候。' : name === 'levels-empty' ? '这个主题暂时没有开放的关卡。可以返回首页，选择其他主题。' : unavailable ? '当前主题或关卡暂时不可用，请返回首页选择新的旅程。' : '请重新连接，或返回主题页再试一次。';
    const y = this.beginContent('online-empty-' + name, this.t + 106, this.v.bottom - 140, 245);
    D.rounded(this.ctx, 24, y, 327, 235, 16, C.surface, C.line); D.motif(this.ctx, 'water', 158, y + 26, 58); D.wrap(this.ctx, copy, 48, y + 132, 279, this.size(17, 14), C.muted); this.endContent(245);
    this.button('empty-retry', '重新连接', 24, this.v.bottom - 115, 327, { type: 'retry-remote' });
    this.button('empty-back', unavailable ? '返回首页' : '返回', 24, this.v.bottom - 52, 327, { type: unavailable ? 'home' : 'back' }, true);
  }
}

module.exports = { OnlineRenderer };
