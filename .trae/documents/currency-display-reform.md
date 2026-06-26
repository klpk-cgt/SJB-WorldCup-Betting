# 积分显示货币化改造计划

## 概述

将项目中所有"积分"显示从当前混乱的三种风格（PTS 后缀 / 中文"积分" / 纯数字）统一改为 **¥ 前缀 + 千分位**格式（如 ¥1,000），增强下注参与感和真实感。同时新建统一格式化入口，消除 5 个组件中的重复实现。

## 当前状态分析

### 问题 1：无统一格式化入口
全项目不存在 `formatPoints` 等统一函数。5 个组件各自实现了重复的本地格式化：
- `BattleReportCard.formatPts`（K 缩写 + PTS）
- `MeTab.formatSigned` / `MeTab.formatCompact`（千分位，前者带 +/- 号）
- `LeaderboardTab.formatSignedNumber`（带 +/- 号，无千分位）
- `NetProfitChart.formatSigned`（带 +/- 号，不处理 null）

### 问题 2：三种后缀混用
| 风格 | 出现位置 |
|------|---------|
| PTS 后缀 | PredictionTab、HomeTab、AdminPanel、MeTab、BattleReportCard、App.tsx |
| 中文"积分" | PredictionTab、HomeTab、AdminPanel、AIRecommendations、App.tsx、AdminDashboard |
| 纯数字 | LeaderboardTab、MeTab、ActivityFeed、AdminPanel |

### 问题 3：小数位数/null 处理不一致
- 预计回收：`toFixed(1)` vs `toFixed(0)` vs `Math.round`
- null 处理：`'0'` vs `'--'` vs 崩溃

## 改造方案

### 第一步：新建统一格式化工具 `src/utils/format.ts`

```ts
/** 通用积分格式化：¥1,000 */
export function formatPoints(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '¥0';
  return '¥' + Math.round(value).toLocaleString();
}

/** 带符号积分格式化：+¥1,000 / -¥500 */
export function formatSignedPoints(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '¥0';
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : '';
  return sign + '¥' + Math.abs(rounded).toLocaleString();
}

/** 赔率格式化：2.20 或 -- */
export function formatOdds(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '--';
  return value.toFixed(2);
}

/** 预计回收格式化：¥1,200（整数） */
export function formatReturn(stake: number, odds: number): string {
  return formatPoints(stake * odds);
}
```

### 第二步：替换 11 个组件中的积分显示

**替换规则**：
- `xxx PTS` → `formatPoints(xxx)`
- `xxx 积分` / `+xxx 积分` → `formatPoints(xxx)` / `formatSignedPoints(xxx)`
- 纯数字余额/金额 → `formatPoints(xxx)`
- 带符号金额 → `formatSignedPoints(xxx)`
- 赔率 `xxx.toFixed(2)` → `formatOdds(xxx)`（不加 ¥ 前缀，赔率不是货币）
- 预计回收 `stake * odds` → `formatReturn(stake, odds)`

**各文件具体改动**：

#### 2.1 `src/App.tsx`
- L103: `净赚 +${profit.toLocaleString()} 积分` → `净赚 ${formatSignedPoints(profit)}`
- L354: `0 <span>PTS</span>` → `${formatPoints(0)}`

#### 2.2 `src/components/PredictionTab.tsx`（改动最多）
- L360: `已提交 ${stake} 积分，命中后预计可回收 ${...potentialReturn} 积分` → `已提交 ${formatPoints(stake)}，命中后预计可回收 ${formatPoints(potentialReturn)}`
- L393: 同上模式
- L433/861/975: `{wallet?.balance?.toLocaleString()} PTS` → `{formatPoints(wallet?.balance)}`
- L711/739/763/786/902/963/1088: `{option.odds.toFixed(2)}` → `{formatOdds(option.odds)}`
- L914/967: `{(stake * ...).toFixed(1)}` → `{formatReturn(stake, selectedOption?.odds || 0)}`
- L1092: `{stake} PTS` → `{formatPoints(stake)}`
- L1100: `+{(stake * ...).toFixed(0)} PTS` → `${formatReturn(stake, selectedOption?.odds || 0)}`
- L1210: `{option.oddsDecimal.toFixed(2)}` → `{formatOdds(option.oddsDecimal)}`
- L1254/1327: `投入 {bet.stakePoints}` → `投入 {formatPoints(bet.stakePoints)}`
- L1254/1327: `指数 {bet.oddsDecimal?.toFixed(2)}` → `指数 {formatOdds(bet.oddsDecimal)}`
- L1261/1265: `{bet.settledProfit}` → `{formatSignedPoints(bet.settledProfit)}`

#### 2.3 `src/components/MeTab.tsx`
- 删除 `formatSigned`（L116-120）和 `formatCompact`（L122-124）
- L368: `{formatCompact(wallet?.balance)}` → `{formatPoints(wallet?.balance)}`
- L373/413: `{formatSigned(stats.netProfit)}` → `{formatSignedPoints(stats.netProfit)}`
- L527: `投入 <strong>{bet.stakePoints}</strong>` → `投入 <strong>{formatPoints(bet.stakePoints)}</strong>`
- L527: `回报 <strong>{formatCompact(...)}</strong>` → `回报 <strong>{formatPoints(...)}</strong>`
- L759: `{formatSigned(prediction.settledProfit || 0)}` → `{formatSignedPoints(prediction.settledProfit || 0)}`
- L783: `{formatSigned(tx.amount)}` → `{formatSignedPoints(tx.amount)}`
- L784: `{formatCompact(tx.balanceAfter)}` → `{formatPoints(tx.balanceAfter)}`
- L889: `{bet.stakePoints} PTS` → `{formatPoints(bet.stakePoints)}`

