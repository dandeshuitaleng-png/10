# 已确认 A 方案的主题场景与关卡底座

2026-10-21，甲方选择 A，并补充四项要求：主题场景元素不同、四主题底座有变化、四季人物按春夏秋冬排列并可点击、减少内页装饰性 IP。

本目录包含八张高分辨率编辑源、完整提示词 `prompts.json`、运行导出参数和 SHA-256 `asset-manifest.json`。通过内置 ImageGen 对已经认可的 A 地图与底座作定向编辑；没有重新生成或修改智小谷原图。旧运行素材仍保留在 Git 中。

| 主题 | 原参考源 | 场景编辑重点 | 底座编辑重点 |
|---|---|---|---|
| 十步芳草 | `miniprogram/assets/journey/red.jpg`，原共享底座 | 旗帜纪念地标、阅读驿站、纪念门 | 红色纪念石台、星形侧纹 |
| 千年文脉 | `miniprogram/assets/journey/culture.jpg`，原共享底座 | 书卷、笔墨、剪纸技艺陈列 | 书页木台、层叠书页 |
| 金色产业 | `miniprogram/assets/journey/industry.jpg`，原共享底座 | 粮仓、农产分拣、稻谷、茶田 | 麦金收获台、麦穗侧纹 |
| 青山绿水 | `miniprogram/assets/journey/ecology.jpg`，原共享底座 | 溪流、湿地、栈桥、白鹭 | 溪石台、水纹与石质边缘 |

导出仅使用 Sharp 作尺寸适配、JPEG 压缩和透明边界裁切，不用代码重绘插画。地图统一为 750×1280，底座使用 220×165 透明容器以 contain 保留比例。每张运行地图低于 240KiB；独立工程仅打包自己的新版地图与底座。源文件命名为 `<theme>-map-source.png` 和 `<theme>-node-source.png`，运行文件为 `<theme>-a-v4.jpg` 和 `<theme>-node-a-v4.png`。

原智小谷源路径为 `miniprogram/assets/brand/original-poses/`，顺序是 spring、summer、autumn、winter。局部手部和道具动作沿用现有组件，不使用全身左右晃动。内页使用策略及验收记录见 `docs/20261021-A方案确认与四项细化.md`。

后续人物点击动作采用原 PNG 的连续局部绘制，不再将手臂裁切为独立贴片；原 PNG 文件仍完全不变。修正说明见 `docs/20261021-人物点击动作与轮廓接缝修正.md`。
