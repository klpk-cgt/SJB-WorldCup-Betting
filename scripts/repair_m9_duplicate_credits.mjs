/**
 * m-9 重复积分修复脚本
 * 
 * 用途：修复 forceResettle 回滚不完整导致的重复发放积分问题
 * 场景：德国 vs 库拉索 (m-9) 首次结算写入钱包但状态未更新，
 *       forceResettle 跳过回滚后再次发放积分 → 双倍积分
 * 
 * 使用方法：
 *   1. SSH 登录云服务器
 *   2. 先备份数据库！
 *   3. cd 到项目根目录
 *   4. node scripts/repair_m9_duplicate_credits.mjs [--dry-run|--fix]
 */

import { PrismaClient } from '@prisma/client';

const MATCH_ID = 'm-9';
const DRY_RUN = process.argv.includes('--dry-run');
const FIX = process.argv.includes('--fix');

if (!DRY_RUN && !FIX) {
  console.log('请指定模式：--dry-run（仅诊断）或 --fix（执行修复）');
  console.log('示例：node scripts/repair_m9_duplicate_credits.mjs --dry-run');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log(`m-9 重复积分 ${DRY_RUN ? '诊断' : '修复'} 脚本`);
  console.log('='.repeat(60));
  console.log();

  // 1. 确认比赛存在
  const match = await prisma.match.findUnique({ where: { id: MATCH_ID } });
  if (!match) {
    console.error(`错误：未找到比赛 ${MATCH_ID}`);
    return;
  }
  console.log(`比赛：${match.roundName || '未知轮次'} (${MATCH_ID})`);
  console.log(`比分：${match.homeScore} : ${match.awayScore}`);
  console.log(`结算状态：isSettled=${match.isSettled}`);
  console.log();

  // 2. 查找所有 m-9 的预测
  const predictions = await prisma.prediction.findMany({
    where: { matchId: MATCH_ID },
    orderBy: { id: 'asc' },
  });

  // 3. 批量获取用户信息
  const userIds = [...new Set(predictions.map((p) => p.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  console.log(`找到 ${predictions.length} 条预测：`);
  const statusCounts = {};
  for (const p of predictions) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }
  console.log('  状态分布：', JSON.stringify(statusCounts));
  console.log();

  // 4. 分析每条预测的交易情况，检测重复积分
  const issues = [];
  const summaries = [];

  for (const prediction of predictions) {
    const txs = await prisma.transaction.findMany({
      where: { relatedPredictionId: prediction.id },
      orderBy: { createdAt: 'asc' },
    });

    const winTxs = txs.filter((t) => t.type === 'PREDICTION_WIN' && t.amount > 0);
    const cardTxs = txs.filter((t) => t.type === 'CARD_EFFECT' && t.amount > 0);
    const refundTxs = txs.filter((t) => t.type === 'REFUND' && t.amount < 0);
    const stakeTxs = txs.filter((t) => t.type === 'PREDICTION_STAKE');
    const loseTxs = txs.filter((t) => t.type === 'PREDICTION_LOSE');

    const hasDuplicateWins = winTxs.length > 1;
    const hasDuplicateCards = cardTxs.length > 1;

    if (hasDuplicateWins || hasDuplicateCards) {
      const duplicateWinAmount = winTxs.slice(1).reduce((s, t) => s + t.amount, 0);
      const duplicateCardAmount = cardTxs.slice(1).reduce((s, t) => s + t.amount, 0);
      const totalDuplicate = duplicateWinAmount + duplicateCardAmount;

      issues.push({
        predictionId: prediction.id,
        userId: prediction.userId,
        displayName: userMap.get(prediction.userId)?.displayName || '未知',
        status: prediction.status,
        winCount: winTxs.length,
        cardCount: cardTxs.length,
        refundCount: refundTxs.length,
        duplicateWinAmount,
        duplicateCardAmount,
        totalDuplicate,
        winTxIds: winTxs.map((t) => t.id),
        cardTxIds: cardTxs.map((t) => t.id),
      });
    }

    summaries.push({
      predictionId: prediction.id,
      user: userMap.get(prediction.userId)?.displayName || prediction.userId,
      status: prediction.status,
      stake: prediction.stakePoints,
      settledReturn: prediction.settledReturn ?? 0,
      winTxs: winTxs.length,
      cardTxs: cardTxs.length,
      loseTxs: loseTxs.length,
      refundTxs: refundTxs.length,
      totalCredited: [...winTxs, ...cardTxs].reduce((s, t) => s + t.amount, 0),
    });
  }

  // 输出诊断结果
  console.log('--- 预测摘要 ---');
  console.log(
    '用户'.padEnd(16),
    '状态'.padEnd(8),
    '本金'.padEnd(8),
    '结算返'.padEnd(8),
    'WIN次'.padEnd(6),
    'CARD次'.padEnd(6),
    'LOSE次'.padEnd(6),
    'REFUND次'.padEnd(8),
    '实收积分',
  );
  for (const s of summaries) {
    console.log(
      s.user.slice(0, 16).padEnd(16),
      s.status.padEnd(8),
      String(s.stake).padEnd(8),
      String(s.settledReturn).padEnd(8),
      String(s.winTxs).padEnd(6),
      String(s.cardTxs).padEnd(6),
      String(s.loseTxs).padEnd(6),
      String(s.refundTxs).padEnd(8),
      s.totalCredited,
    );
  }

  console.log();
  console.log(`--- 发现 ${issues.length} 条重复积分问题 ---`);
  if (issues.length === 0) {
    console.log('没有发现重复积分，数据库可能已经正常。');
    return;
  }

  let totalToRefund = 0;
  for (const issue of issues) {
    console.log();
    console.log(`用户：${issue.displayName} (${issue.userId})`);
    console.log(`  预测ID：${issue.predictionId}，状态：${issue.status}`);
    console.log(`  PREDICTION_WIN 交易数：${issue.winCount}`);
    console.log(`    ${issue.winTxIds.join(', ')}`);
    console.log(`  CARD_EFFECT 交易数：${issue.cardCount}`);
    console.log(`    ${issue.cardTxIds.join(', ')}`);
    console.log(`  重复 WIN 金额：${issue.duplicateWinAmount}`);
    console.log(`  重复 CARD 金额：${issue.duplicateCardAmount}`);
    console.log(`  需扣回总额：${issue.totalDuplicate}`);
    totalToRefund += issue.totalDuplicate;
  }

  console.log();
  console.log(`总计需扣回：${totalToRefund} 积分（${issues.length} 条预测）`);

  if (DRY_RUN) {
    console.log();
    console.log('=== 诊断完成（--dry-run 模式，未修改数据）===');
    console.log('如果确认无误，请运行：node scripts/repair_m9_duplicate_credits.mjs --fix');
    return;
  }

  // 5. 执行修复（--fix 模式）
  console.log();
  console.log('=== 开始修复 ===');
  console.log();

  const fixResults = [];

  for (const issue of issues) {
    // 5a. 删除重复的 PREDICTION_WIN 交易（保留第一笔）
    if (issue.winTxIds.length > 1) {
      const duplicateWinIds = issue.winTxIds.slice(1);
      await prisma.transaction.deleteMany({
        where: { id: { in: duplicateWinIds } },
      });
      console.log(`  ${issue.displayName}: 删除 ${duplicateWinIds.length} 笔重复 PREDICTION_WIN`);
    }

    // 5b. 删除重复的 CARD_EFFECT 交易（保留第一笔）
    if (issue.cardTxIds.length > 1) {
      const duplicateCardIds = issue.cardTxIds.slice(1);
      await prisma.transaction.deleteMany({
        where: { id: { in: duplicateCardIds } },
      });
      console.log(`  ${issue.displayName}: 删除 ${duplicateCardIds.length} 笔重复 CARD_EFFECT`);
    }

    // 5c. 扣除钱包中的重复积分
    if (issue.totalDuplicate > 0) {
      const wallet = await prisma.wallet.findUnique({
        where: { userId: issue.userId },
      });

      if (!wallet) {
        console.error(`  ${issue.displayName}: 错误 - 找不到钱包！`);
        continue;
      }

      const newBalance = wallet.balance - issue.totalDuplicate;

      const actualDeduct = Math.min(wallet.balance, issue.totalDuplicate);

      if (wallet.balance < issue.totalDuplicate) {
        console.warn(
          `  ${issue.displayName}: 警告 - 余额不足！当前=${wallet.balance}，需扣=${issue.totalDuplicate}`,
        );
      }

      await prisma.wallet.update({
        where: { userId: issue.userId },
        data: { balance: Math.max(0, newBalance) },
      });

      // 记录扣款交易
      await prisma.transaction.create({
        data: {
          id: `repair-${issue.predictionId}`,
          userId: issue.userId,
          type: 'REFUND',
          amount: -actualDeduct,
          balanceBefore: wallet.balance,
          balanceAfter: Math.max(0, newBalance),
          relatedPredictionId: issue.predictionId,
          relatedMatchId: MATCH_ID,
          note: `[数据修复] 重结重复积分修复：${match.roundName}`,
          createdAt: new Date().toISOString(),
        },
      });

      fixResults.push({
        user: issue.displayName,
        deducted: actualDeduct,
        balanceBefore: wallet.balance,
        balanceAfter: Math.max(0, newBalance),
      });

      console.log(
        `  ${issue.displayName}: 扣除 ${actualDeduct} 积分 (${wallet.balance} → ${Math.max(0, newBalance)})`,
      );
    }
  }

  console.log();
  console.log('=== 修复完成 ===');
  console.log();
  console.log('修复摘要：');
  console.log('用户'.padEnd(16), '扣回积分'.padEnd(10), '修复前余额'.padEnd(12), '修复后余额');
  for (const r of fixResults) {
    console.log(
      r.user.slice(0, 16).padEnd(16),
      String(r.deducted).padEnd(10),
      String(r.balanceBefore).padEnd(12),
      r.balanceAfter,
    );
  }
}

main()
  .catch((e) => {
    console.error('脚本执行失败：', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
