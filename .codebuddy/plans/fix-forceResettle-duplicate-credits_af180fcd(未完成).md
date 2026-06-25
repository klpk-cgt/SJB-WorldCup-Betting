---
name: fix-forceResettle-duplicate-credits
overview: 修复 forceResettle 回滚不完整导致重复发放积分的 bug，并提供云服务器数据修复方案
todos:
  - id: fix-rollback-logic
    content: 修复 settlement_service.ts 第99-125行：将 forceResettle 回滚条件从 status==='WON' 改为基于 db.transactions 中 PREDICTION_WIN/CARD_EFFECT 交易记录计算回滚金额
    status: pending
  - id: update-changelog
    content: 更新 CHANGELOG.md 添加 v2.5.3 条目，记录 forceResettle 回滚修复
    status: pending
    dependencies:
      - fix-rollback-logic
  - id: commit-push
    content: 提交修复到 Git 并推送到 GitHub
    status: pending
    dependencies:
      - update-changelog
  - id: cleanup-temp-files
    content: 清理临时分析脚本文件（_analyze_cloud_db.cjs, _deep_analyze.cjs, _extract_preds.cjs, _extract_tables.cjs, _parse_sql.cjs）
    status: pending
    dependencies:
      - commit-push
---

## 用户需求

修复 v2.5.2 中 forceResettle 回滚逻辑的严重缺陷，解决 double credits 问题，并提供云服务器数据恢复方案。

## 问题描述

### 场景还原

1. 管理员首次结算德国 vs 库拉索(m-9)，由于未知原因，21条预测中仅1条LOST状态更新成功，**20条预测仍为PENDING，但钱包已加积分（20条PREDICTION_WIN + 7条CARD_EFFECT）**
2. 管理员点击"回退重新结算"(forceResettle)，期望回滚积分后重算
3. 回滚代码仅检查 `prediction.status === 'WON'` 才退款，而20条PENDING预测被跳过
4. 重新结算时再次发放积分 → **双倍积分**，排行榜和积分数据异常

### 根因

`settlement_service.ts` 第99-125行 forceResettle 回滚逻辑以 `prediction.status === 'WON' && prediction.settledReturn` 为回滚条件，未考虑首次结算中 status 未更新但钱包已加积分的边缘情况。

## 核心修复

将回滚触发条件从 "检查 prediction 状态" 改为 "检查实际交易记录"，通过 `db.transactions` 中 `relatedPredictionId` 匹配的 PREDICTION_WIN 和 CARD_EFFECT 交易来计算应回滚金额。

## 云服务器恢复步骤

1. 从 `worldcup_app_2026-06-15_10-52-15` 备份恢复数据库（首次结算后、forceResettle前的干净状态）
2. 部署 v2.5.3 修复代码
3. 重启服务
4. 对 m-9 执行 `POST /api/admin/matches/m-9/settle` + `{ "forceResettle": true }`

## 技术方案

### 修改文件

仅修改一个文件：`src/server/services/settlement_service.ts` 第99-125行

### 修复逻辑

**修复前（已有代码）**：

```typescript
if (match.isSettled && params.forceResettle) {
    for (const prediction of matchPredictions) {
      // 仅回滚 status==='WON' 且有 settledReturn 的预测
      if (prediction.status === 'WON' && prediction.settledReturn) {
        adjustWalletBalance({ amount: -prediction.settledReturn, type: 'REFUND', ... });
      }
      prediction.status = 'PENDING';
      prediction.settledReturn = 0;
      prediction.settledProfit = 0;
      prediction.settledAt = undefined;
    }
}
```

**修复后**：

```typescript
if (match.isSettled && params.forceResettle) {
    for (const prediction of matchPredictions) {
      // 基于实际交易记录回滚：查找所有PREDICTION_WIN和CARD_EFFECT交易
      const creditedTxns = db.transactions.filter(
        t => t.relatedPredictionId === prediction.id
          && (t.type === 'PREDICTION_WIN' || t.type === 'CARD_EFFECT')
      );
      let totalCredited = 0;
      for (const tx of creditedTxns) {
        totalCredited += (tx.amount || 0);
      }

      if (totalCredited > 0) {
        const wallet = db.wallets.find(w => w.userId === prediction.userId);
        if (wallet && wallet.balance >= totalCredited) {
          adjustWalletBalance({
            userId: prediction.userId,
            amount: -totalCredited,
            type: 'REFUND',
            note: `重结回滚：${match.roundName}`,
            relatedPredictionId: prediction.id,
            relatedMatchId: match.id,
          });
        } else {
          logger.warn(`重结回滚跳过（余额不足）`, { ... });
        }
      }

      prediction.status = 'PENDING';
      prediction.settledReturn = 0;
      prediction.settledProfit = 0;
      prediction.settledAt = undefined;
      prediction.cardEffectNotes = undefined;
    }
}
```

### 覆盖场景

| 首次结算后预测状态 | 是否有交易记录 | 修复前行为 | 修复后行为 |
| --- | --- | --- | --- |
| WON + settledReturn>0 | 有 | ✅ 回滚 | ✅ 回滚(通过交易记录) |
| **PENDING(钱包已加积分)** | **有** | **❌ 跳过→双倍积分** | **✅ 回滚(通过交易记录)** |
| LOST(无积分变动) | 有(amount=0) | ✅ 重置状态 | ✅ 重置状态 |
| 真正PENDING(从未结算) | 无 | ✅ 重置状态 | ✅ 重置状态 |


### 回滚金额计算

`totalCredited` = 该预测所有 PREDICTION_WIN 交易 amount 之和 + 所有 CARD_EFFECT 交易 amount 之和。通过实际交易记录而非 prediction 字段计算，确保无论首次结算中 prediction 状态是否正确写入，都能准确回滚。

### 不覆盖的场景

已手动退款或其他 REFUND 类型交易不会重复扣款，因为仅过滤 `PREDICTION_WIN` 和 `CARD_EFFECT` 类型。

## 非代码操作：云服务器恢复

1. 从 10:52 SQL 备份恢复数据库
2. 部署 v2.5.3 代码到云服务器
3. 重启 Node 服务
4. 通过 API 或管理面板执行 forceResettle：`POST /api/admin/matches/m-9/settle` + `{ "forceResettle": true }`