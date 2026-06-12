/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 竞猜道具卡服务
 *
 * 提供 4 种卡牌：
 *  - NO_LOSS  免亏卡：输了下注时仅返回本金（不再亏积分）
 *  - DOUBLE   双倍卡：赢了双倍收益
 *  - REGRET   反悔卡：可在开赛前撤销下注（返还本金）
 *  - FLOOR    保底卡：保证至少拿回 90% 的本金
 *
 * 设计要点：
 * 1. 每个用户拥有 4 种卡的库存，初始各 1 张
 * 2. 管理员可手动调整库存
 * 3. 卡牌使用后从库存中扣除
 * 4. 反悔卡是在"比赛开赛前"用户主动触发，立即结算
 * 5. 其余卡牌在结算时由 settleMatch 触发效果
 */

import { dbService } from '../db/db_service';
import logger from './logger';
import { Prediction, PredictionCardId, UserCardInventory } from '../types';
import { emitPointsAdjusted } from './activity_service';

// ─── 卡牌定义 ───

export const CARD_DEFINITIONS: Record<PredictionCardId, {
  id: PredictionCardId;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  tone: 'emerald' | 'rose' | 'amber' | 'violet' | 'cyan' | 'slate';
  rule: string;
}> = {
  NO_LOSS: {
    id: 'NO_LOSS',
    label: '免亏卡',
    shortLabel: '免亏',
    description: '如果竞猜未中，只扣 0 积分，返还全部本金',
    icon: '🛡️',
    tone: 'emerald',
    rule: 'settle_lost',
  },
  DOUBLE: {
    id: 'DOUBLE',
    label: '双倍卡',
    shortLabel: '双倍',
    description: '如果竞猜命中，结算收益 × 2',
    icon: '⚡',
    tone: 'amber',
    rule: 'settle_won_double',
  },
  REGRET: {
    id: 'REGRET',
    label: '反悔卡',
    shortLabel: '反悔',
    description: '比赛开始前使用，撤销下注并返还全部本金',
    icon: '↩️',
    tone: 'cyan',
    rule: 'cancel_before_kickoff',
  },
  FLOOR: {
    id: 'FLOOR',
    label: '保底卡',
    shortLabel: '保底',
    description: '保证至少拿回 90% 本金，未中返还 90%，命中按正常计算',
    icon: '🛟',
    tone: 'violet',
    rule: 'settle_floor',
  },
};

export function getCardDefinitions() {
  return Object.values(CARD_DEFINITIONS);
}

export function getCardDefinition(id: PredictionCardId) {
  return CARD_DEFINITIONS[id];
}

// ─── 库存管理 ───

const DEFAULT_INITIAL_COUNTS: Record<PredictionCardId, number> = {
  NO_LOSS: 1,
  DOUBLE: 1,
  REGRET: 1,
  FLOOR: 1,
};

function ensureCardInventories(): UserCardInventory[] {
  const db = dbService.getData();
  if (!Array.isArray((db as any).cardInventories)) {
    (db as any).cardInventories = [];
  }
  return (db as any).cardInventories as UserCardInventory[];
}

function saveCardInventories(inventories: UserCardInventory[]) {
  const db = dbService.getData();
  (db as any).cardInventories = inventories;
}

/**
 * 初始化用户卡牌库存（首次创建账户时调用一次）
 */
export function initUserCardInventory(userId: string): UserCardInventory {
  const inventories = ensureCardInventories();
  const existing = inventories.find((inv) => inv.userId === userId);
  if (existing) return existing;

  const newInv: UserCardInventory = {
    userId,
    cards: { ...DEFAULT_INITIAL_COUNTS },
    updatedAt: new Date().toISOString(),
  };
  inventories.push(newInv);
  saveCardInventories(inventories);
  return newInv;
}

/**
 * 获取用户卡牌库存
 */
