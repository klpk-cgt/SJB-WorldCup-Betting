# 更新日志 (Changelog)

## v2.6.6 - 2026-07-02

### 排行榜修复与优化

#### 问题
- "叫我c罗"今日榜显示 -4055，疑似数据异常
- 收益榜只累计命中收益，不扣除未命中本金，与用户直觉不符
- 命中率榜把"暂无数据"用户排在有数据用户前面
- 连胜榜、今日榜缺少平局打破规则
- 排行榜快照使用同步 `save()` 落库，会阻塞事件循环

#### 修复方案
- **今日榜数据核查**：生产环境验证确认 -4055 为正确结果（北京时间 7/2  settled 的 5 条预测盈亏相抵：+11230 - 700 - 14585 = -4055），m-82 的盈利已正确计入
- **收益榜改为净收益**：`/api/leaderboards` 中 `wonProfitList` 排序依据由 `totalWonProfit` 改为 `netProfit = wallet.balance - wallet.initialPoints`
- **命中率排序修复**：无已结算数据用户统一排在最后；相同命中率按命中场次、余额排序
- **连胜榜排序增强**：当前连胜相同按最高连胜、余额排序
- **今日榜排序增强**：今日盈亏相同按余额、命中场次排序
- **快照异步落库**：`leaderboard_snapshot_service.ts` 中 `dbService.save()` 改为 `saveAsync()`，避免阻塞
- **前端展示优化**：`LeaderboardTab.tsx` 收益榜文案和数值改为净收益；命中率榜列表列改为"命中/已结算"；rankDelta 为 0 时显示"持平"

#### 影响文件
- 后端：`src/server/routes/matches.ts`, `src/server/services/leaderboard_snapshot_service.ts`
- 前端：`src/components/LeaderboardTab.tsx`

#### 部署验证
- 本地 build 通过（2814 modules）
- dist 上传服务器并重启 PM2 worldcup
- 生产 `/api/leaderboards` 验证：收益榜按净收益排序、命中率榜无数据用户排最后、连胜榜正常

## v2.6.5 - 2026-06-29

### AET/PEN 比赛比分分离与结算合规修复

#### 问题
ESPN API 在 AET（加时赛）/PEN（点球大战）比赛返回的 `score` 字段是加时赛结束后的总比分，直接写入 `homeScore/awayScore` 会导致：
- 竞彩结算错误（5 种玩法均以 90 分钟 + 伤停补时为结算标准）
- 小组积分榜计算错误（加时进球被错误计入）

#### 修复方案
- **数据层语义固化**：`homeScore/awayScore` 严格表示 90 分钟比分（结算 + 积分榜使用）；新增 `homeScoreAfterExtraTime/awayScoreAfterExtraTime`（加时后总比分）、`homePenaltyScore/awayPenaltyScore`（点球比分）、`winnerTeamId`（点球大战胜方）
- **同步层**：`espn_sync.ts` 新增 `calculateRegulationScore`，从 ESPN `details` 数组按 `clock.displayValue` 解析分钟数（< 100 为常规时间，≥ 100 为加时赛），并显式排除 `shootout=true` 的点球大战进球；新增 `pickWinnerTeamId` 读取 ESPN `competitor.winner` 字段
- **WebSocket**：`broadcastScoreUpdate` 携带分层比分（90 分钟 / 加时后 / 点球 / 胜方）
- **前端工具**：新建 `src/utils/score.ts` 的 `buildScoreDisplay(match)` 统一返回 `{ main, sub?, penalty?, badge?, isLive }` 结构，覆盖 12 个组件
- **管理后台**：`AdminPanel` 支持 AET/PEN 状态选项 + 分层比分手动编辑（90 分钟 / 加时 / 点球三组输入框）
- **结算层**：零侵入（`settlement_service.ts` 不修改），仍只读取 `homeScore/awayScore` 即可获得正确的 90 分钟比分

#### 影响文件（20 个）
- 后端：`src/server/espn_sync.ts`, `src/server/websocket.ts`, `src/server/helpers.ts`, `src/server/routes/admin.ts`, `src/db/db_service.ts`
- 类型：`src/types.ts`
- 前端工具：`src/utils/score.ts`（新建）
- 前端组件：`MatchDetailPage.tsx`, `MatchesTab.tsx`, `HomeTab.tsx`, `home/FocusMatchCard.tsx`, `home/focusMatch.ts`, `BracketBoard.tsx`, `PredictionTab.tsx`, `TeamDetailDrawer.tsx`, `MeTab.tsx`, `SearchBar.tsx`, `AdminPanel.tsx`, `App.tsx`
- 数据库：`prisma/schema.prisma`（新增 4 个 nullable 字段，已通过 `npx prisma db push` 同步）

### 测试守门
build 通过（2814 modules，无 TS 错误）· ESPN 同步 104 场赛事正常 · API 验证 FT 比赛新字段为 null（正确）· 稳定性审查 10 项清单全部通过

## v2.6.4 - 2026-06-28

### 让球结算Bug修复 + handicap字段持久化 + 5种玩法结算逻辑审查

#### 1. 修复m-71让球结算错误（严重）
- **根因**：`matchOdds['m-71'].handicap` 字段缺失，`judgePrediction` 中 `goalLine = odds?.handicap?.goalLine || 0` 默认0，导致让球未生效按0球结算
- **实际让球数**：2球（阿根廷让2球，从optionLabel "阿根廷(-2) 胜" 推断）
- **让球后比分**：1+2=3 vs 3 → 平局
- **错误结算**：HANDICAP draw LOST，HANDICAP away WON
- **正确结算**：HANDICAP draw WON，HANDICAP away LOST
- **受影响3条下注**：
  - pred-9f20dd30 (user-55f4c47c) draw ¥2000: LOST→WON (+¥7,800)
  - pred-308dc96d (user-52d9aa8c) draw ¥5000: LOST→WON (+¥19,500)
  - pred-7ee47ecb (user-39d8ea17) away ¥3000: WON→LOST (-¥5,970)

#### 2. 修复settlement_service.ts让球结算防御逻辑
- **问题**：handicap字段缺失时默认goalLine=0，导致按0球错误结算
- **修复**：handicap缺失或goalLine无效时返回`null`，走VOID流程返还本金
- **影响文件**：`src/server/services/settlement_service.ts`

#### 3. 修复handicap字段未持久化到MySQL（根因修复）
- **问题**：Prisma schema的MatchOdds模型缺少handicap相关字段，db-storage.mjs的normalizeMatchOddsRows未映射handicap，导致应用重启后handicap数据丢失
- **修复**：
  - `prisma/schema.prisma`：MatchOdds模型新增4个字段（handicapGoalLine, handicapHomeWin, handicapDraw, handicapAwayWin）
  - `scripts/db-storage.mjs`：normalizeMatchOddsRows添加handicap映射，loadSnapshot重建handicap对象
  - `scripts/db-storage.mjs`：两个$transaction调用增加timeout:60000, maxWait:10000（默认5000ms在大数据量恢复时超时）
  - 云服务器执行 `npx prisma db push` 同步表结构
- **影响文件**：`prisma/schema.prisma`, `scripts/db-storage.mjs`

#### 4. 5种玩法结算逻辑审查
- **H2H（胜平负）**：逻辑正确，无问题
- **HANDICAP（让球胜平负）**：已修复（见上）
- **CORRECT_SCORE（比分）**：逻辑正确，支持精确比分+other兜底
- **TOTAL_GOALS（总进球）**：逻辑正确，支持新旧格式
- **HAFU（半全场）**：半场比分暂不支持，统一VOID返还本金，逻辑正确

### 改动文件
`src/server/services/settlement_service.ts`, `prisma/schema.prisma`, `scripts/db-storage.mjs`, `scripts/fix-m71-handicap.cjs`（新增）, `dist/server.cjs`（云服务器）

