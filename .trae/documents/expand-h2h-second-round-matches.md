# 扩展第二轮小组赛 H2H 数据（剩余 9 条对阵）

## Summary（摘要）

继续完成用户原始请求：在 `h:\世界杯娱乐项目\back\klpk-cgt-s-Org v2\src\data\worldcup\headToHead\index.ts` 中，为第二轮小组赛（521-722 行）剩余 9 条 `accuracyLevel: 'summary_only'` 的对阵补充 `recentMatches` 并将 `accuracyLevel` 改为 `'needs_review'`。

前 8 条（CZE_RSA、BIH_SUI、CAN_QAT、AUS_USA、MAR_SCO、BRA_HAI、PAR_TUR、NED_SWE）已在之前会话中完成。本次只处理剩余 9 条，然后运行 `npx tsc --noEmit` 验证。

## Current State Analysis（当前状态分析）

通过 Read 工具确认，剩余 9 条对阵当前状态如下（均位于 521-732 行区间）：

| 对阵 | 行号 | recentMatches | accuracyLevel | 处理方式 |
|------|------|---------------|---------------|----------|
| CUR_ECU | 636-644 | `[]` | summary_only | 规则3：无交锋记录 |
| JPN_TUN | 647-655 | `[]` | summary_only | 添加2条记录 |
| CPV_URU | 658-666 | `[]` | summary_only | 规则3：无交锋记录 |
| EGY_NZL | 669-677 | `[]` | summary_only | 添加2条记录 |
| FRA_IRQ | 680-688 | `[]` | summary_only | 规则3：无交锋记录 |
| NOR_SEN | 691-699 | `[]` | summary_only | 添加1条记录 |
| DZA_JOR | 702-710 | `[]` | summary_only | 规则3：无交锋记录 |
| CRO_PAN | 713-721 | `[]` | summary_only | 规则3：无交锋记录 |
| COD_COL | 724-732 | `[]` | summary_only | 规则3：无交锋记录 |

**规则回顾**（来自用户原始请求）：
- 规则1：仅修改 `recentMatches` 数组和 `accuracyLevel` 字段
- 规则2：不修改 `worldCupMatches`、`worldCupSummary`、`source` 字段
- 规则3（例外）：若无任何交锋记录可添加（recentMatches 保持为 `[]`），则在 `worldCupSummary` 末尾追加 "（两队近期无正式交锋记录）"，并将 `accuracyLevel` 改为 `'needs_review'`
- 数据必须基于 2026 年 6 月前的真实公开赛事，不得编造
- `winner` 字段使用 teamA/teamB 三字代码或 `'draw'`
- 比分格式：teamA 进球在前（teamA-teamB 顺序）

## Proposed Changes（拟议修改）

### 文件：`h:\世界杯娱乐项目\back\klpk-cgt-s-Org v2\src\data\worldcup\headToHead\index.ts`

#### 1. CUR_ECU（库拉索 vs 厄瓜多尔，636-644 行）
- 未找到可验证的正式交锋记录
- 应用规则3：
  - `recentMatches` 保持 `[]`
  - 在 `worldCupSummary` 末尾追加 "（两队近期无正式交锋记录）"
  - `accuracyLevel` 改为 `'needs_review'`

#### 2. JPN_TUN（日本 vs 突尼斯，647-655 行）
- 添加 2 条已验证记录：
```typescript
recentMatches: [
  { date: '2022-06-14', competition: '2022麒麟杯决赛', venue: '吹田', score: '0-3', winner: 'TUN', note: '突尼斯3-0胜，本·罗马丹点球，萨西和杰巴利进球' },
  { date: '2023-10-17', competition: '友谊赛', venue: '大阪', score: '2-0', winner: 'JPN', note: '日本2-0复仇' },
],
```
- `accuracyLevel` 改为 `'needs_review'`

#### 3. CPV_URU（佛得角 vs 乌拉圭，658-666 行）
- 未找到可验证的正式交锋记录
- 应用规则3（同 CUR_ECU）

