# 项目功能稳定性修复实施计划

## 摘要

本计划基于只读代码审查 + 三路探索代理报告制定，目标是修复影响淘汰赛后稳定运行的核心玩法一致性问题。分三阶段递进：先修结算/卡牌资金安全 → 再稳同步/赔率/自动结算 → 最后优化排行榜与前端体验。

所有改动以"可回滚、先备份"为前提，不删除用户/竞猜/积分/流水数据，不改 Docker 部署形态。

## 当前进度（已重新核对代码状态）

### 第一阶段进度
- [x] **1.1 修复结算跳过终态预测** — `settlement_service.ts:100-102` 已加 `p.status !== 'CANCELLED'` 过滤；主循环对 CANCELLED 预测完全跳过。
- [x] **1.2 修复 forceResettle 卡牌规则** — 已移除无条件 `restoreCard`；line 166 清空 `prediction.usedCard = undefined`；WON 分支 line 213-217、LOST 分支 line 307-310 检查 `cancelPrediction` 标志。
- [x] **1.3 删除死代码** — `prediction_card_service.ts` 已删除 `commitCardSettlement` 和 `cancelPredictionByCard`；`restoreCard` 函数保留（`card_transaction_service.ts` 仍在用）。
- [x] **1.4 管理员调账走钱包服务** — `admin.ts` 单/批量调账已改走 `adjustWalletBalance` + `runBusinessTransaction`；移除 `Math.max(0,...)` 静默截断；余额不足抛错进 failed 列表。
- [x] **1.5 补核心 Vitest 用例** — 新增 `wallet_service.test.ts`(7)、`settlement_service.test.ts`(14)、`prediction_service.test.ts`(7)、`admin_adjust.test.ts`(8)、`helpers.test.ts` 扩展 resolveOddsSnapshot(8)；共 60 测试全通过。

### 第二阶段进度（部分实施）
- [x] 2.1 同步 0 场响应诊断（`sync.ts` 区分 FAILED vs PARTIAL + 0场诊断）
- [x] 2.2 API-Football 请求带 league/season（`sync.ts` league=1&season=2026 + fallback）
- [x] 2.3 赔率下注守卫（`helpers.ts:640-682` 移除兜底默认值 4.0/9.5/3.0/1.8 → 返回 null；UNSYNCED 阻断；MANUAL_FALLBACK 透传 source）
- [x] 2.4 前端赔率同步状态标记（`PredictionTab.tsx` oddsSyncStatus !== SYNCED 显示"赔率待确认"徽章；默认分支空 options 显示"本场未开售"）
- [x] 2.5 自动结算阻塞原因日志（`helpers.ts:702-775` 补结构化 skip 日志：比分缺失/锁定不足5分钟/开赛不足2.5小时）
- [x] 2.6 赛前检查接口（新增 `GET /api/admin/pre-match-check`，汇总未来48小时比赛赔率同步状态与缺失项）
- [x] 2.7 syncLogs 保留数提升（`helpers.ts:535` 120→300）

### 第三阶段进度（部分实施）
- [x] 3.1 排行榜今日榜改北京时间自然日（`matches.ts` todayProfit 用 toBeijingDateKey 判断同日；移除 anchorTime/oneDay 滚动窗口）
- [x] 3.2 昨日排名快照（新增 `system_state.ts` 类型 + `leaderboard_snapshot_service.ts` + cron `0 16 * * *` 北京午夜捕获；matches.ts 优先用快照回退流水）
- [x] 3.3 streakList 排序与展示一致（`matches.ts` streakList 改按 currentStreak 排序）
- [x] 3.4 前端缓存策略（`utils/api.ts` TTL 2分钟→10秒 + noCache 名单 8 个实时接口 + clearApiCache 在下注后调用）
- [x] 3.5 前端失败态（PredictionTab/MatchesTab/LeaderboardTab 三组件加 loadError state + 重试按钮）
- [x] 3.6 后端 error message 本地化（ai.ts/activities.ts/matches.ts/admin.ts/prediction_service.ts 共 15+ 条英文错误消息中文化）
- [x] 3.7 MatchDetailPage 赔率来源标记（赔率快照区显示 oddsSource 徽章 + 同步时间，按 SYNCED/PARTIAL 着色）

