/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 统一结算服务
 *
 * 封装比赛结算的完整业务逻辑。
 * 必须在 runBusinessTransaction 内部调用。
 */

import { dbService } from '../../db/db_service';
import { Match, Prediction } from '../../types';
import { adjustWalletBalance } from './wallet_service';
import { createId, roundPoints } from '../helpers';
import { applyCardToSettlement } from '../prediction_card_service';
import { FINISHED_MATCH_STATUSES } from '../operations';
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

/**
 * 结算单场比赛
 *
 * 内部负责：
 * 1. 校验比赛已结束
 * 2. 校验未重复结算（除非 forceResettle）
 * 3. 遍历所有未结算预测
 * 4. 判断 WON / LOST / VOID
 * 5. 计算返还和盈亏
 * 6. 应用卡牌效果
 * 7. 修改钱包（通过 wallet_service）
 * 8. 写交易流水
 * 9. 写动态
 * 10. 更新徽章/称号
 * 11. 标记 match.isSettled
 */
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
    throw new Error('比赛尚未正式结束，暂时不能结算。');
  }

  if (match.homeScore === undefined || match.awayScore === undefined) {
    throw new Error('比分还不完整，不能开始结算。');
  }

  // 结算前自动备份
  try {
    const backupResult = createBackup(`auto-before-settle-${match.id}`);
    if (!backupResult.ok) {
      logger.warn('结算前自动备份失败', { matchId: match.id, error: backupResult.error });
    }
  } catch (e) {
    logger.error('结算前自动备份异常', { error: e instanceof Error ? e.message : String(e) });
  }

  const matchPredictions = db.predictions.filter((p) => p.matchId === match.id);

  // 重结算时先回滚
  if (match.isSettled && params.forceResettle) {
    for (const prediction of matchPredictions) {
      if (prediction.status === 'WON' && prediction.settledReturn) {
        adjustWalletBalance({
          userId: prediction.userId,
          amount: -prediction.settledReturn,
          type: 'REFUND',
          note: `重结回滚：${match.roundName}`,
          relatedPredictionId: prediction.id,
          relatedMatchId: match.id,
        });
      }
      prediction.status = 'PENDING';
      prediction.settledReturn = 0;
      prediction.settledProfit = 0;
      prediction.settledAt = undefined;
    }
  }

  const hScore = match.homeScore;
  const aScore = match.awayScore;
  let totalPayout = 0;

  for (const prediction of matchPredictions) {
    const wallet = db.wallets.find((w) => w.userId === prediction.userId);
    if (!wallet) continue;

    const won = judgePrediction(prediction, match);

    if (won) {
      const pointsWon = roundPoints(prediction.stakePoints * prediction.oddsDecimal);
      prediction.status = 'WON';
      prediction.settledReturn = pointsWon;
      prediction.settledProfit = pointsWon - prediction.stakePoints;
      prediction.settledAt = new Date().toISOString();

      // 应用卡牌效果
      if (prediction.usedCard) {
        const cardResult = applyCardToSettlement(prediction, pointsWon, pointsWon - prediction.stakePoints, 'WON');
        if (cardResult.finalReturn !== pointsWon) {
          const diff = cardResult.finalReturn - pointsWon;
          prediction.settledReturn = cardResult.finalReturn;
          prediction.settledProfit = cardResult.finalProfit;
          if (diff > 0) {
            adjustWalletBalance({
              userId: prediction.userId,
              amount: diff,
              type: 'CARD_EFFECT',
              note: `卡牌效果：${cardResult.cardNote || prediction.usedCard}`,
              relatedPredictionId: prediction.id,
              relatedMatchId: match.id,
            });
          }
        }
        if (cardResult.cardNote) {
          prediction.cardEffectNotes = cardResult.cardNote;
        }
      }

      // 写入中奖流水
      adjustWalletBalance({
        userId: prediction.userId,
        amount: pointsWon,
        type: 'PREDICTION_WIN',
        note: `竞猜命中：${match.roundName} ${prediction.optionLabel}`,
        relatedPredictionId: prediction.id,
        relatedMatchId: match.id,
      });

      totalPayout += prediction.settledReturn ?? pointsWon;

      // 触发群内动态
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
            settledReturn: pointsWon,
            settledProfit: pointsWon - prediction.stakePoints,
          });
          if (pointsWon - prediction.stakePoints >= 5000) {
            emitBigWin({
              userId: user.id,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              matchId: match.id,
              predictionId: prediction.id,
              optionLabel: prediction.optionLabel,
              settledProfit: pointsWon - prediction.stakePoints,
            });
          }
          // 评估连胜
          const sortedUserPreds = db.predictions
            .filter((p) => p.userId === user.id && p.settledAt)
            .sort((a, b) => new Date(a.settledAt!).getTime() - new Date(b.settledAt!).getTime());
          let streak = 0;
          for (let i = sortedUserPreds.length - 1; i >= 0; i--) {
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
          logger.error('结算触发动态失败', { error: e instanceof Error ? e.message : String(e) });
        }
      }
    } else {
      prediction.status = 'LOST';
      prediction.settledReturn = 0;
      prediction.settledProfit = -prediction.stakePoints;
      prediction.settledAt = new Date().toISOString();

      // 应用卡牌效果（免亏/保底卡）
      if (prediction.usedCard) {
        const cardResult = applyCardToSettlement(prediction, 0, -prediction.stakePoints, 'LOST');
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

      // 写入未中流水
      adjustWalletBalance({
        userId: prediction.userId,
        amount: 0, // 未中不扣款（下注时已扣）
        type: 'PREDICTION_LOSE',
        note: `竞猜未命中：${match.roundName} ${prediction.optionLabel}`,
        relatedPredictionId: prediction.id,
        relatedMatchId: match.id,
      });

      // 触发未中动态
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
          logger.error('结算触发动态失败', { error: e instanceof Error ? e.message : String(e) });
        }
      }
    }
  }

  // 标记比赛已结算
  match.isSettled = true;
  match.settledAt = new Date().toISOString();
  match.settlementStatus = 'SETTLED';
  match.operationalStatus = 'SETTLED';

  // 写入本地赛后速览
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

  // WebSocket 推送
  try {
    const ws = await import('../websocket');
    ws.broadcastMatchSettled(match.id, hScore, aScore, match.winnerTeamId);
    for (const pred of matchPredictions) {
      const settledReturn = pred.settledReturn ?? 0;
      const settledProfit = roundPoints(settledReturn - pred.stakePoints);
      ws.sendPredictionResult(pred.userId, pred.id, match.id, pred.status, settledReturn, settledProfit);
    }
  } catch (e) {
    // WS 推送失败不影响结算流程
  }

  return {
    settledPredictions: matchPredictions.length,
    totalPayout,
    match,
  };
}

