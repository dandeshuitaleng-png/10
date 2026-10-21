# 参考风格统一素材源

本目录为 2026-10-20 一套四主题视觉修订。所有新地图和底座使用内置 ImageGen，保留生成源图和精确提示词。根据用户提供的互动面板和农场插画参考编辑，不重绘原始智小谷，不修改三个原标题。

- `*-map-source.png`：四套地图源图；对应 `*-map-prompt.txt`。
- `node-{current,locked,completed}-source.png`：三种底座透明源图；对应同名前缀的 `*-prompt.txt`。
- `reference-crops/`：用户原截图的未改色裁切，只用于风格核对，不进入运行资源。
- `asset-manifest.json`：每张运行资源的源路径、尺寸、压缩参数与 SHA-256。

导出工具：`../../tools/install-reference-art-20261020.cjs`，只做透明边距裁切、缩放、压缩；未手工改色、补画或用 CSS/SVG 代替插画。节点源图含接近不透明的 alpha 和抗锯齿边缘，予以保留，不声称所有像素 alpha 都为 255。运行层 opacity 为 1，视觉检查未见路径透入底座。

运行地图 750×1280 JPEG；节点 220×147 PNG。横幅、角色原图和动作实现仍在 `../../miniprogram/`。当前角色分层实现为既有原图组件、局部动作切片与 `mascot-motion.js` / `mascot-rig.js`，本轮没有生成新的角色源画或虚构 PSD。

主题色和组件样式来源：`../../miniprogram/services-v4/visual-feedback.js` 与 `../../tools/build-reference-ui-20261020.cjs`。原参考属于不同版式的桌面页面，本次统一其色彩和材质语言，不宣称为像素级临摹。