### 数据库变更
- matchOdds: m-71补齐handicap字段（goalLine=2）
- predictions: 3条HANDICAP重新结算（2条LOST→WON, 1条WON→LOST）
- wallets: 3位用户余额调整（+¥7800, +¥19500, -¥5970）
- transactions: 新增3条调整交易记录
- syncLogs: 新增1条审计日志
- match_odds表: 新增4个handicap列

## v2.6.3 - 2026-06-28

### maxBuffer修复 + The Odds API异常赔率纠正 + m-72结算修复

#### 1. 修复maxBuffer限制导致PM2重启时数据库被重置（严重）
- **根因**：`STORAGE_SCRIPT_MAX_BUFFER` 设为 16MB，但数据库实际大小 16.27MB，超出缓冲区限制
- **故障链**：PM2重启 → `readMySqlSnapshot()` 读取失败（超出16MB）→ 触发 `resetToDefaults()` → 数据库被重置为初始状态
- **修复**：`maxBuffer` 从 16MB 提升至 64MB
- **影响文件**：`src/db/db_service.ts`, `src/server/backup.ts`, `dist/server.cjs`（云服务器热补丁）

#### 2. The Odds API异常赔率纠正
- 清理14条 The Odds API matchOdds（source→MANUAL, syncStatus→SYNCED）
- 重新结算 pred-f424c06b（m-71 CORRECT_SCORE）：赔率 33.51→9.25，回滚 ¥24,260
- user-52d9aa8c 钱包：¥59,901 → ¥35,641
- 更新61条 predictions 的 oddsSnapshot.source: The Odds API → MANUAL
- 重新生成 m-71 postMatchReport
- 添加审计日志和回滚交易记录

#### 3. 修复m-72手动结算遗漏的8条PENDING predictions
- **问题**：阿尔及利亚vs奥地利(3-3)手动结算时仅处理1条prediction，遗漏8条PENDING
- **修复**：8条PENDING全部结算为LOST（无下注3-3平局或H2H draw）
  - H2H away/home × 3条 → LOST（平局非主/客胜）
  - CORRECT_SCORE 2-0/2-1/0-0/1-0/1-1 × 5条 → LOST（实际3-3）
- 修复后 m-72 共9条predictions全部结算（WON:0, LOST:9, PENDING:0）

### 改动文件
`src/db/db_service.ts`, `src/server/backup.ts`, `scripts/correct-theodds-api.cjs`（新增）, `scripts/fix-m72-pending.cjs`（新增）, `dist/server.cjs`（云服务器热补丁）

### 数据库变更
- matchOdds: 14条 The Odds API → MANUAL
- predictions: 1条重新结算 + 8条PENDING→LOST + 61条source更新
- wallets: user-52d9aa8c 回滚 ¥24,260
- transactions: 新增1条回滚交易
- syncLogs: 新增2条审计日志

## v2.6.2 - 2026-06-27

### 竞猜记录展开 + 排行榜今日榜修复 + 战报头像修复

#### 1. 竞猜"我的记录"默认展开
- **PredictionTab**：`showHistory` 默认值从 `false` 改为 `true`，打开等待结算即可看到记录
- 新增钱包余额变化监听（`useRef`），结算后自动刷新记录

#### 2. 排行榜今日榜数据修复
- **新增 `reconcileSettledPredictions` 函数**：基于 transactions（PREDICTION_WIN/PREDICTION_LOSE/REFUND）修复 prediction 状态
- 修复21条异常 prediction（PENDING → WON/LOST/VOID），解决"一碗白米饭"今日榜为0的问题
- `autoSettleFinishedMatches` 结算后自动调用修复
- 服务器启动时自动执行一次数据修复
- `rate` 在 settledCount=0 时返回 `null`（前端显示"暂无"），不再显示误导性的"0%"

#### 3. 战后战报头像显示和最惨玩家修复
- **BattleReportCard**：`StatRow` 传入 `avatarUrl` 给 `SmartAvatar`，修复头像不显示
- **post_match_report_service**：接口和生成逻辑加入 `avatarUrl` 字段
- **getRecentReports**：为旧战报动态补充 `avatarUrl`（从用户表查找）
- **修复 profit 计算**：跳过未结算 prediction，避免 `potentialReturn` 误导战报盈亏
  - 此前未结算下注的 `settledReturn` 为 undefined，fallback 到 `potentialReturn`（正数）
  - 导致亏损用户被当作盈利，最惨玩家（biggestLoss）从未显示

### 改动文件
`src/components/PredictionTab.tsx`, `src/components/LeaderboardTab.tsx`, `src/components/BattleReportCard.tsx`, `src/server/helpers.ts`, `src/server/routes/matches.ts`, `src/server/services/post_match_report_service.ts`, `server.ts`

## v2.6.1 - 2026-06-26

### 积分显示统一与首页称号/等级改造

#### 1. 积分格式统一为 ¥ 前缀
- **新增工具函数**：`src/utils/format.ts` 提供 `formatPoints` / `formatSignedPoints` / `formatOdds` / `formatReturn`，统一 ¥ 前缀 + 千分位格式
- **全局替换**：App / HomeTab / MeTab / PredictionTab / LeaderboardTab / MatchDetailPage / AdminPanel / BattleReportCard / ActivityFeed / AIRecommendations / NetProfitChart 等 12 个组件接入统一格式化函数，移除 PTS 后缀与纯数字混用
- **文案统一**：用户货币相关"积分"文案统一改为"余额"

#### 2. 资料页布局优化
- **余额/净收益行**：MeTab 头像右侧改用 `whitespace-nowrap` + 微调字号/间距，修复 ¥ 符号增加宽度导致的错位
- **净收益格式化**：使用 `formatSignedPoints` 统一带符号显示

#### 3. 首页金币图标动画移除
- **HomeTab**：移除余额左侧金币图标的 `coinPulse` 动画类与对应 keyframes 样式定义

#### 4. 首页"群聊入口"改为成就称号
- **HomeTab**：新增 `/api/me/profile-summary` 请求获取用户成就称号
- 将"🔥 群聊入口"替换为 `⚡ {currentTitle}` 称号徽章（紫色系，与资料页一致）

#### 5. 首页/资料页等级显示统一
- **HomeTab**：引入 `getLevelByNetProfit` 动态计算等级，移除写死的 `Lv.4`
- 等级徽章使用 `currentLevel.badgeBg` 主题色，与资料页等级环色彩一致

### 改动文件
`src/utils/format.ts`(新增), `src/App.tsx`, `src/components/HomeTab.tsx`, `src/components/MeTab.tsx`, `src/components/PredictionTab.tsx`, `src/components/LeaderboardTab.tsx`, `src/components/MatchDetailPage.tsx`, `src/components/AdminPanel.tsx`, `src/components/AdminDashboard.tsx`, `src/components/BattleReportCard.tsx`, `src/components/ActivityFeed.tsx`, `src/components/AIRecommendations.tsx`, `src/components/profile/NetProfitChart.tsx`, `src/server/helpers.test.ts`

### 测试守门
lint 通过 · build 通过

## v2.6.0 - 2026-06-26

### 稳定性修复三阶段实施（17 项改动）

#### 第一阶段：核心玩法一致性
- **1.1 结算跳过终态预测**：`settlement_service.ts` 主循环前过滤 CANCELLED 状态预测，避免对已取消比赛二次结算
- **1.2 forceResettle 卡牌规则**：`forceResettle=true` 时清空 `usedCard` 防止卡牌二次生效，移除 `restoreCard` 死代码
- **1.3 删除死代码**：`prediction_card_service.ts` 移除 `commitCardSettlement` / `cancelPredictionByCard` 等未使用函数
- **1.4 管理员调账走钱包服务**：`admin.ts` 单/批量调账从直接改 `wallet.balance` 改为走 `adjustWalletBalance` + `runBusinessTransaction`；移除 `Math.max(0,...)` 静默截断，余额不足抛错进 failed 列表
- **1.5 补核心 Vitest 用例**：新增 4 个测试文件（wallet_service 7 / settlement_service 14 / prediction_service 7 / admin_adjust 8），共 60 测试全通过

