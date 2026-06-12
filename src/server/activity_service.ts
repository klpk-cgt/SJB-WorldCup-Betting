/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 群内动态服务
 *
 * 记录群内用户的关键行为（下注、命中竞猜、积分变化等），
 * 用于在首页展示群聊动态时间线，增强群内互动感。
 *
 * 设计要点：
 * 1. 动态最大保留条数可配置（ACTIVITY_MAX_ENTRIES），超过会归档到 JSON 文件
 * 2. 提供下注触发、结算触发、调账触发等便捷接口
 * 3. 动态数据只存内存，写入 db.json 时随主表一起持久化
 */

import fs from 'fs';
import path from 'path';
import { dbService } from '../db/db_service';
import logger from './logger';
import { getRuntimeConfig } from './config';

export type ActivityType =
  | 'PREDICTION_PLACED'
  | 'PREDICTION_WON'
  | 'PREDICTION_LOST'
  | 'PREDICTION_VOID'
  | 'BIG_WIN'
  | 'STREAK_HIT'
  | 'POINTS_ADJUSTED'
  | 'CHECKIN'
  | 'QUIZ_ANSWERED'
  | 'BADGE_UNLOCKED'
  | 'TITLE_CHANGED'
  | 'TOURNAMENT_BET'
  | 'JOINED';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  message: string;
  // 关联数据（可选）
  relatedMatchId?: string;
  relatedPredictionId?: string;
  relatedTournamentBetId?: string;
  // 数值类（积分变化、命中率等）
  deltaPoints?: number;
  badgeId?: string;
  badgeLabel?: string;
  // 元数据
  groupId?: string;
  createdAt: string;
}

const config = getRuntimeConfig();
const ARCHIVE_DIR = path.join(process.cwd(), 'backups', 'activities');

/**
 * 生成动态 ID
 */
function createActivityId(): string {
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 确保活动数组存在
 */
function ensureActivities(): Activity[] {
  const db = dbService.getData();
  if (!Array.isArray((db as any).activities)) {
    (db as any).activities = [];
  }
  return (db as any).activities as Activity[];
}

/**
 * 添加一条群内动态
 */
export function addActivity(input: Omit<Activity, 'id' | 'createdAt'> & { createdAt?: string }): Activity {
  const activities = ensureActivities();
  const activity: Activity = {
    ...input,
    id: createActivityId(),
    createdAt: input.createdAt || new Date().toISOString(),
  };
  activities.push(activity);

  // 限制最大保留条数，超出则归档
  if (activities.length > config.activityMaxEntries) {
    archiveOldActivities(activities, config.activityMaxEntries);
  }

  return activity;
}

/**
 * 将超出限制的旧动态归档到 JSON 文件
 */
function archiveOldActivities(activities: Activity[], keep: number) {
  if (activities.length <= keep) return;
  const toArchive = activities.splice(0, activities.length - keep);
  try {
    if (!fs.existsSync(ARCHIVE_DIR)) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
    const archiveFile = path.join(ARCHIVE_DIR, config.activityArchiveFile);
    let existing: Activity[] = [];
    if (fs.existsSync(archiveFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(archiveFile, 'utf-8'));
      } catch {
        existing = [];
      }
    }
    existing.push(...toArchive);
    fs.writeFileSync(archiveFile, JSON.stringify(existing, null, 2), 'utf-8');
    logger.backup(`归档 ${toArchive.length} 条群内动态`, {
      file: archiveFile,
      remaining: activities.length,
    });
  } catch (e) {
    logger.error('归档群内动态失败', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * 获取最近 N 条动态（默认 30 条）
 */
export function getRecentActivities(limit = 30, groupId?: string): Activity[] {
  const activities = ensureActivities();
  const filtered = groupId
    ? activities.filter((item) => item.groupId === groupId || !item.groupId)
    : activities;
  // 按时间倒序
  return [...filtered]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * 获取指定用户的最近动态
 */
export function getUserActivities(userId: string, limit = 20): Activity[] {
  const activities = ensureActivities();
  return [...activities]
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * 清空所有动态（管理员使用）
 */
export function clearAllActivities(): number {
  const activities = ensureActivities();
  const count = activities.length;
  activities.length = 0;
  return count;
}

// ─── 触发器：在业务场景中调用 ───

/**
 * 用户下注触发
 */
export function emitPredictionPlaced(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  matchId: string;
  optionLabel: string;
  stakePoints: number;
  oddsDecimal: number;
  groupId?: string;
}) {
  return addActivity({
    type: 'PREDICTION_PLACED',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    relatedMatchId: input.matchId,
    deltaPoints: -input.stakePoints,
    message: `下注 ${input.optionLabel}（${input.stakePoints.toLocaleString()} 积分，赔率 ${input.oddsDecimal.toFixed(2)}）`,
  });
}

/**
 * 命中竞猜触发
 */
export function emitPredictionWon(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  matchId: string;
  predictionId?: string;
  optionLabel: string;
  stakePoints: number;
  settledReturn: number;
  settledProfit: number;
  groupId?: string;
}) {
  return addActivity({
    type: 'PREDICTION_WON',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    relatedMatchId: input.matchId,
    relatedPredictionId: input.predictionId,
    deltaPoints: input.settledProfit,
    message: `命中「${input.optionLabel}」赢得 ${input.settledReturn.toLocaleString()} 积分（净赚 ${input.settledProfit >= 0 ? '+' : ''}${input.settledProfit.toLocaleString()}）`,
  });
}

/**
 * 未命中竞猜触发
 */
export function emitPredictionLost(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  matchId: string;
  predictionId?: string;
  optionLabel: string;
  stakePoints: number;
  groupId?: string;
}) {
  return addActivity({
    type: 'PREDICTION_LOST',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    relatedMatchId: input.matchId,
    relatedPredictionId: input.predictionId,
    deltaPoints: -input.stakePoints,
    message: `「${input.optionLabel}」未中，扣除 ${input.stakePoints.toLocaleString()} 积分`,
  });
}

/**
 * 大赢触发（净赚超过 5000）
 */
export function emitBigWin(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  matchId: string;
  predictionId?: string;
  optionLabel: string;
  settledProfit: number;
  groupId?: string;
}) {
  return addActivity({
    type: 'BIG_WIN',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    relatedMatchId: input.matchId,
    relatedPredictionId: input.predictionId,
    deltaPoints: input.settledProfit,
    message: `大赢一笔！净赚 +${input.settledProfit.toLocaleString()} 积分（${input.optionLabel}）`,
  });
}

/**
 * 连胜触发（当前连胜 >= 3）
 */
export function emitStreakHit(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  streak: number;
  matchId?: string;
  predictionId?: string;
  groupId?: string;
}) {
  return addActivity({
    type: 'STREAK_HIT',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    relatedMatchId: input.matchId,
    relatedPredictionId: input.predictionId,
    message: `触发 ${input.streak} 连中！当前势头正旺`,
  });
}

