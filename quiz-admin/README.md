# 趣味闯关管理端 · 当前说明（2026-10-25）

Vue 3 + Vite + Element Plus。默认连接 Node/SQLite 本机服务，沿用现有中文管理界面直接进入；题库不设审核模块。服务端已有管理员权限检查；正式平台身份、DM8/TongRDS 和目标环境接入仍待联调。

先在仓库根目录执行 `npm ci --ignore-scripts`、`npm ci --prefix quiz-admin`、`npm run build --prefix quiz-admin`，再执行 `node demo/scripts/start-local-service.cjs`，打开 http://127.0.0.1:63112/manage。源码开发在本目录执行 `npm ci`、`npm run dev`，开发地址为 http://127.0.0.1:5190/management/，代理到63112。`npm test` 检查数据/CSV，`npm run build` 生成 dist；Git 源码不包含 dist，需要先构建。

主题、关卡、题库和游戏规则保存到服务端。时限为全活动统一的秒/题；关卡保存积分、题数和顺序。题目维护四选项、答案、解析、难度、启用、媒体地址/图注、来源等。图片和视频二选一，使用 HTTPS 或受控本地资源路径。配置修改后新局采用新版本，在途挑战和已发证书保留快照。

“游戏规则”顶部提供完整活动 JSON 导出/导入：activity-3 快照包含主题、关卡、题库、难度、媒体元数据、计时复活积分、证书和分享配置。导入前显示数量及影响提示，整批校验、一次保存；未列入旧内容软停用，玩家账本和证书保留。导出不含玩家数据、凭据和媒体二进制，应同时备份媒体文件与数据库。

题库 CSV 新版22列：

```csv
id,themeId,levelId,title,optionA,optionB,optionC,optionD,answer,explanation,imageUrl,videoUrl,difficulty,enabled,mediaAlt,mediaCaption,mediaRequired,sourceTitle,sourceUrl,sourceIds,knowledgePoint,region
```

关卡 CSV 新版9列：

```csv
id,themeId,name,sort,questionCount,timeLimit,points,difficultyLabel,enabled
```

CSV 为 UTF-8 BOM，答案 A/B/C/D，难度 基础/进阶/综合，布尔 true/false，sourceIds 为 JSON 字符串数组。导出包含当前筛选结果全部行。导入按稳定ID新增/更新，不移除未列出题；支持旧12列题库与7列关卡格式。先导出备份再批量操作，空媒体地址表示清除媒体。examples/ 是少量新模板，不是完整240题；完整作者题库位于仓库的 `demo/design/content-intake/current/bank.json`，后台也可导出完整活动 JSON。

`src/api/index.js` 为现行HTTP适配，默认 /api/local/admin 仅本机桥接；正式管理员 API 为 /api/admin，保留现有界面接正式鉴权后使用。VITE_API_MODE=local-preview 才启用独立浏览器演示存储，该模式没有完整活动 JSON 入口，也不作为服务端持久化证据。

详细步骤见 [维护说明](../rural-culture-miniprogram/docs/MAINTENANCE.md)；接口见 [API 文档](../demo/docs/full-development/API.md)。历史README中的默认localStorage、整轮计时、8080代理及旧review审核接口约定已被本说明替代。

保存/删除携带所读取的数据版本；收到 409 冲突时保留草稿并重新加载，不能直接覆盖其他页面修改。完整活动导入还比对题库版本集合。CSV 导出发现公式前缀时停止，并提示使用 JSON 保留原文。

组件和样式在 `src/ui/` 显式注册，编辑、表格和详情按需加载，ConfigProvider 保留中文。Vite 的 `/management/` 资源前缀须与服务端挂载一致，否则延迟 CSS 无法加载。构建生成 `.vite/manifest.json`，根 `npm run check:admin` 检查真实静态依赖和首屏脚本预算。当前状态见[统一入口](../rural-culture-miniprogram/docs/CURRENT_STATUS.md)。