#### 第二阶段：同步/赔率/自动结算
- **2.1 同步 0 场响应诊断**：`sync.ts` 区分 API 错误（FAILED）与无赛事（PARTIAL），新增 0 场诊断信息
- **2.2 API 请求带 league/season**：URL 增加 `league=1&season=2026`（世界杯）过滤 + 不带 league 的 fallback
- **2.3 赔率下注守卫**：`helpers.ts` `resolveOddsSnapshot` 移除兜底默认值（4.0/9.5/3.0/1.8），找不到有效赔率时返回 null；UNSYNCED 状态阻断下注；MANUAL_FALLBACK 透传 source
- **2.4 前端赔率标记**：`PredictionTab.tsx` 当 `oddsSyncStatus !== 'SYNCED'` 显示"赔率待确认"徽章；空 options 显示"本场未开售"
- **2.5 自动结算日志**：`autoSettleFinishedMatches` 补结构化 skip 日志（比分缺失/锁定不足5分钟/开赛不足2.5小时）
- **2.6 赛前检查接口**：新增 `GET /api/admin/pre-match-check`，汇总未来48小时比赛赔率同步状态与缺失项
- **2.7 syncLogs 扩容**：保留数 120 → 300 条

#### 第三阶段：排行榜与用户体验
- **3.1 今日榜北京自然日**：`matches.ts` todayProfit 改用 `toBeijingDateKey` 判断同日，移除滚动24小时窗口
- **3.2 昨日排名快照**：新增 `system_state.ts` 类型 + `leaderboard_snapshot_service.ts` + cron `0 16 * * *`（北京午夜）捕获余额快照，排行榜优先用快照计算 rankDelta
- **3.3 streakList 排序**：改按 `currentStreak` 排序（原为 `maxStreak`）
- **3.4 前端缓存策略**：`utils/api.ts` TTL 2分钟→10秒 + 8个 noCache 实时接口 + 下注后 `clearApiCache` 刷新
- **3.5 前端失败态**：PredictionTab/MatchesTab/LeaderboardTab 三组件加 `loadError` state + 重试按钮
- **3.6 错误消息中文化**：ai.ts/activities.ts/matches.ts/admin.ts/prediction_service.ts 共 15+ 条英文错误消息本地化
- **3.7 赔率来源标记**：`MatchDetailPage.tsx` 赔率快照区显示 oddsSource 徽章 + 同步时间，按 SYNCED/PARTIAL 着色

### 改动文件
`settlement_service.ts`, `prediction_card_service.ts`, `admin.ts`, `sync.ts`, `helpers.ts`, `helpers.test.ts`, `prediction_service.ts`, `matches.ts`, `scheduler.ts`, `operations.ts`, `backfill_scores.cjs`, `ai.ts`, `activities.ts`, `db_service.ts`, `api.ts`, `PredictionTab.tsx`, `MatchesTab.tsx`, `LeaderboardTab.tsx`, `MatchDetailPage.tsx`, `MeTab.tsx`, `BadgeDetailModal.tsx`, `NetProfitChart.tsx`, `profileStyles.css`

### 新增文件
`system_state.ts`, `leaderboard_snapshot_service.ts`, `wallet_service.test.ts`, `settlement_service.test.ts`, `prediction_service.test.ts`, `admin_adjust.test.ts`, `stability-fix-plan.md`

### 测试守门
60/60 测试通过 · lint 通过 · build 通过

## v2.5.2 - 2026-06-15

### Bug 修复：战后战报生成链路修复 + 排行榜结算日志增强 + 资料页战报分页

#### 1. 战后战报生成链路修复（三重防御）
- **根因**：结算时未调用 `generatePostMatchReport()`，首页 `recent-reports` 只读缓存不触发生成，详情页前端条件限制
- **修复**：
  - `settlement_service.ts`：结算完成后自动调用 `generatePostMatchReport()` 生成战报
  - `post_match_report_service.ts`：`getRecentReports()` 增加兜底逻辑，对已结算但缺战报的比赛自动生成
  - `MatchDetailPage.tsx`：战报拉取条件从多重状态检查简化为仅 `isSettled`

#### 2. 排行榜结算异常诊断增强
- **修复**：`settlement_service.ts` 结算状态拦截处增加详细 logger.warn（含 matchId/status/score 等诊断字段），帮助管理员快速定位结算失败原因

#### 3. 资料页战报 Tab 分页
- **修复**：`MeTab.tsx` "战报"Tab 移除 5/6 条硬限制，新增"加载更多"按钮支持展开全部结算记录和积分流水

### 改动文件
`settlement_service.ts`, `post_match_report_service.ts`, `MatchDetailPage.tsx`, `MeTab.tsx`

## v2.5.1 - 2026-06-14

### 热修复：syncLog 持久化修复 + 战报卡片 UI 优化 + 性能优化

#### 1. syncLog MySQL 写入修复（7 commits）
- **根因**：竞彩网同步日志缺少必填字段（`id`/`requestSummary`/`responseSummary`/`createdAt`）+ `detail` 字段不在 Prisma schema 中 + `targetMatchId` 超长溢出 VARCHAR(191)
- **修复**：4 层防御体系
  - `buildLog()` 生成日志时补全所有必填字段
  - `appendSyncLog()` 兜底补全缺失字段
  - `sanitizeSyncLogs()` 持久化前清洗脏数据
  - `db-storage.mjs` MySQL 写入前最后过滤
- **部署注意**：云服务器需执行 `prisma db push` 同步 HAFU 新列

#### 2. 战后战报卡片 UI 优化
- 用户展示改为 SmartAvatar 头像 + emoji 角色标签
- 玩家行统一单列对称布局（emoji + 头像 + 标签/昵称 + 数值右对齐）
- AI 点评轻量化（line-clamp-1/2）

#### 3. 前端性能优化（5项）
- **Tab 存活**：5 个核心 Tab 从条件渲染改为 CSS 隐藏，切 Tab 不再重建组件
- **GameContext useMemo**：避免子组件无效重渲染
- **Tab 懒加载**：改为 React.lazy 动态导入，首屏 JS 体积减少约 50%
- **请求缓存+去重**：`apiRequest` 增加 2 分钟内存缓存 + 并发请求去重
- **PredictionTab**：消除 `/api/tournament-bets` 重复请求
- **WebSocket toast 节流**：同场比赛比分弹窗 30 秒内不重复
- **HomeTab 定时器降频**：1 秒 → 5 秒，减少 80% 重新渲染
- **MatchesTab 搜索防抖**：200ms 防抖优化

### 改动文件
`src/App.tsx`, `src/utils/api.ts`, `src/components/PredictionTab.tsx`,
`src/components/MatchesTab.tsx`, `src/components/HomeTab.tsx`,
`src/server/sporttery_sync.ts`, `src/server/helpers.ts`, `src/db/db_service.ts`,
`scripts/db-storage.mjs`, `src/components/BattleReportCard.tsx`

---

## v2.5.0 - 2026-06-14

### 新增：赛后群战报 + 积分余额 UI 重设计

#### 1. 赛后群战报功能
- 新建 `src/components/BattleReportCard.tsx`：战报卡片组件，支持精简/完整双模式
- 新建 `src/components/BattleReportWall.tsx`：战报墙页面，分页加载+时间线展示
- 三个展示位置：
  - **首页**：群内动态上方显示最近 1 场战报（精简模式）
  - **比赛详情页**：新增「战报」Tab（仅 FT/AET/PEN 完赛显示）
  - **导航抽屉**：新增「战报墙」入口

#### 2. 战报数据增强
- `PostMatchReport` 新增 4 个字段：
  - `exactPredictor`：最准预言家（猜中准确比分 CORRECT_SCORE 的玩家）
  - `darkHorse`：反向明灯（近期连续 ≥3 场猜错的玩家）
  - `popularOpinion`：群体倾向文本（如 "70% 看好荷兰"）
  - `aiCommentary`：AI 趣味点评模板生成函数
- `getRecentReports()` 返回字段扩展，支持首页卡片渲染

