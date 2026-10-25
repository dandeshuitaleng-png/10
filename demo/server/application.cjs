'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const { SQLiteStore } = require('./store.cjs');
const { installContentMedia } = require('./content-media.cjs');
const catalogConfig = require('./catalog-config.cjs');
const { assertRevision, assertCollectionRevision } = require('./revision.cjs');
const { createOutboxDelivery } = require('./outbox-delivery.cjs');
const THEMES = [
  ['red', '十步芳草'],
  ['culture', '千年文脉'],
  ['industry', '金色产业'],
  ['ecology', '青山绿水']
];
const POINTS = [10, 15, 20, 30];
const LABELS = ['基础认知', '进阶理解', '深度应用', '综合挑战'];
const COOKIE = 'quiz_session';
const ADMIN_COOKIE = 'quiz_admin_session';
const HASH = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const uuid = () => crypto.randomUUID();
const dayAt = (time) => new Date(time + 8 * 3600000).toISOString().slice(0, 10);
const dayEnd = (time) => Date.parse(`${dayAt(time)}T00:00:00+08:00`) + 86400000;
const error = (status, code, message) => Object.assign(new Error(message), { status, code });
function requireValue(condition, code, message, status = 400) {
  if (!condition) throw error(status, code, message);
}
function text(value, field, max = 200) {
  requireValue(
    typeof value === 'string' && value.trim() && value.length <= max,
    'INVALID_INPUT',
    `${field}格式不正确`
  );
  return value.trim();
}
function mediaURL(value) {
  if (!value) return '';
  requireValue(
    typeof value === 'string' &&
      value.length < 2048 &&
      (/^https:\/\//.test(value) || /^\/(?:assets|design|images|media)\/[\w\-./%]+$/.test(value)) &&
      !value.includes('..'),
    'INVALID_MEDIA',
    '媒体须使用HTTPS或受控本地资源路径'
  );
  return value;
}
function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    developmentIdentity: user.developmentIdentity || false
  };
}
const defaultConfig = catalogConfig.defaultConfig;
function normalizeQuestion(input, levels, old = null) {
  requireValue(
    input && typeof input === 'object' && !Array.isArray(input),
    'INVALID_QUESTION',
    '题目须为对象'
  );
  requireValue(
    input.enabled === undefined || typeof input.enabled === 'boolean',
    'INVALID_QUESTION',
    '启用状态须为布尔值'
  );
  requireValue(
    input.deleted === undefined || typeof input.deleted === 'boolean',
    'INVALID_QUESTION',
    '删除标记须为布尔值'
  );
  const levelId = text(input.levelId, '关卡ID', 80);
  const level = levels.find((item) => item.id === levelId);
  requireValue(level, 'INVALID_LEVEL', '题目关卡不存在');
  requireValue(
    input.themeId === undefined || input.themeId === level.themeId,
    'INVALID_LEVEL',
    '题目主题与关卡不一致'
  );
  requireValue(
    Array.isArray(input.options) && input.options.length === 4,
    'INVALID_OPTIONS',
    '每题必须恰好4个选项'
  );
  const options = input.options.map((option) => text(option, '选项', 500));
  requireValue(new Set(options).size === 4, 'INVALID_OPTIONS', '选项不能重复');
  requireValue(
    Number.isInteger(input.answer) && input.answer >= 0 && input.answer <= 3,
    'INVALID_ANSWER',
    '正确答案须为0至3'
  );
  const difficulty =
    input.difficulty ??
    old?.difficulty ??
    (level.order === 1 ? '基础' : level.order === 2 ? '进阶' : '综合');
  requireValue(
    ['基础', '进阶', '综合'].includes(difficulty),
    'INVALID_DIFFICULTY',
    '难度须为基础、进阶或综合'
  );
  const optional = (key, max = 1000) => {
    const v = input[key] ?? old?.[key] ?? '';
    requireValue(typeof v === 'string' && v.length <= max, 'INVALID_QUESTION', `${key}格式不正确`);
    return v;
  };
  const suppliedMedia = input.media === undefined ? old?.media : input.media;
  let media = null;
  requireValue(
    suppliedMedia === undefined ||
      suppliedMedia === null ||
      (typeof suppliedMedia === 'object' && !Array.isArray(suppliedMedia)),
    'INVALID_MEDIA',
    '媒体须为对象或null'
  );
  if (suppliedMedia) {
    requireValue(
      typeof suppliedMedia === 'object' && ['image', 'video'].includes(suppliedMedia.type),
      'INVALID_MEDIA',
      '媒体类型须为image或video'
    );
    requireValue(
      suppliedMedia.required === undefined || typeof suppliedMedia.required === 'boolean',
      'INVALID_MEDIA',
      '媒体必要条件须为布尔值'
    );
    media = {
      type: suppliedMedia.type,
      url: mediaURL(suppliedMedia.url || suppliedMedia.src),
      alt: String(suppliedMedia.alt || '').slice(0, 300),
      caption: String(suppliedMedia.caption || '').slice(0, 500),
      required: suppliedMedia.required === true
    };
    requireValue(media.url, 'INVALID_MEDIA', '媒体地址不能为空');
  }
  const sourceIds = input.sourceIds ?? old?.sourceIds ?? [];
  requireValue(
    Array.isArray(sourceIds) &&
      sourceIds.length <= 50 &&
      sourceIds.every((v) => typeof v === 'string' && v.length <= 200),
    'INVALID_QUESTION',
    '资料来源编号格式不正确'
  );
  const deleted = input.deleted ?? false;
  const question = {
    id: input.id ? text(input.id, '题目ID', 100) : uuid(),
    levelId,
    themeId: level.themeId,
    title: text(input.title, '题干', 2000),
    options,
    answer: input.answer,
    explanation: text(input.explanation, '解析', 4000),
    difficulty,
    media,
    version: (old ? old.version : 0) + 1,
    enabled:
      !deleted &&
      (input.enabled === undefined
        ? old
          ? old.enabled !== false
          : true
        : input.enabled !== false),
    source: old ? old.source : 'admin',
    sourceIds: sourceIds.slice(),
    sourceTitle: optional('sourceTitle'),
    sourceUrl: optional('sourceUrl', 2048),
    knowledgePoint: optional('knowledgePoint'),
    region: optional('region', 200),
    deleted,
    ...(old && old.developmentOnly ? { developmentOnly: true } : {})
  };
  if (old) {
    const previous = { ...old },
      candidate = { ...question };
    delete previous.version;
    delete candidate.version;
    if (isDeepStrictEqual(previous, candidate)) return old;
  }
  return question;
}
const validateConfig = catalogConfig.validateConfig;
function xml(value) {
  return String(value).replace(
    /[<>&"']/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]
  );
}
function certificateSVG(certificate, user) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850"><rect width="1200" height="850" fill="#f8f5e9"/><rect x="40" y="40" width="1120" height="770" rx="24" fill="none" stroke="#287d7d" stroke-width="5"/><rect x="65" y="65" width="1070" height="720" rx="18" fill="none" stroke="#dba747"/><text x="600" y="205" text-anchor="middle" font-size="36" fill="#287d7d" font-family="sans-serif">${xml(certificate.title || '趣味闯关 · 电子荣誉证书')}</text><text x="600" y="310" text-anchor="middle" font-size="58" font-weight="bold" fill="#214c4c" font-family="sans-serif">${xml(certificate.name)}</text><text x="600" y="420" text-anchor="middle" font-size="38" fill="#214c4c" font-family="sans-serif">${xml(user.name)}</text><text x="600" y="505" text-anchor="middle" font-size="27" fill="#456767" font-family="sans-serif">${xml(certificate.description || '已完成乡村知识挑战')}</text><text x="600" y="575" text-anchor="middle" font-size="25" fill="#456767" font-family="sans-serif">完成日期：${xml(certificate.day)}\u3000·\u3000${certificate.mode !== 'production' ? '体验版学习记录' : '正式挑战记录'}</text><text x="600" y="675" text-anchor="middle" font-size="20" fill="#658080" font-family="sans-serif">证书编号：${xml(certificate.id)}</text><text x="600" y="728" text-anchor="middle" font-size="18" fill="#658080" font-family="sans-serif">${xml(certificate.footer || '学习活动纪念，不代表学历或教育资格')}</text></svg>`;
}

