<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  House,
  Collection,
  Flag,
  Document,
  Setting,
  Upload,
  Download,
  Plus,
  Search,
  Refresh,
  Fold,
  Expand,
  Close,
  User
} from '@element-plus/icons-vue';
import { api } from './api';
import { createActivityTransfer } from './features/activity-transfer.js';
const menus = [
  ['home', '首页', House],
  ['themes', '主题管理', Collection],
  ['levels', '关卡管理', Flag],
  ['questions', '题库管理', Document],
  ['rules', '游戏规则', Setting]
];
const page = ref('home'),
  data = ref({ themes: [], levels: [], questions: [], rules: {} }),
  search = ref(''),
  themeFilter = ref(''),
  levelFilter = ref(''),
  statusFilter = ref(''),
  dialog = ref(false),
  editing = ref(false),
  form = ref({}),
  busy = ref(false),
  fileInput = ref(),
  activityInput = ref(),
  pageNumber = ref(1),
  ruleDraft = ref({});
const menuRef = ref(),
  collapsed = ref(false),
  opened = ref(['home']),
  pageSize = ref(10),
  applied = ref({ search: '', theme: '', level: '', status: '' }),
  detail = ref(null);
const pageStates = {};
const title = computed(() => menus.find((m) => m[0] === page.value)?.[1]);
const themeName = (id) => data.value.themes.find((t) => t.id === id)?.name || id;
const levelName = (id) => data.value.levels.find((l) => l.id === id)?.name || id;
const availableLevels = computed(() =>
  data.value.levels.filter((l) => l.themeId === form.value.themeId)
);
const filtered = computed(() => {
  const f = applied.value;
  let rows = Array.isArray(data.value[page.value]) ? data.value[page.value] : [];
  return rows
    .filter(
      (q) =>
        (!f.theme || q.themeId === f.theme) &&
        (!f.level || q.levelId === f.level) &&
        (!f.status || (q.enabled ? '启用' : '停用') === f.status) &&
        (!f.search ||
          [q.id, q.title, q.name, q.description]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(f.search.toLowerCase()))
    )
    .sort((a, b) =>
      page.value === 'levels'
        ? data.value.themes.findIndex((t) => t.id === a.themeId) -
            data.value.themes.findIndex((t) => t.id === b.themeId) || a.sort - b.sort
        : 0
    );
});
const visible = computed(() =>
  filtered.value.slice((pageNumber.value - 1) * pageSize.value, pageNumber.value * pageSize.value)
);
watch(
  () => filtered.value.length,
  () => {
    pageNumber.value = Math.min(
      pageNumber.value,
      Math.max(1, Math.ceil(filtered.value.length / pageSize.value))
    );
  }
);
function query() {
  applied.value = {
    search: search.value.trim(),
    theme: themeFilter.value,
    level: levelFilter.value,
    status: statusFilter.value
  };
  pageNumber.value = 1;
}
function reset() {
  search.value = '';
  themeFilter.value = '';
  levelFilter.value = '';
  statusFilter.value = '';
  query();
}
async function run(fn) {
  busy.value = true;
  try {
    data.value = await fn();
    ruleDraft.value = JSON.parse(JSON.stringify(data.value.rules));
    return true;
  } catch (e) {
    ElMessage.error(e.message || '操作失败，请重试');
    return false;
  } finally {
    busy.value = false;
  }
}
onMounted(() => run(() => api.load()));
async function navigate(id) {
  if (id === page.value) return;
  if (
    page.value === 'rules' &&
    JSON.stringify(ruleDraft.value) !== JSON.stringify(data.value.rules)
  ) {
    try {
      await ElMessageBox.confirm('游戏规则尚未保存，离开后将放弃本次修改。', '未保存的修改', {
        confirmButtonText: '放弃修改并离开',
        cancelButtonText: '继续编辑',
        type: 'warning'
      });
    } catch {
      return false;
    }
  }
  pageStates[page.value] = {
    search: search.value,
    theme: themeFilter.value,
    level: levelFilter.value,
    status: statusFilter.value,
    applied: { ...applied.value },
    number: pageNumber.value,
    size: pageSize.value
  };
  page.value = id;
  if (!opened.value.includes(id)) opened.value.push(id);
  const state = pageStates[id];
  search.value = state?.search || '';
  themeFilter.value = state?.theme || '';
  levelFilter.value = state?.level || '';
  statusFilter.value = state?.status || '';
  applied.value = state?.applied || { search: '', theme: '', level: '', status: '' };
  pageNumber.value = state?.number || 1;
  pageSize.value = state?.size || 10;
  ruleDraft.value = JSON.parse(JSON.stringify(data.value.rules));
  return true;
}
async function selectMenu(id) {
  await navigate(id);
  menuRef.value?.updateActiveIndex(page.value);
}
async function closeTab(id) {
  if (id === 'home') return;
  if (id === page.value) {
    const index = opened.value.indexOf(id);
    if ((await navigate(opened.value[index - 1] || 'home')) === false) return;
  }
  opened.value = opened.value.filter((v) => v !== id);
  delete pageStates[id];
}
async function manageTheme(id) {
  await navigate('questions');
  reset();
  themeFilter.value = id;
  query();
}
function open(row) {
  editing.value = !!row;
  form.value = row
    ? JSON.parse(JSON.stringify(row))
    : page.value === 'themes'
      ? { id: '', name: '', description: '', color: '#398f7d', enabled: true }
      : page.value === 'levels'
        ? {
            id: '',
            themeId: data.value.themes[0]?.id,
            name: '',
            sort: 1,
            questionCount: 10,
            timeLimit: data.value.rules.timerSeconds || 30,
            points: 10,
            enabled: true
          }
        : {
            id: '',
            themeId: data.value.themes[0]?.id,
            levelId: data.value.levels.find((l) => l.themeId === data.value.themes[0]?.id)?.id,
            title: '',
            options: ['', '', '', ''],
            answer: 0,
            explanation: '',
            difficulty: '基础',
            imageUrl: '',
            videoUrl: '',
            mediaAlt: '',
            mediaCaption: '',
            mediaRequired: false,
            sourceTitle: '',
            sourceUrl: '',
            sourceIds: [],
            knowledgePoint: '',
            region: '',
            enabled: true
          };
  dialog.value = true;
}
async function save() {
  if (!editing.value && data.value[page.value].some((q) => q.id === form.value.id)) {
    ElMessage.error('编号已存在，请换一个编号');
    return;
  }
  if (page.value === 'levels' && editing.value) {
    const old = data.value.levels.find((l) => l.id === form.value.id);
    if (
      old.themeId !== form.value.themeId &&
      data.value.questions.some((q) => q.levelId === old.id)
    ) {
      ElMessage.error('有题目的关卡不能更换主题');
      return;
    }
  }
  if (await run(() => api.save(page.value, form.value))) {
    dialog.value = false;
    ElMessage.success('保存成功');
  }
}
async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定删除“${row.name || row.title}”？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    if (await run(() => api.remove(page.value, row.id))) ElMessage.success('已删除');
  } catch {}
}
const { exportCSV, importCSV, exportActivity, importActivity } = createActivityTransfer({
  page,
  filtered,
  busy,
  run,
  api,
  ElMessage,
  ElMessageBox
});
const poolCount = (id) =>
  data.value.questions.filter((q) => q.levelId === id && q.enabled !== false).length;
