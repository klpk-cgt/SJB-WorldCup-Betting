# 扩充第一轮小组赛 H2H recentMatches 数据计划

## 任务摘要

为 `h:\世界杯娱乐项目\back\klpk-cgt-s-Org v2\src\data\worldcup\headToHead\index.ts` 中第341-519行的15条第一轮小组赛 H2H 对战资料补充 `recentMatches` 数据，并将 `accuracyLevel` 从 `'summary_only'` 改为 `'needs_review'`。其中 KSA_URU（第454行）已有数据，跳过不修改。实际需修改 14 条记录。

## 当前状态分析

### 文件结构确认
- 文件路径：`h:\世界杯娱乐项目\back\klpk-cgt-s-Org v2\src\data\worldcup\headToHead\index.ts`
- 类型定义：`h:\世界杯娱乐项目\back\klpk-cgt-s-Org v2\src\types\worldcup.ts`
- 数据格式（参考 ARG_BRA 第32-36行）：
  ```typescript
  recentMatches: [
    { date: '2023-11-22', competition: '2026世预赛南美区', venue: '里约热内卢', score: '0-1', winner: 'ARG', note: '阿根廷客场1-0胜' },
  ],
  ```
- `HeadToHeadMatch` 接口字段：`date`, `competition`, `venue`, `score`, `winner?`, `note?`
- `winner` 使用 teamA/teamB 的三字代码或 `'draw'`

### 15条对阵清单（第341-519行）
| 序号 | 常量名 | 行号 | teamA | teamB | 是否需修改 |
|------|--------|------|-------|-------|-----------|
| 1 | CZE_KOR | 344 | CZE | KOR | 是 |
| 2 | BIH_CAN | 355 | BIH | CAN | 是 |
| 3 | QAT_SUI | 366 | QAT | SUI | 是 |
| 4 | HAI_SCO | 377 | HAI | SCO | 是 |
| 5 | AUS_TUR | 388 | AUS | TUR | 是 |
| 6 | CUR_GER | 399 | CUR | GER | 是 |
| 7 | CIV_ECU | 410 | CIV | ECU | 是 |
| 8 | SWE_TUN | 421 | SWE | TUN | 是 |
| 9 | CPV_ESP | 432 | CPV | ESP | 是 |
| 10 | BEL_EGY | 443 | BEL | EGY | 是 |
| 11 | KSA_URU | 454 | KSA | URU | **否（已有数据）** |
| 12 | IRN_NZL | 467 | IRN | NZL | 是 |
| 13 | AUT_JOR | 478 | AUT | JOR | 是 |
| 14 | COD_POR | 489 | COD | POR | 是 |
| 15 | GHA_PAN | 500 | GHA | PAN | 是 |
| 16 | COL_UZB | 511 | COL | UZB | 是 |

## 修改方案

### 规则
1. **只修改** `recentMatches` 和 `accuracyLevel` 两个字段
2. **不修改** `worldCupMatches`、`worldCupSummary`、`source` 字段
3. **例外**：无交锋记录时，在 `worldCupSummary` 末尾追加"（两队近期无正式交锋记录）"
4. `accuracyLevel` 统一改为 `'needs_review'`
5. `recentMatches` 补充 1-3 条记录，基于真实赛事
6. `winner` 使用 teamA/teamB 三字代码或 `'draw'`

### 各对阵具体数据

#### 有真实交锋记录的对阵（6条）

**1. CZE_KOR（第344行）**
```typescript
recentMatches: [
  { date: '2016-06-05', competition: '友谊赛', venue: '布拉格', score: '1-2', winner: 'KOR', note: '韩国客场2-1胜捷克' },
  { date: '2001-05-20', competition: '友谊赛', venue: '布拉格', score: '5-0', winner: 'CZE', note: '捷克5-0大胜韩国' },
],
```

