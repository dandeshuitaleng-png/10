# V4服务约定（联网整合版）

运行模式由 game-config.js 决定，当前交付为 http。index.js 保留 createService 的独立mock引擎仅用于单元检查；实际默认 createRemoteService，不向mock降级。catalog.js 只含公开目录元信息，questions为空，标准答案仅在后端题库。

远程初始化 ensureReady()/sync() 返回Promise；其完成后 profile/snapshot/configuration/challenge/rankings 是同步展示缓存。start/submit/next/revive 是异步后端操作。Page在初始化期间显示加载态，提交期间阻止重入；页面恢复、切换榜单和每5秒同步权威状态，倒计时以serverTime校正的绝对deadline计算。

默认本地身份 POST /api/local/session，仅非生产回环服务启用。正式接口通过 /api/auth/platform 的ticket取得本人token；不得将管理员凭据放入小程序。每个主题均由相同后端身份读取 /api/me、/api/certificates 与 /api/rankings。

POST带requestId。待重试操作只保存路由、所选项、题目ID、请求ID；不保存标准答案或完整题库。响应丢失后复用相同请求重取结果，后端事务确保积分与证书不重复。服务器拒绝过时题目与越权挑战。

snapshot.progress 是当前主题，globalProgress是后端当前启用目录总进度；points及ledger为跨主题总账，allCertificates为本人所有证书，certificates为当前主题证书及总证书。显示答题正确率统一0–100；后端存储0–1。timerSeconds与countdownSeconds均为秒/题。已有挑战保持冻结规则。

媒体使用后端media.url和type，HTTP本机地址由适配器补齐；视频直接播放，离开页面暂停，重试可恢复播放位置但不会重置题目截止时间。必要媒体失败时提交禁用，重新加载后恢复。非必要媒体允许根据题干继续。正式素材使用HTTPS。

复活联调明确使用experience-test，不能视为已完成微信分享核验。正式环境仍需甲方身份、可信分享凭据与数据接收端。旧审核流程及配置变化提示条均已移除。
