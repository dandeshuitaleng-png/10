> 当前美术状态：待修订，上一轮定稿结论已撤回。工程检查结果保留，勿将其作为美术验收。

# 四主题定稿素材

2026-10-20 定稿，沿用 `final-20261019` 版本目录。当前只有一套方案，四个主题共用同一材质规范。

| 采用的原始位图 | 用途 | 运行资源 |
| --- | --- | --- |
| `culture-map-neutral-parchment-fullsize.png` | 千年文脉场景，浅赭与棕纸色 | `assets/journey/culture.jpg` |
| `current-node-raw.png` | 金色到达底座 | `assets/journey/node-current.png` |
| `locked-node-clean.png` | 暖灰未解锁底座 | `assets/journey/node-locked.png` |
| `completed-node-clean.png` | 淡叶绿完成底座 | `assets/journey/node-completed.png` |

以上由内置 ImageGen 对既有地图/底座进行编辑，未用手写 SVG、CSS 图案替代插画。对应提示词为 `culture-map-neutral-parchment-prompt.txt`、`current-node-prompt.txt`、`locked-node-clean-prompt.txt`、`completed-node-clean-prompt.txt`。原始画面和前一轮运行资源备份在 `../../qa/final-art-20261019/before/`，仅留在工作区供追溯。

运行地图为 750×1280 JPG；底座为 220×147 透明 PNG。`../../tools/install-final-art-20261019.cjs` 只执行生产尺寸适配和压缩，资源尺寸、字节数、散列见 `asset-manifest.json`。透明底座在浏览器和微信模拟器中检查了透明边缘、缩放和站位。

`locked-node-raw.png`、`completed-node-raw.png` 及其旧提示词是迭代中间稿，未被运行页面引用，不进入本次交付包。采用清理后的 `*-clean.png`。不把中间稿当作备选方案。

智小谷继续使用 `../../miniprogram/assets/brand/original-poses/` 中四张原始二维透明图，未重新生成或修改外形。原稿记录见 `../original-poses.json`。动作的区域分离与时间轴在 `../../miniprogram/services-v4/mascot-rig.js`、`mascot-motion.js` 和 `../../miniprogram/components/mascot-actor/`；这些可编辑代码与原始 PNG 是本次角色动作源文件，不提供虚构的分层 PSD 或骨骼文件。

三个原标题没有经过 ImageGen；青山绿水沿用已修订的 `assets/ecology/banner-cartoon-v2.png`，原图与提示词保留在上级目录。
