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
  /** 最准预言家：猜中准确比分(CORRECT_SCORE)的玩家 */
  exactPredictor?: {
    userId: string;
    displayName: string;
    guessedScore: string;
    profit: number;
  };
  /** 本场最大赢家（净赚最多） */
  biggestWinner?: {
    userId: string;
    displayName: string;
    profit: number;
  };
  /** 本场最惨玩家（净亏最多） */
  biggestLoss?: {
    userId: string;
    displayName: string;
    profit: number;
  };
  /** 反向明灯：近期连续猜错最多的玩家 */
  darkHorse?: {
    userId: string;
    displayName: string;
    streak: number;
  };
  hitRate: number;
  totalParticipants: number;
  totalStake: number;
  totalPayout: number;
  popularPickLabel?: string;
  /** 群体倾向文本，如 "70% 看好荷兰" */
  popularOpinion?: string;
  /** AI 趣味点评 */
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

  // 最大赢家 / 最惨玩家
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

  // ─── 最准预言家：猜中准确比分的玩家 ───
  let exactPredictor: PostMatchReport['exactPredictor'];
  const scoreWinners = predictions.filter(
    (p) => p.market === 'CORRECT_SCORE' && p.status === 'WON',
  );
  if (scoreWinners.length > 0) {
    // 取赔率最高（猜中最难）的那个
    const best = scoreWinners.sort((a, b) => (b.oddsDecimal || 1) - (a.oddsDecimal || 1))[0];
    const user = db.users.find((u) => u.id === best.userId);
    exactPredictor = {
      userId: best.userId,
      displayName: user?.displayName || '未知用户',
      guessedScore: best.optionLabel || `${homeScore}:${awayScore}`,
      profit: (best.settledReturn || 0) - (best.stakePoints || 0),
    };
  }

  // ─── 反向明灯：参与用户中近期连续猜错最多的 ───
  let darkHorse: PostMatchReport['darkHorse'];
  {
    const participantIds = new Set(predictions.map((p) => p.userId));
    let worstStreak = 0;
    let worstUser = '';
    let worstName = '';

    for (const uid of participantIds) {
      const userPredictions = db.predictions
        .filter((p) => p.userId === uid && p.status !== 'PENDING' && p.status !== 'LOCKED' && p.status !== 'CANCELLED')
        .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

      let streak = 0;
      for (const p of userPredictions) {
        if (p.status === 'LOST') {
          streak++;
        } else {
          break; // 遇到赢/void就断
        }
      }
      if (streak > worstStreak && streak >= 3) {
        worstStreak = streak;
        worstUser = uid;
        const u = db.users.find((x) => x.id === uid);
        worstName = u?.displayName || '未知用户';
      }
    }

    if (worstStreak >= 3) {
      darkHorse = { userId: worstUser, displayName: worstName, streak: worstStreak };
    }
  }

  // ─── 最热门选项 + 群体倾向 ───
  const optionCounts = new Map<string, number>();
  for (const p of predictions) {
    const label = p.optionLabel || p.market;
    optionCounts.set(label, (optionCounts.get(label) || 0) + 1);
  }
  const popularPick = Array.from(optionCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const popularPickLabel = popularPick ? `${popularPick[0]}（${popularPick[1]}人）` : undefined;

  // 群体倾向：统计主胜/平/客胜人数
  let popularOpinion: string | undefined;
  {
    let homeVotes = 0;
    let drawVotes = 0;
    let awayVotes = 0;
    for (const p of predictions) {
      if (p.market === 'H2H') {
        if (p.optionKey === 'home') homeVotes++;
        else if (p.optionKey === 'draw') drawVotes++;
        else if (p.optionKey === 'away') awayVotes++;
      }
    }
    const totalVotes = homeVotes + drawVotes + awayVotes;
    if (totalVotes > 0) {
      if (homeVotes >= drawVotes && homeVotes >= awayVotes) {
        const pct = Math.round((homeVotes / totalVotes) * 100);
        popularOpinion = `${pct}% 看好${homeTeam}`;
      } else if (awayVotes >= homeVotes && awayVotes >= drawVotes) {
        const pct = Math.round((awayVotes / totalVotes) * 100);
        popularOpinion = `${pct}% 看好${awayTeam}`;
      } else {
        const pct = Math.round((drawVotes / totalVotes) * 100);
        popularOpinion = `${pct}% 看好平局`;
      }
    } else {
      // 非H2H场次，用人数最多的选项
      if (popularPick) {
        popularOpinion = `${Math.round((popularPick[1] / totalParticipants) * 100)}% 选择「${popularPick[0]}」`;
      }
    }
  }

  // ─── AI点评：基于统计数据的智能模板生成 ───
  const aiCommentary = generateBattleCommentary({
    homeTeam, awayTeam, homeScore, awayScore,
    totalParticipants, hitRate,
    biggestWinner, biggestLoss,
    exactPredictor, darkHorse,
    popularOpinion, popularPickLabel,
  });

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
  if (popularPickLabel) shareText += `最热门选择：${popularPickLabel}\n`;
  if (exactPredictor) shareText += `最准预言家：${exactPredictor.displayName} 猜中 ${exactPredictor.guessedScore}\n`;
  if (darkHorse) shareText += `反向明灯：${darkHorse.displayName} 连续 ${darkHorse.streak} 场猜错\n`;
  shareText += `来世界杯群聊，一起竞猜赢积分！`;

  const report: PostMatchReport = {
    id: createId('report'),
    matchId,
    title,
    summary,
    finalScoreLabel,
    exactPredictor,
    biggestWinner,
    biggestLoss,
    darkHorse,
    hitRate,
    totalParticipants,
    totalStake,
    totalPayout,
    popularPickLabel,
    popularOpinion,
    aiCommentary,
    shareText,
    createdAt: new Date().toISOString(),
  };

  // 存储到数据库
  (db.postMatchReports ||= []).push(report);
  logger.info(`[PostMatchReport] Generated report for ${matchId}`);

  return report;
}