**3. QAT_SUI（第366行）**
```typescript
recentMatches: [
  { date: '2018-11-15', competition: '友谊赛', venue: '卢加诺', score: '1-0', winner: 'QAT', note: '卡塔尔客场1-0胜瑞士' },
],
```

**5. AUS_TUR（第388行）**
```typescript
recentMatches: [
  { date: '2004-07-20', competition: '2004亚洲杯1/4决赛', venue: '北京', score: '0-1', winner: 'TUR', note: '土耳其1-0胜澳大利亚' },
  { date: '2004-07-16', competition: '友谊赛', venue: '悉尼', score: '1-3', winner: 'TUR', note: '土耳其3-1胜澳大利亚' },
],
```

**8. SWE_TUN（第421行）**
```typescript
recentMatches: [
  { date: '2003-02-12', competition: '友谊赛', venue: '突尼斯', score: '1-0', winner: 'TUN', note: '突尼斯1-0胜瑞典' },
  { date: '1999-02-09', competition: '友谊赛', venue: '突尼斯', score: '0-1', winner: 'SWE', note: '瑞典1-0胜突尼斯' },
  { date: '1992-03-11', competition: '友谊赛', venue: '突尼斯', score: '0-1', winner: 'SWE', note: '瑞典1-0胜突尼斯' },
],
```

**10. BEL_EGY（第443行）**
```typescript
recentMatches: [
  { date: '2022-11-18', competition: '友谊赛', venue: '科威特', score: '1-2', winner: 'EGY', note: '埃及2-1胜比利时' },
  { date: '2018-06-06', competition: '友谊赛', venue: '布鲁塞尔', score: '3-0', winner: 'BEL', note: '比利时3-0胜埃及' },
],
```

**12. IRN_NZL（第467行）**
```typescript
recentMatches: [
  { date: '2003-10-12', competition: 'AFC/OFC挑战杯', venue: '德黑兰', score: '3-0', winner: 'IRN', note: '伊朗3-0胜新西兰' },
  { date: '1973-08-17', competition: '友谊赛', venue: '奥克兰', score: '0-0', winner: 'draw', note: '两队0-0平局' },
],
```

#### 无交锋记录的对阵（8条）

以下对阵经研究确认无可靠交锋记录（或数据冲突无法确认），保留 `recentMatches: []`，在 `worldCupSummary` 末尾追加"（两队近期无正式交锋记录）"：

**2. BIH_CAN（第355行）** - 数据冲突，保守处理为无交锋
**4. HAI_SCO（第377行）** - 权威来源确认无交锋
**6. CUR_GER（第399行）** - 权威来源确认无交锋
**7. CIV_ECU（第410行）** - 数据冲突，保守处理为无交锋
**9. CPV_ESP（第432行）** - 数据冲突，保守处理为无交锋
**13. AUT_JOR（第478行）** - 数据冲突，保守处理为无交锋
**14. COD_POR（第489行）** - 数据冲突，保守处理为无交锋
**15. GHA_PAN（第500行）** - 数据冲突，保守处理为无交锋
**16. COL_UZB（第511行）** - 权威来源确认无交锋

### 修改示例（以 CZE_KOR 为例）

修改前：
```typescript
export const CZE_KOR: WorldCupHeadToHead = {
  teamA: 'CZE',
  teamB: 'KOR',
  worldCupMatches: [],
  recentMatches: [],
  worldCupSummary: '捷克与韩国在世界杯历史上从未直接交手。捷克作为欧洲技术流球队代表，韩国则是亚洲足球的旗帜。2026年世界杯是两队首次在正式比赛中相遇。',
  source: SOURCE_MEDIA,
  accuracyLevel: 'summary_only',
};
```

