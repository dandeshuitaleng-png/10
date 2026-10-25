# 当前题库接口变更 · 2026-10-18

题目不再包含approved/reviewStatus/reviewNote/reviewedBy/reviewedAt/experienceAuthorized。合法题目默认enabled=true，可显式停用。POST /api/admin/questions/:id/review已移除；新增/编辑/导入按启用状态直接进入题池。历史待审核题事务迁为启用，已明确停用/删除保留；题号、版本、题面及玩家历史保持。旧审核字段只在兼容迁移中识别，不作为新题入池条件。返回运行mode以区分体验与正式，不再用contentApprovalPending表示本地模式。

# 完整系统开发契约 · 2026-10-13

0.3.0支持1012版合同动态目录及旧GDD初始实例，保留内部开发流程验收边界。现有画面与试玩保留。甲方接口、指定环境和分享验证仍需真实资料；2026-10-12用户已确认正式规则，内容审核与外部接入分别记录。

## 传输

同源 HTTP JSON，成功 `{data: ...}`，失败 `{error:{code,message},requestId}`。玩家和管理员使用服务端设置的 HttpOnly 会话 Cookie；微信使用登录交换后的 Bearer token。开发登录仅在非生产模式启用，不允许请求自选管理员角色。生产管理员使用部署环境配置的账号凭据，甲方身份通过可注入验证器。

| 方法与路径                          | 数据与结果                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET /api/health                     | 存储与环境状态，不含凭据                                                                                                                         |
| POST /api/auth/dev                  | `{name,deviceId?}` → 玩家、会话及随机体验设备凭据，仅非生产环境                                                                                  |
| POST /api/auth/admin                | `{username,password}` → 管理员会话                                                                                                               |
| POST /api/auth/platform             | `{ticket}` → 经甲方验证器确认的玩家会话                                                                                                          |
| POST /api/auth/logout               | `{scope:"admin"                                                                                                                                  | "player"}` 撤销对应会话，不互相影响 |
| GET /api/me                         | 玩家、动态进度、总积分、dailyPoints/dailyPointCap/dailyRemaining、配置、活动挑战                                                                 |
| GET /api/catalog                    | 动态themes/levels、配置、可用题量及certificateDefinitions                                                                                        |
| POST /api/challenges                | `{levelId,requestId}` → 挑战快照；同用户同关活动局恢复                                                                                           |
| GET /api/challenges/:id             | 挑战快照，所有权验证，服务器处理超时                                                                                                             |
| POST /api/challenges/:id/answer     | `{questionId,optionId,requestId}`，optionId 为 0—3；超时由服务器裁定                                                                             |
| POST /api/challenges/:id/advance    | `{requestId}` → 反馈后进入下一题、开始下一题计时                                                                                                 |
| POST /api/challenges/:id/revive     | `{evidence,requestId}` → 经验证消费一次复活额度，返回剩余次数                                                                                    |
| POST /api/challenges/:id/exit       | `{requestId}` → 保存退出状态，不授予通关                                                                                                         |
| GET /api/rankings?period=day\|total | `{entries,period,day}`，关数优先、首次作答正确率其次；每行`points`为相应周期内实际入账积分，包含日上限截断后的奖励，重玩不重复统计               |
| GET /api/certificates               | 该玩家证书列表                                                                                                                                   |
| GET /api/certificates/:id.svg       | 所有权验证，下载证书                                                                                                                             |
| GET /api/admin/overview             | 五模块概览、依赖与数据统计                                                                                                                       |
| GET/PUT /api/admin/config           | 动态主题、证书/分享、复活、积分日上限和计时配置；玩法结构/规则变更撤销批准                                                                       |
| GET/POST /api/admin/levels          | 动态列表/新增关卡，稳定ID                                                                                                                        |
| PUT /api/admin/levels[/:id]         | 单条或`{levels}`批量修改名称、排序、题数、奖励、启用；已有ID/主题归属稳定                                                                        |
| DELETE /api/admin/levels/:id        | 软归档，不删除题目、旧局、账本或证书；停用前关需同步处理后关                                                                                     |
| GET /api/admin/activity/export      | `activity-3`完整快照：`contentMode:snapshot,exportedAt,config,levels,questions,assets`；含难度和媒体元数据，不含玩家记录、开发测试题或媒体二进制 |
| POST /api/admin/activity/import     | `activity-3`整批校验并事务保存；缺失的现有题/关卡软停用，玩家历史保留；兼容旧无版本/activity-2增量，文件不能批准规则                             |
| GET/POST /api/admin/questions       | 列表与新增题目；支持主题、关卡、启用状态、关键字筛选                                                                                             |
| PUT/DELETE /api/admin/questions/:id | 编辑/软删除；不设题库审核，活动挑战保存版本                                                                                                      |
| POST /api/admin/questions/import    | `{questions}`，原子校验后按稳定ID更新/新增，保留显式启用状态，不移除未列入题目                                                                   |
| GET /api/admin/questions/export     | 完整可回导 JSON                                                                                                                                  |
| GET /api/admin/audit                | 脱敏管理操作日志                                                                                                                                 |
| GET /api/admin/outbox               | 同步事件与待重试结果                                                                                                                             |
| POST /api/admin/outbox/retry        | 重试已配置同步接收端，不将未配置标为成功                                                                                                         |

