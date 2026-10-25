const oldQuestions = [
  'id',
  'themeId',
  'levelId',
  'title',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'answer',
  'explanation',
  'imageUrl',
  'videoUrl'
];
export const columns = {
  questions: [
    ...oldQuestions,
    'difficulty',
    'enabled',
    'mediaAlt',
    'mediaCaption',
    'mediaRequired',
    'sourceTitle',
    'sourceUrl',
    'sourceIds',
    'knowledgePoint',
    'region'
  ],
  levels: [
    'id',
    'themeId',
    'name',
    'sort',
    'questionCount',
    'timeLimit',
    'points',
    'difficultyLabel',
    'enabled'
  ]
};
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [],
    cell = '',
    state = 'start',
    line = 1,
    column = 0;
  const invalid = (message) => {
    throw Error(`CSV第${line}行第${column}列：${message}`);
  };
  const endCell = () => {
    row.push(cell);
    cell = '';
    state = 'start';
  };
  const endRow = () => {
    endCell();
    if (row.some((value) => value !== '')) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    column++;
    if (state === 'quoted') {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
          column++;
        } else state = 'closed';
      } else {
        cell += c;
        if (c === '\n') {
          line++;
          column = 0;
        }
      }
    } else if (c === ',') endCell();
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endRow();
      line++;
      column = 0;
    } else if (state === 'closed') invalid('闭合引号后只能出现分隔符或换行，字段格式错误');
    else if (c === '"') {
      if (state !== 'start') invalid('引号必须位于字段开头');
      state = 'quoted';
    } else {
      cell += c;
      state = 'unquoted';
    }
  }
  if (state === 'quoted') invalid('CSV有未闭合的引号');
  endRow();
  return rows;
}
export function encodeCSV(rows, { spreadsheetSafe = false } = {}) {
  if (
    spreadsheetSafe &&
    rows.some((row) =>
      row.some((value) => /^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(String(value ?? '')))
    )
  )
    throw Error('内容以表格公式字符开头，请使用完整活动JSON导出以保留原文。');
  return (
    '\uFEFF' +
    rows
      .map((r) => r.map((v) => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(','))
      .join('\r\n')
  );
}
export function toRows(kind, items) {
  return [
    columns[kind],
    ...items.map((q) =>
      columns[kind].map((k) =>
        k.startsWith('option')
          ? q.options['ABCD'.indexOf(k.slice(-1))]
          : k === 'answer'
            ? 'ABCD'[q.answer]
            : k === 'sourceIds'
              ? JSON.stringify(q.sourceIds || [])
              : k === 'enabled'
                ? q.enabled !== false
                : k === 'mediaRequired'
                  ? q.mediaRequired === true
                  : q[k]
      )
    )
  ];
}
export function fromCSV(kind, text) {
  const [head, ...rows] = parseCSV(text),
    signature = head?.join(','),
    old = kind === 'questions' ? oldQuestions : columns.levels.slice(0, 7);
  const recognized = [
    columns[kind].join(','),
    old.join(','),
    ...(kind === 'questions'
      ? [
          [...oldQuestions, 'reviewStatus'].join(','),
          [...columns.questions, 'reviewStatus'].join(',')
        ]
      : [])
  ];
  if (!head || !recognized.includes(signature)) throw Error('表头不匹配，请先导出CSV或下载模板');
  return rows.map((r, i) => {
    if (r.length !== head.length) throw Error(`第${i + 2}行列数不正确`);
    const q = Object.fromEntries(head.map((k, j) => [k, r[j]]));
    delete q.reviewStatus;
    for (const key of ['enabled', 'mediaRequired'])
      if (key in q) {
        if (!['true', 'false'].includes(q[key].trim().toLowerCase()))
          throw Error(`第${i + 2}行${key}须为true或false`);
        q[key] = q[key].trim().toLowerCase() === 'true';
      }
    if (kind === 'questions') {
      q.options = ['A', 'B', 'C', 'D'].map((k) => q['option' + k]);
      q.answer = 'ABCD'.indexOf(q.answer);
      for (const k of ['optionA', 'optionB', 'optionC', 'optionD']) delete q[k];
      if ('sourceIds' in q) {
        try {
          q.sourceIds = JSON.parse(q.sourceIds || '[]');
        } catch {
          throw Error(`第${i + 2}行sourceIds须为JSON字符串数组`);
        }
        if (!Array.isArray(q.sourceIds) || q.sourceIds.some((v) => typeof v !== 'string'))
          throw Error(`第${i + 2}行sourceIds须为JSON字符串数组`);
      }
      if (!q.difficulty) delete q.difficulty;
    } else for (const k of ['sort', 'questionCount', 'timeLimit', 'points']) q[k] = Number(q[k]);
    return q;
  });
}
export function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