### 待办前置
- [ ] MySQL 备份（之前 PowerShell 管道导出 6 字节失败，需用可靠方式重做）

## 当前状态分析（探索已验证）

### 基线
- `npm run lint` / `npm test` / `npm run build` 均通过；`npm run ops:diagnose` 可跑通。
- 测试覆盖极低：仅 `src/server/helpers.test.ts`（quiz 洗牌）和 `src/server/services/quiz_service.test.ts` 两个文件，结算/卡牌/下注/钱包/排行榜 0 覆盖。
- MySQL 里 `predictions=0`，无法用现有数据证明下注/卡牌/回滚结算链路正常。

### P0 资金安全风险（已验证）
1. **CANCELLED 预测被重结算**：`settlement_service.ts:98` 取 `db.predictions.filter(p => p.matchId === match.id)` 不按 status 过滤；line 189 主循环对每个预测无条件 `judgePrediction`。反悔卡撤销后（status=CANCELLED，已通过 CARD_REFUND 退过本金）的预测会被再次判定并发钱。
2. **forceResettle 重复收益**：`settlement_service.ts:161-175` 无条件 `restoreCard`，但 line 177-181 重置 prediction 时**不清空 `usedCard`**，重结算主循环再次调用 `applyCardToSettlement` 对同一张已退回的卡二次生效。
3. **applyCardToSettlement 的 `cancelPrediction` 标志被忽略**：`prediction_card_service.ts:281-288` 对 REGRET 返回 `cancelPrediction:true`，但 `settlement_service.ts:217,311` 从不检查该标志。
4. **管理员调账绕过钱包服务**：`admin.ts:535-584`（单用户）和 `587-639`（批量）直接改 `wallet.balance` 并 push transaction，违反 `wallet_service.ts:1-14` 声明的统一入口契约；且 `Math.max(0, ...)` 静默截断扣款，余额不足时扣账不彻底且无错误日志。
5. **死代码**：`prediction_card_service.ts:298-387` 的 `commitCardSettlement` / `cancelPredictionByCard` 全工程无调用方，逻辑与正式实现不同，易误导。

### P0/P1 同步与赔率风险（已验证）
6. **0 场响应被误判为正常 PARTIAL**：`sync.ts:333-347` 请求返回 0 场时 `status:'PARTIAL'`、无 `errorMessage`，无法区分"今天确实没比赛"与"API Key 配额耗尽/网络异常"。
7. **API-Football 请求未带 league/season**：`sync.ts:213` 仅按 `date` 请求，拉取全球所有联赛赛事，浪费配额。
8. **用户端不显示赔率同步状态**：`resolveOddsSnapshot`（`helpers.ts:640-676`）不校验 `syncStatus`，UNSYNCED/PARTIAL/MANUAL_FALLBACK 赔率照样可下注；缺失赔率时还用兜底默认值（4.0/9.5/1.8）。AdminPanel 有标记，用户端组件无消费。
9. **buildOddsSyncStatus 永远返回 PARTIAL**：`sync.ts:179-184` 因 The Odds API 不提供 correct_score 市场，syncStatus 永远 PARTIAL，需 Sporttery 覆盖才变 SYNCED。
10. **LIVE 同步双路径**：`helpers.ts:812-851` 和 `sync_scheduler_service.ts:538-601` 并行，可能重复消耗配额。
11. **syncLogs 截断到 120 条**：`helpers.ts:535`，历史诊断丢失。

