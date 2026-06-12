/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 赛后战报服务
 *
 * 比赛结束结算后，生成适合朋友群传播的"赛后战报"。
 * 包含统计数据 + AI 趣味点评 + 分享文案。
 */

import { dbService } from '../../db/db_service';
import { Match, Prediction } from '../../types';
import { createId } from '../helpers';
import logger from '../logger';

// ─── 类型定义 ───

export interface PostMatchReport {
  id: string;
  matchId: string;
  title: string;
  summary: string;
  finalScoreLabel: string;
  bestPredictor?: {
    userId: string;
    displayName: string;
    profit: number;
  };
  biggestWinner?: {
    userId: string;
    displayName: string;
    profit: number;
  };
  biggestLoss?: {
    userId: string;
    displayName: string;
    profit: number;
  };
  hitRate: number;
  totalParticipants: number;
  totalStake: number;
  totalPayout: number;
  popularPickLabel?: string;
  aiCommentary?: string;
  shareText: string;
  createdAt: string;
}

export interface ShareCardData {
  title: string;
  subtitle: string;
  score: string;
  highlights: string[];
  footer: string;
  shareText: string;
}

// ─── 核心逻辑 ───

/**
 * 生成赛后战报
 * 必须在比赛已结算后调用
 */
export function generatePostMatchReport(matchId: string): PostMatchReport {
  const db = dbService.getData();
  const match = db.matches.find((m: Match) => m.id === matchId);
  if (!match) throw new Error('比赛不存在');

  const predictions = db.predictions.filter((p: Prediction) => p.matchId === matchId);

  const homeTeam = match.homeTeam?.nameZh || db.teams?.find((t: any) => t.id === match.homeTeamId)?.nameZh || '主队';
  const awayTeam = match.awayTeam?.nameZh || db.teams?.find((t: any) => t.id === match.awayTeamId)?.nameZh || '客队';
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const finalScoreLabel = `${homeTeam} ${homeScore} : ${awayScore} ${awayTeam}`;

  // 统计
  const totalParticipants = predictions.length;
  const totalStake = predictions.reduce((sum: number, p: Prediction) => sum + (p.stakePoints || 0), 0);
  const totalPayout = predictions.reduce((sum: number, p: Prediction) => sum + (p.settledReturn || p.potentialReturn || 0), 0);
  const hitPredictions = predictions.filter((p: Prediction) => p.status === 'WON');
  const hitRate = totalParticipants > 0 ? Math.round((hitPredictions.length / totalParticipants) * 100) : 0;

  // 最大赢家
  let biggestWinner: PostMatchReport['biggestWinner'];
  let biggestLoss: PostMatchReport['biggestLoss'];

  if (predictions.length > 0) {
    const userProfits = new Map<string, { displayName: string; profit: number }>();
    for (const p of predictions) {
      const userId = p.userId;
      const profit = (p.settledReturn || p.potentialReturn || 0) - (p.stakePoints || 0);
      const existing = userProfits.get(userId);
      if (existing) {
        existing.profit += profit;
      } else {
        const user = db.users.find((u) => u.id === userId);
        userProfits.set(userId, { displayName: user?.displayName || '未知用户', profit });
      }
    }

    const sorted = Array.from(userProfits.entries()).sort((a, b) => b[1].profit - a[1].profit);
    if (sorted.length > 0 && sorted[0][1].profit > 0) {
      const [uid, data] = sorted[0];
      biggestWinner = { userId: uid, ...data };
    }
    if (sorted.length > 1 && sorted[sorted.length - 1][1].profit < 0) {
      const [uid, data] = sorted[sorted.length - 1];
      biggestLoss = { userId: uid, ...data };
    }
  }

  // 最热门选项
  const optionCounts = new Map<string, number>();
  for (const p of predictions) {
    const label = p.optionLabel || p.market;
    optionCounts.set(label, (optionCounts.get(label) || 0) + 1);
  }
  const popularPick = Array.from(optionCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const popularPickLabel = popularPick ? `${popularPick[0]}（${popularPick[1]}人）` : undefined;

  // 标题和摘要
  const title = `${homeTeam} ${homeScore}:${awayScore} ${awayTeam} 赛后战报`;
  let summary = `${finalScoreLabel}，本场共 ${totalParticipants} 人参与，累计投入 ${totalStake.toLocaleString()} 积分。`;
  if (biggestWinner) {
    summary += `最大赢家 ${biggestWinner.displayName}，净赚 ${biggestWinner.profit.toLocaleString()} 积分。`;
  }
  summary += `命中率 ${hitRate}%。`;

  // 分享文案
  let shareText = `🏆 ${title}\n`;
  shareText += `${summary}\n`;
  if (popularPickLabel) {
    shareText += `最热门选择：${popularPickLabel}\n`;
  }
  shareText += `来世界杯群聊，一起竞猜赢积分！`;

  const report: PostMatchReport = {
    id: createId('report'),
    matchId,
    title,
    summary,
    finalScoreLabel,
    biggestWinner,
    biggestLoss,
    hitRate,
    totalParticipants,
    totalStake,
    totalPayout,
    popularPickLabel,
    shareText,
    createdAt: new Date().toISOString(),
  };

  // 存储到数据库
  (db.postMatchReports ||= []).push(report);
  logger.info(`[PostMatchReport] Generated report for ${matchId}`);

  return report;
}

/**
 * 获取赛后战报
 */
export function getPostMatchReport(matchId: string): PostMatchReport | { status: string; message: string } {
  const db = dbService.getData();
  const match = db.matches.find((m: Match) => m.id === matchId);
  if (!match) throw new Error('比赛不存在');

  // 未结算
  if (!match.isSettled) {
    return { status: 'NOT_READY', message: '比赛尚未结算，赛后战报将在结算后生成。' };
  }

  // 查已有战报
  const existing = (db.postMatchReports || []).find((r: PostMatchReport) => r.matchId === matchId);
  if (existing) return existing;

  // 自动生成
  return generatePostMatchReport(matchId);
}

/**
 * 管理员强制重新生成战报
 */
export function regeneratePostMatchReport(matchId: string): PostMatchReport {
  const db = dbService.getData();

  // 删除旧战报
  db.postMatchReports = (db.postMatchReports || []).filter((r: PostMatchReport) => r.matchId !== matchId);

  return generatePostMatchReport(matchId);
}

/**
 * 获取分享卡数据
 */
export function getShareCardData(matchId: string): ShareCardData | { status: string; message: string } {
  const report = getPostMatchReport(matchId);
  if ('status' in report) return report;

  const db = dbService.getData();
  const match = db.matches.find((m: Match) => m.id === matchId)!;
  const homeTeam = match.homeTeam?.nameZh || '主队';
  const awayTeam = match.awayTeam?.nameZh || '客队';

  const highlights: string[] = [];
  if (report.totalParticipants > 0) {
    highlights.push(`${report.totalParticipants} 人参与竞猜`);
    highlights.push(`累计投入 ${report.totalStake.toLocaleString()} 积分`);
    highlights.push(`命中率 ${report.hitRate}%`);
  }
  if (report.biggestWinner) {
    highlights.push(`最大赢家：${report.biggestWinner.displayName} +${report.biggestWinner.profit.toLocaleString()}`);
  }
  if (report.popularPickLabel) {
    highlights.push(`最热门：${report.popularPickLabel}`);
  }

  return {
    title: report.title,
    subtitle: `${homeTeam} vs ${awayTeam}`,
    score: report.finalScoreLabel,
    highlights,
    footer: '世界杯群聊 · 娱乐竞猜',
    shareText: report.shareText,
  };
}

/**
 * 获取最近 N 场已结算比赛的战报摘要（首页用）
 */
export function getRecentReports(limit = 3): Array<{
  matchId: string;
  title: string;
  finalScoreLabel: string;
  hitRate: number;
  bestPredictor?: string;
}> {
  const db = dbService.getData();
  const reports = db.postMatchReports || [];

  return reports
    .slice(-limit)
    .reverse()
    .map((r: PostMatchReport) => ({
      matchId: r.matchId,
      title: r.title,
      finalScoreLabel: r.finalScoreLabel,
      hitRate: r.hitRate,
      bestPredictor: r.biggestWinner?.displayName,
    }));
}