## 快照结构

挑战 `{id,levelId,themeId,state,position,total:实际题数,selected:null,question,feedback,result,deadline,serverTime,reviveUsed}`。状态 `answering / feedback / revive / locked / completed / exited`。question `{id,title,options:[字符串×4],media,difficulty}` 仅当前题，无答案及未答解析。feedback `{right,selected,answer,explanation}` 仅已提交题。result `{passed,points,accuracy,correct,totalAnswered}`。客户端不得写分数、时间、身份或通关。

进度 `{themeId:{nodes:[available|locked|completed|today-locked],completed,total:实际关数,levelIds:[稳定ID]}}`，积分由服务端账本得出。会话、挑战、作答、通关、积分、证书和待同步事件持久化。首次结算、积分和同步事件在同一事务内；同一请求重复投递返回原结果，改内容重复键返回冲突；正式与体验的请求记录使用独立键，避免旧体验响应绕过正式门槛。

## 配置边界

用户已于2026-10-12批准：30秒、超时算错、每次挑战一次复活、北京时间零点日界、首次通关发分、正确率按首次提交统计。默认标记 user-approved。管理员改动活动结构、顺序、题数、奖励、时限、复活额度或每日上限会撤销规则批准，不能由配置请求直接自行批准。

experience 模式开放用户指定的240道源题，题目按enabled状态使用。development/test 另有独立开发题。production 排除体验记录与开发测试题；可信身份、分享、同步接收端和批准规则缺失时阻止正式开局。

测试复活仅限非生产模式，不表示真实分享完成。production 不接受测试证据。媒体支持图片/视频 HTTPS 或受控本地路径，拒绝脚本URL。体验版补充2张相关示意配图和1段6秒原创观察动画，不伪称当地实景或实际监测。题目修改保留启用状态并产生新版本，活动挑战仍使用开始时保存的版本。

随机体验设备凭据仅为本机体验账号恢复使用，不是甲方实名身份。浏览器凭据在本机存储，微信保存设备凭据与Bearer会话；后台使用独立HttpOnly Cookie。管理员凭据、数据库、源题答案文件均不通过静态服务开放，源码包不含运行数据或私有凭据。

## 动态活动与迁移 · 0.3.0

活动配置`schemaVersion:2`，每次保存递增`version`并保存目录发布记录。`themes[]`维护稳定ID、名称、排序、启用/归档、简介、封面/地图/背景、证书名称与正文。关卡维护稳定ID与主题归属、顺序、名称/难度说明、`questionCount`与`points`。

