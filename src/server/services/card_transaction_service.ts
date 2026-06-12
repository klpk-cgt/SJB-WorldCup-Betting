/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 统一卡牌交易服务
 *
 * 封装反悔卡使用的完整业务逻辑。
 * 必须在 runBusinessTransaction 内部调用，避免并发重复撤销。
 */

import { dbService } from '../../db/db_service';
import { adjustWalletBalance } from './wallet_service';
import { getUserCardInventory, userHasCard } from '../prediction_card_service';
import logger from '../logger';
import { emitPointsAdjusted } from '../activity_service';

interface UseRegretCardParams {
  userId: string;
  predictionId: string;
}

interface UseRegretCardResult {
  success: true;
  message: string;
  refundedAmount: number;
  walletBalance: number;
}

/**
 * 使用反悔卡撤销下注
 *
 * 内部负责：
 * 1. 校验反悔卡库存
 * 2. 校验 prediction 属于当前用户
 * 3. 校验 prediction 状态是 PENDING 或 LOCKED
 * 4. 校验比赛未开始
 * 5. 扣减反悔卡库存
 * 6. 返还本金到钱包（通过 wallet_service）
 * 7. 修改 prediction 状态为 CANCELLED
 * 8. 保存 cardEffectNotes
 * 9. 触发群内动态
 */
export function useRegretCard(params: UseRegretCardParams): UseRegretCardResult {
  const db = dbService.getData();
  const { userId, predictionId } = params;

  // 1. 校验反悔卡库存
  if (!userHasCard(userId, 'REGRET')) {
    throw new Error('反悔卡库存不足。');
  }

  // 2. 校验 prediction 存在
  const prediction = db.predictions.find((item) => item.id === predictionId);
  if (!prediction) {
    throw new Error('预测不存在。');
  }

  // 3. 校验 prediction 属于当前用户
  if (prediction.userId !== userId) {
    throw new Error('只能撤销自己的预测。');
  }

  // 4. 校验 prediction 状态
  if (prediction.status !== 'PENDING' && prediction.status !== 'LOCKED') {
    throw new Error('只能撤销未结算的下注。');
  }

  // 5. 校验比赛未开始
  const match = db.matches.find((item) => item.id === prediction.matchId);
  if (match && new Date(match.startTimeUtc).getTime() <= Date.now()) {
    throw new Error('比赛已开始，无法使用反悔卡。');
  }

  // 6. 扣减反悔卡库存
  const inventory = getUserCardInventory(userId);
  inventory.cards.REGRET = Math.max(0, (inventory.cards.REGRET || 0) - 1);
  inventory.updatedAt = new Date().toISOString();
  prediction.usedCard = 'REGRET';

  // 7. 修改 prediction 状态
  prediction.status = 'CANCELLED';
  prediction.settledAt = new Date().toISOString();
  prediction.settledReturn = prediction.stakePoints;
  prediction.settledProfit = 0;
  prediction.cardEffectNotes = '反悔卡：撤销下注，返还全部本金';

  // 8. 返还本金到钱包
  const { wallet } = adjustWalletBalance({
    userId,
    amount: prediction.stakePoints,
    type: 'CARD_REFUND',
    note: '反悔卡撤销下注，返还本金',
    relatedPredictionId: prediction.id,
    relatedMatchId: prediction.matchId,
  });

  // 9. 触发群内动态
  try {
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      emitPointsAdjusted({
        userId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        amount: prediction.stakePoints,
        reason: '反悔卡撤销下注',
        balanceAfter: wallet.balance,
        groupId: user.groupId,
      });
    }
  } catch (e) {
    logger.error('触发反悔卡动态失败', { error: e instanceof Error ? e.message : String(e) });
  }

  return {
    success: true,
    message: '反悔卡生效，已撤销下注并返还本金。',
    refundedAmount: prediction.stakePoints,
    walletBalance: wallet.balance,
  };
}