export function getUserCardInventory(userId: string): UserCardInventory {
  const inventories = ensureCardInventories();
  const existing = inventories.find((inv) => inv.userId === userId);
  if (existing) return existing;
  return initUserCardInventory(userId);
}

/**
 * 调整用户卡牌数量（管理员使用）
 */
export function adjustUserCards(
  userId: string,
  cardId: PredictionCardId,
  delta: number,
): UserCardInventory {
  const inventories = ensureCardInventories();
  let inv = inventories.find((item) => item.userId === userId);
  if (!inv) {
    inv = initUserCardInventory(userId);
    // 重新加载
    const updated = ensureCardInventories().find((item) => item.userId === userId);
    if (updated) inv = updated;
  }
  const current = inv.cards[cardId] || 0;
  const next = Math.max(0, current + delta);
  inv.cards[cardId] = next;
  inv.updatedAt = new Date().toISOString();
  saveCardInventories(inventories);
  return inv;
}

/**
 * 消耗一张卡牌（下注时使用）
 */
export function consumeCard(userId: string, cardId: PredictionCardId): boolean {
  const inv = getUserCardInventory(userId);
  const current = inv.cards[cardId] || 0;
  if (current <= 0) return false;
  inv.cards[cardId] = current - 1;
  inv.updatedAt = new Date().toISOString();
  const inventories = ensureCardInventories();
  saveCardInventories(inventories);
  return true;
}

/**
 * 检查用户是否拥有该卡牌
 */
export function userHasCard(userId: string, cardId: PredictionCardId): boolean {
  return (getUserCardInventory(userId).cards[cardId] || 0) > 0;
}

// ─── 卡牌效果计算 ───

export interface CardSettlementResult {
  // 实际返还用户的积分
  finalReturn: number;
  // 实际净利润（可能为负：若免亏卡输的情况下 = 0）
  finalProfit: number;
  // 卡牌触发的提示语
  cardNote?: string;
  // 触发了反悔卡，需要将状态设为 CANCELLED
  cancelPrediction?: boolean;
}

/**
 * 根据卡牌计算结算结果
 */
export function applyCardToSettlement(
  prediction: Prediction,
  baseReturn: number,
  baseProfit: number,
  outcome: 'WON' | 'LOST' | 'VOID',
): CardSettlementResult {
  if (!prediction.usedCard) {
    return { finalReturn: baseReturn, finalProfit: baseProfit };
  }
  const def = CARD_DEFINITIONS[prediction.usedCard];
  if (!def) {
    return { finalReturn: baseReturn, finalProfit: baseProfit };
  }

  // 比赛作废：卡牌不生效
  if (outcome === 'VOID') {
    return {
      finalReturn: baseReturn,
      finalProfit: baseProfit,
      cardNote: '比赛作废，卡牌效果不生效',
    };
  }

  switch (prediction.usedCard) {
    case 'NO_LOSS':
      if (outcome === 'LOST') {
        return {
          finalReturn: prediction.stakePoints,
          finalProfit: 0,
          cardNote: '🛡️ 免亏卡生效：未中返还全部本金',
        };
      }
      return {
        finalReturn: baseReturn,
        finalProfit: baseProfit,
        cardNote: '🛡️ 免亏卡：未触发（命中不需要保护）',
      };

    case 'DOUBLE':
      if (outcome === 'WON') {
        // 双倍收益 = 本金 + 利润×2
        // 但更友好的算法是：本金 + 利润*2 = 原来基础上净利润+1倍
        const doubledProfit = baseProfit * 2;
        return {
          finalReturn: prediction.stakePoints + doubledProfit,
          finalProfit: doubledProfit,
          cardNote: '⚡ 双倍卡生效：命中收益翻倍',
        };
      }
      return {
        finalReturn: 0,
        finalProfit: -prediction.stakePoints,
        cardNote: '⚡ 双倍卡：未命中（无法翻倍）',
      };

    case 'FLOOR':
      if (outcome === 'WON') {
        return {
          finalReturn: baseReturn,
          finalProfit: baseProfit,
          cardNote: '🛟 保底卡：命中按正常结算',
        };
      }
      // 未中：返还 90% 本金
      const floorReturn = Math.floor(prediction.stakePoints * 0.9);
      return {
        finalReturn: floorReturn,
        finalProfit: floorReturn - prediction.stakePoints,
        cardNote: '🛟 保底卡生效：未中返还 90% 本金',
      };

    case 'REGRET':
      // REGRET 不会进入 settleMatch，因为开赛前已撤销
      return {
        finalReturn: prediction.stakePoints,
        finalProfit: 0,
        cardNote: '↩️ 反悔卡：开赛前已撤销',
        cancelPrediction: true,
      };

    default:
      return { finalReturn: baseReturn, finalProfit: baseProfit };
  }
}