#### 3. 新增 API
- `GET /api/battle-reports`：分页返回全部已结算比赛完整战报
- 修复 `recent-reports` 路由被 `/:id` 拦截的 Bug（路由顺序调整）

#### 4. 积分余额 UI 重设计
- 自定义 PTS 金币 SVG 图标（金色渐变 + 高光 + 立体感）
- 积分卡片改为横向布局（图标左 + 数字右）
- 新增 emerald 渐变底色 + 背景光晕效果

### 改动文件
`src/App.tsx`, `src/components/HomeTab.tsx`, `src/components/MatchDetailPage.tsx`,
`src/server/routes/matches.ts`, `src/server/services/post_match_report_service.ts`,
`src/components/BattleReportCard.tsx`(新), `src/components/BattleReportWall.tsx`(新)

---

## v2.4.0 - 2026-06-14

### 重大更新：竞彩网集成 + 竞猜玩法扩展

#### 1. 竞彩网赔率集成（主数据源）
- 新建 `src/server/sporttery_sync.ts`：竞彩网 API 同步引擎，支持赔率/积分榜/赛果同步
- 三级降级链：竞彩网(主) → The Odds API(辅) → Elo 兜底
- 自动同步：积分榜每2小时，赔率通过调度器按优先级自动执行
- 管理后台新增「同步竞彩网赔率」+「同步积分榜」按钮
- 新增环境变量 `SPORTTERY_API_BASE_URL`、`SPORTTERY_SYNC_INTERVAL_MINUTES`

#### 2. 新增玩法：让球胜平负 (HANDICAP)
- 数据来自竞彩网 `hhad` 池，goalLine 让球数
- 按钮标签格式：`德国(-3) 胜` / `让球平` / `库拉索(+3) 胜`
- 未开盘比赛显示「本场未开售让球盘」

#### 3. 新增玩法：半全场 (HAFU)
- 数据来自竞彩网 `hafu` 池，9 种结果：胜胜/胜平/胜负/平胜/平平/平负/负胜/负平/负负
- 3×3 矩阵布局，按上半场结果分三行
- 半场比分暂不可用时结算自动 VOID 返还本金
- 未开盘显示「本场未开售半全场玩法」

#### 4. 完善：总进球数（2项→8项精确投注）
- 从 over/under 2.5 → 0球/1球/2球/3球/4球/5球/6球/7+球
- 竞彩网 `ttg` 池优先，兼容旧格式自动降级显示

#### 5. 完善：比分赔率切换为竞彩网真实数据
- 赔率来源从 Poisson 估算 → 竞彩网 `crs` 池标记 `SPORTTERY`
- 覆盖 25 个精确比分 + 3 个兜底

#### 6. 前端玩法 Tab 重构
- 3 → 5 个玩法 Pill：胜平负 | 让球 | 比分 | 总进球 | 半全场
- 水平可滚动容器 + `justify-center` 居中
- 半全场 3×3 网格、总进球 4×2 网格

#### 7. 玩法结算扩展
- HANDICAP：实际比分 + goalLine 后判定主胜/平/客胜
- HAFU：缺半场比分 → VOID 返还本金
- TOTAL_GOALS：精确进球数匹配 0~7+
- `judgePrediction` 支持 `null` 返回 → VOID 状态

#### 8. 竞彩网积分榜
- `syncWorldCupStandings()` 从 `getTablesV2` 拉取
- `GET /api/group-standings` 竞彩网优先（6h有效）→ 本地计算兜底
- WebSocket 新增 `standings:update` 广播事件
- `DatabaseSchema` 新增 `worldCupStandings` 字段

#### 9. 日期格式兼容
- `normalizeDate()` 统一处理 `2026/6/15`、`2026-06-15` 等格式

### 改动文件
`types.ts`, `config.ts`, `db_service.ts`, `ai.ts`, `helpers.ts`, `sync.ts`,
`settlement_service.ts`, `sync_scheduler_service.ts`, `websocket.ts`,
`routes/admin.ts`, `routes/matches.ts`, `odds.ts`,
`sporttery_sync.ts`(新), `PredictionTab.tsx`, `AdminPanel.tsx`

---

## v2.3.13 - 2026-06-14

### 新增：等级系统重构 + 领奖台修复 + 管理员统一发配积分

#### 1. 等级机制重构（基于净收益阈值）
- 等级改为基于净收益（当前积分 - 初始积分）达到阈值后升级，只升不降
- 共 12 级：青铜球童 → 黑铁后卫 → 绿茵新秀 → 战术中场 → 锋线快马 → 铁血队长 → 战术大师 → 中场核心 → 神锋射手 → 传奇巨星 → 冠军教头 → 球王至尊
- 每级使用不同颜色标识，阈值全部在后台 `config.ts` 配置，前端不显示具体数字，保持 UI 简洁
- 等级仅显示在「我的」资料页，排行榜不显示等级
- **后端** (`config.ts`)：新增 `LevelConfig` 接口、`LEVEL_CONFIGS` 12级配置、`getLevelByNetProfit()` 计算函数
- **前端** (`MeTab.tsx`)：资料卡等级区改为 `Lv.X 等级名称` + 进度条（距下一级百分比）

#### 2. 排行榜领奖台 #3 修复
- 排名 #3 领奖台高度从 `h-16` 提升至 `h-20`，解决 #3 徽章与称号视觉重叠问题
- 排名 #2 同步调整至 `h-24`，保持 1 > 2 > 3 的视觉层次

#### 3. 管理员统一发配积分给全员
- **后端** (`admin.ts`)：新增 `POST /api/admin/users/bulk-adjust-points` 端点，一键给所有用户发放/扣除积分
- **前端** (`AdminPanel.tsx`)：用户管理页新增「统一发配积分给全员」卡片，支持额度+备注输入，二次确认弹窗

### 改动文件
`config.ts`, `MeTab.tsx`, `LeaderboardTab.tsx`, `admin.ts`, `AdminPanel.tsx`

---

## v2.3.12 - 2026-06-14

### 修复：比分同步不清除 scoreUnknown 导致结算阻塞

v2.3.10 关闭 LIVE 赛程同步后，`scoreUnknown` 标记只在赛程同步路径清除，比分同步路径缺失该逻辑，导致兜底模式标记的比赛在配置 API Key 后仍无法自动结算。

- **修复** (`sync_scheduler_service.ts`)：比分同步路径新增 scoreUnknown 恢复逻辑，API 拿到真实比分后自动清除标记，与赛程同步路径保持一致
- 历史积压比赛需在管理后台手动触发一次赛程同步来批量清除已有标记

### 改动文件
`sync_scheduler_service.ts`

---

## v2.3.11 - 2026-06-14

### 优化：解除单场投注50%上限，支持梭哈

移除了单场竞猜"总投入不能超过余额50%"的限制，允许用户自由投入积分，仅保留"下单后至少保留100分"的保底门槛。

- **后端** (`prediction_service.ts`)：移除 `singleMatchTotalBet + betAmount > wallet.balance * 0.5` 校验逻辑
- **前端** (`PredictionTab.tsx`)：下单确认提示文案更新，移除"风险规则限制"表述

### 改动文件
`prediction_service.ts`, `PredictionTab.tsx`

---

## v2.3.10 - 2026-06-14

### 新增：焦点战实时监控 + 同步调用优化

#### 1. 焦点战实时监控面板
- **后端** (`admin.ts`)：新增 `GET /api/admin/dashboard/featured-match` 端点，复用 `selectFeaturedHomeMatch()` 算法选出首页焦点战，返回对阵信息、实时比分、赛程/结算状态、数据源健康度、运维建议
- **前端** (`AdminPanel.tsx`)：仪表盘新增「焦点战实时监控」卡片（位于「一键运维」下方），30秒自动刷新，按严重程度变色边框（绿=正常 / 黄=警告 / 红=紧急）
- 监控内容：📋对阵信息、⚽实时比分、📡数据源状态（API Key/兜底模式/赛程/比分/赔率同步时间）、💰结算状态（运营/结算/比分已知/已结算）、🎯运维建议

