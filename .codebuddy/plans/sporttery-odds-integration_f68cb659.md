---
name: sporttery-odds-integration
overview: 集成竞彩网 API 作为主赔率源，扩展 2 个新玩法（让球、半全场），总进球数从 2 项扩展为 8 项精确投注，比分赔率从 Poisson 估算切换为竞彩网真实数据。1小时自动同步 + 后台手动触发。
todos:
  - id: extend-types-config
    content: 扩展类型与配置：PredictionMarket 新增 HANDICAP/HAFU，MatchOdds 新增 handicap/halfFullTime/totalGoals 改为数组，config 新增竞彩网 API 配置项
    status: completed
  - id: create-sporttery-sync
    content: 新建竞彩网同步模块 src/server/sporttery_sync.ts：拉取 API、解析 CRS/TTG/HAFU/HHAD、匹配项目 matchId
    status: completed
    dependencies:
      - extend-types-config
  - id: update-odds-parsers
    content: 更新 src/utils/odds.ts：新增 parseCrsToScoreOptions、parseTtgToGoals、parseHafuToHalfFullTime 解析函数，更新默认赔率和降级逻辑
    status: completed
    dependencies:
      - extend-types-config
  - id: update-sync-flow
    content: 修改 src/server/sync.ts：集成竞彩网同步到现有赔率同步流程，实现三级降级链（竞彩网→TheOdds→Elo），确保赛程/比分同步不受影响
    status: completed
    dependencies:
      - create-sporttery-sync
      - update-odds-parsers
  - id: update-helpers-routes
    content: 更新 src/server/helpers.ts 和 src/server/services/prediction_service.ts：normalizePredictionMarket 新增 HANDICAP/HAFU 分支，resolveOddsSnapshot 扩展新玩法解析，serializeMatch 序列化新字段
    status: completed
    dependencies:
      - extend-types-config
      - update-odds-parsers
  - id: update-settlement
    content: 更新 src/server/services/settlement_service.ts：新增 HANDICAP（让球后比分判定）、HAFU（半全场判定）、TOTAL_GOALS（精确进球匹配）结算逻辑
    status: completed
    dependencies:
      - extend-types-config
  - id: update-prediction-tab
    content: 重构 src/components/PredictionTab.tsx：ModeFilter 扩展为 5 种玩法，Tab 改为水平可滚动，新增让球/半全场/精确总进球选项渲染，比分赔率来源标记更新
    status: completed
    dependencies:
      - extend-types-config
  - id: add-admin-sync-btn
    content: 在 src/components/AdminPanel.tsx 和 src/server/routes/admin.ts 新增"同步竞彩网赔率"手动触发按钮与 API 端点
    status: completed
    dependencies:
      - create-sporttery-sync
---

## 产品概述

集成竞彩网（sporttery.cn）API 作为主赔率源，扩展竞猜玩法从 3 种到 5 种，赔率数据从数学估算切换为真实市场数据。

## 核心功能

### 1. 新增两种竞猜玩法

- **让球胜平负 (HANDICAP)**：显示让球数，选项格式为 "德国(-3) 胜" / "受让平" / "库拉索(+3) 胜"
- **半全场 (HAFU)**：9 种半场/全场组合结果，用简称显示（胜胜/胜平/胜负/平胜/平平/平负/负胜/负平/负负）
- HAD/HHAD 互斥销售时，无数据的玩法 Tab 显示"本场未开此盘"提示

### 2. 完善总进球数玩法

- 从 over/under 2.5（2项）改为精确进球数 0/1/2/3/4/5/6/7+（8项）
- 赔率来自竞彩网 API 真实市场数据

### 3. 比分赔率切换为真实数据

- 比分赔率从 Poisson 模型估算替换为竞彩网 API 官方赔率
- 比分结构对齐竞彩网 CRS 格式（sXXsYY + s1sh/s1sd/s1sa），覆盖 25+3 项
- 原有 ScoreOption 分组逻辑（主胜/平局/客胜）保持不变

### 4. 数据源优先级与同步