/**
 * 判断预测是否命中
 */
function judgePrediction(prediction: Prediction, match: Match): boolean {
  const hScore = match.homeScore!;
  const aScore = match.awayScore!;

  const key = prediction.optionKey.toLowerCase();

  if (prediction.market === 'H2H') {
    return (
      (key === 'home' && hScore > aScore) ||
      (key === 'draw' && hScore === aScore) ||
      (key === 'away' && hScore < aScore)
    );
  }

  if (prediction.market === 'TOTAL_GOALS') {
    const totalGoals = hScore + aScore;
    return (
      (key === 'over_2_5' && totalGoals > 2.5) ||
      (key === 'under_2_5' && totalGoals < 2.5)
    );
  }

  if (prediction.market === 'CORRECT_SCORE') {
    const normalizedKey = key.replace('correctscore_', '').replace('_', '-');
    const actualScore = `${hScore}-${aScore}`;

    if (normalizedKey === 'home_other') {
      const presetHomeScores = ['1-0','2-0','2-1','3-0','3-1','3-2','4-0','4-1','4-2','5-0','5-1','5-2'];
      return hScore > aScore && !presetHomeScores.includes(actualScore);
    }
    if (normalizedKey === 'draw_other') {
      const presetDrawScores = ['0-0','1-1','2-2','3-3','4-4'];
      return hScore === aScore && !presetDrawScores.includes(actualScore);
    }
    if (normalizedKey === 'away_other') {
      const presetAwayScores = ['0-1','0-2','1-2','0-3','1-3','2-3','0-4','1-4','2-4','0-5','1-5','2-5'];
      return hScore < aScore && !presetAwayScores.includes(actualScore);
    }
    if (normalizedKey === 'other') {
      const allPreset = ['1-0','2-0','2-1','3-0','3-1','3-2','4-0','4-1','4-2','5-0','5-1','5-2',
        '0-0','1-1','2-2','3-3','4-4',
        '0-1','0-2','1-2','0-3','1-3','2-3','0-4','1-4','2-4','0-5','1-5','2-5'];
      return !allPreset.includes(actualScore);
    }
    return normalizedKey === actualScore;
  }

  if (prediction.market === 'QUALIFY' && match.winnerTeamId) {
    return (
      (key === 'homequalify' && match.winnerTeamId === match.homeTeamId) ||
      (key === 'awayqualify' && match.winnerTeamId === match.awayTeamId)
    );
  }

  return false;
}
