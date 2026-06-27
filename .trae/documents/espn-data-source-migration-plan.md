# ESPN API 数据源迁移计划

## 概述

将世界杯项目的比分/状态/积分榜数据源从 API-Football（免费计划不支持 2026 赛季）和竞彩网迁移到 ESPN 公开 API。ESPN API 免费、无需 API Key、支持 2026 世界杯，能彻底解决比分无法自动获取和比赛无法自动结算的问题。

## 当前状态分析

### 数据源现状

| 数据源 | 文件 | 用途 | 2026 可用 | 需要 Key |
|---|---|---|---|---|
| API-Football | `src/server/sync.ts` | 赛程/比分/状态 | ❌ 免费计划报错 | 需要 |
| The Odds API | `src/server/sync.ts` | 赔率（H2H+大小球） | 待确认 | 需要 |
| 竞彩网 Sporttery | `src/server/sporttery_sync.ts` | 赔率 + 积分榜 | ✅ | 不需要 |
| 本地 Elo | `src/utils/odds.ts` | 兜底赔率 | ✅ | 不需要 |

### 问题根因

API-Football 免费计划返回 `{ "plan": "Free plans do not have access to this season, try from 2022 to 2024." }`，所有赛程同步返回 0 场，22 场已开赛比赛状态停留 NS，比分无法获取，自动结算无法触发。

### ESPN API 端点（已验证可用）

```
赛程/比分：https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260721&limit=400
积分榜：  https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026
```

### ESPN 数据结构

**Scoreboard API**：
```json
{
  "events": [{
    "name": "France at Norway",
    "date": "2026-06-26T19:00:00Z",
    "status": { "type": { "state": "post", "shortDetail": "FT" } },
    "competitions": [{
      "competitors": [
        { "homeAway": "home", "team": { "displayName": "Norway", "abbreviation": "NOR" }, "score": 1 },
        { "homeAway": "away", "team": { "displayName": "France", "abbreviation": "FRA" }, "score": 4 }
      ]
    }]
  }]
}
```

**Standings API**：
```json
{
  "children": [{
    "name": "Group A",
    "standings": {
      "entries": [{
        "team": { "displayName": "Mexico", "abbreviation": "MEX" },
        "stats": [
          { "name": "gamesPlayed", "value": 3 },
          { "name": "wins", "value": 3 },
          { "name": "ties", "value": 0 },
          { "name": "losses", "value": 0 },
          { "name": "pointsFor", "value": 6 },
          { "name": "pointsAgainst", "value": 0 },
          { "name": "pointDifferential", "value": 6 },
          { "name": "points", "value": 9 },
          { "name": "rank", "value": 1 }
        ]
      }]
    }
  }]
}
```

### 状态映射

| ESPN `state` + `shortDetail` | 本地 `MatchStatus` |
|---|---|
| `pre` + `Scheduled` | `NS` |
| `in` + `87'` | `LIVE` |
| `in` + `Halftime` | `HT` |
| `post` + `FT` | `FT` |
| `post` + `AET` | `AET` |
| `post` + `Pen` | `PEN` |

### 队名映射

项目中已有 `resolveTeamByExternalName` + `TEAM_NAME_ALIASES` 机制（`sync.ts:61-90`），通过队名别名匹配本地 team。ESPN 返回 `team.abbreviation`（如 NOR、FRA）和 `team.displayName`（如 Norway、France），可直接复用现有别名机制。少量未匹配的队名需补充别名。

## 改造方案

### 决策（用户已确认）

1. **ESPN 完全替代 API-Football** — 移除 API-Football 赛程/比分/状态同步
2. **积分榜切换到 ESPN** — 替换竞彩网积分榜同步
3. **比赛事件暂不接入** — 只同步比分/状态/积分榜
4. **赔率源不变** — 竞彩网（主）+ The Odds API（兜底）保持现状

### 新建文件

#### `src/server/espn_sync.ts` — ESPN API 同步模块