### P1/P2 排行榜与前端风险（已验证）
12. **"今日榜"=滚动24小时**：`matches.ts:447,521-523` 用 `Date.now()-24h`，而 `/api/matches/today` 用北京时间自然日（`helpers.ts:195-201`），两套"今日"语义不一致。
13. **rankDelta 语义错误**：`matches.ts:478-493` 用"最近一条交易 balanceBefore"代理"昨日排名"，无按天对齐，无快照表。
14. **streakList 排序与展示不一致**：`matches.ts:599` 按 `maxStreak` 排序，`LeaderboardTab.tsx:435-439` 展示 `currentStreak`。
15. **clearApiCache 全项目无调用方**：`utils/api.ts:20` 仅导出无引用，2 分钟缓存永远不被主动失效，WS 推送的刷新（如 `BracketPage.tsx:24-28`）实际拿到旧数据。登录切换账号也看到上一账号缓存。
16. **三个核心页面失败态吞错**：`PredictionTab.tsx:256-258`、`MatchesTab.tsx:89-91`、`LeaderboardTab.tsx:173-185`（连 try/catch 都不完整）只 `console.error` 后显示"暂无数据"文案，无 error state、无重试按钮。
17. **H2H 赔率缺失无提示**：`PredictionTab.tsx:727-738` 直接渲染空 grid，对比半全场/让球都有"本场未开售"文案。
18. **后端 error message 本地化不统一**：`matches.ts:283` "Unsupported prediction market."、`activities.ts:101` "User not found" 等英文残留会通过 apiRequest 直接弹给用户。
19. **MatchDetailPage 用户侧看不到赔率来源**：`odds.source`/`syncStatus` 仅 AdminPanel 展示。

## 决策（已与用户确认）

1. **排行榜昨日快照** → 用 `SystemState` 键值存储（复用 `worldCupStandings` 同机制，不改 Prisma schema/迁移，每日 0 点 cron 转存）。
2. **前端缓存** → 缩短 TTL + 按 path 排除实时接口（`/api/matches`、`/api/matches/today`、`/api/leaderboards`、`/api/predictions/snapshot/*` 等加入 noCache 名单每次都请求，其余保留短 TTL≈10s）。
3. **forceResettle 卡牌** → 复用现有 `useRegretCard` 作撤销入口；forceResettle 默认只重算结算、不退卡、清空 `usedCard` 防二次生效；不新增管理员撤销接口。

## 实施计划

### 第一阶段：核心玩法一致性（资金安全，最高优先级）

#### 1.1 修复结算跳过终态预测
**文件**：`src/server/services/settlement_service.ts`
- **主循环过滤**（line 98 取预测后、line 189 主循环前）：增加 `matchPredictions = matchPredictions.filter(p => p.status !== 'CANCELLED')`。CANCELLED 已通过 CARD_REFUND 退过本金，正式结算完全跳过。
- **VOID 处理**：保留现有 VOID 分支（line 195-208 退款），但确保只有 `status==='PENDING'`（或首次结算的待判定预测）才进入 `judgePrediction`；已 WON/LOST/VOID 的终态预测在非 forceResettle 路径下不重复处理。
- **forceResettle 回滚分支**（line 100-183）：回滚循环（line 105）同样跳过 `status==='CANCELLED'`，避免错误退卡与重置状态。

#### 1.2 修复 forceResettle 卡牌规则
**文件**：`src/server/services/settlement_service.ts`
- **不退卡**：移除 line 161-175 的无条件 `restoreCard(...)` 调用（符合决策3"forceResettle 不退卡"）。
- **清空 usedCard**：line 177-181 重置 prediction 时增加 `prediction.usedCard = undefined; prediction.cardEffectNotes = undefined;`，防止重结算主循环对已退库的卡二次调用 `applyCardToSettlement`。
- **检查 cancelPrediction 标志**：在 line 217、311 调用 `applyCardToSettlement` 后，检查返回的 `cancelPrediction` 标志，若为 true 则跳过该预测（不发奖、不二次退款），仅保留 CANCELLED 状态。

#### 1.3 删除死代码
**文件**：`src/server/prediction_card_service.ts`
- 删除 line 298-328 `commitCardSettlement` 和 line 333-387 `cancelPredictionByCard`（全工程无调用方，逻辑与正式实现不同）。

