# 竞猜记录与排行榜今日榜修复计划

## 摘要

修复两个问题：(1) 竞猜"等待结算"页"我的记录"默认展开并随结算同步刷新（已完成改动1）；(2) 排行榜今日榜"一碗白米饭"用户今日收益=0、命中率不对的根因——prediction.status 未持久化为 WON/LOST，导致 settledAt 为 undefined，todayProfit 和 rate 计算均跳过这些记录。

## 当前状态分析

### 问题1：竞猜记录显示（已修复 ✅）
`src/components/PredictionTab.tsx` 已完成：
- `showHistory` 默认值从 `false` 改为 `true`（第204行）
- 新增 `prevBalanceRef` 监听钱包余额变化，自动刷新 `fetchHistory()`（第272-281行）
- import 已添加 `useRef`（第7行）

### 问题2：排行榜今日榜异常（待修复）

**根因链路：**
1. `settleMatchById`（settlement_service.ts）修改内存中 `prediction.status = 'WON'/'LOST'`、`settledAt`、`settledProfit`
2. `runBusinessTransaction` 调用 `dbService.saveOrThrow()` 持久化
3. `persistCurrentState` → `writeMySqlSnapshot` → `db-storage.mjs saveSnapshot`
4. `saveSnapshot` 使用 `getChangedTables` 对比 MySQL 现状与内存快照，仅保存差异表
5. **异常现象**：`match.isSettled=1`、`transactions` 存在 PREDICTION_WIN/PREDICTION_LOSE 记录，但 `predictions.status` 仍为 PENDING，`settledAt` 为 null

**影响：**
- "一碗白米饭"今日榜=0：`todayProfit` 计算条件 `p.settledAt && toBeijingDateKey(p.settledAt) === toBeijingDateKey(Date.now())` 不满足，跳过累加
- 命中率不对：`settledCount` 只统计 WON/LOST，PENDING 不计入，导致 rate 偏差
- 其他用户同样可能受影响（全部4个用户共21条 prediction 异常）

**todayProfit 逻辑确认（符合用户期望，无需改动）：**
```ts
// matches.ts 第523-525行
if (p.settledAt && toBeijingDateKey(p.settledAt) === toBeijingDateKey(Date.now())) {
  todayProfit += p.settledProfit || 0;  // WON: 正值; LOST: 负值; VOID: 0
}
```
- "今日内竞猜的奖励" = WON 的 settledProfit（正）✅
- "未命中亏的钱" = LOST 的 settledProfit（负）✅
- "下注扣掉还没有结算的" = PENDING/LOCKED 无 settledAt，不计入 ✅

**rankDelta（排名变化）确认：**
- 今日榜已显示 rankDelta（LeaderboardTab.tsx 第452行 `deltaMeta && activeLeaderboardTab !== 'streak'`）
- rankDelta 基于总余额排名变化（昨日快照 vs 当前），修复 status 后排序正确，rankDelta 自然有意义
- 今日榜标签保留为"今日榜"（tabMeta 第51行，无需改动）

**交易记录可用性验证：**
- WON：`adjustWalletBalance` 创建 `PREDICTION_WIN` 交易（amount > 0，settlement_service.ts 第228-238行）
- LOST：`adjustWalletBalance` 创建 `PREDICTION_LOSE` 交易（amount = 0，settlement_service.ts 第329-336行）
- VOID：`adjustWalletBalance` 创建 `REFUND` 交易（amount = stakePoints，settlement_service.ts 第191-198行）
- 三种结算状态均有对应交易记录，reconcile 可靠

## 提议改动

### 改动2：新增 reconcileSettledPredictions 数据修复函数

**文件**：`src/server/helpers.ts`

**位置**：在 `autoSettleFinishedMatches` 函数之前（第697行附近）新增导出函数

**逻辑**：
```ts
export function reconcileSettledPredictions(db: ReturnType<typeof dbService.getData>): number {
  let fixed = 0;
  for (const match of db.matches) {
    if (!match.isSettled) continue;
    const matchPreds = db.predictions.filter(p => p.matchId === match.id);
    for (const pred of matchPreds) {
      // 仅修复仍处于未结算状态的 prediction
      if (pred.status === 'PENDING' || pred.status === 'LOCKED') {
        const winTx = db.transactions.find(tx =>
          tx.relatedPredictionId === pred.id && tx.type === 'PREDICTION_WIN'
        );
        const loseTx = db.transactions.find(tx =>
          tx.relatedPredictionId === pred.id && tx.type === 'PREDICTION_LOSE'
        );
        const refundTx = db.transactions.find(tx =>
          tx.relatedPredictionId === pred.id && tx.type === 'REFUND' && tx.amount > 0
        );
        if (winTx) {
          pred.status = 'WON';
          pred.settledAt = winTx.createdAt;
          pred.settledReturn = winTx.amount;
          pred.settledProfit = winTx.amount - pred.stakePoints;
          fixed++;
        } else if (loseTx) {
          pred.status = 'LOST';
          pred.settledAt = loseTx.createdAt;
          pred.settledReturn = 0;
          pred.settledProfit = -pred.stakePoints;
          fixed++;
        } else if (refundTx) {
          // VOID 结算返还本金
          pred.status = 'VOID';
          pred.settledAt = refundTx.createdAt;
          pred.settledReturn = pred.stakePoints;
          pred.settledProfit = 0;
          fixed++;
        }
      }
    }
  }
  return fixed;
}
```