#### 2. API 同步调用大幅优化
针对 API-Football 免费套餐（100次/天）进行调用量优化：

| 优化项 | 改动前 | 改动后 | 节省 |
|--------|--------|--------|------|
| LIVE 比分同步间隔 | 30秒 | 60秒 | -50% |
| LIVE 赛程同步 | 5分钟 | 关闭（比分同步已覆盖） | -100% |
| HIGH 赛程同步 | 15分钟 | 30分钟 | -50% |
| NORMAL 赛程同步 | 1小时 | 2小时 | -50% |
| 赛程窗口 futureDays | 10天 | 5天 | 每次12→6次调用 |
| 失败重试次数 | 2次 | 1次 | 减少浪费 |

一场90分钟比赛的 API 调用从 **198次 → 90次**，控制在免费额度内。

### 改动文件
`AdminPanel.tsx`, `admin.ts`, `sync.ts`, `sync_scheduler_service.ts`

---

## v2.3.9 - 2026-06-14

### 新增：管理后台四大体验优化

围绕管理员日常运维效率进行四项针对性改进：

#### 1. API连通性一键检测
- **后端** (`admin.ts`)：新增 `POST /api/admin/integrations/health-check` 端点，分别对 API-Football、The Odds API、Gemini AI 发起连通性验证（5秒超时），返回每项的 HTTP 状态码、响应延迟、错误详情
- **前端** (`AdminPanel.tsx`)：仪表盘「一键运维」区新增紫色「API连通性检测」按钮，点击后展示三列彩色结果卡片（✅正常 / ❌失败 / ⚠️未配置）

#### 2. 赛程结算交互改为底部抽屉
- 重构赛程结算Tab：从左右分栏改为全宽比赛列表 + 底部抽屉编辑面板
- 点击比赛从底部滑入抽屉（CSS `slideUp` 动画），含半透明遮罩、拖拽手柄、X关闭按钮
- 抽屉内完整保留：比赛对阵信息条 → 比分/状态编辑 → 赔率配置 → 保存/同步/结算/强制重算按钮

#### 3. 管理后台全面中文化
- 仪表盘系统状态卡片：Storage→存储、Data→数据、Betting→竞猜、Match health→比赛健康、Database connected→数据库已连接
- 调度状态：Priority→优先级、Reason→原因
- 所有Tab标签、操作反馈消息（opsStatusMsg/toast）全部改为中文

#### 4. 同步日志中文输出
- `sync.ts` 全部 `buildLog()` 的 action/responseSummary 改为中文（按日期同步赛程、同步世界杯赔率、窗口同步完成等）
- `sync_scheduler_service.ts` 健康状态 reason 中文化（未配置 API_FOOTBALL_KEY 等）

### 改动文件
`AdminPanel.tsx`, `admin.ts`, `sync.ts`, `sync_scheduler_service.ts`, `helpers.ts`, `index.css`

---

## v2.3.8 - 2026-06-14

### 新增：账号禁用/启用功能

管理员后台可一键禁用不活跃账号，全链路屏蔽：

- **Admin UI**：用户列表每行新增「禁用/启用」开关按钮，调用 `PUT /api/admin/users/:id` 切换 `CLAIMED` ↔ `DISABLED`
- **排行榜屏蔽**：`/api/leaderboards` 过滤 `status === 'DISABLED'` 的用户，5个榜单均不再出现
- **群内动态屏蔽**：`getRecentActivities` 排除禁用用户的竞猜、签到、答题等动态
- **徽章评估跳过**：`evaluateAllBadges` 循环内 `continue` 跳过禁用用户
- **竞猜禁止**：`placePrediction` 开头校验，禁用用户下注直接抛 `'账号已被禁用'` 错误
- **登录拦截**：已有 (`helpers.ts:148` + `auth.ts:26`) 拦截 DISABLED 用户登录

### 改动文件

`prediction_service.ts`, `matches.ts`, `activity_service.ts`, `badge_service.ts`, `AdminPanel.tsx`

---

## v2.3.4 - 2026-06-14

### 修复

- **每日答题题库不更新** (helpers.ts)：`getDailyQuizQuestions()` 的 shuffle 逻辑存在严重 Bug —— 所有题目 id 以 "q" 开头，`charCodeAt(0)` 永远返回相同值，sort 永远返回 0，导致每天题目顺序完全不变。改用 **Fisher-Yates shuffle + 日期种子伪随机**，确保每日真随机打乱
- **Prisma `correctScoreSource` 错误**：schema.prisma 已定义该字段 (第135行)，但服务器上的 Prisma Client 未重新生成。部署后需手动运行 `npx prisma generate`

### 部署后操作

服务器需执行：
```bash
npx prisma generate  # 重新生成 Prisma Client
pm2 restart all      # 重启应用
```

---

## v2.3.3 - 2026-06-14

### 「我的」资料页全新设计

- **全宽球场背景**：使用 `stadium-light-bg.svg` 替代内联 data URI，渐变遮罩优化让背景可见
- **头像模块上移**：移除 Player Center 英文标题和刷新/分享/退出按钮行，视觉更简洁
- **统计卡片移入总览 Tab**：命中率、净收益、最长连中、单场最高仅在「总览」Tab 内显示，切换战报/徽章/道具时不再显示多余内容
- **宽度一致性**：头像毛玻璃卡与下方内容区域统一 `max-w-xl` 全宽，移动端 `mx-4` 保留呼吸间距
- **Header 装饰**：右上角使用素材包 `worldcup-trophy.svg` + `football.svg` 替代内联手绘 SVG
- **Tab 切换动效**：所有 Tab 内容区添加 `fadeIn` 淡入动画，按钮增加 `hover` 态

### 修复

- **每日答题逻辑修复** (quiz_service.ts)：
  - `hasCompletedQuizToday` 从"今日有任意记录"改为"答完今日全部 3 题"才算完成
  - `submitQuizAnswer` 增加防重复提交校验
  - `getAIQuizCache` 增加按日期过期过滤，自动丢弃旧 AI 题目
- **Framer Motion 动画警告修复**：全局 5 处 `AnimatePresence` 统一添加 `mode="wait"`，消除 `getBoundingClientRect` 运行时警告
  - 涉及文件：App.tsx、HomeTab.tsx、PredictionTab.tsx、TeamDetailDrawer.tsx、FocusMatchCard.tsx

### 资产

- **新增素材**：`public/assets/player-profile/` (14个SVG)、`public/profile-icons/` (16个PNG图标)
- **新增字体**：引入 Bebas Neue 字体 (Google Fonts CDN)
- **移除重复/废弃内容**：
  - `player_profile_ui_package/` (已复制到 public，设计文档不再需要)
  - `public/preview-me-light.html` / `public/preview-me-redesign.html` (原型预览)
  - `public/stadium-bg.svg` (未使用)
  - `public/assets/player-profile/design-tokens.css` (未引用)

### 构建

- Vite build ✅ 2806 modules, 10.8s
- TypeScript 变更文件零错误
- ESLint 全 src 零诊断

---

## v2.3.2 - 2026-06-13

### 首页布局优化

- **新增「群内倾向」卡片**：放在今日 AI 娱乐预测下方，展示焦点战的主胜/平局/客胜三条百分比进度条，数据复用 `GET /api/matches/:id` 的 `sentiment` 字段，UI 风格与比赛详情页一致
- **「群内动态」移至首页底部**：从原位置（AI 预测下方）移至每日足球问答下方，方便用户聚焦核心内容后浏览动态
- **群内动态展开交互**：默认显示 2 条，新增胶囊样式「展开全部 20 条」按钮，展开后切换为「收起」

### 技术细节

- 新增 `sentiment` / `sentimentLoading` / `activityExpanded` 三个 state
- sentiment 数据通过独立 `useEffect` 监听 `unifiedFeaturedMatch?.id` 变化自动获取
- ActivityFeed 复用已有 `limit` prop 实现 2/20 条切换，无需修改子组件

---

## v2.3.1 - 2026-06-13

### 赔率系统修复与增强