#### 1.4 管理员调账走钱包服务
**文件**：`src/server/routes/admin.ts`
- **单用户调账**（line 535-584）：替换直接改 `wallet.balance` + push transaction，改为调用 `adjustWalletBalance({ userId, amount, type:'ADMIN_ADJUST', note })`；用 `runBusinessTransaction('adminAdjust', ...)` 包装加锁。
- **批量调账**（line 587-639）：循环内对每个用户调用 `adjustWalletBalance`；单个失败 try/catch 记录失败列表，不中断整体；移除 `Math.max(0, ...)` 静默截断，余额不足时该用户记失败、扣款按实际可扣或跳过并返回明细。
- **返回值**：批量接口返回 `{ affectedCount, failed: [{userId, reason}] }`。

#### 1.5 补核心 Vitest 用例
**新增文件**（vitest.config.ts 已 include `src/**/*.test.ts`）：
- `src/server/services/settlement_service.test.ts`：覆盖
  - CANCELLED 预测不被结算（余额不变、无二次发奖）
  - forceResettle 不退卡、清空 usedCard、不重复返奖
  - WON/LOST/VOID 正常分支
  - 各卡牌效果（NO_LOSS/DOUBLE/FLOOR）结算金额正确
- `src/server/services/prediction_service.test.ts`：覆盖
  - 下注成功余额减少且流水 balanceBefore/After 一致
  - 余额不足抛错不生成预测
  - 100 积分保底规则
  - REGRET 卡不能在下注时附带
- `src/server/services/wallet_service.test.ts`：覆盖
  - adjustWalletBalance 写流水前后余额一致
  - 余额不足抛错
- `src/server/routes/admin_adjust.test.ts`：覆盖
  - 单用户/批量调账走钱包服务
  - 余额不足不静默截断、记失败列表

### 第二阶段：同步、赔率、自动结算稳定化

#### 2.1 同步 0 场响应诊断
**文件**：`src/server/sync.ts`
- **区分空响应**（line 333-347）：当 `fixtureCount === 0` 时，检查 `payload.response` 是否为 `null/undefined`（API 错误）vs 空数组（确实无比赛）；前者 `status:'FAILED'` + `errorMessage`，后者保留 PARTIAL 但 `responseSummary` 注明"该日期确无世界杯赛事"。
- **记录原始响应摘要**：在 `responseSummary` 追加 `payload.errors?.[0]?.message`（API-Football 错误字段）和 `payload.results`（配额信息）。

#### 2.2 API-Football 请求带 league/season
**文件**：`src/server/sync.ts`（line 213）
- URL 改为 `fixtures?date=${date}&league=1&season=2026`（league=1 为世界杯），减少非世界杯赛事拉取，节省配额。
- 若 API 返回 0 场且带 league 过滤，再 fallback 一次不带 league 的请求做兜底（仅当配额允许）。

#### 2.3 赔率下注守卫
**文件**：`src/server/helpers.ts`（`resolveOddsSnapshot` line 640-676）
- 增加 syncStatus 校验：当 `matchOdds[matchId].syncStatus === 'UNSYNCED'` 且无任何有效赔率值时，返回 null（下注时 `prediction_service.ts:64-67` 已会抛"当前没有可用指数"）。
- 移除兜底默认值（line 654 的 `4.0`、line 659 的 `9.5`、line 668 的 `1.8`），改为返回 null 让调用方明确报错，避免用户基于伪造赔率下注。
- **MANUAL_FALLBACK 赔率**：允许下注但 `oddsSnapshot.source` 透传，前端据此标记。

#### 2.4 前端赔率同步状态标记
**文件**：`src/components/PredictionTab.tsx`
- H2H/总进球/比分区（line 727-738）：当 `match.oddsSyncStatus` 为 UNSYNCED/PARTIAL/MANUAL_FALLBACK 或赔率为空时，显示"赔率待确认"徽章（参考半全场 line 700-704 的"本场未开售"样式）。
- 赔率缺失时不渲染空 grid，改渲染提示卡片。

#### 2.5 自动结算阻塞原因日志
**文件**：`src/server/helpers.ts`（`autoSettleFinishedMatches` line 696-746）
- 现有守卫已完整（FT/AET/PEN + 比分 number + scoreUnknown=false + 锁定 5 分钟 + 开赛 2.5 小时），无需改逻辑。
- 增加每场阻塞原因输出：遍历时对跳过的比赛记录 `[AutoSettle] skip ${matchId} reason=${原因}`（已结算/状态不符/比分未知/锁定未满5分钟/开赛未满2.5h），便于诊断。

