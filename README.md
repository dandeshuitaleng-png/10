# 趣味闯关 · 四主题独立小程序

当前开发版：2026-10-21 甲方确认的 A 方案细化。四个主题各自独立进入学习关卡，不包含平台总入口或主题选择页。

- `rural-culture-miniprogram/`：母工程、共享页面、视觉组件、声音与证书绘制源。
- `交付/微信小程序四套/{十步芳草,千年文脉,金色产业,青山绿水}/`：四个可分别导入微信开发者工具的独立工程。
- `交付/证书样式修订-20261021/`：四主题证书图片与说明。
- `demo/`：现有 Node/SQLite 服务、管理页面与配套接口代码。
- `quiz-admin/`：已有 Vue 管理界面原型，具体适配范围以该目录说明为准。

## 当前版已包含

原有插画地图、分关卡智小谷互动、四主题配色、自然材质声音与声音设置；2026-10-21 的选项自然换行、连续按压反馈修正，以及参考甲方截图制作的正式竖版荣誉证书。页面证书预览与保存共用同一份 PNG。

原始保留标签：`baseline-20261021-before-home-options`。甲方已选择 A，当前分支 `design/approved-home-a` 的母工程及四套工程默认 A。原 main 和基线标签保留，B 留在历史设计分支。

## 运行与检查

```sh
cd demo
node scripts/start-local-service.cjs

# 另一个终端，源码式浏览器预览
cd rural-culture-miniprogram
node tools/v4-serve.cjs . 6493

# 原生编译与前端回归
node tools/v4-check.cjs
node tests/v4-page.cjs
node --test tests/certificate-art.test.cjs tests/option-measurement.test.cjs tests/press-feedback.test.cjs
```

微信开发者工具分别导入四个独立工程。本机服务地址不能直接供外部手机访问，正式服务、身份、分享校验和平台接入沿用现有项目的待验收边界。

本地数据库、管理员凭据、玩家存档、开发者工具私有配置、运行缓存和大体积历史压缩包不提交。当前原生布局/生成图片/编译检查与实体手机、相册权限、上传发布分别记录；本仓库不代表已完成正式发布。

详见 `BASELINE_VERSION.md` 以及 `rural-culture-miniprogram/docs/20261021-正式荣誉证书视觉修订.md`。

## A 方案已确认

当前仅推进 A「插画漫游」，四主题默认 `homeDesign: 'map'`。主题地标、关卡底座按红色文化、传统文脉、乡村产业和山水生态分别细化。原人物按春、夏、秋、冬排列，动作以手部和道具为主；答题、学习与积分页减少装饰性人物。底座外硬深色圆环已改为柔和椭圆光晕。

[查看 A 方案](交付/首页方案A-20261021/评审.html) · [要求与验收记录](rural-culture-miniprogram/docs/20261021-A方案确认与四项细化.md)

预览使用隔离评审工程：执行 `node rural-culture-miniprogram/tools/prepare-theme-content-review-20261020.cjs`，再执行 `node rural-culture-miniprogram/tools/v4-serve.cjs .rural-quiz-runtime/theme-content-review 6499`，打开 `http://127.0.0.1:6499/preview/首页方案A-20261021.html`。主题选择仅用于评审，不出现在正式工程中。

## 代码质量检查

在工作区根目录使用 Node.js 24 执行 `npm ci --ignore-scripts` 后，运行 `npm run check`。
该入口包含服务端、后台管理、原生页面与服务回归，以及 ESLint 和维护文件格式检查。
维护约定见 [代码规范](rural-culture-miniprogram/docs/CODING_STANDARDS.md)，本轮修复与证据见 [20261025 修复记录](rural-culture-miniprogram/docs/20261025-代码质量修复与验证.md)。