- **修复 oddsDecimal 恒为 1 的 bug**：`resolveOddsSnapshot()` 中 market 大小写不匹配（前端传 `h2h`，代码检查 `H2H`），添加 `.toUpperCase()` 归一化处理
- **修复赔率同步 422 错误**：The Odds API 不支持 `correct_score` market，移除该参数，仅使用 `h2h,totals`
- **新增手动赔率同步路由**：`POST /api/admin/sync/odds` — 全量同步赔率，不自动触发以节省 API 调用次数（免费版 500次/月）
- **The Odds API Key 集成测试**：验证 Key 可用，68 场比赛成功同步 67 场真实赔率

### 代码质量优化 (审查驱动)

- **TypeScript 严格模式**：启用 `strictNullChecks`、`noUnusedLocals`、`noFallthroughCasesInSwitch`
- **Props 类型修复**：4 个组件（PredictionTab/MeTab/HomeTab/LeaderboardTab）Props 从 `any` 改为 `User | null` 和 `Wallet | null`
- **catch 块类型安全**：22 处 `catch (e: any)` → `catch (e: unknown)` + `instanceof Error` 安全访问 `.message`
- **`helpers.ts` 瘦身**：~700 行题库数据提取到独立 `quiz_data.ts`（100题）
- **`room-1` 硬编码配置化**：添加 `DEFAULT_ROOM_ID` 环境变量，`ai.ts` 使用 `getRuntimeConfig()` 动态读取
- **console.log → logger**：替换 `helpers.ts` 中残留的 console.log

### 性能优化

- **Vite 代码分割**：添加 `manualChunks` 配置，将 react/motion/recharts/socket.io/html2canvas 分离为独立 chunk
- **React.lazy + Suspense**：7 个非首页组件懒加载（AdminPanel/BracketPage/HistoryHall/MatchDetail/Stats/WatchGuide/AIRecommend），首屏体积减少 60%+
- **排行榜性能**：O(n×(P+T)) → O(P+T+U)，预聚合 Map 单次遍历替代每用户重复 filter

### 项目清理

- **PWA 移除**：删除 `manifest.json`、`sw.js`、相关 meta 标签和 Service Worker 注册（仅手机浏览器使用）
- **根目录清理**：删除 15 个测试残留文件（admin-*.txt/health-check.txt/test-*.cjs 等）、临时图片、metadata.json
- **脚本归类**：7 个 `.cjs` 工具脚本移至 `scripts/`
- **文档归档**：6 篇冗余旧文档移至 `docs/archive/`

### 部署优化

- **Dockerfile 瘦身**：移除生产不需要的 `scripts/` 复制，添加 `npm prune --production` 减少镜像体积
- **Dockerfile 健康检查**：添加 `HEALTHCHECK` 指令监控服务状态

### 文档

- **新增 `项目维护文档.md`**：完整的 12 章节维护手册（技术栈/API/数据库/部署/业务逻辑/运维操作指南）

---

## v2.3.0 - 2026-06-13

### 赔率同步修复与降级安全增强

- **赔率API同步失败根因定位**：`.env` 中 `API_FOOTBALL_KEY` 和 `THE_ODDS_API_KEY` 均为空，导致所有同步走降级逻辑，赔率全部使用兜底模板。需管理员填入有效 API Key 后才能启用实时赔率同步
- **统一两套 `generateDefaultOdds`**：删除 `sync.ts` 中的重复版本，统一使用 `utils/odds.ts` 中基于 FIFA 排名差异化的版本
- **新增 `scaleCorrectScoreOdds` 算法**：根据 h2h 隐含概率缩放 correctScore 模板赔率，强队主胜比分赔率降低，弱队客胜比分赔率升高
- **赔率 WebSocket 推送接通**：`syncOddsForMatches` 更新赔率后自动触发 `broadcastOddsChange`，变化超过 0.05 阈值时推送
- **前端 WebSocket 实时刷新**：HomeTab 新增 `wsScoreUpdate`/`wsOddsChange` props，比分和赔率变动时局部更新本地状态，无需重新请求全量
- **比分未知标识**：降级模式下 FT 比赛不再广播虚假 0:0 比分，新增 `scoreUnknown` 标记，前端显示"待确认"

### 结算安全防护

- **结算服务无比分保护**：`settlement_service` 中无比分比赛结算时明确提示"降级模式下需管理员手动录入比分"，不再以 0:0 错误结算
- **降级逻辑不再广播虚假比分**：`sync_scheduler_service` 中 FT 状态无比分时标记 `scoreUnknown: true`，不广播 0:0
- **自动结算跳过 scoreUnknown 比赛**：`autoSettleFinishedMatches` 对比分未知的 FT 比赛记录管理员提醒日志

### 备份恢复功能

- **新增管理端备份恢复 API**：
  - `GET /api/admin/backups` — 列出所有备份
  - `POST /api/admin/backups` — 手动创建备份
  - `POST /api/admin/backups/restore` — 从备份恢复（支持全量恢复和精确恢复单个用户）
  - `GET /api/admin/backups/:fileName/users` — 从备份中列出可恢复的用户
- **精确用户恢复**：支持从备份中提取单个用户及其关联数据（钱包、交易、预测、卡牌、徽章、称号），不影响其他用户数据
- **全量恢复安全保护**：全量恢复前自动创建当前数据库备份

### 同步健康监控

- **新增 `GET /api/health/sync` 端点**：无需管理员认证，返回各同步模块健康状态（healthy/degraded）
- **连续失败告警**：赛程/赔率/比分同步连续失败 3 次时记录 ERROR 日志并推送系统通知
- **启动时立即执行初始同步**：服务启动后立即执行一次同步 tick，不等待 cron 下一分钟

### 其他

- `serializeMatch` 新增 `scoreUnknown`、`oddsSyncStatus`、`oddsSource`、`oddsLastSyncedAt` 字段
- `initial_data.ts` 赔率初始化使用基于 FIFA 排名的差异化版本

## v2.2.0 - 2026-06-13

### 阶段一：基础修复与通知系统

- **history_scholar 徽章修复**：新增 `HISTORY_VISIT` 活动类型，历史长廊访问时自动记录，访问 3 次以上解锁"历史学者"徽章
- **活动记录接口**：新增 `POST /api/activities/record` 接口，支持前端记录用户活动事件
- **轻量 Toast 通知系统**：新增 `celebrate`（庆祝）和 `badge`（徽章解锁）两种通知类型，WebSocket 实时推送自动弹出 Toast（比分更新/竞猜命中/比赛结算/徽章解锁/连胜达成）

### 阶段二：功能补全

- **分享功能落地**：安装 html2canvas，个人中心新增"保存战绩"按钮，一键截图身份卡区域保存为 PNG
- **问答题库扩充**：从 15 题扩充到 100 题，涵盖世界杯历史、球星知识、球队文化、足球规则、趣闻纪录、2026 专题
- **AI 每日自动生成新题**：支持 DeepSeek/Gemini 双提供商，混合出题模式（2 道静态 + 1 道 AI），管理端触发接口 `POST /api/quiz/generate-ai`

### 阶段三：数据可视化增强

- **群内预测准确率排行**：统计页新增准确率排行卡片，按命中率排名，进度条+百分比+排名徽章
- **淘汰赛对阵图实时更新**：晋级（绿色+勾号）、淘汰（删除线+半透明）、进行中（脉冲动画）状态标记，WebSocket 自动刷新

### 阶段四：动态更新

- **小组积分榜 API**：新增 `GET /api/group-standings`，返回 12 个小组实时积分榜（赛/胜/平/负/净胜/积分）
- **观赛攻略出线形势**：小组分析展开时显示实时积分榜表格，前 2 名出线区绿色高亮

### 其他改进

- **比赛详情页增强**：MatchDetailPage 大幅优化（+229 行）
- **管理面板调整**：AdminPanel 细节优化
- **日志系统增强**：logger 模块扩展
- **结算服务调整**：settlement_service 更新

### 新增文件

- `docs/screenshots/homepage.png` - 首页预览截图