#### 2.6 赛前检查接口
**文件**：`src/server/routes/admin.ts`
- 新增 `GET /api/admin/pre-match-check`：返回未来 48 小时比赛的清单，每场含 `{ matchId, startTime, status, homeScore, awayScore, scoreUnknown, oddsSource, oddsSyncStatus, bettable, autoSettleBlockedReason }`。
- 复用 `deriveOperationalStatus`、`hasResolvableScore`、`resolveOddsSnapshot` 派生字段。

#### 2.7 syncLogs 保留数提升
**文件**：`src/server/helpers.ts`（line 535）
- `slice(0, 120)` 改为 `slice(0, 300)`，保留更多诊断历史（PARTIAL/FAILED 状态优先保留）。

### 第三阶段：排行榜与用户体验

#### 3.1 排行榜今日榜改北京时间自然日
**文件**：`src/server/routes/matches.ts`（line 447, 521-523）
- 移除 `oneDay = 24h` 滚动窗口；改用 `toBeijingDateKey(settledAt) === toBeijingDateKey(now)` 判断（复用 `helpers.ts:195-201`），与 `/api/matches/today` 语义统一。

#### 3.2 昨日排名快照（SystemState）
**新增 cron + 存储**：
- `src/server/scheduler.ts`：新增 cron `0 0 * * *`（每日 0 点北京时间，即 UTC 16:00），调用 `snapshotDailyRanks()`。
- **存储函数**（放 `src/server/services/leaderboard_snapshot_service.ts` 新文件）：计算当日总积分榜排名，写入 `db.systemStates`（复用 `worldCupStandings` 同机制），key=`dailyRankSnapshot:YYYY-MM-DD`，value=`[{userId, balance, rank}]`。
- `scripts/db-storage.mjs`：systemStates 已在 `getSnapshotTables`/`replaceTable` 覆盖（line 206-214, 493-498），无需改 schema。

**rankDelta 修正**：
**文件**：`src/server/routes/matches.ts`（line 478-493, 588-593）
- `previousBalanceMap` 改为读昨日快照：`getDailyRankSnapshot(yesterdayKey)` → `previousRankMap`。
- 无快照时 rankDelta 返回 0 并标记 `rankDeltaReliable:false`。

#### 3.3 streakList 排序与展示一致
**文件**：`src/server/routes/matches.ts`（line 599）或 `src/components/LeaderboardTab.tsx`（line 435-439）
- 统一为按 `maxStreak` 排序、展示 `maxStreak`（历史最高），或按 `currentStreak` 排序、展示 `currentStreak`。选 **按 currentStreak 排序+展示 currentStreak**（更符合"连中榜"直觉），改 `matches.ts:599` 排序键为 `currentStreak`。

#### 3.4 前端缓存策略
**文件**：`src/utils/api.ts`
- `CACHE_TTL`（line 13）从 `2*60*1000` 改为 `10*1000`（10 秒）。
- 新增 noCache 名单（line 25 附近）：`const NO_CACHE_PATHS = ['/api/matches', '/api/matches/today', '/api/leaderboards', '/api/predictions/snapshot/', '/api/matches/recent-reports'];`，命中时跳过缓存读写。
- `clearApiCache`（line 20）：在 `App.tsx` 的 `handleLogin`/`handleLogout`（line 158-194）和 WS 回调（`onMatchSettled` line 106、`onPredictionResult` line 97）调用，清实时接口缓存。

#### 3.5 前端失败态
**文件**：`src/components/PredictionTab.tsx`、`src/components/MatchesTab.tsx`、`src/components/LeaderboardTab.tsx`
- 各加 `const [error, setError] = useState<string|null>(null)`；`init`/`fetchRanks` catch 里 `setError(msg)`；渲染 error state：显示错误文案 + "重试"按钮（调 `init()`/`fetchRanks()`）。
- LeaderboardTab 的 `fetchRanks` 补全 try/catch（line 173-185 现仅 try/finally）。

