## 用户需求

先修复 forceResettle 回滚链路的 4 个 P0 缺陷，然后重启本地服务进行全流程功能实测。

## 核心修复内容

### P0-1: 卡牌库存不恢复

forceResettle 重置 prediction.status=PENDING 但卡牌已被 consumeCard 消耗且未退回，重结时 usedCard 仍存在，导致一张卡用两次。

### P0-2: VOID 退款参数名错误

VOID 结算退款调用 adjustWalletBalance 时用了 matchId/predictionId，接口要求 relatedMatchId/relatedPredictionId，导致 VOID 退款交易无法被 forceResettle 关联回滚。

### P0-3: SETTLEMENT_VOID 类型未定义

VOID 结算用了 type:'SETTLEMENT_VOID'，但 TransactionType 合法值中无此类型（因 @ts-nocheck 未报错），回滚过滤逻辑漏掉 VOID 退款。

### P0-4: 余额不足静默跳过

forceResettle 回滚时若用户余额不足，只 warn 不处理，导致用户积分永久不一致。

### P0-5: admin.ts 重置比赛接口同类 bug

admin.ts 第811-828行 resetToNS 也有 status==='WON' 回滚 + 直接改 wallet.balance + 无卡牌恢复的问题。

## 实测验证内容

- 下注扣减积分、道具卡消耗
- 比赛结算积分发放、自动结算链路
- forceResettle 回滚（含道具卡场景）
- 排行榜积分同步
- 赔率同步状态
- 已结束赛程比分完整性

## Tech Stack

- 后端: Node.js + TypeScript + Express
- 数据库: MySQL (Docker worldcup-mysql) via Prisma
- 存储: APP_STORAGE_MODE=mysql, DATABASE_URL=mysql://worldcup_user:worldcup123@localhost:3306/worldcup_betting
- 定时调度: node-cron (每分钟 dynamic-sync-tick → autoSettleFinishedMatches)
- 本地端口: 3001 (3000 被网易云容器占用)

## Implementation Approach

### 修复策略：交易记录驱动的完整回滚

所有回滚逻辑统一为：基于 `db.transactions` 中 `relatedPredictionId` 匹配的实际交易记录计算应回滚金额，而非依赖 prediction.status 字段。

### 5 个修复点

**1. 新增 `restoreCard` 函数 (prediction_card_service.ts)**
在 `consumeCard` 函数后新增 `restoreCard(userId, cardId)`，逻辑为 `consumeCard` 的逆操作——库存 +1。供 forceResettle 回滚时恢复用户卡牌。

**2. settlement_service.ts 回滚循环修复 (第100-153行)**

- `settlementCreditTypes` 数组增加 `'REFUND'`（使 VOID 退款也能被回滚计算覆盖）
- 余额不足时改为部分扣减（`Math.min(netToRefund, wallet.balance)`）而非静默跳过，未扣回部分记 `logger.error`
- 回滚时若 `prediction.usedCard` 存在，调用 `restoreCard` 恢复库存
- 清除 `prediction.cardEffectNotes`

**3. settlement_service.ts VOID 结算修复 (第172-179行)**

- `type: 'SETTLEMENT_VOID'` → `type: 'REFUND'`
- `matchId` → `relatedMatchId`
- `predictionId` → `relatedPredictionId`

**4. admin.ts resetToNS 回滚修复 (第811-828行)**

- 替换旧的 `status === 'WON'` 检查为交易记录驱动回滚
- 替换直接 `wallet.balance -=` 为 `adjustWalletBalance`
- 增加卡牌库存恢复
- 增加余额不足部分扣减处理

**5. import 修正**

- settlement_service.ts 增加 `restoreCard` 导入

### 回滚计算公式（统一）

```
creditedTxs = transactions WHERE relatedPredictionId = pred.id 
  AND type IN (PREDICTION_WIN, CARD_EFFECT, REFUND) AND amount > 0
refundTxs = transactions WHERE relatedPredictionId = pred.id 
  AND type = REFUND AND amount < 0
netToRefund = SUM(creditedTxs.amount) - SUM(ABS(refundTxs.amount))
deductAmount = MIN(netToRefund, wallet.balance)  // 部分扣减
```