#### 2.4 `src/components/LeaderboardTab.tsx`
- 删除 `formatSignedNumber`（L65-68）
- L97/107/425: `{item.balance?.toLocaleString() || 0}` → `{formatPoints(item.balance)}`
- L101/441: `+${item.totalWonProfit?.toLocaleString() || 0}` → `{formatSignedPoints(item.totalWonProfit)}`
- L300: `+{todayList[0].todayProfit}` → `{formatSignedPoints(todayList[0].todayProfit)}`
- L427/448: `{formatSignedNumber(...)}` → `{formatSignedPoints(...)}`
- L433/434: `{formatSignedNumber(...)}` → `{formatSignedPoints(...)}`

#### 2.5 `src/components/HomeTab.tsx`
- L446-460: PTS 金币 SVG 图标 → 改为 ¥ 符号显示
- L465: `{wallet?.balance?.toLocaleString() || '10,000'}` → `{formatPoints(wallet?.balance)}`
- L699: `答对 +100 积分/题` → `答对 +¥100/题`
- L844: `+{quizScore} PTS` → `${formatSignedPoints(quizScore)}`
- L962: `回答正确，+100 积分` → `回答正确，+¥100`

#### 2.6 `src/components/BattleReportCard.tsx`
- 删除 `formatPts`（L49-53）
- L103: `formatPts(...) + ' PTS'` → `{formatSignedPoints(...)}`
- L117: 同上

#### 2.7 `src/components/AdminPanel.tsx`
- L384: `...${amountNum} 积分` → `...${formatPoints(amountNum)}`
- L1632: `${Math.abs(Number(bulkAmount))} 积分` → `${formatPoints(Math.abs(Number(bulkAmount)))}`
- L1836: `{u.balance?.toLocaleString()} PTS` → `{formatPoints(u.balance)}`
- L2090-2092: `赔率 {p.oddsDecimal}` / `投注 {p.stakePoints}` / `可赢 {p.potentialReturn}` → 加 formatPoints/formatOdds
- L2173: `{t.amount > 0 ? '+' : ''}{t.amount}` → `{formatSignedPoints(t.amount)}`
- L2178: `余额: {t.balanceBefore} → {t.balanceAfter}` → `余额: ${formatPoints(t.balanceBefore)} → ${formatPoints(t.balanceAfter)}`

#### 2.8 `src/components/AdminDashboard.tsx`
- L246: `title={...${h.volume}积分}` → `title={...${formatPoints(h.volume)}}`

#### 2.9 `src/components/ActivityFeed.tsx`
- L176-177: `{delta > 0 ? '+' : ''}{delta.toLocaleString()}` → `{formatSignedPoints(delta)}`

#### 2.10 `src/components/AIRecommendations.tsx`
- L58: `需要 ${rec.suggestedStake} 积分，当前余额 ${wallet.balance}` → `需要 ${formatPoints(rec.suggestedStake)}，当前余额 ${formatPoints(wallet.balance)}`
- L73: `已跟投 ...${rec.suggestedStake} 积分` → `已跟投 ...${formatPoints(rec.suggestedStake)}`
- L142: `{rec.odds.toFixed(2)}` → `{formatOdds(rec.odds)}`
- L155: `${rec.suggestedStake} 积分` → `${formatPoints(rec.suggestedStake)}`
- L157: `预期回报 {Math.round(...)}` → `预期回报 ${formatPoints(Math.round(...))}`

#### 2.11 `src/components/profile/NetProfitChart.tsx`
- 删除 `formatSigned`（L11-14）
- L68/89/94/117: `{formatSigned(...)}` → `{formatSignedPoints(...)}`

### 第三步：HomeTab PTS 金币图标改造

HomeTab L446-460 有一个包含 "PTS" 文字的 SVG 金币图标，需要改为显示 "¥" 符号的图标样式，与新的货币化风格一致。

## 不改动的部分

- **后端数据**：`Wallet.balance`、`Transaction.amount` 等保持 number 类型不变
- **赔率值**：赔率不是货币，保持 `toFixed(2)` 格式（通过 `formatOdds` 统一），不加 ¥ 前缀
- **球员身价**：`MatchDetailPage.formatMarketValue` 是球员市场价值，不是用户积分，不改动
- **球队积分**：`StandingTeamRow.points` 是足球比赛积分（胜3平1负0），不是用户货币，不改动
- **下注输入框**：用户输入的纯数字保持不变，只在展示时格式化

## 验证步骤

1. `npm run build` 确认无编译错误
2. `npm test` 确认现有测试通过
3. 启动开发服务器，手动检查：
   - 首页钱包余额显示 ¥10,000
   - 下注弹窗中余额、投入、预计回收都显示 ¥ 前缀
   - 排行榜积分显示 ¥ 前缀 + 千分位
   - 个人中心流水金额显示带符号的 ¥ 前缀
   - 确认赔率仍保持小数格式（如 2.20），不加 ¥
