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
  data/seed.js     四主题、16关、240道待审核题及规则
  utils/csv.js     CSV解析、序列化和下载
 tests/            数据操作与CSV测试
```

第一版按单页菜单切换组织基础页面，后续页面增多时可拆为views/components并引入Vue Router。

## 管理模块

- 首页：实时统计主题、关卡、题目、待审核题，并显示各主题容量。
- 主题：新增、编辑、删除，名称、介绍、颜色和启用状态。已有子内容时禁止直接删除。
- 关卡：新增、编辑、删除，排序值决定同主题显示次序；配置每轮题数、整轮答题秒数和通关积分。有题目时禁止删除或更换主题。
- 题库：单选题四选一，编辑题干、答案、解析、图片/视频http(s)地址、审核状态；按关键词、主题、关卡和状态筛选。
- CSV：题库和关卡均支持模板下载、导入、导出。导出当前筛选结果全部数据（不限当前页）。
- 规则：复活次数、每日积分上限、失败后当日锁定；各关积分在关卡管理中维护。0每日上限表示当日不获得积分。

操作保存在当前浏览器localStorage，刷新后保留，不跨浏览器同步。初始仅240道待审核题，部分关卡题数不足会提示。浏览器禁用存储或写入失败时显示错误，不提示保存成功。业务审核状态是演示字段，不代表已获得真实审核结论。主题启用与规则配置只保存后台配置，不直接改变游戏运行逻辑。

## CSV约定

题库表头：
```csv
id,themeId,levelId,title,optionA,optionB,optionC,optionD,answer,explanation,imageUrl,videoUrl,reviewStatus
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
VITE_API_BASE=/api/admin
```
Vite开发代理/api到localhost:8080；线上使用同源反向代理或配置CORS。

|接口|请求|响应|
|---|---|---|
|GET /api/admin/state|无|完整状态对象|
|PUT /api/admin/{themes,levels,questions,rules}|JSON记录（rules为对象）|完整状态对象|
|DELETE /api/admin/{themes,levels,questions}/{id}|无|完整状态对象|
|POST /api/admin/{levels,questions}/import|{items: [...]}|完整状态对象|

完整状态结构为{themes:[],levels:[],questions:[],rules:{}}，字段见seed.js。HTTP非2xx显示错误，页面更新只发生在请求成功后。本版HTTP适配器保留契约，未实现Java服务或DM8连接。数据库连接放后端，前端不持有数据库账号；后端需实现事务、关联约束、字段校验、幂等更新和审计。正式权限及登录系统不在本次范围。
