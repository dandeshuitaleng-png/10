'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const titles = {
    overview: ['概览', '内容、关卡、当前规则与正式接入状态。'],
    questions: ['题库管理', '按活动主题与关卡核对内容，审核后再正式启用。'],
    levels: ['关卡配置', '设置各主题的关卡顺序、题数、难度与通关积分。'],
    basic: ['基础配置', '维护主题、外观、证书与旅程分享内容。'],
    revive: ['复活配置', '设置每次挑战的复活额度与分享内容。'],
    points: ['积分配置', '设置每日积分上限与计时，各关奖励在关卡页维护。'],
    operations: ['操作与同步', '管理操作有记录，未确认的同步保留待重试。'],
  };
  const state = { view: 'overview', config: null, levels: [], questions: [], page: 0, pageSize: 15,
    editing: null, reviewing: null, busy: false, viewRequest: 0, mode: null };
  const defaults = {
    certificates: { title: '趣味闯关 · 电子荣誉证书', totalName: '乡村知识闯关王',
      totalText: '已完成全部主题乡村知识挑战', footer: '学习活动纪念，不代表学历或教育资格' },
    share: { title: '趣味闯关', text: '一起挑战乡村知识，发现家乡。', image: '' },
  };
  const themes = () => (state.config?.themes || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const themeName = id => themes().find(t => t.id === id)?.name || id;
  const levelsFor = id => state.levels.filter(l => l.themeId === id).sort((a, b) => a.order - b.order);
  const levelName = id => { const l = state.levels.find(item => item.id === id); return l ? `第${l.order}关 · ${l.name}` : id; };
  const approvedRules = () => ['user-approved', 'approved'].includes(state.config?.approval?.status);

  function el(tag, attrs = {}, ...children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (['checked', 'disabled', 'hidden', 'required', 'readOnly'].includes(k)) n[k] = !!v;
      else n.setAttribute(k, String(v));
    }
    for (const child of children.flat()) if (child != null) n.append(typeof child === 'string' ? document.createTextNode(child) : child);
    return n;
  }
  function replace(id, ...nodes) { $(id).replaceChildren(...nodes.flat()); }
  function badge(text, type = 'neutral') { return el('span', { class: 'badge ' + type }, text); }
  function date(t) { return t ? new Date(t).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '—'; }
  function showError(id, error) { $(id).textContent = error.message || String(error); $(id).hidden = false; }
  function notify(text) { $('notice').textContent = text; $('notice').hidden = false; clearTimeout(notify.timer); notify.timer = setTimeout(() => $('notice').hidden = true, 5500); }
  function field(form, name) { return form.elements.namedItem(name); }
  function set(form, name, value) { field(form, name).value = value ?? ''; }
  function label(text, input, help) { return el('label', {}, text, input, help ? el('span', { class: 'field-help' }, help) : null); }
  function checkbox(text, name, checked) { return el('label', { class: 'checkbox-field' }, el('input', { type: 'checkbox', name, checked }), text); }
  function textInput(name, value, max = 100, attrs = {}) { return el('input', { name, value: value ?? '', maxlength: max, ...attrs }); }
  function numberInput(name, value, min, max, attrs = {}) { return el('input', { name, value, type: 'number', min, max, step: 1, required: true, ...attrs }); }
  function integer(raw, name, min, max) {
    if (raw === '' || raw == null || !Number.isSafeInteger(Number(raw)) || Number(raw) < min || Number(raw) > max) throw Error(`${name}须为 ${min}—${max} 的整数。`);
    return Number(raw);
  }
  function text(raw, name) { const v = String(raw ?? '').trim(); if (!v) throw Error(`请填写${name}。`); return v; }
  function stableId(raw, name) { const value = text(raw, name); if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) throw Error(`${name}仅支持字母、数字、下划线与连字符。`); return value; }
  function slugId(raw, name) { const value = text(raw, name); if (!/^[a-z][a-z0-9_-]*$/.test(value) || value === 'all' || value.length > 80) throw Error(`${name}须为小写字母开头、最多 80 位的小写字母数字编号；all 为保留值。`); return value; }
  function safeSrc(src) {
    if (/^https:\/\//i.test(src)) { try { const url = new URL(src); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } }
    return /^\/(?:images|media|assets)\/[\w./-]+$/.test(src) && !src.includes('..');
  }
  function mediaURL(raw, name) { const v = String(raw ?? '').trim(); if (v && !safeSrc(v)) throw Error(`${name}须为 HTTPS 或受控站内素材地址。`); return v; }
  function preview(id, src, type = 'image') {
    const host = $(id); if (!host) return;
    const reserved=['basic-preview','share-preview','activity-share-preview'].includes(id);
    host.hidden = !reserved && (!src || !safeSrc(src)); host.replaceChildren(); if (host.hidden) return;
    if(!src || !safeSrc(src)){host.append(el('p',{class:'preview-placeholder'},'填写素材地址后显示预览'));return;}
    const media = el(type === 'video' ? 'video' : 'img', { src, alt: '配置素材预览', ...(type === 'video' ? { controls: 'controls', preload: 'metadata' } : {}) });
    media.addEventListener('error', () => host.replaceChildren(el('p', { class: 'muted small' }, '素材未能加载。请检查地址与访问权限，再重新填写。')), { once: true });
    host.append(media);
  }
  async function api(url, body, method = body === undefined ? 'GET' : 'POST') {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
    try {
      const r = await fetch('/api/' + url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
      const json = await r.json();
      if (!r.ok) { const e = Error(json.error?.message || '操作未完成'); e.status = r.status; e.code = json.error?.code; throw e; }
      return json.data;
    } catch (e) {
      if (e.name === 'AbortError' || e instanceof TypeError) throw Error('连接中断，请检查网络后重试。操作可能已保存，请刷新核对后再提交。');
      throw e;
    } finally { clearTimeout(timer); }
  }
  async function submit(form, job, errorId) {
    if (state.busy) return; state.busy = true;
    const buttons = [...form.querySelectorAll('button[type=submit]')]; buttons.forEach(b => b.disabled = true);
    if (errorId) $(errorId).hidden = true;
    const status = form.querySelector('.save-status'); if (status) { status.textContent = '正在保存…'; status.classList.remove('error'); }
    try { await job(); if (status) status.textContent = '已保存'; }
    catch (e) { if (errorId) showError(errorId, e); else if (status) { status.textContent = e.message; status.classList.add('error'); } else notify(e.message); }
    finally { state.busy = false; buttons.forEach(b => b.disabled = false); }
  }
  function environment(mode) {
    state.mode = mode || state.mode;
    $('environment').textContent = state.mode === 'production' ? '正式环境' : state.mode === 'experience' ? '授权体验环境' : '开发测试环境';
    $('environment').className = 'badge ' + (state.mode === 'production' ? 'success' : 'warning');
  }
  function configNotice() {
    const unapproved = !approvedRules();
    $('configuration-notice').hidden = !unapproved;
    $('configuration-notice').textContent = '当前活动规则待确认。新设置适用于之后开始的挑战，进行中的挑战保持原规则。每日上限截断发分、额度耗尽仍通关属于待批准的体验策略；不构成正式规则批准。';
    const count = themes().length, enabled = themes().filter(t => t.enabled !== false).length;
    $('scope-summary').textContent = `${count} 个主题 · ${state.levels.length} 个关卡`;
    $('theme-count').textContent = `${count} 个主题 · ${enabled} 个启用`;
  }
  async function readStructure() {
    const [cfg, data] = await Promise.all([api('admin/config'), api('admin/levels')]);
    return { config: cfg, levels: data.levels || [] };
  }
  function applyStructure(data) { state.config = data.config; state.levels = data.levels; configNotice(); }
  async function refreshStructure() { applyStructure(await readStructure()); }
  async function showView(name) {
    if (!titles[name]) return;
    const revision = ++state.viewRequest; state.view = name;
    $('page-title').textContent = titles[name][0]; $('page-description').textContent = titles[name][1];
    document.querySelectorAll('.view').forEach(n => n.hidden = n.id !== 'view-' + name);
    document.querySelectorAll('[data-view]').forEach(n => { if (n.dataset.view === name) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current'); });
    $('global-error').hidden = true; $('loading').hidden = false;
    try {
      if (name === 'overview') {
        const [data, structure] = await Promise.all([api('admin/overview'), readStructure()]);
        if (revision !== state.viewRequest) return; applyStructure(structure); renderOverview(data);
      } else if (name === 'questions') {
        const structure = await readStructure(); if (revision !== state.viewRequest) return; applyStructure(structure); await loadQuestions(revision);
      } else if (name === 'operations') await renderOperations(revision);
      else { const structure = await readStructure(); if (revision !== state.viewRequest) return; applyStructure(structure); if (name === 'levels') renderLevels(); else renderConfig(name); }
    } catch (e) {
      if (revision !== state.viewRequest) return;
      if (e.status === 401 || e.status === 403) { $('admin-screen').hidden = true; $('login-screen').hidden = false; showError('login-error', Error('管理员会话已失效，请重新登录。')); }
      else { $('global-error-text').textContent = e.message; $('global-error').hidden = false; }
    } finally { if (revision === state.viewRequest) $('loading').hidden = true; }
  }
  function renderOverview(data) {
    environment(data.mode);
    $('overview-banner').textContent = data.mode === 'production' ? '正式游戏按审核内容与可信接入条件开放。' : '授权体验可运行源题，源内容仍待正式审核。新增与修改题目不会自动加入体验题池；请实际审核后启用。测试复活不代表已验证真实分享。';
    const stats = [['题库总数', data.stats.questions, '道'], ['待审核', data.stats.pendingQuestions, '道'], ['通关记录', data.stats.completions, '次'], ['已发积分', data.stats.points, '分']];
    replace('overview-stats', stats.map(([name, value, unit]) => el('article', { class: 'stat' }, el('p', { class: 'stat-label' }, name), el('strong', {}, String(value)), el('span', { class: 'stat-note' }, unit))));
    replace('overview-modules', data.modules.map(m => el('div', { class: 'module-row' }, el('strong', {}, m.name), badge(m.status === 'experience-test-only' ? '测试复活' : '已实现', m.status === 'experience-test-only' ? 'warning' : 'success'))));
    replace('overview-dependencies', data.dependencies.map(d => el('div', { class: 'dependency-row' }, el('span', {}, d.name), badge(d.configured ? '已配置' : '待提供', d.configured ? 'success' : 'warning'))));
    const cfg = state.config, cap = cfg.points.dailyPointCap;
    replace('overview-rules', [['活动范围', `${themes().length} 主题 / ${state.levels.length} 关`], ['单题时限', cfg.timer.seconds + ' 秒'], ['复活额度', cfg.revive.limit + ' 次 / 挑战'], ['挑战题数', '按各关配置'], ['奖励', '各关首次通关积分'], ['每日积分上限', cap == null ? '不限（原默认）' : cap + ' 分'], ['重玩', '不重复发分'], ['日界线', '北京时间 00:00'], ['正确率', '首次作答']].map(([k, v]) => el('div', {}, el('span', {}, k), el('strong', {}, v))));
    $('approval-badge').textContent = approvedRules() ? '规则已确认' : '规则待确认'; $('approval-badge').className = 'badge ' + (approvedRules() ? 'success' : 'warning');
    $('approval-note').textContent = `批准记录：${cfg.approval?.approvedAt || '尚无日期'} · 配置版本 ${cfg.version}。新设置适用于之后开始的挑战，进行中的挑战保持原规则。`;
    $('pending-nav').textContent = data.stats.pendingQuestions || '';
  }

  function themeCard(t, fresh = false) {
    const card = el('article', { class: 'theme-config', 'data-theme': t.id, 'data-new-theme': fresh ? 'true' : 'false' });
    card.append(el('h3', {}, t.name || '新主题', badge(fresh ? '尚未保存' : t.enabled === false ? '已停用' : '已启用', fresh ? 'warning' : 'neutral')));
    const grid = el('div', { class: 'form-grid theme-fields' },
      label('主题编号', textInput('themeId', t.id, 80, { required: true, readOnly: !fresh, pattern: '[a-z][a-z0-9_-]*' }), fresh ? '保存后不可修改；避免使用会变化的名称。' : '稳定编号，保留历史关联。'),
      label('排序', numberInput('themeOrder', t.order ?? themes().length + 1, 1, 1000000)),
      label('主题名称', textInput('themeName', t.name, 100, { required: true })),
      checkbox('启用主题入口', 'enabled', t.enabled !== false),
      label('内容介绍', el('textarea', { name: 'themeDescription', rows: 2, maxlength: 1000, class: 'span-2' }, t.description || '')),
      label('封面图地址', textInput('themeCover', t.cover, 2048, { placeholder: 'https://… 或 /images/…' })),
      label('地图图像地址', textInput('themeMapImage', t.mapImage, 2048, { placeholder: 'https://… 或 /images/…' })),
      label('背景色', el('input', { name: 'themeBackground', type: 'color', value: t.background || state.config.background })),
      label('主题证书名称', textInput('themeCertificateName', t.certificateName || t.name + ' · 知识证书', 100, { required: true })),
      label('主题证书正文', el('textarea', { name: 'themeCertificateText', rows: 2, required: true, maxlength: 1000 }, t.certificateText || '已完成本主题全部乡村知识挑战')));
    grid.querySelector('[name=themeDescription]').parentElement.classList.add('span-2');
    grid.querySelector('[name=themeCertificateText]').parentElement.classList.add('span-2');
    card.append(grid);
    if (fresh) card.append(el('button', { type: 'button', class: 'text-button', onclick: () => { card.remove(); $('theme-count').textContent = $('theme-configs').children.length + ' 个主题（待保存）'; } }, '移除未保存主题'));
    else card.append(el('p', { class: 'field-help theme-history-note' }, '停用只影响之后进入，不删除题目与历史挑战。'));
    return card;
  }
  function renderConfig(name) {
    const c = state.config;
    if (name === 'basic') {
      const f = $('basic-form'); set(f, 'name', c.name); set(f, 'cover', c.cover); set(f, 'background', c.background); $('background-value').textContent = c.background;
      replace('theme-configs', themes().map((t, i) => themeCard({ ...t, order: t.order ?? i + 1 })));
      const cert = { ...defaults.certificates, ...c.certificates }, share = { ...defaults.share, ...c.share };
      set(f, 'certificateTitle', cert.title); set(f, 'totalCertificateName', cert.totalName); set(f, 'totalCertificateText', cert.totalText); set(f, 'certificateFooter', cert.footer);
      set(f, 'shareTitle', share.title); set(f, 'shareText', share.text); set(f, 'shareImage', share.image);
      preview('basic-preview', c.cover); preview('activity-share-preview', share.image);
    } else if (name === 'revive') {
      const f = $('revive-form'); for (const k of ['limit', 'period', 'shareText', 'shareImage']) set(f, k, c.revive[k]); preview('share-preview', c.revive.shareImage);
    } else if (name === 'points') {
      const f = $('points-form');
      replace('point-fields', themes().map(t => { const ls = levelsFor(t.id); return el('div', { class: 'reward-row' }, el('strong', {}, t.name), el('span', { class: 'muted small' }, ls.length ? ls.map(l => `第${l.order}关 ${l.points}分 / ${l.questionCount ?? 10}题`).join(' · ') : '尚无关卡')); }));
      set(f, 'replay', c.points.replay); set(f, 'seconds', c.timer.seconds); set(f, 'timeout', c.timer.timeout);
      field(f, 'noDailyPointCap').checked = c.points.dailyPointCap == null; set(f, 'dailyPointCap', c.points.dailyPointCap); updateCapField();
    }
  }
  function collectThemes() {
    const list = [...$('theme-configs').children].map(card => {
      const q = name => card.querySelector(`[name=${name}]`), id = slugId(q('themeId').value, '主题编号');
      if (card.dataset.newTheme !== 'true' && id !== card.dataset.theme) throw Error('已保存的主题编号不可更改。');
      return { ...(state.config.themes.find(t => t.id === card.dataset.theme) || {}), id,
        name: text(q('themeName').value, '主题名称'), order: integer(q('themeOrder').value, '主题排序', 1, 1000000),
        description: q('themeDescription').value.trim(), enabled: q('enabled').checked,
        cover: mediaURL(q('themeCover').value, '主题封面'), mapImage: mediaURL(q('themeMapImage').value, '主题地图'), background: q('themeBackground').value,
        certificateName: text(q('themeCertificateName').value, '主题证书名称'), certificateText: text(q('themeCertificateText').value, '主题证书正文') };
    });
    if (!list.length || list.length > 100) throw Error('活动须保留 1—100 个主题。停用主题可以保留历史。');
    if (new Set(list.map(t => t.id)).size !== list.length) throw Error('主题编号不能重复。');
    if (new Set(list.map(t => t.order)).size !== list.length) throw Error('主题排序不能重复；可同时交换两个主题的顺序。');
    return list.sort((a, b) => a.order - b.order);
  }
  function updateCapField() { const f = $('points-form'), unlimited = field(f, 'noDailyPointCap').checked; field(f, 'dailyPointCap').disabled = unlimited; field(f, 'dailyPointCap').required = !unlimited; }

  function renderLevels() {
    $('level-scope').textContent = `${themes().length} 个主题 · ${state.levels.length} 个关卡。停用的关卡仍保留历史与题目关联。`;
    replace('level-groups', themes().map(t => {
      const ls = levelsFor(t.id), form = el('form', { class: 'panel level-group', 'data-theme': t.id }, el('div', { class: 'panel-heading' }, el('div', {}, el('h2', {}, t.name), el('p', { class: 'muted small' }, `${ls.length} 个关卡${t.enabled === false ? ' · 主题已停用' : ''}`)), el('button', { type: 'button', class: 'button secondary', onclick: () => openLevel(t.id) }, '＋ 新增关卡')));
      if (!ls.length) form.append(el('div', { class: 'empty-state compact-empty' }, el('strong', {}, '主题还没有关卡'), el('p', {}, '新增关卡后，在题库管理中关联题目。')));
      for (const l of ls) {
        const card = el('article', { class: 'level-card', 'data-level': l.id });
        const toggle = checkbox('启用', 'enabled', l.enabled !== false);
        card.append(el('div', { class: 'level-card-top' }, el('span', { class: 'level-order' }, String(l.order)), el('span', { class: 'muted level-id' }, l.id), toggle));
        card.append(el('div', { class: 'level-card-fields dynamic-level-fields' },
          label('关卡名称', textInput('name', l.name, 100, { required: true })),
          label('排序', numberInput('order', l.order, 1, 1000000)),
          label('通关积分', numberInput('points', l.points, 0, 1000000)),
          label('每次题数', numberInput('questionCount', l.questionCount ?? 10, 1, 2000)),
          label('难度说明', textInput('difficultyLabel', l.difficultyLabel || '知识挑战', 100, { required: true }))));
        card.append(el('div', { class: 'level-card-meta' }, el('span', { class: 'field-help' }, '新题数不能超过有效题池；旧局继续原配置。'), el('button', { type: 'button', class: 'text-button', onclick: () => stopLevel(l) }, '停用此关及后续')));
        form.append(card);
      }
      if (ls.length) form.append(el('div', { class: 'form-actions' }, el('p', { class: 'save-status', role: 'status' }), el('button', { type: 'submit', class: 'button primary' }, '保存' + t.name)));
      form.addEventListener('submit', e => { e.preventDefault(); submit(form, async () => {
        const levels = [...form.querySelectorAll('[data-level]')].map(card => {
          const q = n => card.querySelector(`[name=${n}]`);
          return { id: card.dataset.level, name: text(q('name').value, '关卡名称'), order: integer(q('order').value, '关卡排序', 1, 1000000),
            points: integer(q('points').value, '通关积分', 0, 1000000), questionCount: integer(q('questionCount').value, '挑战题数', 1, 2000),
            difficultyLabel: text(q('difficultyLabel').value, '难度说明'), enabled: q('enabled').checked };
        });
        if (new Set(levels.map(l => l.order)).size !== levels.length) throw Error('同一主题的关卡排序不能重复；请同时修改要交换的两个关卡。');
        let stopped = false; for (const l of levels.slice().sort((a, b) => a.order - b.order)) { if (!l.enabled) stopped = true; else if (stopped) throw Error('停用前关时须同时停用后续关卡，避免解锁断点。'); }
        await api('admin/levels', { levels }, 'PUT'); await refreshStructure(); renderLevels(); notify('关卡已保存，新设置用于之后开始的挑战。');
      }); });
      return form;
    }));
  }
  function openLevel(themeId) {
    if (state.busy) return;
    const f = $('level-form'); f.reset(); $('level-error').hidden = true;
    fillSelect(field(f, 'themeId'), themes().map(t => [t.id, t.name])); set(f, 'themeId', themeId || themes()[0]?.id);
    suggestLevel(); $('level-dialog').showModal();
  }
  function suggestLevel() {
    const f = $('level-form'), id = field(f, 'themeId').value, ls = levelsFor(id), order = Math.max(0, ...ls.map(l => l.order)) + 1;
    let suggested = id + '-' + order; if (state.levels.some(l => l.id === suggested)) suggested += '-' + Date.now().toString(36);
    set(f, 'id', suggested); set(f, 'name', '第' + order + '关'); set(f, 'order', order); set(f, 'questionCount', 10); set(f, 'points', [10, 15, 20, 30][Math.min(order - 1, 3)]); set(f, 'difficultyLabel', '知识挑战');
  }
  function confirmAction(title, message, buttonLabel, action) {
    if (state.busy) return;
    $('confirm-title').textContent = title; $('confirm-message').textContent = message; $('confirm-error').hidden = true;
    $('confirm-accept').textContent = buttonLabel; $('confirm-dialog').showModal();
    $('confirm-accept').onclick = async () => {
      if (state.busy) return; state.busy = true; $('confirm-accept').disabled = true;
      try { await action(); $('confirm-dialog').close(); }
      catch (e) { showError('confirm-error', e); }
      finally { state.busy = false; $('confirm-accept').disabled = false; }
    };
  }
  function stopLevel(level) {
    const affected = levelsFor(level.themeId).filter(l => l.order >= level.order && l.enabled !== false);
    confirmAction('停用关卡', `停用“${level.name}”及其后续 ${Math.max(0, affected.length - 1)} 个启用关卡？题目与历史记录保留；进行中的挑战保持原规则。未保存的本页修改会被重新读取的数据替换。`, '确认停用', async () => {
      if (affected.length > 1) await api('admin/levels', { levels: affected.map(l => ({ id: l.id, enabled: false })) }, 'PUT');
      else await api('admin/levels/' + encodeURIComponent(level.id), undefined, 'DELETE');
      await refreshStructure(); renderLevels(); notify('关卡已停用，历史记录保留。');
    });
  }

  function fillSelect(select, items, all, preserve = '') {
    select.replaceChildren(...(all ? [el('option', { value: '' }, all)] : []), ...items.map(([id, name]) => el('option', { value: id }, name)));
    if ([...select.options].some(o => o.value === preserve)) select.value = preserve;
  }
  function filterLevelOptions() {
    const f = $('question-filters'), theme = field(f, 'themeId').value, prior = field(f, 'levelId').value;
    fillSelect(field(f, 'levelId'), state.levels.filter(l => !theme || l.themeId === theme).sort((a, b) => a.order - b.order).map(l => [l.id, themeName(l.themeId) + ' · 第' + l.order + '关 · ' + l.name]), '全部关卡', prior);
  }
  async function loadQuestions(revision = state.viewRequest) {
    const f = $('question-filters'), prior = field(f, 'themeId').value;
    fillSelect(field(f, 'themeId'), themes().map(t => [t.id, t.name + (t.enabled === false ? '（停用）' : '')]), '全部主题', prior); filterLevelOptions();
    const params = new URLSearchParams(), review = field(f, 'review').value;
    for (const k of ['themeId', 'levelId']) if (field(f, k).value) params.set(k, field(f, k).value);
    if (field(f, 'search').value.trim()) params.set('q', field(f, 'search').value.trim());
    if (review && review !== 'disabled') params.set('reviewStatus', review);
    const data = await api('admin/questions?' + params); if (revision !== state.viewRequest) return;
    state.questions = review === 'disabled' ? data.questions.filter(q => !q.enabled) : data.questions;
    state.page = Math.min(state.page, Math.max(0, Math.ceil(state.questions.length / state.pageSize) - 1)); renderQuestions();
  }
  function renderQuestions() {
    const all = state.questions, start = state.page * state.pageSize, qs = all.slice(start, start + state.pageSize);
    $('question-total').textContent = all.length; $('question-summary-text').textContent = all.filter(q => !q.approved).length + ' 道未批准 · ' + all.filter(q => q.approved && q.enabled).length + ' 道正式启用'; $('question-empty').hidden = !!all.length;
    replace('question-rows', qs.map(q => el('tr', { 'data-question': q.id },
      el('td', {}, el('div', { class: 'question-title' }, q.title), el('div', { class: 'question-id' }, q.id)),
      el('td', {}, themeName(q.themeId), el('div', { class: 'subtext' }, levelName(q.levelId))),
      el('td', {}, el('span', { class: 'media-label' }, q.media?.type === 'video' ? '视频题' : q.media ? '图片题' : '文字题'), q.difficulty),
      el('td', {}, el('div', { class: 'badges' }, badge(q.approved ? '已通过' : q.reviewStatus === 'rejected' ? '已退回' : '待审核', q.approved ? 'success' : 'warning'), badge(q.enabled ? '已启用' : '未启用'), q.experienceAuthorized ? badge('体验开放') : null)),
      el('td', { class: 'actions-cell' }, el('div', { class: 'table-actions' }, el('button', { type: 'button', onclick: () => edit(q) }, '编辑'), el('button', { type: 'button', onclick: () => review(q) }, '审核'), el('button', { type: 'button', class: 'delete-link', onclick: () => remove(q) }, '删除'))))));
    $('question-range').textContent = all.length ? `显示 ${start + 1}—${start + qs.length} / 共 ${all.length} 道` : '共 0 道'; $('page-indicator').textContent = (state.page + 1) + ' / ' + Math.max(1, Math.ceil(all.length / state.pageSize));
    $('previous-page').disabled = state.page === 0; $('next-page').disabled = start + state.pageSize >= all.length;
  }
  function editorLevels(prior = '') {
    const f = $('question-form'); fillSelect(field(f, 'levelId'), levelsFor(field(f, 'themeId').value).map(l => [l.id, `第${l.order}关 · ${l.name}${l.enabled === false ? '（停用）' : ''}`]), null, prior);
    field(f, 'levelId').disabled = !field(f, 'levelId').options.length;
    const button = f.querySelector('button[type=submit]'); button.disabled = !field(f, 'levelId').options.length;
    if (!field(f, 'levelId').options.length) showError('editor-error', Error('此主题尚无关卡，请先在关卡配置中新增，再关联题目。'));
    else $('editor-error').hidden = true;
  }
  function edit(q = null) {
    if (state.busy) return;
    state.editing = q; const f = $('question-form'); f.reset(); $('editor-error').hidden = true; $('editor-title').textContent = q ? '编辑题目' : '新增题目';
    fillSelect(field(f, 'themeId'), themes().map(t => [t.id, t.name])); set(f, 'themeId', q?.themeId || themes()[0]?.id); editorLevels(q?.levelId);
    set(f, 'id', q?.id || 'Q-' + Date.now().toString(36)); field(f, 'id').readOnly = !!q;
    set(f, 'difficulty', ({ 基础: 'basic', 进阶: 'advanced', 综合: 'comprehensive' })[q?.difficulty] || 'basic'); set(f, 'title', q?.title || ''); set(f, 'explanation', q?.explanation || '');
    replace('option-fields', [0, 1, 2, 3].map(i => el('div', { class: 'option-row' }, label('ABCD'[i], el('input', { name: 'answer', type: 'radio', value: i, checked: (q?.answer ?? 0) === i, required: true })), textInput('option-' + i, q?.options[i], 500, { required: true, 'aria-label': '选项 ' + 'ABCD'[i] }))));
    set(f, 'mediaType', q?.media?.type || ''); set(f, 'mediaSrc', q?.media?.url || q?.media?.src || ''); field(f, 'mediaRequired').checked = !!q?.media?.required; editorMedia(); $('question-dialog').showModal();
  }
  function editorMedia() { const f = $('question-form'), type = field(f, 'mediaType').value; $('media-url-field').hidden = !type; field(f, 'mediaSrc').required = !!type; preview('question-media-preview', type ? field(f, 'mediaSrc').value : '', type); }
  function review(q) {
    if (state.busy) return;
    state.reviewing = q; const f = $('review-form'); f.reset(); field(f, 'enabled').disabled = false; $('review-error').hidden = true;
    $('review-question-title').textContent = q.title;
    replace('review-answer', ...q.options.map((option, i) => el('p', {}, 'ABCD'[i] + ' · ' + option + (i === q.answer ? '（正确）' : ''))), el('p', {}, '解析：' + q.explanation), el('p', {}, '来源：' + (q.sourceUrl || q.source || '待补充')));
    if (q.media && safeSrc(q.media.url || q.media.src)) $('review-answer').append(el(q.media.type === 'video' ? 'video' : 'img', { class: 'review-media', src: q.media.url || q.media.src, alt: q.media.alt || '审核题目素材', ...(q.media.type === 'video' ? { controls: 'controls', preload: 'metadata' } : {}) }));
    set(f, 'approved', 'true'); set(f, 'note', q.reviewNote || ''); field(f, 'enabled').checked = !!q.enabled; $('review-dialog').showModal();
  }
  function remove(q) { confirmAction('确认删除题目', '删除“' + q.title + '”？已开始的挑战保留原题版本。', '删除题目', async () => { await api('admin/questions/' + encodeURIComponent(q.id), undefined, 'DELETE'); await loadQuestions(); notify('题目已删除'); }); }
  async function renderOperations(revision = state.viewRequest) {
    const [outbox, audit] = await Promise.all([api('admin/outbox'), api('admin/audit')]); if (revision !== state.viewRequest) return;
    $('sync-status').textContent = outbox.configured ? '接收端已配置，确认后才标为已同步。' : '甲方接收端待提供，通关事件已保存；未宣称同步成功。'; $('retry-sync').disabled = !outbox.configured; $('outbox-empty').hidden = !!outbox.entries.length; $('audit-empty').hidden = !!audit.entries.length;
    replace('outbox-rows', outbox.entries.map(e => el('tr', {}, el('td', {}, e.type, el('div', { class: 'question-id' }, e.id)), el('td', {}, badge(e.status === 'delivered' ? '已同步' : e.status === 'failed' ? '待重试' : '待同步', e.status === 'delivered' ? 'success' : 'warning')), el('td', {}, String(e.attempts)), el('td', {}, e.lastError || (e.status === 'delivered' ? '已确认' : '等待接收端确认')), el('td', { class: 'date-text' }, date(e.at)))));
    replace('audit-rows', audit.entries.map(e => el('tr', {}, el('td', {}, e.action), el('td', {}, e.targetId), el('td', {}, e.actorId), el('td', { class: 'date-text' }, date(e.at)), el('td', { class: 'details-text' }, JSON.stringify(e.details)) )));
  }
  async function readJSON(file, name) {
    if (!file || file.size > 2000000) throw Error(`请选择不超过 2MB 的${name} JSON 文件。`);
    try { return JSON.parse(await file.text()); } catch { throw Error('JSON 文件格式错误，请修正后重试。'); }
  }
  function downloadJSON(data, filename) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), anchor = el('a', { href: url, download: filename });
    document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  $('login-form').addEventListener('submit', e => { e.preventDefault(); const f = e.currentTarget; submit(f, async () => {
    const data = await api('auth/admin', { username: field(f, 'username').value, password: field(f, 'password').value }); field(f, 'password').value = ''; environment(data.mode);
    $('login-screen').hidden = true; $('admin-screen').hidden = false; await showView('overview');
  }, 'login-error'); });
  document.querySelectorAll('[data-view],[data-go]').forEach(b => b.addEventListener('click', () => { if (!state.busy) showView(b.dataset.view || b.dataset.go); }));
  $('refresh').onclick = $('global-retry').onclick = () => { if (!state.busy) showView(state.view); };
  $('logout').onclick = async () => { if (state.busy) return; try { await api('auth/logout', { scope: 'admin' }); state.viewRequest++; document.querySelectorAll('dialog[open]').forEach(d => d.close()); $('admin-screen').hidden = true; $('login-screen').hidden = false; $('username').focus(); } catch (e) { notify(e.message); } };
  $('new-theme').onclick = () => {
    if (state.busy) return; if ($('theme-configs').children.length >= 100) { notify('最多维护 100 个主题。'); return; }
    const orders = [...$('theme-configs').querySelectorAll('[name=themeOrder]')].map(i => Number(i.value));
    const card = themeCard({ id: 'theme-' + Date.now().toString(36), name: '新主题', order: Math.max(0, ...orders) + 1, enabled: false }, true);
    $('theme-configs').append(card); $('theme-count').textContent = $('theme-configs').children.length + ' 个主题（待保存）'; card.querySelector('[name=themeName]').focus();
  };
  $('basic-form').addEventListener('submit', e => { e.preventDefault(); const f = e.currentTarget; submit(f, async () => {
    const config = { name: text(field(f, 'name').value, '互动名称'), cover: mediaURL(field(f, 'cover').value, '互动封面'), background: field(f, 'background').value, themes: collectThemes(),
      certificates: { title: text(field(f, 'certificateTitle').value, '证书抬头'), totalName: text(field(f, 'totalCertificateName').value, '总证书名称'), totalText: text(field(f, 'totalCertificateText').value, '总证书正文'), footer: text(field(f, 'certificateFooter').value, '证书落款') },
      share: { title: text(field(f, 'shareTitle').value, '分享标题'), text: text(field(f, 'shareText').value, '分享文案'), image: mediaURL(field(f, 'shareImage').value, '分享图片') } };
    state.config = await api('admin/config', config, 'PUT'); configNotice(); renderConfig('basic'); notify('基础配置已保存；实际规则批准状态见上方提示。');
  }); });
  field($('basic-form'), 'background').addEventListener('input', e => $('background-value').textContent = e.target.value);
  field($('basic-form'), 'cover').addEventListener('change', e => preview('basic-preview', e.target.value));
  field($('basic-form'), 'shareImage').addEventListener('change', e => preview('activity-share-preview', e.target.value));
  field($('revive-form'), 'shareImage').addEventListener('change', e => preview('share-preview', e.target.value));
  $('revive-form').addEventListener('submit', e => { e.preventDefault(); const f = e.currentTarget; submit(f, async () => {
    state.config = await api('admin/config', { revive: { limit: integer(field(f, 'limit').value, '复活次数', 0, 100), period: 'challenge', failurePolicy: 'until-limit', shareText: text(field(f, 'shareText').value, '复活分享语'), shareImage: mediaURL(field(f, 'shareImage').value, '复活分享图') } }, 'PUT'); configNotice(); notify('复活配置已保存，新设置适用于之后开始的挑战。');
  }); });
  $('points-form').addEventListener('submit', e => { e.preventDefault(); const f = e.currentTarget; submit(f, async () => {
    const cap = field(f, 'noDailyPointCap').checked ? null : integer(field(f, 'dailyPointCap').value, '每日积分上限', 0, Number.MAX_SAFE_INTEGER);
    state.config = await api('admin/config', { points: { replay: 'first', dailyPointCap: cap, capPolicy: 'truncate-reward' }, timer: { seconds: integer(field(f, 'seconds').value, '单题时限', 5, 600), timeout: 'wrong' } }, 'PUT'); configNotice(); notify('积分与计时已保存，进行中的挑战保持原规则。');
  }); });
  field($('points-form'), 'noDailyPointCap').onchange = updateCapField;
  $('level-form').addEventListener('submit', e => { e.preventDefault(); const f = e.currentTarget; submit(f, async () => {
    const themeId = field(f, 'themeId').value, order = integer(field(f, 'order').value, '关卡排序', 1, 1000000);
    if (levelsFor(themeId).some(l => l.order === order)) throw Error('该主题已有相同排序的关卡，请使用其他顺序。');
    const id = slugId(field(f, 'id').value, '关卡编号'); if (state.levels.some(l => l.id === id)) throw Error('关卡编号已存在，不能覆盖历史关卡。');
    await api('admin/levels', { id, themeId, order, name: text(field(f, 'name').value, '关卡名称'), points: integer(field(f, 'points').value, '通关积分', 0, 1000000), questionCount: integer(field(f, 'questionCount').value, '挑战题数', 1, 2000), difficultyLabel: text(field(f, 'difficultyLabel').value, '难度说明'), enabled: field(f, 'enabled').checked });
    $('level-dialog').close(); await refreshStructure(); renderLevels(); notify('关卡已新增，请关联题目并核对有效题池。');
  }, 'level-error'); });
  field($('level-form'), 'themeId').onchange = suggestLevel;
  $('question-filters').addEventListener('submit', e => { e.preventDefault(); if (!state.busy) { state.page = 0; showView('questions'); } }); field($('question-filters'), 'themeId').onchange = filterLevelOptions;
  function clear() { if (state.busy) return; $('question-filters').reset(); filterLevelOptions(); state.page = 0; showView('questions'); }
  $('clear-filters').onclick = clear; document.querySelector('[data-reset-filters]').onclick = clear;
  $('previous-page').onclick = () => { state.page--; renderQuestions(); }; $('next-page').onclick = () => { state.page++; renderQuestions(); }; $('new-question').onclick = () => edit();
  field($('question-form'), 'themeId').onchange = () => editorLevels(); for (const n of ['mediaType', 'mediaSrc']) field($('question-form'), n).onchange = editorMedia;
  $('question-form').addEventListener('submit', e => { e.preventDefault(); const f = e.currentTarget; submit(f, async () => {
    const type = field(f, 'mediaType').value, options = [0, 1, 2, 3].map(i => text(field(f, 'option-' + i).value, '选项 ' + 'ABCD'[i]));
    if (new Set(options).size !== 4) throw Error('四个选项不能重复。');
    const selectedAnswer = field(f, 'answer').value; if (selectedAnswer === '') throw Error('请选择唯一正确答案。');
    const old = state.editing, question = { id: stableId(field(f, 'id').value, '题目编号'), levelId: text(field(f, 'levelId').value, '所属关卡'), title: text(field(f, 'title').value, '题干'), explanation: text(field(f, 'explanation').value, '解析'), options, answer: integer(selectedAnswer, '正确答案', 0, 3), difficulty: ({ basic: '基础', advanced: '进阶', comprehensive: '综合' })[field(f, 'difficulty').value],
      media: type ? { type, url: mediaURL(field(f, 'mediaSrc').value, '题目素材'), alt: old?.media?.alt || '', required: field(f, 'mediaRequired').checked } : null };
    if (question.media && !question.media.url) throw Error('选择图片或视频题后须填写素材地址。');
    await api('admin/questions' + (old ? '/' + encodeURIComponent(old.id) : ''), question, old ? 'PUT' : 'POST'); $('question-dialog').close(); await loadQuestions(); notify('题目已保存，等待审核。');
  }, 'editor-error'); });
  $('review-form').addEventListener('submit', e => { e.preventDefault(); const f = e.currentTarget; submit(f, async () => {
    const approved = field(f, 'approved').value === 'true'; await api('admin/questions/' + encodeURIComponent(state.reviewing.id) + '/review', { approved, enabled: approved && field(f, 'enabled').checked, note: text(field(f, 'note').value, '审核说明') }); $('review-dialog').close(); await loadQuestions(); notify('审核结果已保存。');
  }, 'review-error'); });
  field($('review-form'), 'approved').onchange = e => { field($('review-form'), 'enabled').disabled = e.target.value !== 'true'; if (e.target.value !== 'true') field($('review-form'), 'enabled').checked = false; };
  $('import-questions').onclick = () => { if (state.busy) return; $('import-form').reset(); $('import-error').hidden = true; $('import-dialog').showModal(); };
  $('import-form').addEventListener('submit', e => { e.preventDefault(); const f = e.currentTarget; submit(f, async () => {
    const parsed = await readJSON(field(f, 'file').files[0], '题库'), questions = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(questions) || !questions.length) throw Error('题库须包含非空 questions 数组。'); const data = await api('admin/questions/import', { questions }); $('import-dialog').close(); await loadQuestions(); notify('已导入 ' + data.imported + ' 题，均待审核。');
  }, 'import-error'); });
  $('export-questions').onclick = async () => { try { downloadJSON(await api('admin/questions/export'), '趣味闯关题库.json'); notify('题库已导出。'); } catch (e) { notify(e.message); } };
  $('export-activity').onclick = async () => { try { const data = await api('admin/activity/export'); downloadJSON({ schemaVersion: data.schemaVersion, exportedAt: data.exportedAt, config: data.config, levels: data.levels }, '趣味闯关活动配置.json'); notify('活动配置已导出，题库审核状态独立管理。'); } catch (e) { notify(e.message); } };
  $('import-activity').onclick = () => { if (state.busy) return; $('activity-import-form').reset(); $('activity-import-error').hidden = true; $('activity-file-info').textContent = '文件须包含 config 与 levels。可选 questions 默认不导入，题库审核独立保留。'; $('activity-dialog').showModal(); };
  field($('activity-import-form'), 'file').onchange = async e => { try { const data = await readJSON(e.target.files[0], '活动配置'); if (!data.config || !Array.isArray(data.levels)) throw Error('活动文件须包含 config 对象与 levels 数组。'); $('activity-file-info').textContent = `文件包含 ${data.config.themes?.length || 0} 个主题、${data.levels.length} 个关卡${Array.isArray(data.questions) ? '、' + data.questions.length + ' 道题目' : ''}。`; $('activity-import-error').hidden = true; } catch (error) { showError('activity-import-error', error); } };
  $('activity-import-form').addEventListener('submit', e => { e.preventDefault(); const f = e.currentTarget; submit(f, async () => {
    if (!field(f, 'confirmed').checked) throw Error('请先备份并确认导入活动。'); const data = await readJSON(field(f, 'file').files[0], '活动配置');
    if (!data.config || typeof data.config !== 'object' || Array.isArray(data.config) || !Array.isArray(data.levels)) throw Error('活动文件须包含 config 对象与 levels 数组。');
    if (field(f, 'includeQuestions').checked && !Array.isArray(data.questions)) throw Error('此文件不含 questions 数组，请取消同时导入题目的选项。');
    await api('admin/activity/import', { config: data.config, levels: data.levels, ...(field(f, 'includeQuestions').checked && Array.isArray(data.questions) ? { questions: data.questions } : {}) }); $('activity-dialog').close(); await refreshStructure(); renderConfig('basic'); notify('活动已导入。规则与题目不会由文件自动批准。');
  }, 'activity-import-error'); });
  $('retry-sync').onclick = async () => { if (state.busy) return; state.busy = true; $('retry-sync').disabled = true; try { const data = await api('admin/outbox/retry', {}); notify('已同步 ' + data.delivered + ' 条，待重试 ' + data.failed + ' 条。'); await renderOperations(); } catch (e) { notify(e.message); } finally { state.busy = false; } };
  for (const [id, dialog] of [['close-editor', 'question-dialog'], ['cancel-editor', 'question-dialog'], ['close-review', 'review-dialog'], ['cancel-review', 'review-dialog'], ['close-import', 'import-dialog'], ['cancel-import', 'import-dialog'], ['confirm-cancel', 'confirm-dialog'], ['close-level', 'level-dialog'], ['cancel-level', 'level-dialog'], ['close-activity-import', 'activity-dialog'], ['cancel-activity-import', 'activity-dialog']]) $(id).onclick = () => { if (!state.busy) $(dialog).close(); };
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('cancel', e => { if (state.busy) e.preventDefault(); }));
  api('admin/overview').then(async data => { environment(data.mode); $('login-screen').hidden = true; $('admin-screen').hidden = false; await showView('overview'); }).catch(e => { if (e.status !== 401 && e.status !== 403) showError('login-error', e); });
})();