/**
 * 管理员调账触发
 */
export function emitPointsAdjusted(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  amount: number;
  reason: string;
  balanceAfter: number;
  groupId?: string;
}) {
  return addActivity({
    type: 'POINTS_ADJUSTED',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    deltaPoints: input.amount,
    message: `管理员调账：${input.amount >= 0 ? '+' : ''}${input.amount.toLocaleString()} 积分（${input.reason || '管理员手动调整'}）`,
  });
}

/**
 * 签到触发
 */
export function emitCheckin(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  pointsEarned: number;
  streakDays: number;
  groupId?: string;
}) {
  return addActivity({
    type: 'CHECKIN',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    deltaPoints: input.pointsEarned,
    message: `签到 +${input.pointsEarned} 积分${input.streakDays > 1 ? `（已连续 ${input.streakDays} 天）` : ''}`,
  });
}

/**
 * 答题正确触发
 */
export function emitQuizAnswered(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  pointsEarned: number;
  isCorrect: boolean;
  groupId?: string;
}) {
  return addActivity({
    type: 'QUIZ_ANSWERED',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    deltaPoints: input.pointsEarned,
    message: input.isCorrect
      ? `答对每日问答 +${input.pointsEarned} 积分`
      : '参与每日问答',
  });
}

/**
 * 徽章解锁触发
 */
export function emitBadgeUnlocked(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  badgeId: string;
  badgeLabel: string;
  groupId?: string;
}) {
  return addActivity({
    type: 'BADGE_UNLOCKED',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    badgeId: input.badgeId,
    badgeLabel: input.badgeLabel,
    message: `解锁新成就「${input.badgeLabel}」`,
  });
}

/**
 * 称号变化触发
 */
export function emitTitleChanged(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  oldTitle: string;
  newTitle: string;
  groupId?: string;
}) {
  return addActivity({
    type: 'TITLE_CHANGED',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    message: `称号升级：${input.oldTitle} → ${input.newTitle}`,
  });
}

/**
 * 长线竞猜下注触发
 */
export function emitTournamentBet(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  type: 'champion' | 'golden_boot' | 'golden_ball';
  targetLabel: string;
  stakePoints: number;
  oddsDecimal: number;
  tournamentBetId?: string;
  groupId?: string;
}) {
  const typeLabel = input.type === 'champion' ? '冠军' : input.type === 'golden_boot' ? '金靴' : '金球';
  return addActivity({
    type: 'TOURNAMENT_BET',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    relatedTournamentBetId: input.tournamentBetId,
    deltaPoints: -input.stakePoints,
    message: `长线竞猜 [${typeLabel}]：押 ${input.targetLabel}（${input.stakePoints.toLocaleString()} 积分，赔率 ${input.oddsDecimal.toFixed(2)}）`,
  });
}

/**
 * 账号创建触发
 */
export function emitUserJoined(input: {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  groupId?: string;
}) {
  return addActivity({
    type: 'JOINED',
    userId: input.userId,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    groupId: input.groupId,
    message: `加入了群聊`,
  });
}
