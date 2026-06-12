/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbService } from '../../db/db_service';
import { Prediction, PredictionCardId } from '../../types';
import { adjustWalletBalance } from './wallet_service';
import {
  createId,
  roundPoints,
  deriveOperationalStatus,
  resolveOddsSnapshot,
} from '../helpers';
import { getRuntimeConfig } from '../config';
import { consumeCard, userHasCard } from '../prediction_card_service';
import { emitPredictionPlaced } from '../activity_service';
import logger from '../logger';

const config = getRuntimeConfig();

interface PlacePredictionParams {
  userId: string;
  groupId: string;
  matchId: string;
  market: Prediction['market'];
  optionKey: string;
  optionLabel: string;
  stakePoints: number;
  usedCard?: PredictionCardId;
}

interface PlacePredictionResult {
  prediction: Prediction;
  walletBalance: number;
}

export function placePrediction(params: PlacePredictionParams): PlacePredictionResult {
  const db = dbService.getData();
  const { userId, groupId, matchId, market, optionKey, optionLabel, stakePoints, usedCard } = params;

  const match = db.matches.find((item) => item.id === matchId);
  if (!match) {
    throw new Error('比赛不存在。');
  }

  const operationalStatus = deriveOperationalStatus(match, Date.now(), config.predictionLockMinutes);
  if (operationalStatus !== 'BETTABLE' && operationalStatus !== 'LOCKING_SOON') {
    throw new Error('这场比赛当前不能继续竞猜。');
  }

  const snapshot = resolveOddsSnapshot(matchId, market, optionKey);
  if (!snapshot) {
    throw new Error('当前没有可用指数，请稍后再试。');
  }

  const betAmount = roundPoints(stakePoints);
  if (!Number.isFinite(betAmount) || betAmount <= 0) {
    throw new Error('积分数量不合法。');
  }

  const wallet = db.wallets.find((item) => item.userId === userId);
  if (!wallet) {
    throw new Error('钱包不存在。');
  }
  if (wallet.balance < betAmount) {
    throw new Error(`积分不足，当前余额 ${wallet.balance}。`);
  }

  const singleMatchTotalBet = db.predictions
    .filter(
      (item) =>
        item.userId === userId &&
        item.matchId === matchId &&
        (item.status === 'PENDING' || item.status === 'LOCKED'),
    )
    .reduce((sum, item) => sum + item.stakePoints, 0);

  if (singleMatchTotalBet + betAmount > wallet.balance * 0.5 && wallet.balance > 200) {
    throw new Error('单场总投入不能超过当前余额的 50%。');
  }
  if (wallet.balance - betAmount < 100) {
    throw new Error('下单后至少保留 100 积分。');
  }

  let cardEffectNotes: string | undefined;
  if (usedCard) {
    if (!userHasCard(userId, usedCard)) {
      throw new Error('你暂时没有这张卡牌。');
    }
    if (usedCard === 'REGRET') {
      throw new Error('反悔卡需要在开赛前手动使用，不能在下注时附带。');
    }
  }

  const predictionId = createId('pred');
  const potentialReturn = roundPoints(betAmount * snapshot.oddsDecimal);

  const prediction: Prediction = {
    id: predictionId,
    userId,
    groupId,
    matchId,
    market,
    optionKey,
    optionLabel,
    stakePoints: betAmount,
    oddsDecimal: snapshot.oddsDecimal,
    potentialReturn,
    status: 'PENDING',
    placedAt: new Date().toISOString(),
    oddsSnapshot: {
      market,
      optionKey,
      optionLabel,
      oddsDecimal: snapshot.oddsDecimal,
      source: snapshot.source as any,
      capturedAt: snapshot.capturedAt,
    },
    usedCard,
  };

  adjustWalletBalance({
    userId,
    amount: -betAmount,
    type: 'PREDICTION_STAKE',
    note: `竞猜投入：${optionLabel}`,
    relatedPredictionId: predictionId,
    relatedMatchId: matchId,
  });

  if (usedCard) {
    const consumed = consumeCard(userId, usedCard);
    if (consumed) {
      const cardDef = {
        NO_LOSS: '免亏卡',
        DOUBLE: '双倍卡',
        REGRET: '反悔卡',
        FLOOR: '保底卡',
      }[usedCard];
      cardEffectNotes = `已使用 ${cardDef}`;
      prediction.cardEffectNotes = cardEffectNotes;
    }
  }

  db.predictions.push(prediction);

  try {
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      emitPredictionPlaced({
        userId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        matchId,
        optionLabel,
        stakePoints: betAmount,
        oddsDecimal: snapshot.oddsDecimal,
        groupId,
      });
    }
  } catch (e) {
    logger.error('触发下注动态失败', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return {
    prediction,
    walletBalance: wallet.balance,
  };
}
