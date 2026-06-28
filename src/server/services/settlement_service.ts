// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbService } from '../../db/db_service';
import { Match, Prediction, TransactionType } from '../../types';
import { adjustWalletBalance } from './wallet_service';
import { createId, roundPoints, normalizePredictionMarket } from '../helpers';
import { applyCardToSettlement } from '../prediction_card_service';
import { FINISHED_MATCH_STATUSES, hasResolvableScore } from '../operations';
import { generatePostMatchReport } from './post_match_report_service';
import {
  emitBigWin,
  emitPredictionLost,
  emitPredictionWon,
  emitStreakHit,
} from '../activity_service';
import { evaluateUserBadges, syncUserTitle } from '../badge_service';
import { createBackup } from '../backup';
import { invalidateAIContent } from '../ai';
import logger from '../logger';

interface SettleMatchParams {
  matchId: string;
  source: 'AUTO' | 'ADMIN';
  adminUser?: string;
  reason?: string;
  forceResettle?: boolean;
}

interface SettleMatchResult {
  settledPredictions: number;
  totalPayout: number;
  match: Match;
}

export async function settleMatchById(params: SettleMatchParams): Promise<SettleMatchResult> {
  const db = dbService.getData();
  const match = db.matches.find((m) => m.id === params.matchId);
  if (!match) {
    throw new Error('比赛不存在。');
  }

  if (match.isSettled && !params.forceResettle) {
    throw new Error('该比赛已完成正式结算；如需重结算，请显式传入 forceResettle。');
  }

  if (!FINISHED_MATCH_STATUSES.has(match.status)) {
    logger.warn('结算被阻止：比赛状态不满足结算条件（需为 FT/AET/PEN 之一）', {
      matchId: match.id,
      currentStatus: match.status,
      isSettled: match.isSettled,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      source: params.source,
    });
    throw new Error('比赛尚未正式结束，暂时不能结算。');
  }

  if (!hasResolvableScore(match)) {
    logger.warn('结算被阻止：比分不完整（可能是降级模式下的无真实比分比赛）', {
      matchId: match.id,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      source: params.source,
    });
    throw new Error('比分还不完整，不能开始结算。降级模式下无比分的比赛需管理员手动录入比分后才能结算。');
  }

  logger.settlement('Starting match settlement', {
    matchId: match.id,
    source: params.source,
    forceResettle: Boolean(params.forceResettle),
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  });

  try {
    const backupResult = createBackup(`auto-before-settle-${match.id}`);
    if (!backupResult.ok) {
      logger.warn('结算前自动备份失败', {
        matchId: match.id,
        error: backupResult.error,
      });
    }
  } catch (e) {
    logger.error('结算前自动备份异常', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // CANCELLED 预测已通过反悔卡撤销（CARD_REFUND 退过本金），正式结算/重结完全跳过，
  // 避免二次发奖或二次退款
  const matchPredictions = db.predictions.filter(
    (p) => p.matchId === match.id && p.status !== 'CANCELLED',
  );

  if (match.isSettled && params.forceResettle) {
    // 结算入库的正向交易类型（这些类型会向用户钱包添加积分）
    // 包含 REFUND：VOID 结算时返还本金也走 REFUND 类型，回滚时需一并扣除
    const settlementCreditTypes: TransactionType[] = ['PREDICTION_WIN', 'CARD_EFFECT', 'REFUND'];

    for (const prediction of matchPredictions) {
      // 基于实际交易记录回滚，而非仅检查 prediction.status === 'WON'
      // 防止首次结算写入钱包但预测状态未更新（如 PENDING）时，回滚遗漏导致重复发放
      const creditedTxs = db.transactions.filter(
        (tx) =>
          tx.relatedPredictionId === prediction.id &&
          settlementCreditTypes.includes(tx.type as TransactionType) &&
          tx.amount > 0,
      );

      // 之前力结已产生的 REFUND 回滚交易（amount<0），避免回滚回滚
      const refundTxs = db.transactions.filter(
        (tx) =>
          tx.relatedPredictionId === prediction.id &&
          tx.type === 'REFUND' &&
          tx.amount < 0,
      );
      const refundedAmount = refundTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      // 净应收积分 = 结算发放 - 已回滚
      const totalCredited = creditedTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const netToRefund = totalCredited - refundedAmount;

      if (netToRefund > 0) {
        const wallet = db.wallets.find((w) => w.userId === prediction.userId);
        if (wallet && wallet.balance > 0) {
          // 部分扣减策略：余额不足时扣到0，剩余部分记录告警，避免静默跳过导致积分永久不一致
          const deductAmount = Math.min(netToRefund, wallet.balance);
          if (deductAmount < netToRefund) {
            logger.error(`[SettleMatch] 重结回滚余额不足，部分扣减: userId=${prediction.userId} balance=${wallet.balance} need=${netToRefund} deduct=${deductAmount} shortfall=${netToRefund - deductAmount}`, {
              matchId: match.id,
              predictionId: prediction.id,
              totalCredited,
              refundedAmount,
            });
          }
          adjustWalletBalance({
            userId: prediction.userId,
            amount: -deductAmount,
            type: 'REFUND',
            note: `重结回滚：${match.roundName}`,
            relatedPredictionId: prediction.id,
            relatedMatchId: match.id,
          });
        } else {
          logger.error(`[SettleMatch] 重结回滚余额为0无法扣回: userId=${prediction.userId} need=${netToRefund}`, {
            matchId: match.id,
            predictionId: prediction.id,
            totalCredited,
            refundedAmount,
          });
        }
      }

      // forceResettle 不返还卡牌库存（避免退卡后重结再次触发卡牌效果的重复收益）；
      // 清空 usedCard 防止重结主循环对已消耗卡二次调用 applyCardToSettlement。
      // 如需退卡，使用反悔卡（useRegretCard）执行完整撤销下注。
      prediction.usedCard = undefined;
      prediction.status = 'PENDING';
      prediction.settledReturn = 0;
      prediction.settledProfit = 0;
      prediction.settledAt = undefined;
      prediction.cardEffectNotes = undefined;
    }
  }

  const hScore = match.homeScore as number;
  const aScore = match.awayScore as number;
  let totalPayout = 0;

  for (const prediction of matchPredictions) {
    const wallet = db.wallets.find((w) => w.userId === prediction.userId);
    if (!wallet) continue;

    // 监控：检测异常赔率来源（不阻止结算，仅告警）
    const oddsSource = prediction.oddsSnapshot?.source;
    if (oddsSource === 'The Odds API' || oddsSource === 'INFERRED_FROM_H2H') {
      logger.warn('[SettleMatch] 检测到异常赔率来源的预测（建议人工核查）', {
        matchId: match.id,
        predictionId: prediction.id,
        userId: prediction.userId,
        market: prediction.market,
        oddsDecimal: prediction.oddsDecimal,
        oddsSource,
      });
    }

    const won = judgePrediction(prediction, match);

    if (won === null) {
      // 无法判定（如 HAFU 缺半场比分）→ VOID 返还本金
      prediction.status = 'VOID';
      prediction.settledReturn = prediction.stakePoints;
      prediction.settledProfit = 0;
      prediction.settledAt = new Date().toISOString();
      adjustWalletBalance({
        userId: prediction.userId,
        amount: prediction.stakePoints,
        type: 'REFUND',
        note: `${prediction.optionLabel}（${prediction.market || '未知玩法'}）无法判定，返还本金`,
        relatedPredictionId: prediction.id,
        relatedMatchId: match.id,
      });
    } else if (won) {
      const baseReturn = roundPoints(prediction.stakePoints * prediction.oddsDecimal);
      prediction.status = 'WON';
      prediction.settledReturn = baseReturn;
      prediction.settledProfit = baseReturn - prediction.stakePoints;
      prediction.settledAt = new Date().toISOString();

      if (prediction.usedCard) {
        const cardResult = applyCardToSettlement(
          prediction,
          baseReturn,
          baseReturn - prediction.stakePoints,
          'WON',
        );
        if (cardResult.cancelPrediction) {
          // 反悔卡撤销的预测不参与发奖（防御性检查，正常已在主循环外过滤 CANCELLED）
          prediction.status = 'CANCELLED';
          continue;
        }
        prediction.settledReturn = cardResult.finalReturn;
        prediction.settledProfit = cardResult.finalProfit;
        if (cardResult.cardNote) {
          prediction.cardEffectNotes = cardResult.cardNote;
        }
      }

      const finalReturn = prediction.settledReturn ?? baseReturn;
      const finalProfit = prediction.settledProfit ?? baseReturn - prediction.stakePoints;

      adjustWalletBalance({
        userId: prediction.userId,
        amount: finalReturn,
        type: prediction.usedCard && finalReturn !== baseReturn ? 'CARD_EFFECT' : 'PREDICTION_WIN',
        note:
          prediction.usedCard && finalReturn !== baseReturn
            ? `竞猜命中并触发卡牌效果：${match.roundName} ${prediction.optionLabel}`
            : `竞猜命中：${match.roundName} ${prediction.optionLabel}`,
        relatedPredictionId: prediction.id,
        relatedMatchId: match.id,
      });

      totalPayout += finalReturn;

      const user = db.users.find((u) => u.id === prediction.userId);
      if (user) {
        try {
          emitPredictionWon({
            userId: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            matchId: match.id,
            predictionId: prediction.id,
            optionLabel: prediction.optionLabel,
            stakePoints: prediction.stakePoints,
            settledReturn: finalReturn,
            settledProfit: finalProfit,
          });
          if (finalProfit >= 5000) {
            emitBigWin({
              userId: user.id,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              matchId: match.id,
              predictionId: prediction.id,
              optionLabel: prediction.optionLabel,
              settledProfit: finalProfit,
            });
          }

          const sortedUserPreds = db.predictions
            .filter((p) => p.userId === user.id && p.settledAt)
            .sort(
              (a, b) => new Date(a.settledAt!).getTime() - new Date(b.settledAt!).getTime(),
            );
          let streak = 0;
          for (let i = sortedUserPreds.length - 1; i >= 0; i -= 1) {
            if (sortedUserPreds[i].status === 'WON') {
              streak += 1;
            } else {
              break;
            }
          }
          if (streak === 3 || streak === 5 || streak === 10) {
            emitStreakHit({
              userId: user.id,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              streak,
              matchId: match.id,
              predictionId: prediction.id,
            });
          }
          evaluateUserBadges(user.id, user.displayName, user.avatarUrl);
          syncUserTitle(user.id, user.displayName, user.avatarUrl);
        } catch (e) {
          logger.error('结算触发动态失败', {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    } else {
      prediction.status = 'LOST';
      prediction.settledReturn = 0;
      prediction.settledProfit = -prediction.stakePoints;
      prediction.settledAt = new Date().toISOString();

      if (prediction.usedCard) {
        const cardResult = applyCardToSettlement(prediction, 0, -prediction.stakePoints, 'LOST');
        if (cardResult.cancelPrediction) {
          prediction.status = 'CANCELLED';
          continue;
        }
        if (cardResult.finalReturn > 0) {
          prediction.settledReturn = cardResult.finalReturn;
          prediction.settledProfit = cardResult.finalProfit;
          prediction.status = 'WON';
          adjustWalletBalance({
            userId: prediction.userId,
            amount: cardResult.finalReturn,
            type: 'CARD_EFFECT',
            note: `卡牌效果：${cardResult.cardNote || prediction.usedCard}`,
            relatedPredictionId: prediction.id,
            relatedMatchId: match.id,
          });
        }
        if (cardResult.cardNote) {
          prediction.cardEffectNotes = cardResult.cardNote;
        }
      }

      adjustWalletBalance({
        userId: prediction.userId,
        amount: 0,
        type: 'PREDICTION_LOSE',
        note: `竞猜未命中：${match.roundName} ${prediction.optionLabel}`,
        relatedPredictionId: prediction.id,
        relatedMatchId: match.id,
      });

      const user = db.users.find((u) => u.id === prediction.userId);
      if (user) {
        try {
          emitPredictionLost({
            userId: user.id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            matchId: match.id,
            predictionId: prediction.id,
            optionLabel: prediction.optionLabel,
            stakePoints: prediction.stakePoints,
          });
          evaluateUserBadges(user.id, user.displayName, user.avatarUrl);
          syncUserTitle(user.id, user.displayName, user.avatarUrl);
        } catch (e) {
          logger.error('结算触发动态失败', {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }
  }

  match.isSettled = true;
  match.settledAt = new Date().toISOString();
  match.settlementStatus = 'SETTLED';
  match.operationalStatus = 'SETTLED';

  const homeName = db.teams.find((t) => t.id === match.homeTeamId)?.nameZh || '主队';
  const awayName = db.teams.find((t) => t.id === match.awayTeamId)?.nameZh || '客队';
  db.aiContents.unshift({
    id: createId('ai-recap'),
    type: 'POST_MATCH_RECAP',
    matchId: match.id,
    title: `赛后速览：${homeName} vs ${awayName}`,
    content: `${homeName} 与 ${awayName} 的比赛已经结束，最终比分 ${hScore} : ${aScore}。本场竞猜已经自动结算完成。`,
    summary: `比分定格在 ${hScore} : ${aScore}，本场竞猜已完成结算。`,
    bullets: ['结算已写入钱包', '重结时会先回滚再重算', '榜单会随着结算自动刷新'],
    riskWarning: '若赛果官方修订，后台可以触发重结。',
    model: 'local-fallback',
    provider: 'Local',
    fallbackUsed: true,
    createdAt: new Date().toISOString(),
  });

  dbService.refreshBracketState();
  invalidateAIContent(db, match.id, 'MATCH_PREDICTION', 'match');
  invalidateAIContent(db, match.id, 'PRE_MATCH_ANALYSIS', 'match');
  invalidateAIContent(db, match.id, 'SEARCH_ENHANCEMENT', 'match');
  invalidateAIContent(db, dbService.getPrimaryRoomId(), 'LEADERBOARD_COMMENTARY', 'room');

  try {
    const ws = await import('../websocket');
    ws.broadcastMatchSettled(match.id, hScore, aScore, match.winnerTeamId);
    for (const pred of matchPredictions) {
      const settledReturn = pred.settledReturn ?? 0;
      const settledProfit = roundPoints(settledReturn - pred.stakePoints);
      ws.sendPredictionResult(
        pred.userId,
        pred.id,
        match.id,
        pred.status,
        settledReturn,
        settledProfit,
      );
    }
  } catch {
    // Ignore websocket push failures.
  }

  // 结算完成后自动生成赛后战报
  try {
    generatePostMatchReport(match.id);
    logger.info('赛后战报已自动生成', { matchId: match.id });
  } catch (e) {
    logger.error('结算后自动生成战报失败', {
      matchId: match.id,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  logger.settlement('Match settlement finished', {
    matchId: match.id,
    source: params.source,
    forceResettle: Boolean(params.forceResettle),
    settledPredictions: matchPredictions.length,
    totalPayout,
  });

  return {
    settledPredictions: matchPredictions.length,
    totalPayout,
    match,
  };
}

function judgePrediction(prediction: Prediction, match: Match): boolean | null {
  const hScore = match.homeScore!;
  const aScore = match.awayScore!;
  const key = prediction.optionKey.toLowerCase();
  const market = normalizePredictionMarket(prediction.market);

  if (!market) {
    logger.warn('Skipping settlement for prediction with unsupported market', {
      predictionId: prediction.id,
      market: prediction.market,
      matchId: prediction.matchId,
    });
    return false;
  }

  if (market === 'H2H') {
    return (
      (key === 'home' && hScore > aScore) ||
      (key === 'draw' && hScore === aScore) ||
      (key === 'away' && hScore < aScore)
    );
  }

  if (market === 'TOTAL_GOALS' || market === 'TOTAL_GOALS_PRECISE') {
    const totalGoals = hScore + aScore;
    // 旧格式兼容 (over_2_5 / under_2_5)
    if (key === 'over_2_5') return totalGoals > 2.5;
    if (key === 'under_2_5') return totalGoals < 2.5;
    // 新精确进球格式 (totalGoals_0 ~ totalGoals_7+)
    const goalsKey = key.replace(/^totalGoals_/, '').replace(/^totalgoals_/, '');
    if (goalsKey === '7+') return totalGoals >= 7;
    const goalNum = parseInt(goalsKey, 10);
    return !isNaN(goalNum) && totalGoals === goalNum;
  }

  if (market === 'HANDICAP') {
    // 获取让球数
    const db = dbService.getData();
    const odds = db.matchOdds[prediction.matchId];
    const goalLine = odds?.handicap?.goalLine || 0;
    // 应用让球: 主队实际得分 = hScore + goalLine
    const adjustedHScore = hScore + goalLine;
    return (
      (key === 'home' && adjustedHScore > aScore) ||
      (key === 'draw' && adjustedHScore === aScore) ||
      (key === 'away' && adjustedHScore < aScore)
    );
  }

  if (market === 'HAFU') {
    // 半全场需要半场比分，当前数据源暂不支持 → 标记 VOID
    // TODO: 接入半场比分后改为实际判定
    return null;
  }

  if (market === 'CORRECT_SCORE') {
    const normalizedKey = key.replace('correctscore_', '').replace('_', '-');
    const actualScore = `${hScore}-${aScore}`;

    if (normalizedKey === 'home_other') {
      const presetHomeScores = [
        '1-0',
        '2-0',
        '2-1',
        '3-0',
        '3-1',
        '3-2',
        '4-0',
        '4-1',
        '4-2',
        '5-0',
        '5-1',
        '5-2',
      ];
      return hScore > aScore && !presetHomeScores.includes(actualScore);
    }
    if (normalizedKey === 'draw_other') {
      const presetDrawScores = ['0-0', '1-1', '2-2', '3-3', '4-4'];
      return hScore === aScore && !presetDrawScores.includes(actualScore);
    }
    if (normalizedKey === 'away_other') {
      const presetAwayScores = [
        '0-1',
        '0-2',
        '1-2',
        '0-3',
        '1-3',
        '2-3',
        '0-4',
        '1-4',
        '2-4',
        '0-5',
        '1-5',
        '2-5',
      ];
      return hScore < aScore && !presetAwayScores.includes(actualScore);
    }
    if (normalizedKey === 'other') {
      const allPreset = [
        '1-0',
        '2-0',
        '2-1',
        '3-0',
        '3-1',
        '3-2',
        '4-0',
        '4-1',
        '4-2',
        '5-0',
        '5-1',
        '5-2',
        '0-0',
        '1-1',
        '2-2',
        '3-3',
        '4-4',
        '0-1',
        '0-2',
        '1-2',
        '0-3',
        '1-3',
        '2-3',
        '0-4',
        '1-4',
        '2-4',
        '0-5',
        '1-5',
        '2-5',
      ];
      return !allPreset.includes(actualScore);
    }
    return normalizedKey === actualScore;
  }

  if (market === 'QUALIFY' && match.winnerTeamId) {
    return (
      (key === 'homequalify' && match.winnerTeamId === match.homeTeamId) ||
      (key === 'awayqualify' && match.winnerTeamId === match.awayTeamId)
    );
  }

  return false;
}