核心函数：

```typescript
// 同步赛程/比分/状态（替代 syncFixturesForDateWindow + syncFixturesForDay）
export async function syncEspnScoreboard(db: DatabaseSchema): Promise<{
  updatedMatches: Match[];
  log: SyncLog;
}>;

// 同步积分榜（替代 syncWorldCupStandings）
export async function syncEspnStandings(db: DatabaseSchema): Promise<{
  synced: boolean;
  groupCount: number;
}>;
```

**syncEspnScoreboard 逻辑**：
1. 请求 ESPN scoreboard API（日期范围覆盖整个世界杯周期）
2. 遍历 events，解析队名/比分/状态
3. 通过 `resolveTeamByExternalName`（从 sync.ts 提取为共享函数）匹配本地 team
4. 匹配本地 match（优先 providerMeta.espnEventId → 队伍+日期）
5. 更新 match.status、match.homeScore、match.awayScore
6. 清除 `scoreUnknown` 标记（ESPN 提供真实比分）
7. 比分变化时调用 `broadcastScoreUpdate`
8. 返回更新的 matches 列表和 SyncLog

**syncEspnStandings 逻辑**：
1. 请求 ESPN standings API
2. 遍历 children（12 个小组 A-L）
3. 解析每个小组的 entries → `StandingTeamRow[]`
4. 通过队名/代码匹配本地 team
5. 写入 `db.worldCupStandings = { groups, source: 'ESPN', lastUpdated }`
6. 调用 `broadcastStandingsUpdate`

### 修改文件

#### 1. `src/server/services/sync_scheduler_service.ts` — 调度器替换

**赛程同步（第 2 步，行 417-455）**：
- 替换 `syncFixturesForDateWindow` → `syncEspnScoreboard`
- 移除 `config.apiFootballKey` 依赖
- 保留 `scoreUnknown` 清除逻辑（ESPN 提供真实比分后清除标记）

**比分同步（第 4 步，行 537-601）**：
- 替换 `syncFixturesForDay` → `syncEspnScoreboard`（ESPN 一次拉取全部，不需要按日期逐日）
- 简化逻辑：直接调用 `syncEspnScoreboard`，不需要循环 liveDates

**积分榜同步（第 3 步，行 509-535）**：
- 替换 `syncWorldCupStandings` → `syncEspnStandings`
- `source` 从 `'Sporttery'` 改为 `'ESPN'`

**降级方案（第 5 步，行 603-660）**：
- 保留降级逻辑作为最终兜底（ESPN 也失败时仍能基于时间推断状态）
- 但降级条件从 `!hasProviderKey(config.apiFootballKey)` 改为检测 ESPN 连续失败
- 降级时不再标记 `scoreUnknown`（因为 ESPN 不需要 Key，失败更可能是网络问题）

#### 2. `src/server/sync.ts` — API-Football 代码保留但不再被调度器调用

- `syncFixturesForDay` 和 `syncFixturesForDateWindow` 保留代码（admin 手动触发仍可用，未来升级 Pro 计划可恢复）
- `syncOddsForMatches`（The Odds API 赔率同步）**不变**，继续作为赔率兜底源
- `resolveTeamByExternalName`、`buildTeamAliases`、`TEAM_NAME_ALIASES`、`normalizeName` 提取为共享（导出或移到 utils），供 espn_sync.ts 复用

#### 3. `src/server/sporttery_sync.ts` — 积分榜同步保留但不再被调度器调用

- `syncWorldCupStandings` 保留代码（admin 手动触发仍可用）
- `syncSportteryOdds`（赔率同步）**不变**，继续作为主赔率源

#### 4. `src/types.ts` — WorldCupStandings.source 类型更新

```typescript
// 行 615 附近
interface WorldCupStandings {
  groups: Record<string, StandingTeamRow[]>;
  source: 'ESPN' | 'Sporttery' | 'COMPUTED';  // 新增 'ESPN'
  lastUpdated: string;
}
```