#### 3.6 后端 error message 本地化
**文件**：`src/server/routes/matches.ts`（line 283）、`src/server/routes/activities.ts`（line 93, 101, 115）、`src/server/ai.ts`（line 130, 294, 499）、`src/server/routes/ai.ts`（line 140, 196, 201, 272）、`src/server/services/prediction_service.ts`（line 51）、`src/server/backup.ts`（line 41, 54, 167, 201, 263）
- 英文 error 改中文（如 "Unsupported prediction market." → "不支持的竞猜玩法。"，"User not found" → "用户不存在"，"Match not found" → "比赛不存在"）。

#### 3.7 MatchDetailPage 赔率来源标记
**文件**：`src/components/MatchDetailPage.tsx`（line 306-316 附近）
- 在赔率区显示 `match.oddsSource` / `match.oddsSyncStatus` 来源徽章（参考 AdminPanel.tsx:1426-1440 的 oddsSyncStatusLabel 文案映射），让用户区分"同步盘"和"本地兜底盘"。

## 假设与决策

- 不列账号安全优化（按群内十多人娱乐场景）。
- 部署仍按宝塔 + Node + 本机 MySQL，不改 Docker。
- 不删除用户/竞猜/积分/流水；所有修复可回滚，先备份。
- 第一优先级：避免积分/卡牌/结算重复收益或漏结算。
- 第二优先级：赛程/比分/赔率信息准确可诊断。
- 排行榜快照用 SystemState（不改 schema），前端缓存缩短 TTL + noCache 名单，forceResettle 不退卡、清空 usedCard、复用 useRegretCard 撤销。
- `LOCKED` 预测状态枚举存在但代码从未使用（全工程已确认），不引入新中间态，保持 PENDING→终态。
- LIVE 同步双路径（helpers.ts + sync_scheduler_service.ts）本轮不合并，仅记录为后续优化项（避免改动过大）。
- `buildOddsSyncStatus` 永远 PARTIAL 的问题本轮不修（需重构赔率同步状态机），靠 2.3/2.4 的下注守卫+前端标记缓解。

## 验收步骤

### 保留项
- `npm run lint`、`npm test`、`npm run build` 全通过。

### 第一阶段验收
- 新增测试全绿：CANCELLED 预测不被结算；forceResettle 不退卡、不重复返奖；NO_LOSS/DOUBLE/FLOOR 收益符合规则；管理员调账走钱包服务、余额不足不静默截断。
- 手动验证：对一场已含 CANCELLED 预测的比赛触发 forceResettle，确认 CANCELLED 预测余额不变、无二次发奖、卡牌库存不变。

### 第二阶段验收
- 手动同步未来 48 小时赛程：返回 0 场时 syncLog 能看到具体原因（确无赛事 vs API 错误）。
- LIVE 比赛比分能更新；FT 比赛比分明确后能自动结算；阻塞原因可在日志看到。
- UNSYNCED/PARTIAL 赔率比赛在前端投注区显示"赔率待确认"。
- `GET /api/admin/pre-match-check` 返回未来 48 小时比赛清单含赔率来源/同步状态/可投注性/阻塞原因。

### 第三阶段验收
- 今日榜按北京时间自然日统计；rankDelta 基于昨日快照（0 点后有快照后准确）。
- `/api/matches`、`/api/leaderboards` 不再被 2 分钟缓存阻塞；登录切换账号不再看到上一账号缓存。
- PredictionTab/MatchesTab/LeaderboardTab 接口失败时显示错误文案 + 重试按钮。
- 下注触发 unsupported market 时弹中文提示。
- MatchDetailPage 显示赔率来源徽章。

## 实施顺序建议

1. 先备份 MySQL（`mysqldump` 或 db-storage 快照导出）。
2. 第一阶段（1.1→1.5）一次性完成 + 跑测试，确保资金安全无回归。
3. 第二阶段（2.1→2.7）增量提交，每项可独立验证。
4. 第三阶段（3.1→3.7）最后做，前端改动需手动 UI 验证。
5. 每阶段完成后跑 `npm run lint && npm test && npm run build` 守门。