## v2.1.6 - 2026-06-13

### 功能改进

- **AI 预测卡片 B+C 缓存策略**：启动时预热缓存 + 每3小时后台刷新 + 本地文件兜底（`runtime/prediction-data.json`），离线重启也能展示预测
- **数据源改为 jsDelivr CDN**：`cdn.jsdelivr.net` 国内可直接访问，替代原 Vercel API 和 GitHub Raw
- **比赛 ID 匹配**：data.json 通过 id 与本地比赛数据匹配（`m-1` → id:1），替代队名模糊匹配
- **只显示1场焦点战预测**：优先焦点战 > 信心等级 > 开赛时间，卡片更聚焦
- **预测数据丰富化**：新增进球预期（totalGoals）、半全场（htft）、赛果（result）字段展示
- **管理面板增强**：系统状态卡片、一键运维、窗口同步、强制重算按钮
- **焦点战选择逻辑重构**：统一 `homeMatchSelection` 工具函数，支持进行中/即将开赛/完赛

### 新增文件

- `src/server/services/home_ai_prediction_service.ts` - AI 预测服务层（独立模块）
- `src/utils/homeMatchSelection.ts` - 首页焦点战选择逻辑
- `scripts/check-home-ai-prediction.mjs` - AI 预测调试脚本
- `vitest.config.ts` - 测试配置

## v2.1.5 - 2026-06-13

### 功能改进

- **AI 预测卡片数据源重构**：新增 GitHub Pages 爬取作为主要数据源（国内服务器可访问），替代原 Vercel API
- **三级降级策略**：GitHub Pages 爬取 → Vercel API → 本地赔率预测，确保任何网络环境都能展示
- **丰富预测数据展示**：新增竞彩 SPF 赔率、伤停信息、比赛场馆、焦点战标记、标签（揭幕战/死亡之组）
- **信心等级颜色区分**：铁胆(绿)、稳胆(青)、大概率(橙)、中等(灰)，视觉更直观
- **队名智能匹配**：爬取数据与本地比赛数据通过中英文队名模糊匹配

### 文件变更

- 重写 `src/server/routes/home.ts` - 新增 HTML 爬取、解析、队名匹配逻辑
- 重写 `src/components/home/AIPredictionCard.tsx` - 新增伤停/场馆/标签/赔率展示，信心等级颜色化

## v2.1.4 - 2026-06-13

### 功能改进

- **焦点战智能选择**：`HomeTab.tsx` 重构焦点战匹配逻辑，优先级：进行中比赛 > 当前比赛窗口(3h内) > 即将开赛 > 最近完赛，不再依赖固定数据
- **比赛状态分类**：新增 `FINISHED_STATUSES`/`LIVE_STATUSES` 集合，精确区分完赛/进行中/未开赛
- **倒计时格式化**：新增 `formatCountdown()` 和 `formatBeijingTime()` 工具函数
- **阶段中文标签**：新增 `stageLabel()` 映射比赛阶段为中文

### 文件变更

- 修改 `src/components/HomeTab.tsx` - 焦点战智能选择逻辑重构

## v2.1.3 - 2026-06-13

### Bug 修复

- **比赛列表排序**：`matches.ts` 比赛列表和今日比赛接口返回数据按开赛时间排序，新增 `sortMatchesByStartTime()` 工具函数
- **竞猜锁定状态分类**：`PredictionTab.tsx` 新增 `LOCKED` 分类，已锁定比赛单独展示，不再混入可下注列表

### 功能改进

- **AI 预测卡片优化**：标题改为"今日 AI 娱乐预测"，变量命名规范化
- **首页路由增强**：`home.ts` 大幅重构，AI 预测卡片接口支持多提供商降级、缓存、错误处理
- **db-storage 脚本优化**：`db-storage.mjs` 读写操作增强 utf8mb4 字符集保障
- **调试脚本**：新增 `scripts/debug-match-order.mjs`，`package.json` 添加 `ops:debug:matches` 命令

### 部署支持

- **PM2 生态配置**：新增 `ecosystem.config.cjs`，自动加载 `.env.production`
- **.gitignore 修复**：排除 `src/assets/*.png`，修复构建时缺少球场背景图

### 文件变更

- 修改 `src/server/routes/matches.ts` - 比赛列表按开赛时间排序
- 修改 `src/server/routes/home.ts` - AI 预测卡片接口重构
- 修改 `src/server/helpers.ts` - 新增 sortMatchesByStartTime
- 修改 `src/components/PredictionTab.tsx` - 新增 LOCKED 状态分类
- 修改 `src/components/home/AIPredictionCard.tsx` - 标题和变量优化
- 修改 `scripts/db-storage.mjs` - 字符集保障增强
- 修改 `package.json` - 新增调试命令
- 新增 `ecosystem.config.cjs` - PM2 配置

## v2.1.2 - 2026-06-13

### Bug 修复

- **AI 预测卡片未渲染**：`HomeTab.tsx` 中 `AIPredictionCard` 已 import 但未在 JSX 中渲染，现已添加到首页焦点战卡片与群内动态之间
- **useScrollReveal 未使用**：GSAP 动画系统的 `useScrollReveal` hook 已定义但无组件调用，现已应用到统计页和排行榜

### 功能完善

- **统计页滚动动画**：`StatsPage.tsx` 4 个图表 section 均添加 `useScrollReveal`，滚动时渐入动画
- **排行榜头部动画**：`LeaderboardTab.tsx` 头部区域添加 `useScrollReveal`，配合已有 `useStaggerReveal` 列表行交错动画
- **ChartCard 组件重构**：改为 `React.forwardRef` 支持外部 ref 传递

### 文件变更

- 修改 `src/components/HomeTab.tsx` - 添加 `<AIPredictionCard />` 渲染
- 修改 `src/components/StatsPage.tsx` - 引入 useScrollReveal，4 个 section 添加 ref
- 修改 `src/components/LeaderboardTab.tsx` - 引入 useScrollReveal，头部添加 ref

## v2.1.1 - 2026-06-13

### Bug 修复

- **事务回滚机制**：`transaction_guard.ts` 新增快照回滚，业务事务失败时自动恢复数据状态，防止脏数据写入
- **下注扣款顺序修复**：`prediction_service.ts` 调整为先扣款再消耗卡牌，避免卡牌消耗后扣款失败导致数据不一致
- **结算卡牌效果金额修复**：`settlement_service.ts` 统一卡牌效果处理逻辑，修复卡牌效果金额计算错误，中奖+卡牌效果合并为单笔交易记录
- **每日问答时区修复**：`helpers.ts` 使用 `toBeijingDateKey()` 替代 `new Date().toISOString()`，确保北京时间日期正确

### 性能优化

- **移除请求级维护调用**：`matches.ts` 路由移除所有 `runScheduledMaintenance()` 调用，避免每次 API 请求都执行维护逻辑，显著提升响应速度

### 功能改进

- **观赛攻略入口**：`App.tsx` 新增观赛攻略页面导航入口（Eye 图标）
- **连接状态优化**：WebSocket 连接状态"离线"改为"延迟"，移除脉冲动画减少视觉干扰
- **MySQL 字符集保障**：`db-storage.mjs` 读写操作强制使用 `utf8mb4` 字符集，事务内设置 `SET NAMES utf8mb4`

### 代码质量

- **db_service 增强**：新增 `saveOrThrow()`、`createSnapshot()`、`restoreSnapshot()` 方法，提取 `persistCurrentState()` 私有方法
- **代码格式化**：`settlement_service.ts` 和 `prediction_service.ts` 代码格式化，移除冗余注释
- **清理废弃文档**：删除 `NAVIGATION_HUB_IMPLEMENTATION_PLAN.md`

### 文件变更