#### 4. EGY_NZL（埃及 vs 新西兰，669-677 行）
- 添加 2 条已验证记录：
```typescript
recentMatches: [
  { date: '2024-03-22', competition: 'FIFA系列赛', venue: '开罗', score: '1-0', winner: 'EGY', note: '埃及1-0胜，穆斯塔法·穆罕默德点球' },
  { date: '2012-07-29', competition: '2012伦敦奥运会', venue: '伦敦', score: '1-1', winner: 'draw', note: '奥运会1-1平' },
],
```
- `accuracyLevel` 改为 `'needs_review'`

#### 5. FRA_IRQ（法国 vs 伊拉克，680-688 行）
- 未找到可验证的正式交锋记录
- 应用规则3（同 CUR_ECU）

#### 6. NOR_SEN（挪威 vs 塞内加尔，691-699 行）
- 添加 1 条已验证记录：
```typescript
recentMatches: [
  { date: '2006-03-01', competition: '友谊赛', venue: '达喀尔', score: '1-2', winner: 'SEN', note: '塞内加尔2-1胜，两队唯一一次交锋' },
],
```
- 比分说明：teamA=NOR，teamB=SEN，塞内加尔 2-1 胜，故 score 为 '1-2'（NOR 进球在前），winner 为 'SEN'
- `accuracyLevel` 改为 `'needs_review'`

#### 7. DZA_JOR（阿尔及利亚 vs 约旦，702-710 行）
- 未找到可验证的正式交锋记录
- 应用规则3（同 CUR_ECU）

#### 8. CRO_PAN（克罗地亚 vs 巴拿马，713-721 行）
- 未找到 2026 年前可验证的正式交锋记录
- 应用规则3（同 CUR_ECU）

#### 9. COD_COL（刚果(金) vs 哥伦比亚，724-732 行）
- 未找到可验证的正式交锋记录
- 应用规则3（同 CUR_ECU）

### 规则3 追加文本统一格式

对 6 条无交锋记录的对阵（CUR_ECU、CPV_URU、FRA_IRQ、DZA_JOR、CRO_PAN、COD_COL），在 `worldCupSummary` 字符串末尾追加：
```
（两队近期无正式交锋记录）
```
追加方式：直接在原字符串末尾拼接该文本（原句末尾的句号之后）。

## Assumptions & Decisions（假设与决策）

1. **数据可靠性**：JPN_TUN、EGY_NZL、NOR_SEN 的比赛数据已在之前会话中通过多个可靠来源（rsssf.org、national-football-teams.com、官方足协网站等）交叉验证，本次直接复用已验证数据，不再重新搜索。

2. **比分顺序约定**：统一采用 teamA 进球在前（teamA-teamB 顺序），与之前 8 条已完成编辑保持一致。NOR_SEN 中挪威为 teamA，塞内加尔 2-1 获胜，故 score 为 '1-2'，winner 为 'SEN'。

3. **规则3适用判断**：6 条对阵经多轮搜索均未找到可验证的正式 A 级赛交锋记录，符合规则3的"无任何交锋记录"条件，需追加备注文本。

4. **不修改其他字段**：严格遵循规则1和规则2，除 `recentMatches`、`accuracyLevel`（以及规则3例外下的 `worldCupSummary`）外，不触碰 `worldCupMatches`、`source` 等其他字段。

5. **编辑方式**：使用 Edit 工具逐条精确替换，每条对阵单独编辑，确保 `old_string` 唯一匹配。

## Verification Steps（验证步骤）

1. 完成全部 9 条编辑后，运行 `npx tsc --noEmit` 确认无 TypeScript 错误。
2. 若有错误，根据错误信息修正（如类型不匹配、字段缺失等）。
3. 最终通过 Grep 确认 521-732 行区间内不再存在 `accuracyLevel: 'summary_only'`（除非有特殊情况）。

## 执行顺序

1. 编辑 CUR_ECU（规则3）
2. 编辑 JPN_TUN（2条记录）
3. 编辑 CPV_URU（规则3）
4. 编辑 EGY_NZL（2条记录）
5. 编辑 FRA_IRQ（规则3）
6. 编辑 NOR_SEN（1条记录）
7. 编辑 DZA_JOR（规则3）
8. 编辑 CRO_PAN（规则3）
9. 编辑 COD_COL（规则3）
10. 运行 `npx tsc --noEmit` 验证