**集成点1**：在 `autoSettleFinishedMatches` 的 `return settledCount;` 之前（第774行）调用：
```ts
const fixedCount = reconcileSettledPredictions(db);
if (fixedCount > 0) {
  logger.info(`[AutoSettle] reconcile 修复 ${fixedCount} 条历史 prediction 状态`);
}
return settledCount;
```

**集成点2**：在 `server.ts` 启动时调用一次（第114行 `dbService.getData()` 之后）：
```ts
const __db = dbService.getData();
const fixedCount = reconcileSettledPredictions(__db);
if (fixedCount > 0) {
  logger.info(`[Startup] reconcile 修复 ${fixedCount} 条历史 prediction 状态`);
  dbService.save();
}
```
需要在 server.ts 顶部 import 中添加 `reconcileSettledPredictions`（第25行）。

### 改动3：rate 返回 null（settledCount=0 时）

**文件**：`src/server/routes/matches.ts`

**位置**：第528行

**改动**：
```ts
// 原：const rate = settledCount === 0 ? 0 : Math.round((wonCount / settledCount) * 100);
const rate: number | null = settledCount === 0 ? null : Math.round((wonCount / settledCount) * 100);
```

**原因**：settledCount=0 时返回 0 会被前端显示为"0%"，误导用户以为命中率是0%。返回 null 让前端显示"暂无数据"。

### 改动4：LeaderboardTab.tsx 处理 rate=null 显示

**文件**：`src/components/LeaderboardTab.tsx`

**改动1**：第29行类型修改
```ts
// 原：rate?: number;
rate?: number | null;
```

**改动2**：PodiumCard 第99行
```tsx
// 原：return `${item.rate || 0}%`;
return item.rate == null ? '暂无' : `${item.rate}%`;
```

**改动3**：列表第405行（rate 榜单显示）
```tsx
// 原：<p className="text-sm font-black text-violet-700">{item.rate || 0}%</p>
<p className="text-sm font-black text-violet-700">{item.rate == null ? '暂无' : `${item.rate}%`}</p>
```

**改动4**：列表第412行（其他榜单的 rate 副信息）
```tsx
// 原：<p className="text-sm font-black text-slate-900">{item.rate || 0}%</p>
<p className="text-sm font-black text-slate-900">{item.rate == null ? '暂无' : `${item.rate}%`}</p>
```

## 不需要改动的部分（确认）

- **今日榜标签**：保留"今日榜"（tabMeta 第51行已正确）
- **todayProfit 计算逻辑**：已结算才计入，未结算下注不计入（matches.ts 第523-525行已正确）
- **rankDelta 显示**：今日榜已显示总余额排名变化（LeaderboardTab.tsx 第452行已正确）
- **总余额榜**：用户确认无问题
- **改动1**：PredictionTab.tsx 已完成

## 假设与决策

1. **reconcileSettledPredictions 基于 transactions 修复**：transactions 表持久化正常（PREDICTION_WIN/LOSE/REFUND 均有记录），作为修复 prediction 状态的可靠数据源
2. **不深究 getChangedTables 根因**：即使根因是 getChangedTables 检测逻辑，reconcile 函数能在启动时和每次结算后修复数据，属于防御性修复，足以解决问题
3. **VOID 一并修复**：虽然原计划只提 WON/LOST，但 VOID 同样有 REFUND 交易可依据，一并修复避免遗漏
4. **rate=null 仅影响显示**：不影响排序逻辑（null 在排序中等价于0，但今日榜按 todayProfit 排序，rate 榜单按 rate 排序时 null 会排在最后，符合预期）
5. **改动5（服务器启动修复）合并到改动2**：在 server.ts 调用 reconcileSettledPredictions，与 helpers.ts 新增函数同属一个改动单元

## 验证步骤

1. **本地构建**：
   ```bash
   npm run build
   ```
   确保 TypeScript 编译无错误

2. **启动本地服务**：
   ```bash
   npx pm2 restart worldcup
   ```
   或直接 `npm run dev`

3. **验证启动修复**：查看 PM2 日志，确认 `[Startup] reconcile 修复 N 条历史 prediction 状态` 输出

4. **验证排行榜**：访问 `http://localhost:3000`，登录后查看排行榜
   - 今日榜：确认"一碗白米饭"今日收益不再为0（显示正或负值）
   - 命中率：确认"一碗白米饭"命中率正确显示
   - 无已结算记录的用户显示"暂无"而非"0%"

5. **验证竞猜记录**：进入竞猜 → 等待结算
   - "我的记录"默认展开显示
   - 结算后记录自动刷新，状态显示"已结算"

6. **验证其他用户**：检查所有用户今日榜数据是否合理（有正有负，未结算的不计入）

7. **提交 GitHub + 部署云服务器**（本地测试通过后）