async function createApplication(options = {}) {
  const mode = options.mode || 'experience';
  requireValue(
    ['production', 'development', 'experience', 'test'].includes(mode),
    'INVALID_MODE',
    '运行模式不正确'
  );
  const nonProduction = mode !== 'production';
  const acceptedRecord = (record) => nonProduction || record.mode === 'production';
  const entityKey = (userId, scope) => `${nonProduction ? '' : 'production:'}${userId}:${scope}`;
  const clock = options.clock || Date.now;
  const store =
    options.store || new SQLiteStore(options.dbPath || path.join(__dirname, 'data', 'quiz.sqlite'));
  const now = () => Number(clock());
  const outboxDelivery = createOutboxDelivery({
    store,
    receiver: options.syncReceiver,
    clock: now,
    timeoutMs: options.syncTimeoutMs
  });
  let credentials = options.adminCredentials;
  if (!credentials && !nonProduction)
    throw error(503, 'ADMIN_NOT_CONFIGURED', '生产管理员凭据未配置');
  if (!credentials) {
    const credentialPath =
      options.credentialPath ||
      path.join(
        path.dirname(options.dbPath || path.join(__dirname, 'data', 'quiz.sqlite')),
        '.admin-credentials.json'
      );
    if (fs.existsSync(credentialPath))
      credentials = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
    else {
      credentials = { username: 'admin', password: crypto.randomBytes(24).toString('base64url') };
      fs.mkdirSync(path.dirname(credentialPath), { recursive: true, mode: 0o700 });
      fs.writeFileSync(credentialPath, JSON.stringify(credentials), { mode: 0o600 });
    }
    fs.chmodSync(credentialPath, 0o600);
  }
  requireValue(
    credentials &&
      typeof credentials.username === 'string' &&
      typeof credentials.password === 'string' &&
      credentials.password.length >= 12,
    'ADMIN_NOT_CONFIGURED',
    '管理员密码须至少12位',
    503
  );
  const adminSalt = crypto.randomBytes(16);
  const adminHash = crypto.scryptSync(credentials.password, adminSalt, 64);
  const credentialUsername = credentials.username;
  // Do not retain plaintext credentials in the route closures after hashing.
  credentials = null; // eslint-disable-line no-useless-assignment
  const loginFailures = new Map();
  const seedBank =
    options.seedBank ||
    JSON.parse(
      fs.readFileSync(path.join(__dirname, '../design/content-intake/current/bank.json'), 'utf8')
    );
  await store.transaction(async (tx) => {
    if (await tx.get('meta', 'initialized')) return;
    await tx.set('meta', 'config', defaultConfig());
    const levels = THEMES.flatMap(([themeId]) =>
      POINTS.map((points, index) => ({
        id: `${themeId}-${index + 1}`,
        themeId,
        order: index + 1,
        name: LABELS[index],
        difficultyLabel: LABELS[index],
        enabled: true,
        points,
        questionCount: 10
      }))
    );
    await tx.set('meta', 'levels', levels);
    for (const raw of seedBank.questions || []) {
      const question = normalizeQuestion(raw, levels);
      question.source = 'source-bank';
      question.enabled = true;
      await tx.set('questions', question.id, question);
    }
    if (mode === 'development' || mode === 'test') {
      for (const level of levels)
        for (let index = 1; index <= 12; index++) {
          const answer = index % 4;
          const opts = [`${index + 5}`, `${index + 6}`, `${index + 7}`, `${index + 8}`];
          const question = normalizeQuestion(
            {
              id: `DEV-${level.id}-${index}`,
              levelId: level.id,
              title: `【开发测试】${index}加${5 + answer}等于多少？`,
              options: opts,
              answer,
              explanation: '这是独立开发测试题，不属于正式乡村题库。'
            },
            levels
          );
          question.source = 'development-test';
          question.developmentOnly = true;
          question.enabled = true;
          await tx.set('questions', question.id, question);
        }
    }
    await tx.set('meta', 'initialized', { at: now(), version: 1 });
  });
  await installContentMedia(store);
  // One atomic, idempotent upgrade: identity, history and absolute deadlines survive.
  await store.transaction(async (tx) => {
    if (await tx.get('meta', 'catalog-v2')) return;
    const cfg = catalogConfig.normalizeConfigShape(await tx.get('meta', 'config'));
    const all = catalogConfig.validateLevels(await tx.get('meta', 'levels'), cfg);
    await tx.set('meta', 'config', cfg);
    await tx.set('meta', 'levels', all);
    await tx.set('catalogReleases', String(cfg.version), {
      id: String(cfg.version),
      config: cfg,
      levels: all,
      at: now()
    });
    for (const challenge of await tx.list('challenges')) {
      const level = all.find((item) => item.id === challenge.levelId);
      if (!level) throw error(500, 'MIGRATION_ORPHAN', '历史挑战关卡缺失，迁移已回滚');
      const inherited = catalogConfig.ruleSnapshot(cfg, all, level);
      challenge.rules = {
        ...inherited,
        ...challenge.rules,
        total: challenge.questions.length,
        reviveLimit: challenge.rules.reviveLimit ?? 1,
        dailyPointCap: challenge.rules.dailyPointCap ?? null
      };
      challenge.reviveCount = challenge.reviveCount ?? (challenge.reviveUsed ? 1 : 0);
      challenge.reviveUsed = challenge.reviveCount > 0;
      await tx.set('challenges', challenge.id, challenge);
    }
    const legacyBook = catalogConfig.manifest(cfg, all);
    for (const cert of await tx.list('certificates')) {
      const theme = cfg.themes.find((item) => item.id === cert.themeId);
      cert.title = cert.title || cfg.certificates.title;
      cert.description =
        cert.description || (theme ? theme.certificateText : cfg.certificates.totalText);
      cert.footer = cert.footer || cfg.certificates.footer;
      cert.levelIds =
        cert.levelIds ||
        (theme
          ? legacyBook.themes.find((item) => item.id === theme.id)?.levelIds || []
          : legacyBook.levels.map((item) => item.id));
      cert.requirementsVersion = cert.requirementsVersion ?? cfg.version;
      await tx.set('certificates', cert.key || `${cert.userId}:${cert.themeId || 'all'}`, cert);
    }
    await tx.set('meta', 'catalog-v2', { schemaVersion: 2, at: now() });
  });
  // Retire the old question-review workflow without rewriting gameplay history.
  await store.transaction(async (tx) => {
    if (await tx.get('meta', 'questions-no-review-v1')) return;
    let count = 0;
    for (const q of await tx.list('questions')) {
      if (q.reviewStatus === 'pending' || q.reviewStatus === '待审核') q.enabled = !q.deleted;
      for (const k of [
        'approved',
        'reviewStatus',
        'reviewNote',
        'reviewedBy',
        'reviewedAt',
        'experienceAuthorized'
      ])
        delete q[k];
      if (q.source === 'source-bank-pending-review') q.source = 'source-bank';
      await tx.set('questions', q.id, q);
      count++;
    }
    await tx.set('meta', 'questions-no-review-v1', { at: now(), questionCount: count });
  });
  // Earlier normalization omitted these authored fields. Recover only absent
  // fields on unchanged source-bank questions; explicit blanks/edits stay owned
  // by the administrator. Frozen questions and all player history stay intact.
  await store.transaction(async (tx) => {
    if (await tx.get('meta', 'source-metadata-v1')) return;
    const originals = new Map((seedBank.questions || []).map((q) => [q.id, q]));
    let patched = 0;
    for (const q of await tx.list('questions')) {
      const raw = originals.get(q.id);
      if (
        q.source !== 'source-bank' ||
        !raw ||
        !['levelId', 'themeId', 'title', 'options', 'answer', 'explanation'].every((k) =>
          isDeepStrictEqual(q[k], raw[k])
        )
      )
        continue;
      let changed = false;
      for (const key of ['sourceTitle', 'knowledgePoint', 'region'])
        if (
          !Object.hasOwn(q, key) &&
          typeof raw[key] === 'string' &&
          raw[key].length <= (key === 'region' ? 200 : 1000)
        ) {
          q[key] = raw[key];
          changed = true;
        }
      if (changed) {
        q.version++;
        await tx.set('questions', q.id, q);
        patched++;
      }
    }
    await tx.set('meta', 'source-metadata-v1', { at: now(), patched });
  });
  const isEligible = (question) =>
    !question.deleted &&
    question.enabled !== false &&
    (!question.developmentOnly || mode === 'development' || mode === 'test');
  async function config(tx) {
    return tx.get('meta', 'config');
  }
  async function levels(tx) {
    return tx.get('meta', 'levels');
  }
  function dependencies() {
    return [
      {
        id: 'identity',
        name: '甲方身份验证',
        configured: Boolean(options.platformVerifier),
        requiredForProduction: true
      },
      {
        id: 'share',
        name: '可靠分享验证',
        configured: Boolean(options.shareVerifier),
        requiredForProduction: true
      },
      {
        id: 'sync',
        name: '甲方数据同步',
        configured: Boolean(options.syncReceiver),
        requiredForProduction: true
      }
    ];
  }
  async function readiness(tx) {
    const cfg = await config(tx);
    return {
      rulesApproved: cfg.approval.status === 'user-approved' || cfg.approval.status === 'approved',
      identityConfigured: Boolean(options.platformVerifier),
      shareConfigured: Boolean(options.shareVerifier),
      syncConfigured: Boolean(options.syncReceiver)
    };
  }
  async function assertOpen(tx, frozenRules = null) {
    if (nonProduction) return;
    const ready = await readiness(tx);
    const rulesApproved = frozenRules
      ? ['user-approved', 'approved'].includes(frozenRules.approval?.status)
      : ready.rulesApproved;
    requireValue(
      rulesApproved && ready.identityConfigured && ready.shareConfigured && ready.syncConfigured,
      'PRODUCTION_NOT_READY',
      '规则、身份、分享或同步尚未满足正式开放条件',
      503
    );
  }
  async function audit(tx, user, action, targetId, details = {}) {
    const entry = { id: uuid(), actorId: user.id, action, targetId, at: now(), details };
    await tx.set('audit', entry.id, entry);
  }
  async function authenticate(tx, req) {
    const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
    const cookieName =
      req.url.startsWith('/api/admin/') || req.url.startsWith('/api/auth/admin')
        ? ADMIN_COOKIE
        : COOKIE;
    const cookie = String(req.headers.cookie || '')
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${cookieName}=`));
    const token = bearer ? bearer[1] : cookie ? cookie.slice(cookieName.length + 1) : '';
    if (!token) return null;
    const session = await tx.get('sessions', HASH(token));
    if (
      !session ||
      session.expiresAt <= now() ||
      session.revoked ||
      (!nonProduction && session.mode !== 'production')
    )
      return null;
    const user = await tx.get('users', session.userId);
    return user && (nonProduction || !user.developmentIdentity) ? { user, session } : null;
  }
  async function login(tx, user, bearer = false) {
    const token = crypto.randomBytes(32).toString('base64url');
    const session = {
      id: HASH(token),
      userId: user.id,
      createdAt: now(),
      expiresAt: now() + 7 * 86400000,
      revoked: false,
      mode
    };
    await tx.set('users', user.id, user);
    await tx.set('sessions', session.id, session);
    return {
      status: 200,
      data: { user: safeUser(user), mode, token },
      headers: {
        'Set-Cookie': `${user.role === 'admin' ? ADMIN_COOKIE : COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${nonProduction ? '' : '; Secure'}`
      }
    };
  }
  function requirePlayer(auth) {
    requireValue(auth, 'UNAUTHENTICATED', '请先登录', 401);
    requireValue(auth.user.role === 'player', 'PLAYER_REQUIRED', '此操作仅限玩家', 403);
    return auth.user;
  }
  function requireAdmin(auth) {
    requireValue(auth, 'UNAUTHENTICATED', '请先登录', 401);
    requireValue(auth.user.role === 'admin', 'FORBIDDEN', '需要管理员权限', 403);
    return auth.user;
  }
  async function ownedChallenge(tx, user, id) {
    const item = await tx.get('challenges', id);
    requireValue(
      item && item.userId === user.id && acceptedRecord(item),
      'CHALLENGE_NOT_FOUND',
      '挑战不存在',
      404
    );
    return item;
  }
  async function idempotent(tx, user, action, body, callback) {
    const requestId = text(body.requestId, 'requestId', 150);
    const fingerprint = HASH(
      JSON.stringify({ action, payload: { ...body, requestId: undefined } })
    );
    const key = entityKey(user.id, requestId);
    const previous = await tx.get('requests', key);
    if (previous) {
      requireValue(
        previous.fingerprint === fingerprint,
        'IDEMPOTENCY_CONFLICT',
        '相同请求编号的内容不同',
        409
      );
      return previous.response;
    }
    const response = await callback();
    await tx.set('requests', key, {
      id: key,
      mode,
      userId: user.id,
      fingerprint,
      response,
      at: now()
    });
    return response;
  }
  async function complete(tx, challenge) {
    if (challenge.settled) return;
    challenge.settled = true;
    challenge.state = 'completed';
    challenge.completedAt = now();
    challenge.deadline = null;
    const firstAnswers = challenge.answers.filter((item) => item.first),
      correct = firstAnswers.filter((item) => item.right).length;
    const key = entityKey(challenge.userId, challenge.levelId),
      prior = await tx.get('completions', key);
    const day = dayAt(now()),
      dailyLedger = (await tx.list('ledger')).filter(
        (item) =>
          item.userId === challenge.userId &&
          acceptedRecord(item) &&
          (item.day || dayAt(item.at)) === day
      );
    const dailyBefore = dailyLedger.reduce((sum, item) => sum + item.points, 0);
    const cap = challenge.rules.dailyPointCap ?? null,
      requested = prior ? 0 : challenge.rules.points;
    const points = cap === null ? requested : Math.min(requested, Math.max(0, cap - dailyBefore));
    challenge.result = {
      passed: true,
      points,
      awarded: points,
      requested,
      requestedPoints: requested,
      dailyPointCap: cap,
      dailyCapReached: requested > 0 && cap !== null && dailyBefore + points >= cap,
      dailyPoints: dailyBefore + points,
      accuracy: firstAnswers.length ? correct / firstAnswers.length : 0,
      correct,
      totalAnswered: firstAnswers.length,
      solved: challenge.questions.length,
      reviveUsed: challenge.reviveCount > 0,
      rulesVersion: challenge.rules.version
    };
    let event = null;
    if (!prior) {
      const completion = {
        id: key,
        mode,
        userId: challenge.userId,
        levelId: challenge.levelId,
        themeId: challenge.themeId,
        challengeId: challenge.id,
        at: now(),
        day,
        correct,
        totalAnswered: firstAnswers.length,
        accuracy: challenge.result.accuracy,
        rulesVersion: challenge.rules.version
      };
      await tx.set('completions', key, completion);
      await tx.set('ledger', key, {
        id: key,
        mode,
        userId: challenge.userId,
        challengeId: challenge.id,
        levelId: challenge.levelId,
        points,
        awarded: points,
        requested,
        dailyPointCap: cap,
        dailyCapReached: challenge.result.dailyCapReached,
        day,
        at: now(),
        rulesVersion: challenge.rules.version
      });
      event = {
        id: uuid(),
        type: 'level.completed',
        userId: challenge.userId,
        payload: {
          ...completion,
          points,
          awarded: points,
          requested,
          dailyCapReached: challenge.result.dailyCapReached
        },
        at: now(),
        attempts: 0,
        status: 'pending',
        lastError: options.syncReceiver ? '' : '接收端未配置'
      };
    }
    const completions = (await tx.list('completions')).filter(
      (item) => item.userId === challenge.userId && acceptedRecord(item)
    );
    const done = new Set(completions.map((item) => item.levelId)),
      book = challenge.rules.certificateRequirements;
    const theme = book.themes.find((item) => item.id === challenge.themeId),
      allIds = book.levels.map((item) => item.id);
    challenge.themeComplete = Boolean(
      theme?.levelIds.length && theme.levelIds.every((id) => done.has(id))
    );
    const definitions = [];
    if (challenge.themeComplete)
      definitions.push({
        scope: theme.id,
        themeId: theme.id,
        name: theme.certificateName,
        description: theme.certificateText,
        levelIds: theme.levelIds
      });
    if (allIds.length && allIds.every((id) => done.has(id)))
      definitions.push({
        scope: 'all',
        themeId: null,
        name: book.certificates.totalName,
        description: book.certificates.totalText,
        levelIds: allIds
      });
    const issued = [];
    const existing = (await tx.list('certificates')).filter(
      (item) => item.userId === challenge.userId && acceptedRecord(item)
    );
    for (const definition of definitions) {
      const hash = catalogConfig.requirementHash(definition.levelIds);
      if (
        existing.some(
          (item) =>
            item.themeId === definition.themeId &&
            catalogConfig.requirementHash(item.levelIds || []) === hash
        )
      )
        continue;
      const certKey = entityKey(challenge.userId, `certificate:${definition.scope}:${hash}`);
      const cert = {
        id: uuid(),
        mode,
        key: certKey,
        userId: challenge.userId,
        themeId: definition.themeId,
        name: definition.name,
        title: book.certificates.title,
        description: definition.description,
        footer: book.certificates.footer,
        levelIds: definition.levelIds,
        requirementsVersion: book.version,
        issuedAt: now(),
        day
      };
      await tx.set('certificates', certKey, cert);
      issued.push(cert);
    }
    if (event) {
      event.payload.certificates = issued;
      await tx.set('outbox', event.id, event);
    } else if (issued.length) {
      const certEvent = {
        id: uuid(),
        type: 'certificates.issued',
        userId: challenge.userId,
        payload: { certificates: issued },
        at: now(),
        attempts: 0,
        status: 'pending',
        lastError: options.syncReceiver ? '' : '接收端未配置'
      };
      await tx.set('outbox', certEvent.id, certEvent);
    }
    challenge.result.themeComplete = challenge.themeComplete;
  }
  async function recordAnswer(tx, challenge, selected, timeout = false) {
    const question = challenge.questions[challenge.position];
    const right = !timeout && selected === question.answer;
    const first = !challenge.answers.some((item) => item.questionId === question.id);
    challenge.answers.push({ questionId: question.id, selected, right, first, timeout, at: now() });
    challenge.selected = selected;
    challenge.deadline = null;
    if (right) {
      challenge.feedback = {
        right: true,
        selected,
        answer: question.answer,
        explanation: question.explanation,
        timeout: false
      };
      challenge.state = 'feedback';
      if (challenge.position === challenge.questions.length - 1) await complete(tx, challenge);
    } else if (challenge.reviveCount < challenge.rules.reviveLimit) {
      challenge.state = 'revive';
      challenge.feedback = {
        right: false,
        selected,
        answer: null,
        explanation: null,
        timeout,
        message: timeout ? '本题已超时，可分享恢复当前题作答' : '本题回答错误，可分享恢复当前题作答'
      };
    } else {
      challenge.state = 'locked';
      challenge.feedback = {
        right: false,
        selected,
        answer: question.answer,
        explanation: question.explanation,
        timeout
      };
      challenge.lockedUntil = dayEnd(now());
      await tx.set('locks', entityKey(challenge.userId, challenge.levelId), {
        id: entityKey(challenge.userId, challenge.levelId),
        mode,
        userId: challenge.userId,
        levelId: challenge.levelId,
        until: challenge.lockedUntil,
        day: dayAt(now()),
        challengeId: challenge.id
      });
      const firstAnswers = challenge.answers.filter((item) => item.first);
      const correct = firstAnswers.filter((item) => item.right).length;
      challenge.result = {
        passed: false,
        points: 0,
        accuracy: correct / firstAnswers.length,
        correct,
        totalAnswered: firstAnswers.length,
        solved: challenge.position,
        reviveUsed: challenge.reviveCount > 0,
        awarded: 0,
        requested: 0,
        dailyCapReached: false,
        rulesVersion: challenge.rules.version
      };
    }
    await tx.set('challenges', challenge.id, challenge);
  }
  async function expire(tx, challenge) {
    const state = challenge.state === 'exited' ? challenge.resumeState : challenge.state;
    if (state === 'answering' && challenge.deadline && now() >= challenge.deadline) {
      if (challenge.state === 'exited') challenge.state = 'answering';
      await recordAnswer(tx, challenge, null, true);
    }
    return challenge;
  }
  function snapshot(challenge) {
    const current = challenge.questions[challenge.position];
    return {
      id: challenge.id,
      levelId: challenge.levelId,
      themeId: challenge.themeId,
      state: challenge.state,
      position: challenge.position,
      total: challenge.questions.length,
      reviveCount: challenge.reviveCount,
      reviveLimit: challenge.rules.reviveLimit,
      revivesRemaining: Math.max(0, challenge.rules.reviveLimit - challenge.reviveCount),
      levelName: challenge.rules.levelName,
      themeName: challenge.rules.themeName,
      levelOrder: challenge.rules.levelOrder,
      difficultyLabel: challenge.rules.difficultyLabel,
      nextLevelId: challenge.rules.nextLevelId,
      themeComplete: challenge.themeComplete || false,
      certificateRequirements: challenge.rules.certificateRequirements,
      selected: challenge.selected ?? null,
      question: current
        ? {
            id: current.id,
            title: current.title,
            options: current.options,
            media: current.media,
            difficulty: current.difficulty
          }
        : null,
      feedback: challenge.feedback || null,
      result: challenge.result
        ? {
            ...challenge.result,
            levelName: challenge.rules.levelName,
            themeName: challenge.rules.themeName,
            levelOrder: challenge.rules.levelOrder,
            difficultyLabel: challenge.rules.difficultyLabel,
            nextLevelId: challenge.rules.nextLevelId,
            themeComplete: challenge.themeComplete || false
          }
        : null,
      deadline: challenge.deadline,
      serverTime: now(),
      reviveUsed: challenge.reviveUsed,
      lockedUntil: challenge.lockedUntil || null,
      mode,
      rulesVersion: challenge.rules.version,
      countdownSeconds: challenge.rules.seconds,
      testShareAvailable: nonProduction
    };
  }
  async function playerProgress(tx, user) {
    const completions = (await tx.list('completions')).filter(
      (item) => item.userId === user.id && acceptedRecord(item)
    );
    const locks = (await tx.list('locks')).filter(
      (item) => item.userId === user.id && acceptedRecord(item) && item.until > now()
    );
    const cfg = await config(tx),
      all = await levels(tx),
      progress = {};
    for (const theme of cfg.themes.filter((item) => !item.deleted)) {
      const themeLevels = all
        .filter((item) => item.themeId === theme.id && !item.deleted)
        .sort((a, b) => a.order - b.order);
      progress[theme.id] = {
        nodes: themeLevels.map((level, index) => {
          if (locks.some((item) => item.levelId === level.id)) return 'today-locked';
          if (completions.some((item) => item.levelId === level.id)) return 'completed';
          if (!theme.enabled || !level.enabled) return 'locked';
          return index === 0 ||
            completions.some((item) => item.levelId === themeLevels[index - 1].id)
            ? 'available'
            : 'locked';
        }),
        levelIds: themeLevels.map((item) => item.id),
        completed: themeLevels.filter((level) =>
          completions.some((item) => item.levelId === level.id)
        ).length,
        total: themeLevels.length
      };
    }
    return progress;
  }
  async function catalog(tx) {
    const allQuestions = await tx.list('questions');
    const cfg = await config(tx);
    return {
      themes: cfg.themes.filter((item) => !item.deleted),
      certificateDefinitions: catalogConfig.manifest(cfg, await levels(tx)),
      levels: (await levels(tx))
        .filter(
          (level) =>
            !level.deleted &&
            cfg.themes.some((theme) => theme.id === level.themeId && !theme.deleted)
        )
        .map((level) => ({
          ...level,
          availableQuestions: allQuestions.filter(
            (question) => question.levelId === level.id && isEligible(question)
          ).length
        })),
      config: cfg,
      mode,
      readiness: await readiness(tx)
    };
  }
  async function ranking(tx, period) {
    requireValue(['day', 'total'].includes(period), 'INVALID_PERIOD', '榜单周期须为day或total');
    const day = dayAt(now());
    const completed = (await tx.list('completions')).filter(
      (item) => acceptedRecord(item) && (period === 'total' || item.day === day)
    );
    const awardedPoints = new Map();
    for (const record of await tx.list('ledger')) {
      if (!acceptedRecord(record) || (period === 'day' && (record.day || dayAt(record.at)) !== day))
        continue;
      awardedPoints.set(record.userId, (awardedPoints.get(record.userId) || 0) + record.points);
    }
    const grouped = new Map();
    for (const record of completed) {
      const row = grouped.get(record.userId) || {
        userId: record.userId,
        completed: 0,
        correct: 0,
        totalAnswered: 0,
        firstCompletion: record.at
      };
      row.completed++;
      row.correct += record.correct;
      row.totalAnswered += record.totalAnswered;
      row.firstCompletion = Math.min(row.firstCompletion, record.at);
      grouped.set(record.userId, row);
    }
    const entries = [];
    for (const row of grouped.values()) {
      const user = await tx.get('users', row.userId);
      entries.push({
        userId: row.userId,
        name: user ? user.name : '玩家',
        completed: row.completed,
        points: awardedPoints.get(row.userId) || 0,
        correct: row.correct,
        totalAnswered: row.totalAnswered,
        accuracy: row.correct / row.totalAnswered,
        firstCompletion: row.firstCompletion
      });
    }
    entries.sort(
      (a, b) =>
        b.completed - a.completed ||
        b.accuracy - a.accuracy ||
        a.firstCompletion - b.firstCompletion ||
        a.userId.localeCompare(b.userId)
    );
    return {
      entries: entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
      period,
      day,
      mode
    };
  }

  async function route(tx, req, url, body) {
    const pathname = url.pathname;
    const method = req.method;
    if (method === 'GET' && pathname === '/api/health')
      return {
        data: { ok: true, mode, storage: store.kind || 'injected', readiness: await readiness(tx) }
      };
    if (method === 'GET' && pathname === '/api/catalog') return { data: await catalog(tx) };
    const auth = await authenticate(tx, req);
    if (method === 'POST' && pathname === '/api/auth/dev') {
      requireValue(nonProduction, 'DEV_LOGIN_DISABLED', '正式环境不提供开发登录', 404);
      const name = text(body.name, '展示名', 40);
      const deviceId =
        body.deviceId === undefined
          ? crypto.randomBytes(24).toString('base64url')
          : text(body.deviceId, '体验设备凭据', 200);
      requireValue(deviceId.length >= 24, 'INVALID_DEVICE_ID', '体验设备凭据须至少24位');
      const id = `dev-${HASH(deviceId).slice(0, 32)}`;
      const user = (await tx.get('users', id)) || {
        id,
        name,
        role: 'player',
        developmentIdentity: true,
        createdAt: now()
      };
      user.name = name;
      const response = await login(tx, user);
      response.data.deviceId = deviceId;
      return response;
    }
    if (method === 'POST' && pathname === '/api/auth/admin') {
      const remote = req.socket.remoteAddress || 'unknown';
      const attempt = loginFailures.get(remote) || { count: 0, since: now() };
      if (now() - attempt.since >= 15 * 60000) {
        attempt.count = 0;
        attempt.since = now();
      }
      requireValue(attempt.count < 8, 'RATE_LIMITED', '登录尝试过多，请稍后重试', 429);
      const candidate =
        typeof body.password === 'string' && body.password.length <= 500 ? body.password : '';
      const matches = crypto.timingSafeEqual(
        crypto.scryptSync(candidate, adminSalt, 64),
        adminHash
      );
      if (body.username !== credentialUsername || !matches) {
        attempt.count++;
        loginFailures.set(remote, attempt);
        throw error(401, 'INVALID_CREDENTIALS', '账号或密码不正确');
      }
      loginFailures.delete(remote);
      return login(tx, { id: 'administrator', name: '管理员', role: 'admin', createdAt: now() });
    }
    if (method === 'POST' && pathname === '/api/auth/platform') {
      requireValue(options.platformVerifier, 'IDENTITY_NOT_CONFIGURED', '甲方身份验证未配置', 503);
      const ticket = text(body.ticket, '登录凭据', 4000);
      const verified = await options.platformVerifier(ticket);
      requireValue(
        verified && typeof verified.id === 'string' && verified.id && verified.name,
        'IDENTITY_INVALID',
        '身份验证失败',
        401
      );
      const id = `platform-${HASH(verified.id).slice(0, 32)}`;
      const old = await tx.get('users', id);
      return login(
        tx,
        {
          id,
          name: text(verified.name, '展示名', 40),
          role: 'player',
          developmentIdentity: false,
          createdAt: old ? old.createdAt : now()
        },
        true
      );
    }
    if (method === 'POST' && pathname === '/api/auth/logout') {
      if (auth && (!body.scope || auth.user.role === body.scope)) {
        auth.session.revoked = true;
        await tx.set('sessions', auth.session.id, auth.session);
      }
      const logoutCookies =
        body.scope === 'admin'
          ? [ADMIN_COOKIE]
          : body.scope === 'player'
            ? [COOKIE]
            : [COOKIE, ADMIN_COOKIE];
      for (const cookie of String(req.headers.cookie || '')
        .split(';')
        .map((item) => item.trim())) {
        if (!logoutCookies.some((name) => cookie.startsWith(`${name}=`))) continue;
        const session = await tx.get('sessions', HASH(cookie.slice(cookie.indexOf('=') + 1)));
        if (session) {
          session.revoked = true;
          await tx.set('sessions', session.id, session);
        }
      }
      return {
        data: { loggedOut: true },
        headers: {
          'Set-Cookie': logoutCookies.map(
            (name) =>
              `${name}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${nonProduction ? '' : '; Secure'}`
          )
        }
      };
    }
    if (pathname.startsWith('/api/admin/'))
      return adminRoute(tx, auth, method, pathname, url, body);
    if (method === 'GET' && pathname === '/api/rankings') {
      const user = requirePlayer(auth);
      const data = await ranking(tx, url.searchParams.get('period') || 'total');
      return {
        data: { ...data, own: data.entries.find((entry) => entry.userId === user.id) || null }
      };
    }
    const user = requirePlayer(auth);
    if (method === 'GET' && pathname === '/api/me') {
      const active = [];
      for (const item of (await tx.list('challenges')).filter(
        (item) =>
          item.userId === user.id &&
          acceptedRecord(item) &&
          !['completed', 'locked'].includes(item.state)
      )) {
        const current = await expire(tx, item);
        if (!['completed', 'locked'].includes(current.state)) active.push(snapshot(current));
      }
      const cfg = await config(tx),
        ledger = (await tx.list('ledger')).filter(
          (item) => item.userId === user.id && acceptedRecord(item)
        );
      const dailyPoints = ledger
        .filter((item) => (item.day || dayAt(item.at)) === dayAt(now()))
        .reduce((sum, item) => sum + item.points, 0);
      const dailyPointCap = cfg.points.dailyPointCap;
      const completions = (await tx.list('completions')).filter(
          (item) => item.userId === user.id && acceptedRecord(item)
        ),
        activeBook = catalogConfig.manifest(cfg, await levels(tx)),
        series = {
          total: activeBook.levels.length,
          completed: activeBook.levels.filter((l) => completions.some((c) => c.levelId === l.id))
            .length
        };
      return {
        data: {
          user: safeUser(user),
          progress: await playerProgress(tx, user),
          points: ledger.reduce((sum, item) => sum + item.points, 0),
          dailyPoints,
          dailyPointCap,
          dailyRemaining: dailyPointCap === null ? null : Math.max(0, dailyPointCap - dailyPoints),
          config: cfg,
          ledger,
          completions,
          series,
          activeChallenges: active,
          activeChallenge: active[0] || null,
          mode
        }
      };
    }
    if (method === 'POST' && pathname === '/api/challenges')
      return {
        data: await idempotent(tx, user, 'challenge.create', body, async () => {
          // Resume an existing immutable challenge even when its catalogue is now disabled.
          let active = (await tx.list('challenges')).find(
            (item) =>
              item.userId === user.id &&
              acceptedRecord(item) &&
              item.levelId === body.levelId &&
              !['completed', 'locked'].includes(item.state)
          );
          if (active) {
            await assertOpen(tx, active.rules);
            await expire(tx, active);
            if (active.state === 'exited') {
              active.state = active.resumeState;
              delete active.resumeState;
              await tx.set('challenges', active.id, active);
            }
            return snapshot(active);
          }
          await assertOpen(tx);
          const all = await levels(tx),
            level = all.find((item) => item.id === body.levelId);
          requireValue(
            level && level.enabled && !level.deleted,
            'LEVEL_UNAVAILABLE',
            '关卡未开放',
            409
          );
          const cfg = await config(tx),
            theme = cfg.themes.find((item) => item.id === level.themeId);
          requireValue(
            theme && theme.enabled && !theme.deleted,
            'THEME_UNAVAILABLE',
            '主题未开放',
            409
          );
          const progress = await playerProgress(tx, user),
            nodeIndex = progress[level.themeId].levelIds.indexOf(level.id),
            state = progress[level.themeId].nodes[nodeIndex];
          requireValue(state !== 'locked', 'LEVEL_LOCKED', '请先通过上一关', 409);
          requireValue(
            state !== 'today-locked',
            'LEVEL_TODAY_LOCKED',
            '本关今日无答题机会，明日再来',
            409
          );
          const pool = (await tx.list('questions')).filter(
            (question) => question.levelId === level.id && isEligible(question)
          );
          requireValue(
            pool.length >= level.questionCount,
            'INSUFFICIENT_QUESTIONS',
            `本关有效题目不足${level.questionCount}题，请补充题库`,
            409
          );
          for (let index = pool.length - 1; index > 0; index--) {
            const pick = crypto.randomInt(index + 1);
            [pool[index], pool[pick]] = [pool[pick], pool[index]];
          }
          const rules = catalogConfig.ruleSnapshot(cfg, all, level);
          const challenge = {
            id: uuid(),
            mode,
            userId: user.id,
            levelId: level.id,
            themeId: level.themeId,
            state: 'answering',
            position: 0,
            questions: pool.slice(0, level.questionCount),
            answers: [],
            selected: null,
            feedback: null,
            result: null,
            deadline: now() + cfg.timer.seconds * 1000,
            reviveCount: 0,
            reviveUsed: false,
            settled: false,
            createdAt: now(),
            rules
          };
          await tx.set('challenges', challenge.id, challenge);
          return snapshot(challenge);
        })
      };
    const challengeMatch = /^\/api\/challenges\/([^/]+)(?:\/(answer|advance|revive|exit))?$/.exec(
      pathname
    );
    if (challengeMatch) {
      let challenge = await ownedChallenge(tx, user, decodeURIComponent(challengeMatch[1]));
      const action = challengeMatch[2];
      if (method === 'GET' && !action) {
        await expire(tx, challenge);
        if (challenge.state === 'exited') {
          challenge.state = challenge.resumeState;
          delete challenge.resumeState;
          await tx.set('challenges', challenge.id, challenge);
        }
        return { data: snapshot(challenge) };
      }
      requireValue(method === 'POST' && action, 'NOT_FOUND', '接口不存在', 404);
      return {
        data: await idempotent(tx, user, `${challenge.id}.${action}`, body, async () => {
          challenge = await expire(tx, challenge);
          if (action === 'answer') {
            if (
              challenge.state !== 'answering' &&
              challenge.answers.length &&
              challenge.answers[challenge.answers.length - 1].timeout
            )
              return snapshot(challenge);
            requireValue(challenge.state === 'answering', 'INVALID_STATE', '当前状态不可作答', 409);
            requireValue(
              body.questionId === challenge.questions[challenge.position].id,
              'QUESTION_MISMATCH',
              '题目已发生变化，请恢复当前状态',
              409
            );
            requireValue(
              Number.isInteger(body.optionId) && body.optionId >= 0 && body.optionId <= 3,
              'INVALID_OPTION',
              '选项须为0至3'
            );
            await recordAnswer(tx, challenge, body.optionId);
          } else if (action === 'advance') {
            requireValue(
              challenge.state === 'feedback',
              'INVALID_STATE',
              '当前状态不可进入下一题',
              409
            );
            challenge.position++;
            challenge.state = 'answering';
            challenge.selected = null;
            challenge.feedback = null;
            challenge.deadline = now() + challenge.rules.seconds * 1000;
            await tx.set('challenges', challenge.id, challenge);
          } else if (action === 'revive') {
            requireValue(
              challenge.state === 'revive' && challenge.reviveCount < challenge.rules.reviveLimit,
              'REVIVE_UNAVAILABLE',
              '当前无法复活',
              409
            );
            let valid = false;
            if (
              nonProduction &&
              body.evidence &&
              ((body.evidence.type === 'development-test' && body.evidence.confirmed === true) ||
                (body.evidence.type === 'experience-test' &&
                  body.evidence.challengeId === challenge.id))
            )
              valid = true;
            else if (options.shareVerifier)
              valid = await options.shareVerifier(body.evidence, {
                challengeId: challenge.id,
                userId: user.id,
                levelId: challenge.levelId
              });
            requireValue(
              valid === true,
              'SHARE_NOT_VERIFIED',
              '分享尚未通过可信验证，未发放复活',
              409
            );
            challenge.reviveCount++;
            challenge.reviveUsed = challenge.reviveCount > 0;
            challenge.revivedAt = now();
            challenge.state = 'answering';
            challenge.selected = null;
            challenge.feedback = null;
            challenge.deadline = now() + challenge.rules.seconds * 1000;
            await tx.set('challenges', challenge.id, challenge);
          } else if (action === 'exit') {
            requireValue(
              !['completed', 'locked'].includes(challenge.state),
              'INVALID_STATE',
              '挑战已结束',
              409
            );
            if (challenge.state !== 'exited') {
              challenge.resumeState = challenge.state;
              challenge.state = 'exited';
              challenge.exitedAt = now();
              await tx.set('challenges', challenge.id, challenge);
            }
          }
          return snapshot(challenge);
        })
      };
    }
    if (method === 'GET' && pathname === '/api/certificates')
      return {
        data: {
          certificates: (await tx.list('certificates'))
            .filter((item) => item.userId === user.id && acceptedRecord(item))
            .map((item) => ({ ...item, downloadUrl: `/api/certificates/${item.id}.svg` })),
          mode
        }
      };
    const certificateMatch = /^\/api\/certificates\/([^/]+)\.svg$/.exec(pathname);
    if (method === 'GET' && certificateMatch) {
      const certificate = (await tx.list('certificates')).find(
        (item) => item.id === certificateMatch[1] && item.userId === user.id && acceptedRecord(item)
      );
      requireValue(certificate, 'CERTIFICATE_NOT_FOUND', '证书不存在', 404);
      return {
        raw: certificateSVG(certificate, user),
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Content-Disposition': `inline; filename="certificate-${certificate.id}.svg"`
        }
      };
    }
    throw error(404, 'NOT_FOUND', '接口不存在');
  }

  async function adminRoute(tx, auth, method, pathname, url, body) {
    const admin = requireAdmin(auth);
    if (method === 'GET' && pathname === '/api/admin/overview') {
      const [users, questions, challenges, completions, ledger, certificates, outbox] =
        await Promise.all(
          [
            'users',
            'questions',
            'challenges',
            'completions',
            'ledger',
            'certificates',
            'outbox'
          ].map((name) => tx.list(name))
        );
      const existing = questions.filter((item) => !item.deleted);
      return {
        data: {
          mode,
          modules: [
            { id: 'basic', name: '基础配置', status: 'implemented' },
            { id: 'levels', name: '关卡配置', status: 'implemented' },
            { id: 'questions', name: '题库管理', status: 'implemented' },
            {
              id: 'revive',
              name: '复活配置',
              status: options.shareVerifier ? 'configured' : 'experience-test-only'
            },
            { id: 'points', name: '积分配置', status: 'implemented' }
          ],
          stats: {
            users: users.filter((item) => item.role === 'player').length,
            questions: existing.length,
            enabledQuestions: existing.filter(isEligible).length,
            challenges: challenges.length,
            completions: completions.length,
            points: ledger.reduce((sum, item) => sum + item.points, 0),
            certificates: certificates.length,
            outboxPending: outbox.filter((item) => item.status !== 'delivered').length
          },
          dependencies: dependencies(),
          config: await config(tx)
        }
      };
    }
    async function saveCatalog(next, all, action, targetId, details = {}) {
      const old = await config(tx),
        previous = await levels(tx);
      if (catalogConfig.ruleSignature(next, all) !== catalogConfig.ruleSignature(old, previous))
        next.approval = { status: 'unapproved', source: 'admin-rule-change' };
      next.version = old.version + 1;
      await tx.set('meta', 'config', next);
      await tx.set('meta', 'levels', all);
      await tx.set('catalogReleases', String(next.version), {
        id: String(next.version),
        config: next,
        levels: all,
        at: now()
      });
      await audit(tx, admin, action, targetId, {
        ...details,
        version: next.version,
        approval: next.approval.status
      });
    }
    if (pathname === '/api/admin/config') {
      if (method === 'GET') return { data: await config(tx) };
      if (method === 'PUT') {
        const old = await config(tx);
        assertRevision(body.expectedVersion ?? body.version, old.version);
        const { expectedVersion, ...input } = body;
        const next = validateConfig(input, old);
        let all = await levels(tx);
        // Legacy step rewards remain a supported batch editor, while each level has its own points.
        if (
          body.points?.byLevel &&
          JSON.stringify(body.points.byLevel) !== JSON.stringify(old.points.byLevel)
        )
          all = all.map((level) => ({
            ...level,
            points: body.points.byLevel[level.order - 1] ?? level.points
          }));
        all = catalogConfig.validateLevels(all, next);
        await saveCatalog(next, all, 'config.update', 'config');
        return { data: next };
      }
    }
    if (pathname === '/api/admin/activity/export' && method === 'GET') {
      const questions = (await tx.list('questions')).filter((q) => !q.developmentOnly);
      const portable = questions.map(
        ({
          id,
          levelId,
          themeId,
          title,
          options,
          answer,
          explanation,
          difficulty,
          media,
          enabled,
          deleted,
          sourceIds,
          sourceTitle,
          sourceUrl,
          knowledgePoint,
          region
        }) => ({
          id,
          levelId,
          themeId,
          title,
          options,
          answer,
          explanation,
          difficulty,
          media,
          enabled: enabled !== false,
          deleted: !!deleted,
          sourceIds: sourceIds || [],
          sourceTitle: sourceTitle || '',
          sourceUrl: sourceUrl || '',
          knowledgePoint: knowledgePoint || '',
          region: region || ''
        })
      );
      return {
        data: {
          schemaVersion: 'activity-3',
          contentMode: 'snapshot',
          exportedAt: now(),
          config: await config(tx),
          levels: await levels(tx),
          questions: portable,
          assets: [
            ...new Set(
              [
                ...(await config(tx)).themes.flatMap((t) => [t.cover, t.mapImage]),
                (await config(tx)).cover,
                (await config(tx)).share.image,
                (await config(tx)).revive.shareImage,
                ...portable.map((q) => q.media?.url)
              ].filter(Boolean)
            )
          ].sort()
        }
      };
    }
    if (pathname === '/api/admin/activity/import' && method === 'POST') {
      requireValue(
        body.config && Array.isArray(body.levels),
        'INVALID_IMPORT',
        '请提供config和levels'
      );
      requireValue(
        body.levels.length <= 1000 &&
          body.levels.every((level) => level && typeof level === 'object' && !Array.isArray(level)),
        'INVALID_IMPORT',
        '关卡须为对象数组，最多1000关'
      );
      requireValue(
        !body.schemaVersion || ['activity-2', 'activity-3'].includes(body.schemaVersion),
        'INVALID_IMPORT',
        '不支持的活动数据版本'
      );
      const snapshot = body.schemaVersion === 'activity-3';
      requireValue(
        !snapshot || (body.contentMode === 'snapshot' && Array.isArray(body.questions)),
        'INVALID_IMPORT',
        '完整活动快照须包含contentMode和questions'
      );
      const old = await config(tx);
      assertRevision(body.expectedVersion, old.version);
      if (snapshot)
        assertCollectionRevision(
          body.expectedQuestionVersions,
          (await tx.list('questions')).filter((q) => !q.deleted)
        );
      const next = validateConfig(body.config, old),
        previous = await levels(tx);
      const ids = new Set(body.levels.map((level) => level.id));
      let merged = [
        ...body.levels,
        ...previous
          .filter((level) => !ids.has(level.id))
          .map((level) => ({ ...level, enabled: false, deleted: true }))
      ];
      for (const level of body.levels) {
        const before = previous.find((item) => item.id === level.id);
        requireValue(
          !before || before.themeId === level.themeId,
          'STABLE_ID',
          '已有关卡的主题归属不可改变'
        );
      }
      merged = catalogConfig.validateLevels(merged, next);
      const normalized = [];
      if (body.questions !== undefined) {
        requireValue(
          Array.isArray(body.questions) && body.questions.length <= 2000,
          'INVALID_IMPORT',
          '题库一次最多导入2000题'
        );
        for (const input of body.questions) {
          requireValue(
            input && typeof input.id === 'string' && input.id.trim(),
            'INVALID_IMPORT',
            '导入题目必须有稳定编号'
          );
          const before = await tx.get('questions', input.id);
          assertRevision(input.expectedVersion, before?.version);
          const question = normalizeQuestion(input, merged, before);
          normalized.push(question);
        }
        requireValue(
          new Set(normalized.map((q) => q.id)).size === normalized.length,
          'DUPLICATE_ID',
          '导入题号重复'
        );
      }
      const missing = snapshot
        ? (await tx.list('questions')).filter(
            (q) => !q.developmentOnly && !q.deleted && !normalized.some((n) => n.id === q.id)
          )
        : [];
      await saveCatalog(next, merged, 'activity.import', 'activity', {
        questions: normalized.length
      });
      for (const question of normalized) await tx.set('questions', question.id, question);
      for (const question of missing)
        await tx.set('questions', question.id, {
          ...question,
          enabled: false,
          deleted: true,
          version: question.version + 1
        });
      return {
        data: {
          config: next,
          levels: merged,
          importedQuestions: normalized.length,
          enabled: normalized.filter((q) => q.enabled && !q.deleted).length,
          disabledMissing: missing.length
        }
      };
    }
    if (pathname === '/api/admin/levels' || pathname.startsWith('/api/admin/levels/')) {
      let all = await levels(tx);
      const levelId = pathname.split('/')[4];
      const cfg = await config(tx);
      if (method !== 'GET') assertRevision(body.expectedVersion, cfg.version);
      if (method === 'GET') {
        if (levelId) {
          const level = all.find((item) => item.id === levelId);
          requireValue(level, 'LEVEL_NOT_FOUND', '关卡不存在', 404);
          return { data: level };
        }
        return { data: { levels: all } };
      }
      if (method === 'POST' && !levelId) {
        const candidate = { ...body, id: body.id || `level-${uuid()}` };
        requireValue(
          !all.some((item) => item.id === candidate.id),
          'DUPLICATE_ID',
          '关卡ID已存在',
          409
        );
        const next = catalogConfig.validateLevels([...all, candidate], cfg);
        await saveCatalog(cfg, next, 'level.create', candidate.id);
        return { status: 201, data: next.find((item) => item.id === candidate.id) };
      }
      if (method === 'PUT') {
        const updates = levelId ? [{ ...body, id: levelId }] : body.levels;
        requireValue(
          Array.isArray(updates) && updates.length > 0 && updates.length <= 1000,
          'INVALID_LEVELS',
          '请提供1至1000条关卡更新'
        );
        requireValue(
          new Set(updates.map((item) => item.id)).size === updates.length,
          'DUPLICATE_ID',
          '更新关卡ID重复'
        );
        for (const update of updates) {
          const index = all.findIndex((item) => item.id === update.id);
          requireValue(index >= 0, 'LEVEL_NOT_FOUND', '关卡不存在', 404);
          requireValue(
            update.themeId === undefined || update.themeId === all[index].themeId,
            'STABLE_ID',
            '已有关卡主题归属不可改变'
          );
          all[index] = {
            ...all[index],
            ...update,
            id: all[index].id,
            deleted: update.enabled === true ? false : (update.deleted ?? all[index].deleted)
          };
        }
        all = catalogConfig.validateLevels(all, cfg);
        await saveCatalog(cfg, all, 'levels.update', levelId || 'all', {
          ids: updates.map((item) => item.id)
        });
        return { data: levelId ? all.find((item) => item.id === levelId) : { levels: all } };
      }
      if (method === 'DELETE' && levelId) {
        const level = all.find((item) => item.id === levelId);
        requireValue(level, 'LEVEL_NOT_FOUND', '关卡不存在', 404);
        requireValue(
          !all.some(
            (item) =>
              item.themeId === level.themeId &&
              item.order > level.order &&
              item.enabled &&
              !item.deleted
          ),
          'LEVEL_DEPENDENCY',
          '停用前关时须同步停用后续关卡'
        );
        level.enabled = false;
        level.deleted = true;
        all = catalogConfig.validateLevels(all, cfg);
        await saveCatalog(cfg, all, 'level.disable', levelId);
        return { data: { id: levelId, deleted: true, enabled: false } };
      }
    }
    if (pathname === '/api/admin/questions/export' && method === 'GET')
      return {
        data: {
          schemaVersion: 'server-1',
          exportedAt: now(),
          questions: (await tx.list('questions')).filter((item) => !item.deleted)
        }
      };
    if (pathname === '/api/admin/questions/import' && method === 'POST') {
      requireValue(
        Array.isArray(body.questions) && body.questions.length > 0 && body.questions.length <= 2000,
        'INVALID_IMPORT',
        '一次导入1至2000题'
      );
      const allLevels = await levels(tx);
      const normalized = [];
      for (const input of body.questions) {
        const old = input.id ? await tx.get('questions', input.id) : null;
        assertRevision(input.expectedVersion, old?.version);
        normalized.push(normalizeQuestion(input, allLevels, old));
      }
      requireValue(
        new Set(normalized.map((item) => item.id)).size === normalized.length,
        'DUPLICATE_ID',
        '导入题号重复'
      );
      for (const item of normalized) {
        await tx.set('questions', item.id, item);
      }
      await audit(tx, admin, 'questions.import', 'batch', { count: normalized.length });
      return {
        data: { imported: normalized.length, enabled: normalized.filter((q) => q.enabled).length }
      };
    }
    if (pathname === '/api/admin/questions') {
      if (method === 'GET') {
        const themeId = url.searchParams.get('themeId');
        const levelId = url.searchParams.get('levelId');
        const keyword = url.searchParams.get('q') || url.searchParams.get('keyword');
        const questions = (await tx.list('questions')).filter(
          (item) =>
            !item.deleted &&
            (!themeId || item.themeId === themeId) &&
            (!levelId || item.levelId === levelId) &&
            (!keyword || item.title.includes(keyword) || item.id.includes(keyword))
        );
        return { data: { questions, total: questions.length } };
      }
      if (method === 'POST') {
        const question = normalizeQuestion(body, await levels(tx));
        requireValue(!(await tx.get('questions', question.id)), 'DUPLICATE_ID', '题号已存在', 409);
        await tx.set('questions', question.id, question);
        await audit(tx, admin, 'question.create', question.id);
        return { status: 201, data: question };
      }
    }
    const questionMatch = /^\/api\/admin\/questions\/([^/]+)$/.exec(pathname);
    if (questionMatch) {
      const id = decodeURIComponent(questionMatch[1]);
      const current = await tx.get('questions', id);
      requireValue(current && !current.deleted, 'QUESTION_NOT_FOUND', '题目不存在', 404);
      if (method === 'GET') return { data: current };
      if (method === 'PUT') {
        assertRevision(body.expectedVersion ?? body.version, current.version);
        const question = normalizeQuestion({ ...current, ...body, id }, await levels(tx), current);
        await tx.set('questions', id, question);
        await audit(tx, admin, 'question.update', id, { version: question.version });
        return { data: question };
      }
      if (method === 'DELETE') {
        assertRevision(body.expectedVersion, current.version);
        current.deleted = true;
        current.enabled = false;
        await tx.set('questions', id, current);
        await audit(tx, admin, 'question.delete', id);
        return { data: { deleted: true, id } };
      }
    }
    if (method === 'GET' && pathname === '/api/admin/audit')
      return { data: { entries: (await tx.list('audit')).sort((a, b) => b.at - a.at) } };
    if (method === 'GET' && pathname === '/api/admin/outbox')
      return {
        data: {
          entries: (await tx.list('outbox')).sort((a, b) => b.at - a.at),
          configured: Boolean(options.syncReceiver)
        }
      };
    throw error(404, 'NOT_FOUND', '接口不存在');
  }

  async function retryOutbox(req) {
    const admin = await store.transaction(async (tx) => {
      const user = requireAdmin(await authenticate(tx, req));
      requireValue(
        options.syncReceiver,
        'SYNC_NOT_CONFIGURED',
        '甲方同步接收端未配置，事件保留待重试',
        503
      );
      return user;
    });
    const result = await outboxDelivery.retry();
    await store.transaction((tx) => audit(tx, admin, 'outbox.retry', 'all', result));
    return { data: result };
  }

  async function readBody(req) {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) throw error(413, 'BODY_TOO_LARGE', '请求数据超过限制');
      chunks.push(chunk);
    }
    if (!size) return {};
    try {
      const parsed = JSON.parse(Buffer.concat(chunks).toString());
      requireValue(
        parsed && typeof parsed === 'object' && !Array.isArray(parsed),
        'INVALID_JSON',
        '请求须为JSON对象'
      );
      return parsed;
    } catch (cause) {
      if (cause.code) throw cause;
      throw error(400, 'INVALID_JSON', 'JSON格式不正确');
    }
  }
  const handler = async (req, res) => {
    const requestId = uuid();
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin) {
        const allowedOrigin =
          options.allowedOrigin || `${nonProduction ? 'http' : 'https'}://${req.headers.host}`;
        requireValue(
          req.headers.origin === allowedOrigin,
          'ORIGIN_FORBIDDEN',
          '请求来源不受信任',
          403
        );
      }
      const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
        ? await readBody(req)
        : {};
      const response =
        req.method === 'POST' && url.pathname === '/api/admin/outbox/retry'
          ? await retryOutbox(req)
          : await store.transaction((tx) => route(tx, req, url, body));
      res.statusCode = response.status || 200;
      for (const [key, value] of Object.entries(response.headers || {})) res.setHeader(key, value);
      if (response.raw !== undefined) res.end(response.raw);
      else {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ data: response.data }));
      }
    } catch (cause) {
      res.statusCode = cause.status || 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error: {
            code: cause.code || 'INTERNAL_ERROR',
            message: cause.status ? cause.message : '服务暂时不可用，请稍后重试'
          },
          requestId
        })
      );
      if (!cause.status && options.onError) options.onError({ requestId, code: 'INTERNAL_ERROR' });
    }
  };
  let server = null;
  return {
    handler,
    store,
    mode,
    async listen(port = 0, host = '127.0.0.1') {
      server = http.createServer(handler);
      server.requestTimeout = 15000;
      server.headersTimeout = 10000;
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, resolve);
      });
      return server;
    },
    async close() {
      if (server) await new Promise((resolve) => server.close(resolve));
      await store.close();
    }
  };
}
module.exports = { createApplication, dayAt, defaultConfig, normalizeQuestion };