复活配置`limit/period:challenge/failurePolicy:until-limit`；积分配置`replay:first/dailyPointCap:null或非负整数/capPolicy:truncate-reward`。默认一次复活、无日上限；扩展策略仅在未批准体验配置测试，不能由后台请求或导入自授正式批准。有限上限按北京时间结算日的可信账本计算，额度不足截断奖励，额度用尽仍记录通关，超出部分不补发。首次通关、额度、账本、证书和同步事件保持同一事务。

开局冻结题序/版本、实际题数、计时、复活额度、奖励、日上限及证书所需关卡ID集合。快照增加`reviveCount/reviveLimit/revivesRemaining`、`themeName/levelName/levelOrder/difficultyLabel/nextLevelId/themeComplete/certificateRequirements`。结果增加`requested/requestedPoints/awarded/dailyCapReached/dailyPoints/rulesVersion`，区分重玩与日额度截断。当前`me`日额度面向新局；在途旧局使用原冻结日上限。

证书保存颁发时名称、`title/description/footer/levelIds/requirementsVersion`。扩展目录不会撤销旧证书，满足新的关卡集合可发对应新版本证书。SVG与微信PNG均使用当前账号真实已获证书，浏览器生成PNG后通过明确按钮交给系统分享；分享入口打开不代表可信完成。

技术资源输入保护：1—100主题、最多1000关、每关1—2000题、0—100复活额度、单题5—600秒、单关0—1000000积分。有效题池不足时拒绝开局。这些是资源限制，不是正式业务规模批准。

启动时执行一次事务迁移，原ID、会话、进度、账本、证书ID及旧局截止时间保留；旧布尔复活记录转换为0/1次，旧题数由已保存题目计算。维护迁移前备份，迁移失败整笔回滚，不清空数据库。

## 2026-10-18 原生/PC整合增量

GET /api/me新增本人ledger、completions、series{completed,total}，只计当前启用目录。既有字段不变。本机非生产额外启用POST /api/local/session：同一台联调机使用同一体验用户。/api/local/admin/*为原管理界面的受限本机桥接，需X-Quiz-Management:1，不返回管理员凭据；正式管理员API仍鉴权。生产模式无本机桥接。PC当前入口/play，管理页/manage；原生服务使用services-v4/remote.js。视频支持Range。详见统一交付说明。

## 2026-10-25 并发、恢复与同步约定

完整活动导出的题目是可移植数据，不携带原实例的题目 `version`。导入前应读取目标实例的配置和 `/api/admin/questions`，取得目标版本前提；不能从导出文件猜测目标题库版本。

- 配置、关卡写入携带读取到的 `expectedVersion`（配置版本）；题目写入/删除携带题目版本。配置 PUT 和题目 PUT 兼容 `version` 字段。版本格式非法为 400 `INVALID_VERSION`，版本过期为 409 `VERSION_CONFLICT`。前端收到冲突后保留草稿并重新加载，不自动覆盖。
- 完整活动快照导入除 `expectedVersion` 外，还携带 `expectedQuestionVersions: {题目ID:版本}`。服务端在同一事务内对比当前未删除题目集合，包括新增、移除和修改；不一致返回 409，不写入部分内容。题目批量导入对每个已有题携带 `expectedVersion`。
- 为兼容旧集成，省略版本前提的旧调用暂时允许；当前编辑器均携带。新接入方不得依赖此兼容路径，应按上述约定防止覆盖。
- 网络结果不确定、服务端异常或损坏响应时，客户端保留原请求编号以恢复结果；明确业务拒绝才清理待恢复操作并加载权威进度。状态码 401/408/425/429 和 5xx 不能当作“肯定未执行”。
- `POST /api/admin/outbox/retry` 鉴权后以短事务领取事件，外部接收回调在事务外执行。默认每批最多 50 条，每条默认等待 5 秒，支持取消信号。超时保留失败事件及原事件编号，以便重试；接收端须按编号去重，不能将其解释为严格恰好一次投递。
- CSV 严格拒绝闭合引号后的非法字符。面向表格的导出发现公式前缀时停止，完整 JSON 提供无损替代。
