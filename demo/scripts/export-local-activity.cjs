'use strict';
// Read-only export; validate the whole bundle before creating its directory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { loopbackBase } = require('../../rural-culture-miniprogram/tools/lib/project-tools.cjs');

async function exportFiles(snapshot, workspaceRoot = path.resolve(__dirname, '../..')) {
  if (
    snapshot?.schemaVersion !== 'activity-3' ||
    snapshot.contentMode !== 'snapshot' ||
    !snapshot.config ||
    !Array.isArray(snapshot.questions) ||
    !Array.isArray(snapshot.levels)
  )
    throw new Error('完整活动数据格式不正确');
  const { toRows, encodeCSV } = await import(
    pathToFileURL(path.join(workspaceRoot, 'quiz-admin/src/utils/csv.js'))
  );
  const questions = snapshot.questions
    .filter((q) => !q.deleted)
    .map((q) => ({
      ...q,
      imageUrl: q.media?.type === 'image' ? q.media.url : '',
      videoUrl: q.media?.type === 'video' ? q.media.url : '',
      mediaAlt: q.media?.alt || '',
      mediaCaption: q.media?.caption || '',
      mediaRequired: !!q.media?.required
    }));
  const levels = snapshot.levels
    .filter((l) => !l.deleted)
    .map((l) => ({ ...l, sort: l.order, timeLimit: snapshot.config.timer.seconds }));
  const mediaRoot = path.join(workspaceRoot, 'demo');
  const media = questions
    .filter((q) => q.media)
    .map((q) => {
      const url = q.media.url,
        local = url.startsWith('/');
      const file = local ? path.resolve(mediaRoot, '.' + url) : null;
      const actual = file && fs.existsSync(file) ? fs.realpathSync(file) : null;
      const exists =
        !!actual && actual.startsWith(mediaRoot + path.sep) && fs.statSync(actual).isFile();
      return {
        questionId: q.id,
        themeId: q.themeId,
        levelId: q.levelId,
        ...q.media,
        local,
        exists,
        sourcePath: exists ? path.relative(workspaceRoot, actual) : '',
        bytes: exists ? fs.statSync(actual).size : null,
        sha256: exists
          ? crypto.createHash('sha256').update(fs.readFileSync(actual)).digest('hex')
          : null
      };
    });
  if (media.some((m) => m.local && !m.exists)) throw new Error('存在缺失或越界的媒体文件');
  const files = {
    '完整活动.json': JSON.stringify(snapshot, null, 2) + '\n',
    '媒体关联表.json':
      JSON.stringify(
        { questions: questions.length, media, notes: '只验证受控本机文件，远程媒体未下载。' },
        null,
        2
      ) + '\n'
  };
  try {
    files['题库完整字段.csv'] = encodeCSV(toRows('questions', questions), {
      spreadsheetSafe: true
    });
    files['关卡配置.csv'] = encodeCSV(toRows('levels', levels), { spreadsheetSafe: true });
  } catch (error) {
    // Preserve the JSON even when a source cell would be interpreted as a formula.
    if (!error.message.includes('完整活动JSON')) throw error;
    delete files['题库完整字段.csv'];
    delete files['关卡配置.csv'];
    files['CSV导出说明.txt'] = 'CSV含表格公式前缀，已停止生成。请使用完整活动.json保留原文。\n';
  }
  return files;
}

async function main() {
  const target = process.argv[2];
  if (!target) throw new Error('用法：node demo/scripts/export-local-activity.cjs 新输出目录');
  const destination = path.resolve(target);
  if (fs.existsSync(destination)) throw new Error('输出目录已存在，请使用新目录');
  const base = loopbackBase(process.env.QUIZ_EXPORT_BASE, 'http://127.0.0.1:63112');
  const response = await fetch(base + '/api/local/admin/activity/export', {
    headers: { 'X-Quiz-Management': '1' },
    signal: AbortSignal.timeout(10000)
  });
  const json = await response.json();
  if (!response.ok) throw new Error('本机服务尚未就绪');
  const files = await exportFiles(json.data);
  fs.mkdirSync(destination);
  for (const [name, value] of Object.entries(files))
    fs.writeFileSync(path.join(destination, name), value);
  console.log(
    JSON.stringify({
      passed: true,
      questions: json.data.questions.length,
      levels: json.data.levels.length,
      files: Object.keys(files)
    })
  );
}

module.exports = { exportFiles };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
