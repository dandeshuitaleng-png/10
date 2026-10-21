# 趣味闯关 · 四主题独立小程序

当前保留版：2026-10-21 证书样式修订版。四个主题各自独立进入学习关卡，不包含平台总入口或主题选择页。

- `rural-culture-miniprogram/`：母工程、共享页面、视觉组件、声音与证书绘制源。
- `交付/微信小程序四套/{十步芳草,千年文脉,金色产业,青山绿水}/`：四个可分别导入微信开发者工具的独立工程。
- `交付/证书样式修订-20261021/`：四主题证书图片与说明。
- `demo/`：现有 Node/SQLite 服务、管理页面与配套接口代码。
- `quiz-admin/`：已有 Vue 管理界面原型，具体适配范围以该目录说明为准。

## 当前版已包含

原有插画地图、分关卡智小谷互动、四主题配色、自然材质声音与声音设置；2026-10-21 的选项自然换行、连续按压反馈修正，以及参考甲方截图制作的正式竖版荣誉证书。页面证书预览与保存共用同一份 PNG。

原始保留标签：`baseline-20261021-before-home-options`。两款新首页将在单独分支制作，领导选择前不替换这份保留版。

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

## 两款首页评审

当前保留版位于 `main`，标签为 `baseline-20261021-before-home-options`。新增首页位于 `design/home-two-directions` 分支，四个独立主题仍默认使用保留版布局。

- A「插画漫游」：完整铺开的插画路线，进度与常用入口集中在顶部。
- B「智小谷导览」：以智小谷和当前章节卡片开场，地图放入圆角画框。

评审文件：[首页两款设计](交付/首页两款设计-20261021/评审.html)。两款复用原有主题标题、插画与 IP，所有关卡、积分、证书和音效规则继续共用现有实现。

交互预览：先执行 `node rural-culture-miniprogram/tools/prepare-theme-content-review-20261020.cjs`，再执行 `node rural-culture-miniprogram/tools/v4-serve.cjs .rural-quiz-runtime/theme-content-review 6499`，打开 `http://127.0.0.1:6499/preview/首页两款评审-20261021.html`。评审使用隔离的进度记录；入口不出现在正式四套工程中。
