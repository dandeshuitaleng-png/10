# 当前联网运行说明（2026-10-18）

原管理页默认连接本机SQLite后端，直接进入首页；不是localStorage演示。先启动上级demo服务，打开63112/manage或本项目npm run dev后的5190入口。新规则配置含秒/题、复活、积分上限、证书和分享；题库无需审核。详见统一交付说明。

# 当前：题库不设审核流程（2026-10-18）

题目保存后直接使用，保留数据校验；旧CSV和浏览器存档中的审核列会被忽略。管理页仍直接进入首页。后台联网适配尚未完成，当前仍默认本地存储。

# 趣味闯关 · 后台管理演示

Vue 3 + Vite + Element Plus，中文界面。独立项目，不修改同目录小游戏或正式题库。

## 运行

使用Node.js 22.12+或24 LTS（Vite要求见 https://vite.dev/guide/）。

```bash
cd /Users/huangnianpeng/Desktop/yx/quiz-admin
npm install
npm run dev
```

打开终端输出地址（默认 http://127.0.0.1:5173）。

```bash
npm test
npm run build
npm run preview
```

preview默认 http://127.0.0.1:4173，dist为部署文件。首次安装需要网络。

## 目录

```text
src/
  main.js          入口与中文组件库
  App.vue          布局、首页、主题/关卡/题库/规则页面
  style.css        视觉样式与窄屏布局
  api/index.js     本地适配器、HTTP适配器、数据校验
  data/seed.js     四主题、16关、240道题目及规则
  utils/csv.js     CSV解析、序列化和下载
 tests/            数据操作与CSV测试
```

第一版按单页菜单切换组织基础页面，后续页面增多时可拆为views/components并引入Vue Router。

## 管理模块

- 首页：实时统计主题、关卡、题目和题库覆盖关卡，并显示各主题容量。
- 主题：新增、编辑、删除，名称、介绍、颜色和启用状态。已有子内容时禁止直接删除。
- 关卡：新增、编辑、删除，排序值决定同主题显示次序；配置每轮题数、整轮答题秒数和通关积分。有题目时禁止删除或更换主题。
- 题库：单选题四选一，编辑题干、答案、解析、图片/视频http(s)地址；按关键词、主题、关卡筛选。
- CSV：题库和关卡均支持模板下载、导入、导出。导出当前筛选结果全部数据（不限当前页）。
- 规则：复活次数、每日积分上限、失败后当日锁定；各关积分在关卡管理中维护。0每日上限表示当日不获得积分。

操作保存在当前浏览器localStorage，刷新后保留，不跨浏览器同步。初始仅240道题目，部分关卡题数不足会提示。浏览器禁用存储或写入失败时显示错误，不提示保存成功。主题启用与规则配置只保存后台配置，不直接改变游戏运行逻辑。

## CSV约定

题库表头：
```csv
id,themeId,levelId,title,optionA,optionB,optionC,optionD,answer,explanation,imageUrl,videoUrl
```
关卡表头：
```csv
id,themeId,name,sort,questionCount,timeLimit,points
```

使用UTF-8（导出含BOM），支持双引号转义、逗号及字段内换行；answer为A/B/C/D。themeId为red/culture/industry/ecology，levelId为已有关卡编号。整批校验后原子保存；编号相同更新，其他新增；批内重复编号、空必填字段、非法答案、不存在关卡、重复选项等会拒绝整批。导入前有更新确认。先导出备份再批量修改。原240题已转换为examples/questions.csv；初始数据默认载入全部240题。已有浏览器本地数据不会被覆盖，可通过CSV导入更新。

## Java Spring Boot / DM8接口预留

默认纯本地。后续建立.env.local：
```env
VITE_API_MODE=http
VITE_API_BASE=/api/local/admin
```
Vite开发代理/api到localhost:8080；线上使用同源反向代理或配置CORS。

|接口|请求|响应|
|---|---|---|
|GET /api/admin/state|无|完整状态对象|
|PUT /api/admin/{themes,levels,questions,rules}|JSON记录（rules为对象）|完整状态对象|
|DELETE /api/admin/{themes,levels,questions}/{id}|无|完整状态对象|
|POST /api/admin/{levels,questions}/import|{items: [...]}|完整状态对象|

完整状态结构为{themes:[],levels:[],questions:[],rules:{}}，字段见seed.js。HTTP非2xx显示错误，页面更新只发生在请求成功后。本版HTTP适配器保留契约，未实现Java服务或DM8连接。数据库连接放后端，前端不持有数据库账号；后端需实现事务、关联约束、字段校验、幂等更新和审计。正式权限及登录系统不在本次范围。

## 管理界面规范（2026-10-16更新）

参考所提供的管理平台样式，统一采用白色顶栏/侧栏、浅灰背景和橙红色主操作。查询条件与列表分区显示，主操作使用实色按钮，导入/导出/模板使用描边按钮，行内操作使用文字按钮，删除前确认。

- 顶栏按钮可收起或展开菜单；页面页签可切换、关闭，首页保留。
- 查询条件点击“查询”或按回车后生效，“重置”恢复全部数据；主题变化会清空关卡条件。
- 页签切换保留对应页面筛选条件和分页；每页10/20/50条可选，支持跳页，删除后自动回到有效页码。
- 题目“查看”展示完整四选项、答案、解析及媒体地址；新增和编辑弹窗遮罩点击不会关闭。
- 游戏规则存在未保存修改时，切换页面会提示确认。
- 保留现有数据接口与浏览器存储，不添加正式登录及退出入口。