#### 5. `src/server/config.ts` — 无需修改

`apiFootballKey` 保留（admin 手动触发 API-Football 同步仍需配置），但调度器不再依赖它。

#### 6. `src/server/routes/admin.ts` — admin 路由可选添加手动触发

可选：添加 `/admin/sync/espn` 路由，允许 admin 手动触发 ESPN 同步（调试用）。

### 队名别名补充

ESPN 返回的队名是英文全名（如 "Cape Verde"、"South Korea"），项目中 `TEAM_NAME_ALIASES` 已有大部分覆盖。需要在 `sync.ts` 的 `TEAM_NAME_ALIASES` 中补充 ESPN 特有名称。实测 ESPN 用的 `abbreviation` 与项目 `team.code` 一致（NOR、FRA、MEX 等），可直接通过 code 匹配，别名补充需求很小。

## 实施步骤

1. **创建 `src/server/espn_sync.ts`**
   - 实现 `syncEspnScoreboard(db)` 函数
   - 实现 `syncEspnStandings(db)` 函数
   - 复用 sync.ts 中的队名匹配逻辑

2. **提取共享工具函数**
   - 将 `resolveTeamByExternalName`、`buildTeamAliases`、`TEAM_NAME_ALIASES`、`normalizeName` 从 sync.ts 导出（或移到 `src/utils/teamMatch.ts`）
   - espn_sync.ts 和 sync.ts 都引用共享版本

3. **修改 `sync_scheduler_service.ts`**
   - 赛程同步：`syncFixturesForDateWindow` → `syncEspnScoreboard`
   - 比分同步：`syncFixturesForDay` 循环 → 单次 `syncEspnScoreboard`
   - 积分榜同步：`syncWorldCupStandings` → `syncEspnStandings`
   - 降级方案条件调整

4. **更新类型定义**
   - `src/types.ts` 中 `WorldCupStandings.source` 添加 `'ESPN'`

5. **补充队名别名**（如需要）
   - 测试 ESPN API 返回的队名与本地匹配情况
   - 在 `TEAM_NAME_ALIASES` 中补充缺失别名

6. **构建验证**
   - `npm run lint && npm run build`
   - 本地启动测试 ESPN 同步是否正常

7. **部署到云服务器**
   - git push + 云服务器 git pull + build + pm2 restart
   - 验证挪威vs法国等已结束比赛的比分和状态是否正确更新

## 假设与决策

1. **ESPN API 稳定性**：ESPN 是大型体育媒体，API 公开且稳定，但无 SLA 保证。降级方案保留作为兜底。
2. **ESPN API 频率**：无明确文档限制，但调度器沿用现有优先级机制（LIVE 时 60 秒、NORMAL 时 2 小时），避免过度请求。
3. **赔率数据源不变**：竞彩网赔率（主）+ The Odds API（兜底）保持现状，不受 ESPN 迁移影响。
4. **API-Football 代码保留**：不删除 sync.ts 中的 API-Football 函数，未来升级 Pro 计划可恢复使用。admin 手动触发仍可用。
5. **比赛事件暂不接入**：ESPN 的 events 数据（进球/红黄牌/换人）本次不接入，后续可扩展。
6. **ESPN scoreboard 日期范围**：使用 `20260611-20260721` 覆盖整个世界杯周期，一次请求获取全部比赛。

## 验证步骤

1. **本地构建**：`npm run lint && npm run build` 通过
2. **ESPN API 联通**：本地启动后查看日志确认 ESPN 同步成功
3. **比分验证**：挪威vs法国（m-61）比分更新为 1:4，状态更新为 FT
4. **积分榜验证**：12 个小组积分榜从 ESPN 同步，source 标记为 ESPN
5. **自动结算验证**：`scoreUnknown` 标记清除后，自动结算流程能正常触发
6. **云服务器部署**：git push → SSH 拉取 → build → pm2 restart → HTTP 验证