</script>
<template>
  <div class="shell" :class="{ 'is-collapsed': collapsed }">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">趣</span><strong>趣味闯关管理平台</strong></div>
      <el-button
        class="collapse-button"
        text
        :icon="collapsed ? Expand : Fold"
        :aria-label="collapsed ? '展开菜单' : '收起菜单'"
        @click="collapsed = !collapsed"
      />
      <div class="header-account">
        <span class="avatar"
          ><el-icon><User /></el-icon></span
        ><span>内容管理</span>
      </div>
    </header>
    <aside>
      <el-menu
        ref="menuRef"
        :default-active="page"
        @select="selectMenu"
        :collapse="collapsed"
        :collapse-transition="false"
        ><el-menu-item v-for="m in menus" :key="m[0]" :index="m[0]"
          ><el-icon><component :is="m[2]" /></el-icon
          ><template #title>{{ m[1] }}</template></el-menu-item
        ></el-menu
      >
    </aside>
    <div class="workspace">
      <nav class="page-tabs" aria-label="已打开的页面">
        <div v-for="id in opened" :key="id" class="page-tab" :class="{ active: page === id }">
          <button @click="navigate(id)" :aria-current="page === id ? 'page' : undefined">
            {{ menus.find((m) => m[0] === id)[1] }}</button
          ><button
            v-if="id !== 'home'"
            class="close-tab"
            :aria-label="'关闭' + menus.find((m) => m[0] === id)[1]"
            @click="closeTab(id)"
          >
            <el-icon><Close /></el-icon>
          </button>
        </div>
      </nav>
      <main v-loading="busy">
        <section v-if="page === 'rules' && api.exportActivity" class="panel activity-transfer">
          <div>
            <h2>完整活动数据</h2>
            <p class="muted">
              导出全部题库、难度、素材地址、主题关卡、证书与分享配置。素材文件按地址清单另行交付。
            </p>
          </div>
          <div class="list-actions">
            <el-button
              data-testid="activity-export"
              :icon="Download"
              :disabled="busy"
              @click="exportActivity"
              >导出完整JSON</el-button
            ><el-button
              data-testid="activity-import"
              :icon="Upload"
              :disabled="busy"
              @click="activityInput.click()"
              >导入完整JSON</el-button
            ><input
              ref="activityInput"
              data-testid="activity-file"
              hidden
              type="file"
              accept=".json,application/json"
              @change="importActivity"
            />
          </div>
        </section>
        <div v-if="page === 'home' || page === 'rules'" class="page-heading">
          <h1>{{ title }}</h1>
        </div>
        <template v-if="page === 'home'"
          ><div class="stats">
            <article
              v-for="s in [
                ['游戏主题', data.themes.length, 'themes'],
                ['关卡配置', data.levels.length, 'levels'],
                ['题库总量', data.questions.length, 'questions'],
                ['已有题目的关卡', new Set(data.questions.map((q) => q.levelId)).size, 'levels']
              ]"
              :key="s[0]"
              @click="navigate(s[2])"
              tabindex="0"
              @keydown.enter="navigate(s[2])"
            >
              <span>{{ s[0] }}</span
              ><strong>{{ s[1] }}<small>项</small></strong>
              <div>查看管理 →</div>
            </article>
          </div>
          <section class="panel">
            <div class="panel-title">
              <h2>主题内容概览</h2>
              <span>四个方向，一起探索湖南</span>
            </div>
            <div class="theme-grid">
              <article v-for="t in data.themes" :key="t.id" :style="{ '--theme-color': t.color }">
                <div class="theme-line" />
                <h3>{{ t.name }}</h3>
                <p>{{ t.description }}</p>
                <div class="theme-numbers">
                  <span>{{ data.levels.filter((l) => l.themeId === t.id).length }} 个关卡</span
                  ><span>{{ data.questions.filter((q) => q.themeId === t.id).length }} 道题目</span>
                </div>
                <el-button text type="primary" @click="manageTheme(t.id)">管理题目 →</el-button>
              </article>
            </div>
          </section></template
        >
        <section v-else-if="page === 'rules'" class="panel rules">
          <h2>答题与积分</h2>
          <el-form label-position="top"
            ><el-form-item label="每题作答时限（秒）"
              ><el-input-number v-model="ruleDraft.timerSeconds" :min="5" :max="600" />
              <p class="muted">对新挑战生效；已有挑战继续使用开始时的规则。</p></el-form-item
            ><el-form-item label="每关复活次数"
              ><el-input-number v-model="ruleDraft.reviveCount" :min="0" :max="100" /></el-form-item
            ><el-form-item label="每日积分上限"
              ><el-switch v-model="ruleDraft.unlimited" active-text="不限制" /><el-input-number
                v-if="!ruleDraft.unlimited"
                v-model="ruleDraft.dailyPointLimit"
                :min="0"
                :max="100000"
              />
              <p class="muted">不限时保存为空值；设为0表示当日不获得积分。</p></el-form-item
            ><el-form-item label="失败后的当日锁定"
              ><el-switch
                v-model="ruleDraft.lockAfterFailure"
                active-text="复活额度用尽后，再次错误锁定至次日"
                disabled /></el-form-item
            ><el-divider />
            <h3>证书配置</h3>
            <template v-if="ruleDraft.certificates"
              ><el-form-item
                v-for="f in [
                  ['title', '证书标题'],
                  ['totalName', '总证书称号'],
                  ['totalText', '总证书正文'],
                  ['footer', '证书页脚']
                ]"
                :key="f[0]"
                :label="f[1]"
                ><el-input
                  v-model="ruleDraft.certificates[f[0]]"
                  :type="f[0] === 'totalText' ? 'textarea' : 'text'" /></el-form-item
            ></template>
            <h3>分享配置</h3>
            <template v-if="ruleDraft.share"
              ><el-form-item
                v-for="f in [
                  ['title', '分享标题'],
                  ['text', '分享文案'],
                  ['image', '分享图片（HTTPS或受控本地路径）']
                ]"
                :key="f[0]"
                :label="f[1]"
                ><el-input v-model="ruleDraft.share[f[0]]" /></el-form-item></template
            ><el-form-item label="复活分享文案"
              ><el-input v-model="ruleDraft.reviveShareText" /></el-form-item
            ><el-form-item label="复活分享图片"
              ><el-input v-model="ruleDraft.reviveShareImage" /></el-form-item
            ><el-divider />
            <h3>各关通关积分</h3>
            <p class="muted">积分为通关奖励，不是每题得分。在关卡管理中逐关调整。</p>
            <el-table :data="data.levels"
              ><el-table-column label="主题"
                ><template #default="s">{{ themeName(s.row.themeId) }}</template></el-table-column
              ><el-table-column prop="name" label="关卡" /><el-table-column
                prop="points"
                label="通关积分" /></el-table
            ><el-button
              class="save-rules"
              type="primary"
              @click="
                async () => {
                  if (await run(() => api.save('rules', ruleDraft)))
                    ElMessage.success('规则已保存');
                }
              "
              >保存游戏规则</el-button
            ></el-form
          >
        </section>
        <template v-else>
          <section class="filter-panel" aria-label="查询条件">
            <el-form inline label-width="72px" @submit.prevent="query"
              ><el-form-item :label="page === 'questions' ? '题目：' : '名称：'"
                ><el-input
                  v-model="search"
                  placeholder="请输入名称或编号"
                  clearable
                  @keyup.enter="query" /></el-form-item
              ><el-form-item v-if="page !== 'themes'" label="主题："
                ><el-select
                  v-model="themeFilter"
                  placeholder="请选择主题"
                  clearable
                  @change="levelFilter = ''"
                  ><el-option
                    v-for="t in data.themes"
                    :key="t.id"
                    :label="t.name"
                    :value="t.id" /></el-select></el-form-item
              ><el-form-item v-if="page === 'questions'" label="关卡："
                ><el-select v-model="levelFilter" placeholder="请选择关卡" clearable
                  ><el-option
                    v-for="l in data.levels.filter(
                      (l) => !themeFilter || l.themeId === themeFilter
                    )"
                    :key="l.id"
                    :label="themeName(l.themeId) + ' / ' + l.name"
                    :value="l.id" /></el-select></el-form-item
              ><el-form-item v-if="page === 'themes'" label="状态："
                ><el-select v-model="statusFilter" placeholder="请选择状态" clearable
                  ><el-option
                    v-for="v in ['启用', '停用']"
                    :key="v"
                    :label="v"
                    :value="v" /></el-select
              ></el-form-item>
              <div class="query-actions">
                <el-button type="primary" :icon="Search" @click="query">查询</el-button
                ><el-button :icon="Refresh" @click="reset">重置</el-button>
              </div></el-form
            >
          </section>
          <section class="panel list-panel">
            <div class="list-heading">
              <h1>{{ title }}</h1>
              <div class="list-actions">
                <template v-if="page !== 'themes'"
                  ><el-button :icon="Upload" @click="fileInput.click()">CSV导入</el-button
                  ><el-button :icon="Download" @click="exportCSV()">导出</el-button
                  ><el-button @click="exportCSV(true)">下载模板</el-button
                  ><input
                    ref="fileInput"
                    hidden
                    type="file"
                    accept=".csv,text/csv"
                    @change="importCSV" /></template
                ><el-button type="primary" :icon="Plus" @click="open()"
                  >新增{{
                    page === 'themes' ? '主题' : page === 'levels' ? '关卡' : '题目'
                  }}</el-button
                >
              </div>
            </div>
            <el-table :data="visible" empty-text="暂无数据，请新增或导入内容" row-key="id"
              ><el-table-column
                type="index"
                label="序号"
                width="70"
                :index="(i) => (pageNumber - 1) * pageSize + i + 1"
              /><el-table-column
                prop="id"
                label="编号"
                width="170"
                show-overflow-tooltip
              /><el-table-column v-if="page !== 'themes'" label="主题" width="110"
                ><template #default="s">{{ themeName(s.row.themeId) }}</template></el-table-column
              ><el-table-column
                :prop="page === 'questions' ? 'title' : 'name'"
                :label="page === 'questions' ? '题干' : '名称'"
                min-width="220"
                show-overflow-tooltip
              /><template v-if="page === 'themes'"
                ><el-table-column
                  prop="description"
                  label="主题说明"
                  min-width="150"
                /><el-table-column label="状态" width="100"
                  ><template #default="s"
                    ><el-tag :type="s.row.enabled ? 'success' : 'info'">{{
                      s.row.enabled ? '启用' : '停用'
                    }}</el-tag></template
                  ></el-table-column
                ></template
              ><template v-if="page === 'levels'"
                ><el-table-column prop="sort" label="排序" width="75" /><el-table-column
                  prop="questionCount"
                  label="每轮题数"
                  width="100"
                /><el-table-column prop="timeLimit" label="秒 / 题" width="110" /><el-table-column
                  prop="points"
                  label="通关积分"
                  width="100"
                /><el-table-column label="题池容量" width="100"
                  ><template #default="s"
                    ><el-tag
                      :type="poolCount(s.row.id) < s.row.questionCount ? 'warning' : 'success'"
                      >{{ poolCount(s.row.id) }} 题</el-tag
                    ></template
                  ></el-table-column
                ></template
              ><template v-if="page === 'questions'"
                ><el-table-column label="关卡" min-width="160"
                  ><template #default="s">{{ levelName(s.row.levelId) }}</template></el-table-column
                ><el-table-column label="答案" width="70"
                  ><template #default="s">{{ 'ABCD'[s.row.answer] }}</template></el-table-column
                ></template
              ><el-table-column label="操作" width="175" fixed="right"
                ><template #default="s"
                  ><el-button
                    v-if="page === 'questions'"
                    link
                    type="primary"
                    @click="detail = s.row"
                    >查看</el-button
                  ><el-button link type="primary" @click="open(s.row)">编辑</el-button
                  ><el-button link type="danger" @click="remove(s.row)">删除</el-button></template
                ></el-table-column
              ></el-table
            >
            <div class="pagination">
              <el-pagination
                v-model:current-page="pageNumber"
                v-model:page-size="pageSize"
                :total="filtered.length"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
                background
                @size-change="pageNumber = 1"
              />
            </div></section
        ></template>
      </main>
    </div>
    <el-dialog
      v-model="dialog"
      :title="(editing ? '编辑' : '新增') + title.replace('管理', '')"
      width="min(640px, 94vw)"
      destroy-on-close
      :close-on-click-modal="false"
      ><el-form label-position="top"
        ><div class="form-grid">
          <el-form-item label="唯一编号" required
            ><el-input
              v-model="form.id"
              :disabled="editing"
              placeholder="例如 red-5 或 Q-001" /></el-form-item
          ><el-form-item v-if="page !== 'themes'" label="所属主题"
            ><el-select v-model="form.themeId" @change="form.levelId = ''"
              ><el-option
                v-for="t in data.themes"
                :key="t.id"
                :label="t.name"
                :value="t.id" /></el-select
          ></el-form-item>
        </div>
        <template v-if="page === 'themes'"
          ><el-form-item label="主题名称"><el-input v-model="form.name" /></el-form-item
          ><el-form-item label="主题说明"
            ><el-input v-model="form.description" type="textarea" /></el-form-item
          ><el-form-item label="地图底图（可选，留空沿用原图）"
            ><el-input v-model="form.mapImage" placeholder="https://…" /></el-form-item
          ><el-form-item label="主题证书称号"
            ><el-input v-model="form.certificateName" /></el-form-item
          ><el-form-item label="主题证书正文"
            ><el-input v-model="form.certificateText" type="textarea" /></el-form-item
          ><el-form-item label="主题颜色"><el-color-picker v-model="form.color" /></el-form-item
          ><el-form-item label="启用主题"><el-switch v-model="form.enabled" /></el-form-item
        ></template>
        <template v-if="page === 'levels'"
          ><el-form-item label="关卡名称"><el-input v-model="form.name" /></el-form-item>
          <div class="form-grid">
            <el-form-item
              v-for="f in [
                ['sort', '排序（同主题内）'],
                ['questionCount', '每轮题目数量'],
                ['timeLimit', '每题时限（秒，在游戏规则中统一设置）'],
                ['points', '通关积分']
              ]"
              :key="f[0]"
              :label="f[1]"
              ><el-input-number
                v-model="form[f[0]]"
                :disabled="f[0] === 'timeLimit'"
                :min="f[0] === 'points' ? 0 : 1"
                :max="100000"
            /></el-form-item>
          </div>
          <el-form-item label="启用关卡"
            ><el-switch v-model="form.enabled" />
            <p class="muted">停用前关时需先停用后续关卡，历史积分仍保留。</p></el-form-item
          ></template
        >
        <template v-if="page === 'questions'"
          ><el-form-item label="所属关卡"
            ><el-select v-model="form.levelId"
              ><el-option
                v-for="l in availableLevels"
                :key="l.id"
                :label="l.name"
                :value="l.id" /></el-select></el-form-item
          ><el-form-item label="题干（单选题）" required
            ><el-input v-model="form.title" type="textarea" :rows="2"
          /></el-form-item>
          <div class="form-grid">
            <el-form-item v-for="(v, i) in form.options" :key="i" :label="'选项 ' + 'ABCD'[i]"
              ><el-input v-model="form.options[i]"
            /></el-form-item>
          </div>
          <el-form-item label="正确答案"
            ><el-radio-group v-model="form.answer"
              ><el-radio-button v-for="(v, i) in form.options" :key="i" :value="i">{{
                'ABCD'[i]
              }}</el-radio-button></el-radio-group
            ></el-form-item
          ><el-form-item label="难度标签"
            ><el-select v-model="form.difficulty"
              ><el-option
                v-for="v in ['基础', '进阶', '综合']"
                :key="v"
                :label="v"
                :value="v" /></el-select></el-form-item
          ><el-form-item label="题目解析" required
            ><el-input v-model="form.explanation" type="textarea" /></el-form-item
          ><el-form-item label="图片地址（可选）"
            ><el-input v-model="form.imageUrl" placeholder="https://… 或 /images/…" /></el-form-item
          ><el-form-item label="启用题目"><el-switch v-model="form.enabled" /></el-form-item
          ><el-form-item label="媒体说明"
            ><el-input v-model="form.mediaAlt" placeholder="图片或视频内容说明" /></el-form-item
          ><el-form-item label="媒体图注"><el-input v-model="form.mediaCaption" /></el-form-item
          ><el-form-item label="媒体为答题必要条件"
            ><el-switch v-model="form.mediaRequired" /></el-form-item
          ><el-form-item label="视频地址（可选）"
            ><el-input v-model="form.videoUrl" placeholder="https://… 或 /media/…" /></el-form-item
          ><el-form-item label="资料来源名称"><el-input v-model="form.sourceTitle" /></el-form-item
          ><el-form-item label="资料来源地址"><el-input v-model="form.sourceUrl" /></el-form-item
          ><el-form-item label="知识点"><el-input v-model="form.knowledgePoint" /></el-form-item
          ><el-form-item label="地区"
            ><el-input v-model="form.region" /></el-form-item></template></el-form
      ><template #footer
        ><el-button @click="dialog = false">取消</el-button
        ><el-button type="primary" :loading="busy" @click="save">保存</el-button></template
      ></el-dialog
    >
    <el-dialog
      :model-value="!!detail"
      title="题目详情"
      width="min(720px,94vw)"
      @close="detail = null"
      ><template v-if="detail"
        ><div class="detail-meta">{{ detail.id }}<el-tag effect="plain">单选题</el-tag></div>
        <h3 class="detail-title">{{ detail.title }}</h3>
        <p>{{ themeName(detail.themeId) }} / {{ levelName(detail.levelId) }}</p>
        <div class="answer-options">
          <div
            v-for="(option, i) in detail.options"
            :key="i"
            :class="{ correct: detail.answer === i }"
          >
            <b>{{ 'ABCD'[i] }}.</b> {{ option }}<span v-if="detail.answer === i">正确答案</span>
          </div>
        </div>
        <h4>题目解析</h4>
        <p class="detail-explanation">{{ detail.explanation }}</p>
        <el-descriptions :column="1" border
          ><el-descriptions-item label="难度标签">{{
            detail.difficulty || '基础'
          }}</el-descriptions-item
          ><el-descriptions-item label="图片地址">{{
            detail.imageUrl || '未设置'
          }}</el-descriptions-item
          ><el-descriptions-item label="视频地址">{{
            detail.videoUrl || '未设置'
          }}</el-descriptions-item></el-descriptions
        ></template
      ><template #footer><el-button @click="detail = null">关闭</el-button></template></el-dialog
    >
  </div>
</template>