- 修改 `src/server/services/transaction_guard.ts` - 事务失败自动回滚
- 修改 `src/server/services/prediction_service.ts` - 扣款顺序修复 + 代码清理
- 修改 `src/server/services/settlement_service.ts` - 卡牌效果金额修复 + 代码格式化
- 修改 `src/server/helpers.ts` - 每日问答时区修复
- 修改 `src/server/routes/matches.ts` - 移除请求级维护调用
- 修改 `src/db/db_service.ts` - 新增快照/回滚方法
- 修改 `src/App.tsx` - 观赛攻略入口 + 连接状态优化
- 修改 `scripts/db-storage.mjs` - MySQL utf8mb4 字符集保障
- 删除 `NAVIGATION_HUB_IMPLEMENTATION_PLAN.md`

---

## v2.1.0 - 2026-06-13

### 新增功能

#### 1. AI 预测卡片（首页）
- 新增 `AIPredictionCard.tsx` 首页 AI 预测卡片组件
- 接入第三方预测 API，展示 1-3 场比赛的 AI 预测
- 支持信心等级展示、比分参考、预测理由
- 3 小时内存缓存，避免频繁调用第三方 API
- 投注化词汇自动映射为娱乐化表达（"铁胆"→"高信心"）

#### 2. 观赛攻略页面
- 新增 `WatchGuidePage.tsx` 2026 世界杯观赛全攻略页面
- 12 组小组深度分析 + 黑马预测
- 10 场必看对决推荐
- 4 支新军首秀故事（乌兹别克斯坦、约旦、库拉索、佛得角）
- 整体赛事格局预测

#### 3. 世界杯数据扩充
- 新增 `classicMatches.ts` - 20 场经典比赛回顾（1930-2022）
- 新增 `playerProfiles.ts` - 20 位球星趣味档案（10 传奇 + 10 当红）
- 新增 `tactics.ts` - 15 支球队战术分析
- 新增 `visualStats.ts` - 数据可视化静态数据集（各大洲夺冠分布、进球趋势、东道主成绩、点球大战胜率）
- 新增 `watchGuide2026.ts` - 观赛攻略完整数据

#### 4. GSAP 动画系统
- 新增 `src/animations/index.ts` 动画工具集
- `useReducedMotion()` - 无障碍动画偏好检测
- `useStaggerReveal()` - 子元素依次淡入动画
- `useScrollReveal()` - 滚动触发淡入动画
- `useFadeIn()` - 简单淡入动画

#### 5. 后端服务层重构
- 新增 `src/server/services/` 服务层目录，拆分业务逻辑
- `settlement_service.ts` - 统一结算服务
- `prediction_service.ts` - 统一下注服务
- `wallet_service.ts` - 统一钱包服务（所有余额变动唯一入口）
- `card_transaction_service.ts` - 统一卡牌交易服务
- `quiz_service.ts` - 每日问答服务
- `sync_scheduler_service.ts` - 动态同步调度（智能频率调整）
- `post_match_report_service.ts` - 赛后战报服务
- `transaction_guard.ts` - 业务事务包装器

#### 6. 首页路由
- 新增 `src/server/routes/home.ts` 首页 AI 预测卡片接口
- `GET /api/home/ai-prediction-card` 接口

#### 7. 球员头像扩充
- 新增大量球员头像图片（覆盖 48 支参赛队伍）
- 包括阿根廷、巴西、法国、德国、英格兰、日本、韩国、墨西哥等全部参赛国

### 技术改进

- 后端服务层模块化：将业务逻辑从路由中拆分到独立 service 文件
- 钱包服务统一入口：禁止其他模块直接修改 wallet.balance
- 动态同步调度：根据比赛阶段智能调整同步频率（LOW/NORMAL/HIGH/LIVE）
- 事务保护：`runBusinessTransaction` 保证数据一致性
- 赛后战报自动生成：结算后自动生成适合群聊传播的战报
- Prisma schema 更新：新增 quiz 相关表结构
- 环境变量校验增强

### 文件变更

- 新增 `src/animations/index.ts`
- 新增 `src/components/WatchGuidePage.tsx`
- 新增 `src/components/home/AIPredictionCard.tsx`
- 新增 `src/data/worldcup/classicMatches.ts`
- 新增 `src/data/worldcup/playerProfiles.ts`
- 新增 `src/data/worldcup/tactics.ts`
- 新增 `src/data/worldcup/visualStats.ts`
- 新增 `src/data/worldcup/watchGuide2026.ts`
- 新增 `src/server/routes/home.ts`
- 新增 `src/server/services/` 目录（8 个服务文件）
- 更新 `src/components/HomeTab.tsx` - 集成 AI 预测卡片
- 更新 `src/components/MatchDetailPage.tsx` - 比赛详情增强
- 更新 `src/components/MatchesTab.tsx` - 赛程页面优化
- 更新 `src/components/HistoryHallPage.tsx` - 历史长廊扩充
- 更新 `src/components/TeamDetailDrawer.tsx` - 球队详情增强
- 更新 `src/components/LeaderboardTab.tsx` - 排行榜优化
- 更新 `src/server/helpers.ts` - 辅助函数重构
- 更新 `src/server/routes/admin.ts` - 管理接口增强
- 更新 `src/server/routes/ai.ts` - AI 路由优化
- 更新 `src/server/routes/matches.ts` - 比赛路由重构
- 更新 `src/server/routes/cards.ts` - 卡牌路由优化
- 更新 `src/server/routes/checkin.ts` - 签到路由重构
- 更新 `src/server/scheduler.ts` - 调度器优化
- 更新 `src/db/db_service.ts` - 数据库服务增强
- 更新 `prisma/schema.prisma` - 数据模型更新
- 更新 `package.json` - 新增依赖
- 新增大量球员头像图片（`public/player-avatars/`）

---

## v2.0.0 - 2026-06-07

### 新增功能

#### 1. 管理后台全面升级
- **单个创建账号**：管理员可手动设置登录码、昵称、初始积分，无需 PIN 即可登录
- **删除账号**：支持删除用户及其关联数据（钱包、预测记录、交易记录），带全屏确认弹窗
- **头像上传**：支持 Base64 格式图片上传，直接存储在数据库中
- **积分调账**：管理员可手动调整用户积分，支持自定义调账原因
- **中文错误提示**：所有接口返回中文错误信息，便于管理员理解

#### 2. 首字母登录系统
- 拼音首字母转换：输入中文昵称自动生成首字母登录码（如"张三"→"ZS"）
- 无 PIN 登录：管理员创建的账号无需 PIN，直接用首字母登录
- 登录码唯一性校验：防止重复登录码

#### 3. 历史长廊全面扩充
- **冠军年表**：从 11 届扩充至 **22 届完整数据**（1930-2022），含决赛比分、金靴奖
- **经典球队**：从 4 支扩充至 **8 支**（新增 1970 巴西、1974 荷兰、1954 西德、1986 阿根廷）
- **传奇球星**：从 4 人扩充至 **10 人**（新增贝利、克洛泽、克鲁伊夫、方丹、穆勒、马特乌斯）
- **世界杯纪录**：从 4 条扩充至 **12 条**（新增最快进球、参赛最多、最年长进球者等）

#### 4. 长线竞猜优化
- 冠军、金靴、金球竞猜界面美化
- 同步显示球员头像 + 国家国旗
- 竞猜选项卡片化展示

### 技术改进

- 后端路由模块化：将 `server.ts` 拆分为 `routes/` 目录下的独立路由文件
- 添加 `getPinyinInitials` 拼音首字母转换工具函数
- 完善 TypeScript 类型定义

### 文件变更

- 新增 56 个球员头像图片（`public/player-avatars/`）
- 新增 FIFA 球员信息数据文件
- 更新 `src/components/AdminPanel.tsx` - 管理后台 UI
- 更新 `src/components/HistoryHallPage.tsx` - 历史长廊 UI
- 更新 `src/data/historyHall.ts` - 历史数据
- 更新 `src/server/helpers.ts` - 拼音转换工具
- 更新 `src/server/routes/admin.ts` - 管理接口
- 更新 `src/server/routes/auth.ts` - 无 PIN 登录支持
- 更新 `src/App.tsx` - 管理员登录入口
- 更新 `src/components/MeTab.tsx` - 管理后台入口按钮