/**
 * 应用卡牌并写入钱包（处理"未中返本金"等需要补差额的场景）
 */
export function commitCardSettlement(
  userId: string,
  prediction: Prediction,
  cardResult: CardSettlementResult,
  baseReturn: number,
) {
  if (cardResult.finalReturn === baseReturn) return;
  if (cardResult.finalReturn <= 0) return;

  const db = dbService.getData();
  const wallet = db.wallets.find((w) => w.userId === userId);
  if (!wallet) return;

  const diff = cardResult.finalReturn - baseReturn;
  if (diff > 0) {
    wallet.balance += diff;
    db.transactions.push({
      id: `card-bonus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      type: 'CARD_EFFECT',
      amount: diff,
      balanceBefore: wallet.balance - diff,
      balanceAfter: wallet.balance,
      relatedPredictionId: prediction.id,
      note: `卡牌效果补偿：${cardResult.cardNote || ''}`,
      createdAt: new Date().toISOString(),
    });
  }

  dbService.save();
}

/**
 * 撤销预测（反悔卡）
 */
export function cancelPredictionByCard(
  prediction: Prediction,
  note?: string,
): boolean {
  const db = dbService.getData();
  const target = db.predictions.find((p) => p.id === prediction.id);
  if (!target) return false;

  const wallet = db.wallets.find((w) => w.userId === prediction.userId);
  if (!wallet) return false;

  // 返还本金
  const oldBalance = wallet.balance;
  wallet.balance += prediction.stakePoints;

  target.status = 'CANCELLED';
  target.settledAt = new Date().toISOString();
  target.settledReturn = prediction.stakePoints;
  target.settledProfit = 0;
  target.cardEffectNotes = note || '反悔卡：撤销下注，返还全部本金';

  db.transactions.push({
    id: `regret-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: prediction.userId,
    type: 'CARD_REFUND',
    amount: prediction.stakePoints,
    balanceBefore: oldBalance,
    balanceAfter: wallet.balance,
    relatedPredictionId: prediction.id,
    note: '反悔卡撤销下注，返还本金',
    createdAt: new Date().toISOString(),
  });

  dbService.save();

  // 触发动态
  try {
    const user = db.users.find((u) => u.id === prediction.userId);
    if (user) {
      emitPointsAdjusted({
        userId: user.id,
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

  return true;
}

/**
 * 初始化所有老用户的卡牌库存
 */
export function bootstrapAllCardInventories(): { count: number } {
  const db = dbService.getData();
  let count = 0;
  for (const user of db.users) {
    const inv = getUserCardInventory(user.id);
    const total = Object.values(inv.cards).reduce((sum, v) => sum + (v || 0), 0);
    if (total === 0) {
      // 库存为空，补齐初始卡牌
      for (const cardId of Object.keys(DEFAULT_INITIAL_COUNTS) as PredictionCardId[]) {
        inv.cards[cardId] = (inv.cards[cardId] || 0) + DEFAULT_INITIAL_COUNTS[cardId];
      }
      inv.updatedAt = new Date().toISOString();
      count += 1;
    }
  }
  dbService.save();
  return { count };
}
