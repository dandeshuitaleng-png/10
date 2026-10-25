# 维护与运行

当前只推进甲方确认的 A 方案。四套小程序各自固定主题，不增加正式汇总入口。主业务源码已提交，历史截图和旧阶段工具继续本地归档。

当前功能、检查与待验边界统一见 [当前工程状态](CURRENT_STATUS.md)，不再从早期原型说明推定当前缺口。

## 安装、构建和运行

使用 Node.js 24，在仓库根目录执行：

```sh
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix quiz-admin
npm ci --ignore-scripts --prefix rural-culture-miniprogram/tools
npm run build --prefix quiz-admin
npm run check
node demo/scripts/start-local-service.cjs
```

后台 `/manage` 与参与页 `/play` 由本机服务提供，默认地址为 `http://127.0.0.1:63112`。源码不附 `node_modules` 和 `dist`，必须先安装、构建。生产环境不启用本机共享身份和管理桥接；正式平台身份、真实分享验证、DM8/TongRDS 和设备验收分别记录。

完整作者题库在 `demo/design/content-intake/current/bank.json`；`quiz-admin/examples/` 是少量字段示例。后台完整活动 JSON 包含配置和题库，不含玩家记录或媒体二进制。数据库维护见 `demo/server/maintenance.cjs`，备份、恢复先在隔离目录验证，不覆盖运行数据库。

## 当前视觉与历史记录

- 地图保持 A 方案，四主题独立配色与场景，人物依次为春、夏、秋、冬。
- 当前证书使用统一浅米金样式和“知识达人”称号，每套通关独立领取。以 [统一证书说明](20261023-统一知识达人证书.md) 为准；此前四称号文档只是阶段记录。
- [五张规范概览](../preview/美术精修-20261022.html) 使用仓库内五张摘要图。完整阶段截图、旧 ZIP 和录帧仍在本地，未将其当作新验收。
- 本目录 20261022／23 的文档保留当时设计决策和检查范围；文中的 `qa/` 原始材料未全部入库。当前修复与验证见 [20261025 记录](20261025-代码质量修复与验证.md)，编码约定见 [代码规范](CODING_STANDARDS.md)。

## 可复用工具

工具依赖独立安装，不进入小程序主包：

```sh
npm ci --ignore-scripts --prefix rural-culture-miniprogram/tools
```

按需要安装 Playwright Chromium。人物帧导出另需 Python 和 `tools/requirements.txt` 中的 Pillow；Vision 蒙版工具需要 macOS 及系统 Vision 框架。

`tools/lib/project-tools.cjs` 统一加载依赖、预览地址、微信命令及可选字体。默认使用 PATH 中的 `wechatide`，可用 `WECHATIDE_CLI` 指定；预览检查使用 `RURAL_PREVIEW_BASE`，默认 `http://127.0.0.1:6499`。可选 `RURAL_BROWSER_CHANNEL` 指定已安装浏览器，`RURAL_REVIEW_FONT` 指定排版对照字体，`CODEX_UI_DEPENDENCIES` 仅用于明确指定的外部工具目录。

准备隔离评审工程后再启动预览：

```sh
node rural-culture-miniprogram/tools/prepare-art-refinement-review-20261022.cjs
node rural-culture-miniprogram/tools/v4-serve.cjs .rural-quiz-runtime/art-refinement-review-20261022 6499
```

该工程使用独立内存评审内容，不能作为真实用户通关或设备验收。浏览器与原生检查分别执行；GitHub 自动检查不冒充微信模拟器或实体手机结果。

## 设计输入与生成

图标 SVG、授权与来源清单位于 `design-source/ui-icons-20261022/`。远景编辑源图位于两个 `*-horizon*` 目录；生成所需原图、道路边界和保护蒙版位于 `design-source/build-inputs/`，附 SHA-256 清单。工具不再依赖被忽略的历史编译报告来计算地图预算，而是读取当前独立工程的包体规则。

地图生成工具仅写 `qa/` 下的 proposed 输出。图标及人物帧生成工具会更新运行资源；执行前保持 Git 可回退，生成后检查画面、同步四套工程，并运行原生编译与包体检查。不要将旧阶段追加样式或增量修改 ZIP 的脚本当作当前默认构建链。

## 导出、交付和检查

`demo/scripts/export-local-activity.cjs` 只读取本机完整活动，输出目录必须是新目录。可通过 `QUIZ_EXPORT_BASE` 配置本机服务地址。表格 CSV 采用同一公式前缀防护；如含此类原文，使用完整 JSON。

当前源码包使用 `demo/scripts/package-contract-local-20261023.py`，文件范围取自 Git 跟踪内容和维护清单，附校验清单及已构建后台；不自动复制旧交付目录、会话或数据库。生成新路径后，用 `verify-contract-package-20261023.cjs` 在解压目录验证，不连接原工作区数据库。旧包保持不变。

`npm run check` 包括规范、格式、服务与维护工具回归；`npm run check:recovery` 在临时数据库执行真实备份/恢复演练并更新报告。报告中的 `runtimeSha256` 是 `demo/scripts/lib/runtime-evidence.cjs` 定义的整套运行文件汇总指纹，不是单个浏览器文件的哈希。GitHub Actions 的原始日志与恢复报告单独留存。

统一入口还检查五套工程包体和共用文件一致性、后台首屏资源预算；完整 Node 回归自动发现测试并生成 JUnit，运行前后源码指纹必须一致。输出位于 `.rural-quiz-runtime/quality/`，GitHub 工作流保存当次资料。`npm run check:native` 是本机额外编译入口，Linux CI 不替代微信编译器或实体手机。

PNG 工具 `node rural-culture-miniprogram/tools/optimize-runtime-png.cjs assets/主题/文件.png` 默认只检查；显式 `--write` 才替换更小编码并同步已有相同副本。工具逐像素校验 RGBA，不启用调色板量化、不改设计源。内部预算和64KiB余量见根 `tools/package-budget.json`，并非合同数字上限。
