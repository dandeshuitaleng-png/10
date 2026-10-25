import { columns, toRows, fromCSV, encodeCSV, download } from '../utils/csv.js';

// Import/export orchestration is separate from navigation and editor state.
export function createActivityTransfer({
  page,
  filtered,
  busy,
  run,
  api,
  ElMessage,
  ElMessageBox
}) {
  function exportCSV(template = false) {
    try {
      download(
        `${page.value === 'questions' ? '题库' : '关卡配置'}${template ? '模板' : ''}.csv`,
        encodeCSV(template ? [columns[page.value]] : toRows(page.value, filtered.value), {
          spreadsheetSafe: true
        })
      );
      ElMessage.success(template ? '模板已下载' : '已导出当前筛选结果');
    } catch (error) {
      ElMessage.error(error.message);
    }
  }
  async function importCSV(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      const items = fromCSV(page.value, await file.text());
      if (!items.length) throw Error('文件中没有数据');
      await ElMessageBox.confirm(
        `导入${items.length}条数据；相同编号将更新，其余新增。整批校验通过后保存。`,
        '确认导入',
        { confirmButtonText: '导入', cancelButtonText: '取消' }
      );
      if (await run(() => api.import(page.value, items)))
        ElMessage.success(`已导入${items.length}条数据`);
    } catch (e) {
      if (e instanceof Error) ElMessage.error(e.message);
    }
  }
  async function exportActivity() {
    if (busy.value) return;
    busy.value = true;
    try {
      const snapshot = await api.exportActivity();
      download('趣味闯关完整活动.json', JSON.stringify(snapshot, null, 2));
      ElMessage.success('已导出完整活动数据与素材地址清单');
    } catch (e) {
      ElMessage.error(e.message || '导出失败');
    } finally {
      busy.value = false;
    }
  }
  async function importActivity(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file || busy.value) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw Error('活动文件不能超过2MiB');
      const snapshot = JSON.parse(await file.text());
      if (
        snapshot.schemaVersion !== 'activity-3' ||
        snapshot.contentMode !== 'snapshot' ||
        !snapshot.config ||
        !Array.isArray(snapshot.config.themes) ||
        !Array.isArray(snapshot.levels) ||
        !Array.isArray(snapshot.questions)
      )
        throw Error('请选择完整活动JSON（activity-3）');
      await ElMessageBox.confirm(
        `将导入 ${snapshot.config.themes.length} 个主题、${snapshot.levels.length} 个关卡、${snapshot.questions.length} 道题及证书、分享、计时和积分配置。未包含的现有题目和关卡会停用；玩家进度、积分、证书及进行中的答题保留。请先导出现有数据留存。`,
        '确认导入完整活动',
        { confirmButtonText: '校验并导入', cancelButtonText: '取消', type: 'warning' }
      );
      if (await run(() => api.importActivity(snapshot)))
        ElMessage.success('完整活动已导入，玩家历史记录保留');
    } catch (e) {
      if (e instanceof Error) ElMessage.error(e.message || '导入失败');
    }
  }
  return { exportCSV, importCSV, exportActivity, importActivity };
}