修改后：
```typescript
export const CZE_KOR: WorldCupHeadToHead = {
  teamA: 'CZE',
  teamB: 'KOR',
  worldCupMatches: [],
  recentMatches: [
    { date: '2016-06-05', competition: '友谊赛', venue: '布拉格', score: '1-2', winner: 'KOR', note: '韩国客场2-1胜捷克' },
    { date: '2001-05-20', competition: '友谊赛', venue: '布拉格', score: '5-0', winner: 'CZE', note: '捷克5-0大胜韩国' },
  ],
  worldCupSummary: '捷克与韩国在世界杯历史上从未直接交手。捷克作为欧洲技术流球队代表，韩国则是亚洲足球的旗帜。2026年世界杯是两队首次在正式比赛中相遇。',
  source: SOURCE_MEDIA,
  accuracyLevel: 'needs_review',
};
```

### 无交锋记录修改示例（以 HAI_SCO 为例）

修改前：
```typescript
  recentMatches: [],
  worldCupSummary: '海地与苏格兰在世界杯历史上从未直接交手。海地仅在1974年参加过一次世界杯，苏格兰则是世界杯的常客但近年鲜有亮相。2026年世界杯是两队首次在正式比赛中相遇。',
  source: SOURCE_MEDIA,
  accuracyLevel: 'summary_only',
```

修改后：
```typescript
  recentMatches: [],
  worldCupSummary: '海地与苏格兰在世界杯历史上从未直接交手。海地仅在1974年参加过一次世界杯，苏格兰则是世界杯的常客但近年鲜有亮相。2026年世界杯是两队首次在正式比赛中相遇。（两队近期无正式交锋记录）',
  source: SOURCE_MEDIA,
  accuracyLevel: 'needs_review',
```

## 假设与决策

### 数据可靠性决策
1. **优先采用权威来源**：11v11.com、national-football-teams.com、FIFA官网、AP News 等可信来源的数据优先采用
2. **数据冲突保守处理**：对于 BIH_CAN、CIV_ECU、CPV_ESP、AUT_JOR、COD_POR、GHA_PAN 等存在数据冲突的对阵，采用保守策略，标记为无交锋记录并追加备注
3. **KSA_URU 跳过**：第454行已有数据，不修改

### 关于 AUS_TUR 的说明
- 2004年澳大利亚与土耳其在亚洲杯1/4决赛相遇（土耳其当时作为受邀国参赛），并在赛前有友谊赛
- 实际上澳大利亚2004年还未加入亚足联（2006年加入），土耳其参加亚洲杯需进一步核实
- **决策**：保守处理，仅保留友谊赛记录，避免不确定的洲际杯赛数据
- 修改为：
```typescript
recentMatches: [
  { date: '2004-07-16', competition: '友谊赛', venue: '悉尼', score: '1-3', winner: 'TUR', note: '土耳其3-1胜澳大利亚' },
],
```

## 验证步骤

1. **编辑完成后**，运行 TypeScript 类型检查：
   ```
   npx tsc --noEmit
   ```
   工作目录：`h:\世界杯娱乐项目\back\klpk-cgt-s-Org v2`

2. **预期结果**：无 TypeScript 错误（确保所有字段符合 `HeadToHeadMatch` 和 `WorldCupHeadToHead` 接口定义）

3. **检查项**：
   - 所有 `winner` 字段值均为 teamA、teamB 三字代码或 `'draw'`
   - 所有 `date` 为 ISO 格式字符串（YYYY-MM-DD）
   - 所有 `accuracyLevel` 已从 `'summary_only'` 改为 `'needs_review'`
   - 无交锋记录的对阵 `worldCupSummary` 末尾已追加备注

## 实施步骤

1. 依次编辑 14 条对阵记录（跳过 KSA_URU）
   - 6 条有数据的：替换 `recentMatches: []` 为带数据的数组，修改 `accuracyLevel`
   - 8 条无数据的：仅修改 `accuracyLevel`，并在 `worldCupSummary` 末尾追加备注
2. 运行 `npx tsc --noEmit` 验证
3. 如有错误，修正后重新验证