- 赔率优先级：竞彩网 API（主）&gt; The Odds API（辅）&gt; Elo 模型（最终兜底）
- 自动同步频率：每小时一次
- 管理后台新增"同步竞彩网赔率"手动触发按钮

### 5. 前端 UI 适配

- 玩法 Tab 从 3 列固定改为水平可滚动（5 个 pill）
- 总进球从 2 列 1 行改为 4 列 2 行
- 半全场 9 项用 3x3 网格展示

## 技术栈

- 后端：Express.js + TypeScript（沿用现有架构）
- 前端：React + TypeScript + Tailwind CSS
- 数据存储：db.json（文件型数据库，matchOdds 键值存储）
- 新依赖：无（使用 Node.js 内置 fetch）

## 实现方案

### 数据流架构

```mermaid
graph TD
    A[竞彩网 API] -->|每小时 / 手动触发| B[sporttery_sync.ts 新模块]
    C[The Odds API] -->|动态调度| D[sync.ts 现有逻辑]
    B --> E[matchOdds 存储]
    D --> E
    E --> F[/api/matches 序列化]
    F --> G[PredictionTab 前端]
    E --> H[settlement_service 结算]
    
    I[API-Football] -->|赛程/比分| J[matches 存储]
    J --> F
```

优先级链：竞彩网获取成功 → 直接写入 matchOdds；失败 → 尝试 The Odds API → 失败 → Elo 兜底。

### 核心类型变更

#### PredictionMarket 扩展

```typescript
// src/types.ts 第304行
export type PredictionMarket = 'H2H' | 'CORRECT_SCORE' | 'TOTAL_GOALS' | 'QUALIFY' | 'HANDICAP' | 'HAFU';
```

#### MatchOdds 扩展

```typescript
// src/types.ts MatchOdds 接口
export interface MatchOdds {
  matchId: string;
  h2h: { homeWin: number; draw: number; awayWin: number; };
  handicap?: { goalLine: number; homeWin: number; draw: number; awayWin: number; };
  correctScore: Array<{ score: string; odds: number; }>;
  totalGoals: Array<{ goals: string; odds: number; }>;  // 从 {over25,under25} 改为数组
  halfFullTime?: { hh: number; hd: number; ha: number; dh: number; dd: number; da: number; ah: number; ad: number; aa: number; };
  // ... 其他字段保留
}
```

注意：totalGoals 从 `{ over25: number; under25: number }` 改为 `Array<{ goals: string; odds: number }>`，兼容期保留旧字段为可选。

### 竞彩网同步模块

新建 `src/server/sporttery_sync.ts`，核心函数：

- `syncSportteryOdds()`: 拉取竞彩网 API，解析 5 个玩法池，通过队伍名+日期匹配项目的 matchId
- `parseCrsToScoreOptions(crs: object): ScoreOption[]`: 将 sXXsYY → ScoreOption
- `parseTtgToGoals(ttg: object): Array<{goals, odds}>`: 将 s0~s7 → 精确进球项
- `parseHafuToHalfFullTime(hafu: object)`: 将 hh~aa → 9 项半全场
- 匹配策略：`{homeTeamCode}-{awayTeamCode}` + `matchDate` 组合匹配

### 结算逻辑扩展

`settlement_service.ts` 新增 3 种市场判定：

- **HANDICAP**: 实际比分 + goalLine 计算让球后结果
- **HAFU**: 半场比分 + 全场比分 组合判定（需要 HT 比分数据）
- **TOTAL_GOALS**: 从 over/under 2.5 改为精确总进球匹配

### 降级与兼容

- 旧数据库 totalGoals 为 `{over25, under25}` 格式时，自动迁移为数组格式
- 已结算的旧预测保持不变
- correctScoreSource 字段新增 `'SPORTTERY'` 枚举值

## Agent Extensions

### SubAgent

- **code-explorer**
- 用途：在实施过程中快速定位需要修改的精确行号，验证现有函数签名和引用链
- 预期成果：确认每个修改点的准确位置，避免因行号偏移导致替换错误