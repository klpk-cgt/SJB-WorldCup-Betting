# 赔率API连通 + 赛程比分同步修复 + 小组赛H2H扩充

## Summary

修复三个数据同步问题：(1) The Odds API Key 失效(401)，更新为新 Key；(2) 49场已开赛比赛卡在 NS 状态未同步比分（同步窗口 pastDays=1 太短，6月11-24日比赛不在窗口内）；(3) 扩充小组赛对战资料(H2H)静态数据，将 summary_only 记录补充具体交锋记录。

## Current State Analysis（诊断结果）

### 1. Odds API 连通性（已诊断）
- **API-Football**: ✅ 健康 (HTTP 200, 1207ms) — Key `8fd82d70...` 有效
- **The Odds API**: ❌ HTTP 401 Unauthorized — Key `3148784d...` 已失效
- **竞彩网**: ✅ 已修复(上次提交 d68e6e6)，12场第3轮赔率已同步
- 用户已提供新 Key: `6807dcb7914d84b0076e92d52d534b26`

### 2. 赛程比分同步问题（已诊断）
- **比赛总数**: 104 场
- **状态分布**: NS=99, FT=5
- **核心问题**: 49 场已开赛比赛（6月11-24日）卡在 NS，`providerMeta=null`（从未同步过）
- **成功同步**: 仅 5 场（m-48/m-50/m-51 等）有比分和 providerMeta
- **根因**: `syncFixturesForDateWindow` 默认 `pastDays=1`（[sync.ts:372](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/server/sync.ts#L372)），当前6月25日只回溯到6月24日，6月11-23日的比赛不在窗口内
- **调度调用**: [sync_scheduler_service.ts:426-429](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/server/services/sync_scheduler_service.ts#L426) 调用时未传 pastDays，用默认值1
- **前端显示**: `getRelevantUpcomingMatches` 只保留 NS/LIVE/HT，已结束的 FT 不显示；但卡在 NS 的会显示为"未开赛"+"VS"

### 3. 球队对战资料 H2H（已诊断）
- 静态数据文件: [headToHead/index.ts](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/data/worldcup/headToHead/index.ts)（约1100行）
- 已覆盖所有小组赛对阵，但约 60+ 条为 `accuracyLevel: 'summary_only'`
- summary_only 记录的 `worldCupMatches: []` 和 `recentMatches: []` 为空，只有 `worldCupSummary` 摘要
- 前端 [MatchDetailPage.tsx:476-546](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/MatchDetailPage.tsx#L476) 已实现 H2H 渲染，补充数据后自动展示
- 数据结构: `HeadToHeadMatch { date, competition, venue, score, winner?, note? }`

## Proposed Changes

### Part A: 更新 The Odds API Key + 连通验证

**A1. 更新 .env 的 THE_ODDS_API_KEY**
- 文件: `.env` (第16-17行附近)
- 修改: `THE_ODDS_API_KEY=3148784d...` → `THE_ODDS_API_KEY=6807dcb7914d84b0076e92d52d534b26`
- 同步更新 `.env.example` 和 `.env.production.example` 中的示例值（保持占位符格式）

**A2. 验证连通性**
- 重启 dev server
- 调用 `POST /api/admin/integrations/health-check` 确认 The Odds API 返回 200
- 调用 `POST /api/admin/sync/odds` 触发赔率同步，确认不再 401

### Part B: 修复赛程比分同步

**B1. 扩大同步回溯窗口**
- 文件: [src/server/sync.ts:372](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/server/sync.ts#L372)
- 修改: `pastDays = 1` → `pastDays = 5`
- 理由: 世界杯小组赛持续约2周，5天回溯能覆盖近期结束的比赛；同时避免回溯过远浪费API配额
- 影响范围: 仅影响自动同步窗口，手动同步不受影响

**B2. 一次性回溯同步全部历史比赛**
- 通过管理员 API 手动触发，按日期逐日同步6月11-24日的比赛
- 方式: 调用 `POST /api/admin/sync/fixtures` 传入具体日期，或编写临时脚本循环调用 `syncFixturesForDay`
- 预期: 49场卡在 NS 的比赛将更新为 FT/AET/PEN 并填入比分
- 验证: 同步后查询 `/api/matches`，确认状态分布 NS 减少、FT 增加、比分非 null

**B3. （可选）前端 scoreUnknown 显示优化**
- 文件: [src/components/MatchesTab.tsx:424-426](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/components/MatchesTab.tsx#L424)
- 当前: FT 状态显示 `${homeScore ?? 0} : ${awayScore ?? 0}`，scoreUnknown 时显示 0:0 误导
- 优化: 若 `scoreUnknown=true`，显示"比分待录入"而非 0:0
- 注: 此项为体验优化，若 B2 成功同步到比分则非必需

### Part C: 扩充小组赛 H2H 静态数据

**C1. 为 summary_only 记录补充近期交锋记录**
- 文件: [src/data/worldcup/headToHead/index.ts](file:///h:/世界杯娱乐项目/back/klpk-cgt-s-Org%20v2/src/data/worldcup/headToHead/index.ts)
- 范围: 第一轮(16场)、第二轮(18场)、第三轮(24场)中 accuracyLevel='summary_only' 的记录
- 补充内容: 为 `recentMatches` 数组添加 2-4 条近期交锋记录（世预赛/洲际杯赛/友谊赛）
- 数据格式: `{ date: 'YYYY-MM-DD', competition: '赛事名', venue: '城市', score: 'X-Y', winner: 'TEAM_A'|'TEAM_B'|'draw', note: '备注' }`
- 数据来源: 基于公开赛事记录编写（Wikipedia/转会市场等）
- accuracyLevel 提升: `summary_only` → `needs_review`（有具体记录但未完全核实）
- 优先级: 优先补充第一轮小组赛（已开赛/已结束），其次第二轮，最后第三轮

**C2. 验证 H2H 展示**
- 访问比赛详情页，确认 H2H 区块显示新增的交锋记录
- 访问球队详情页，确认相关展示正常

## Assumptions & Decisions

1. **新 Odds API Key 有效**: 假设用户提供的 `6807dcb7914d84b0076e92d52d534b26` 是有效的免费/付费 key
2. **pastDays=5 不超配额**: API-Football 免费套餐每日 100 请求，5天窗口×每日1次同步=5请求/天，远低于上限
3. **H2H 数据准确性**: 静态补充的交锋记录标记为 `needs_review`，不声称完全准确，前端会显示"待复核"标签
4. **不修改 Prisma schema**: H2H 保持纯静态数据，不新增数据库表（用户选择"扩充静态H2H数据"方案）
5. **降级逻辑不改**: API-Football Key 有效，无需修改降级触发条件；核心问题是同步窗口而非降级逻辑

## Verification Steps

1. **Odds API**: `POST /api/admin/integrations/health-check` → The Odds API healthy=true, statusCode=200
2. **赛程同步**: 
   - `GET /api/matches` 状态分布: FT 场次应从 5 增加到约 50+（6月11-24日已结束的比赛）
   - 抽查 m-1 (MEX vs RSA): status 应为 FT，homeScore/awayScore 非 null
3. **前端赛程页**: 已结束比赛显示比分（如 1:0），不再显示"VS"+"未开赛"
4. **H2H 展示**: 比赛详情页 H2H 区块显示近期交锋记录列表（非空）
5. **TypeScript 编译**: `npx tsc --noEmit` 无错误

## 实施顺序

1. Part A: 更新 Key → 重启 → 验证连通（5分钟）
2. Part B1: 修改 pastDays → 重启
3. Part B2: 手动触发历史同步 → 验证比分
4. Part C: 扩充 H2H 数据（工作量最大，可分批进行）
5. 提交代码