// ─── AI 点评生成 ───

interface BattleCommentaryInput {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalParticipants: number;
  hitRate: number;
  biggestWinner?: { displayName: string; profit: number };
  biggestLoss?: { displayName: string; profit: number };
  exactPredictor?: { displayName: string; guessedScore: string };
  darkHorse?: { displayName: string; streak: number };
  popularOpinion?: string;
  popularPickLabel?: string;
}

function generateBattleCommentary(input: BattleCommentaryInput): string {
  const {
    homeTeam, awayTeam, homeScore, awayScore,
    totalParticipants, hitRate,
    biggestWinner, biggestLoss,
    exactPredictor, darkHorse,
    popularOpinion,
  } = input;

  const parts: string[] = [];

  // 开篇：比分 + 结果定性
  if (homeScore > awayScore) {
    parts.push(`${homeTeam} ${homeScore}-${awayScore} 击败${awayTeam}，`);
  } else if (homeScore < awayScore) {
    parts.push(`${awayTeam} ${awayScore}-${homeScore} 掀翻${homeTeam}，`);
  } else {
    parts.push(`${homeTeam} ${homeScore}-${awayScore} 战平${awayTeam}，`);
  }

  // 群体倾向
  if (popularOpinion && totalParticipants > 0) {
    parts.push(`今晚群里${popularOpinion}`);
    if (exactPredictor) {
      parts.push(`，但全场只有 ${exactPredictor.displayName} 一人猜中了准确比分 ${exactPredictor.guessedScore}，含金量直接拉满。`);
    } else {
      parts.push(`。命中率 ${hitRate}%，`);
      if (hitRate >= 50) parts.push('整体发挥不错，群友们看得很准。');
      else parts.push('冷门结果让大部分群友翻车了。');
    }
  } else if (exactPredictor) {
    parts.push(`${exactPredictor.displayName} 独中比分 ${exactPredictor.guessedScore}，全场最佳预言家。`);
  } else {
    parts.push(`本场共 ${totalParticipants} 人参与，命中率 ${hitRate}%。`);
  }

  // 最大赢家点评
  if (biggestWinner && biggestWinner.profit > 0) {
    parts.push(` ${biggestWinner.displayName} 怒赚 ${biggestWinner.profit > 999 ? '+' + (biggestWinner.profit / 1000).toFixed(1) + 'K' : '+' + biggestWinner.profit} PTS，成为本场最大赢家。`);
  }

  // 反向明灯
  if (darkHorse) {
    parts.push(` ${darkHorse.displayName} 连续 ${darkHorse.streak} 场猜错，群聊反向明灯实至名归，下一场不妨反着跟。`);
  } else if (biggestLoss && biggestLoss.profit < 0) {
    parts.push(` ${biggestLoss.displayName} 本场亏了 ${Math.abs(biggestLoss.profit)} PTS，需要调整策略了。`);
  }

  return parts.join('');
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
  totalParticipants: number;
  biggestWinner?: { displayName: string; profit: number };
  biggestLoss?: { displayName: string; profit: number };
  exactPredictor?: { displayName: string; guessedScore: string; profit: number };
  darkHorse?: { displayName: string; streak: number };
  popularOpinion?: string;
  aiCommentary?: string;
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
      totalParticipants: r.totalParticipants,
      biggestWinner: r.biggestWinner,
      biggestLoss: r.biggestLoss,
      exactPredictor: r.exactPredictor,
      darkHorse: r.darkHorse,
      popularOpinion: r.popularOpinion,
      aiCommentary: r.aiCommentary,
    }));
}
