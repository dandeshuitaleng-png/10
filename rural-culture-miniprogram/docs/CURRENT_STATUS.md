# 当前工程状态与验证入口

更新日期：2026-10-25。当前仅维护甲方确认的 A 方案，四个主题分别进入自己的首页。本文是当前状态入口；带日期的设计、合同核对与验收文档保存当时情况，不覆盖后续实现。

## 当前实现

- 四套前台通过 HTTP 使用同一后端身份和进度服务，后台使用同一题库、目录及配置。当前安装配置仍连接本机服务，不向 mock 自动降级。
- 题库维护已取消审核流程。合法且启用的题目可用于新局；标准答案不进入玩家未作答数据。来源、内容正确性与最终文案的人工确认由内容负责人完成。
- 原生页面的证书、声音设置、评审场景分别位于 `pages/game/certificate-flow.js`、`sound-settings.js`、`review-flow.js`。只有隔离评审配置能启用评审场景。
- 管理端保留原菜单、顶部与表单，组件和样式在 `src/ui/` 显式维护；编辑、表格、详情延迟加载，构建资源统一从 `/management/` 提供，中文配置保留。
- Element Plus 默认 CSS 放入独立级联层，应用定制保持非分层，确保延迟加载不覆盖表格、表单和弹窗间距。
- 青山绿水运行横幅只优化 PNG 编码，尺寸、解码 RGBA 与透明度逐字节验证一致。设计源图和人物动作未改动；记录位于 `design-source/runtime-png-optimization-20261025.json`。

## 安装和检查

在仓库根目录使用 Node.js 24：

```sh
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix quiz-admin
npm ci --ignore-scripts --prefix rural-culture-miniprogram/tools
npm run build --prefix quiz-admin
npm run check
```

`check` 包含规范、格式、五套工程包体和共用源码一致性、后台构建资源、完整 Node 回归、维护测试及隔离备份恢复。修改后台源码后先重新构建，不能拿旧 dist 验收新页面。

`npm run check:native` 另外执行五套 WXML/WXSS 原生编译。默认查找已安装的 macOS 微信编译器，可通过 `WECHAT_COMPILER_ROOT` 指定包含 `wcc` 和 `wcsc` 的目录；不存在时明确失败。Linux CI 的 `check:packages` 仅检查预算和一致性，不报告原生编译通过。

完整回归通过 `tools/run-regression.cjs` 自动发现测试，记录运行前后源码汇总指纹、Git 提交及工作区是否有改动，并输出 JUnit。脱离 Git 的源码包使用 `MANIFEST.json` 和实际源码目录共同确定范围，新增模块、测试也进入指纹；跳过依赖和运行数据，拒绝源码符号链接。结果明确标注无 Git 提交信息。输出位于忽略的 `.rural-quiz-runtime/quality/`；GitHub Actions 保存当次日志、JUnit、资源报告和恢复报告，不包含真实数据库或会话。

## 工程预算与合同范围

`tools/package-budget.json` 是内部包体预算：2MiB、至少保留64KiB余量；`tools/admin-budget.json` 是后台首屏脚本预算。两者均不是合同新增的数字上限，也不能代替微信平台实际上传结果。原生检查、CI 和地图生成采用同一份包体规则及预算。

合同原文未写2MB/2MiB包体上限；当前合同也未明确列出每日积分上限。旧1012稿的可配置日上限不作为当前合同新增义务。默认玩法、积分和证书条件沿用已确认规则，本轮优化不改业务取值。

## 证据和待验事项

10月13日 demo 的 browser、dynamic、media、performance、unit 报告是历史版本证据，不能因文件名或 passed 标记成为当前验收。备份恢复报告已重新生成；当前代码回归以本次 JUnit、源码指纹及对应 CI 为准。浏览器、微信模拟器、实体手机与正式平台结果分别记录。

正式身份、分享资格、甲方同步、管理员授权接入、DM8/TongRDS、指定国产环境、真实 iPhone/安卓微信及上传发布仍需分别开发/联调/验收。旧管理调用继续兼容可选版本前提；新调用必须携带版本，强制切换需与接入方协调。

本轮结果见 [工程优化与规范](20261025-工程优化与规范.md)，审查后的修正见 [代码审查问题修正](20261025-代码审查问题修正.md)，优先级基线见 [优化前完成度检查](20261025-项目完成情况与完善优先级.md)，操作见 [维护说明](MAINTENANCE.md)，现行接口见仓库 `demo/docs/full-development/API.md` 与 `miniprogram/services-v4/SERVICE-CONTRACT.md`。