### 性能与安全性

- 回滚循环时间复杂度 O(P*T)，P=比赛预测数，T=总交易数，对于单场比赛(通常<50预测)可忽略
- 部分扣减确保不会因余额不足导致整个事务回滚（adjustWalletBalance 在 balanceAfter<0 时抛异常）
- restoreCard 复用现有 ensureCardInventories/saveCardInventories 模式，无新架构引入

## Implementation Notes

- settlement_service.ts 顶部有 `// @ts-nocheck`，修改后需手动确认类型正确性
- adjustWalletBalance 要求 balanceAfter >= 0，部分扣减策略确保 `amount = -Math.min(netToRefund, wallet.balance)` 不会触发异常
- admin.ts 的 resetToNS 回滚不经过 runBusinessTransaction，直接操作 db 后 dbService.save()，需保持这一模式（该路由整体在 GET handler 中，非独立事务）
- restoreCard 不需要写入交易记录（卡牌库存独立于钱包交易系统）

## Architecture Design

### 修改文件关系图

```
prediction_card_service.ts
  └── restoreCard() [NEW] ← settlement_service.ts 回滚调用
                              ← admin.ts resetToNS 回滚调用

settlement_service.ts
  ├── forceResettle 回滚循环 [MODIFY] ← 调用 restoreCard + 部分扣减 + REFUND类型
  └── VOID 结算退款 [MODIFY] ← 参数名 + 类型修正

admin.ts
  └── resetToNS 回滚 [MODIFY] ← 同样改为交易记录驱动 + restoreCard

wallet_service.ts (无修改)
  └── adjustWalletBalance ← 已有接口，参数 relatedMatchId/relatedPredictionId
```

## Directory Structure

```
project-root/
├── src/
│   ├── server/
│   │   ├── services/
│   │   │   └── settlement_service.ts  # [MODIFY] 修复4个P0缺陷：VOID参数名/类型、回滚卡牌恢复、余额不足部分扣减、回滚过滤增加REFUND
│   │   ├── routes/
│   │   │   └── admin.ts               # [MODIFY] 修复resetToNS回滚：改为交易记录驱动+restoreCard+adjustWalletBalance
│   │   └── prediction_card_service.ts # [MODIFY] 新增restoreCard函数（consumeCard的逆操作）
│   └── types.ts                       # [无修改] TransactionType已包含REFUND，无需新增SETTLEMENT_VOID
```

## 执行清单 (Todo List)

| # | 任务 | 依赖 | 说明 |
| --- | --- | --- | --- |
| 1 | **fix-p0-defects** | - | 修复5个P0缺陷：restoreCard + 回滚循环(REFUND类型/部分扣减/卡牌恢复) + VOID退款参数名类型 + admin resetToNS + import |
| 2 | **tsc-restart** | 1 | TypeScript编译检查零错误 + 重启服务(port 3001)验证health API |
| 3 | **test-bet-card-settle** | 2 | 下注扣减+道具卡消耗+手动结算发放+forceResettle回滚(验证卡牌库存恢复无重复应用+积分正确扣回) |
| 4 | **test-auto-settle-odds** | 3 | 自动结算链路验证 + 赔率三源同步状态 + matchOdds数据完整性 |
| 5 | **test-leaderboard** | 3 | 5种排行榜+今日之星逻辑正确性 + 结算后积分变化同步到榜单 |
| 6 | **test-finished-matches** | 2 | 已结束赛程比分完整性(scoreUnknown检查) + 积分进度 + 是否需补充录入 |
| 7 | **commit-push** | 3,4,5,6 | 提交P0修复到Git并推送到GitHub |


### 验证矩阵（对应原始5个问题）

| 原始问题 | 覆盖todo |
| --- | --- |
| 1. 赛程结算/自动结算/回滚机制 | #3 test-bet-card-settle + #4 test-auto-settle-odds |
| 2. 赔率同步 | #4 test-auto-settle-odds |
| 3. 下注/道具卡扣减/回滚bug | #3 test-bet-card-settle |
| 4. 已结束赛程比分信息 | #6 test-finished-matches |
| 5. 排行榜逻辑/积分同步 | #5 test-leaderboard |