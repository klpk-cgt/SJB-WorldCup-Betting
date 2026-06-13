/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 称号 / 徽章服务
 *
 * 根据用户的竞猜、签到、答题等行为，自动生成/更新用户的称号和徽章。
 * - 称号：根据命中率和收益综合评定，1 个用户 1 个当前称号
 * - 徽章：根据具体行为解锁成就，1 个用户可解锁多个徽章
 *
 * 设计要点：
 * 1. 7 个核心规则，覆盖新手、命中、连胜、收益、长线、历史等维度
 * 2. 数据持久化到 db.json 的 userBadges 字段
 * 3. 提供 evaluateAllBadges 一键评估所有用户的徽章
 * 4. 提供 emitBadgeUnlocked 触发群内动态
 */

import { dbService } from '../db/db_service';
import logger from './logger';
import { emitBadgeUnlocked, emitTitleChanged } from './activity_service';

export type BadgeId =
  | 'first_bet'           // 初次下注
  | 'three_streak'        // 3 连中
  | 'five_streak'         // 5 连中
  | 'hit_rate_60'         // 命中率 ≥ 60%
  | 'big_winner'          // 单笔净赚 ≥ 5000
  | 'profit_king'         // 累计净赚 ≥ 50000
  | 'long_term_player'    // 长线冠军竞猜参与
  | 'history_scholar'     // 浏览历史长廊
  | 'daily_checkin';      // 连续签到 7 天

export interface BadgeDefinition {
  id: BadgeId;
  label: string;
  description: string;
  icon: string;
  tone: 'emerald' | 'amber' | 'violet' | 'cyan' | 'rose' | 'slate';
  // 评估函数：返回该徽章是否已解锁
  evaluate: (userId: string) => { unlocked: boolean; progress: number; target: number };
}

export interface UserBadgeRecord {
  userId: string;
  badgeId: BadgeId;
  unlocked: boolean;
  progress: number;
  target: number;
  unlockedAt?: string;
  updatedAt: string;
}

export type PlayerTitle =
  | '群聊新星'
  | '稳健分析师'
  | '连红猎手'
  | '冷门先知'
  | '金杯投资人'
  | '世界杯老炮';

export interface UserTitleRecord {
  userId: string;
  title: PlayerTitle;
  updatedAt: string;
}

// ─── 内部数据辅助 ───

function getUserPredictions(userId: string) {
  const db = dbService.getData();
  return db.predictions.filter((p) => p.userId === userId);
}

function getUserWallet(userId: string) {
  const db = dbService.getData();
  return db.wallets.find((w) => w.userId === userId);
}

function getUserTransactions(userId: string) {
  const db = dbService.getData();
  return db.transactions.filter((t) => t.userId === userId);
}

function getUserTournamentBets(userId: string) {
  const db = dbService.getData();
  return db.tournamentBets.filter((b) => b.userId === userId);
}

// ─── 7+ 核心徽章规则 ───

const BADGE_DEFINITIONS: Record<BadgeId, BadgeDefinition> = {
  first_bet: {
    id: 'first_bet',
    label: '初次下注',
    description: '完成第一笔竞猜即可解锁',
    icon: '🎯',
    tone: 'cyan',
    evaluate: (userId) => {
      const count = getUserPredictions(userId).length;
      return { unlocked: count >= 1, progress: Math.min(count, 1), target: 1 };
    },
  },
  three_streak: {
    id: 'three_streak',
    label: '三连红',
    description: '连续命中 3 场竞猜',
    icon: '🔥',
    tone: 'rose',
    evaluate: (userId) => {
      const predictions = getUserPredictions(userId)
        .filter((p) => p.status === 'WON' || p.status === 'LOST' || p.status === 'VOID')
        .sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime());
      let maxStreak = 0;
      let current = 0;
      for (const p of predictions) {
        if (p.status === 'WON') {
          current += 1;
          maxStreak = Math.max(maxStreak, current);
        } else {
          current = 0;
        }
      }
      return { unlocked: maxStreak >= 3, progress: Math.min(maxStreak, 3), target: 3 };
    },
  },
  five_streak: {
    id: 'five_streak',
    label: '五连红',
    description: '连续命中 5 场竞猜',
    icon: '🌟',
    tone: 'amber',
    evaluate: (userId) => {
      const predictions = getUserPredictions(userId)
        .filter((p) => p.status === 'WON' || p.status === 'LOST' || p.status === 'VOID')
        .sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime());
      let maxStreak = 0;
      let current = 0;
      for (const p of predictions) {
        if (p.status === 'WON') {
          current += 1;
          maxStreak = Math.max(maxStreak, current);
        } else {
          current = 0;
        }
      }
      return { unlocked: maxStreak >= 5, progress: Math.min(maxStreak, 5), target: 5 };
    },
  },
  hit_rate_60: {
    id: 'hit_rate_60',
    label: '神准',
    description: '命中率（至少 5 单）达到 60%',
    icon: '🎯',
    tone: 'emerald',
    evaluate: (userId) => {
      const settled = getUserPredictions(userId).filter(
        (p) => p.status === 'WON' || p.status === 'LOST',
      );
      const total = settled.length;
      const won = settled.filter((p) => p.status === 'WON').length;
      if (total < 5) {
        return { unlocked: false, progress: total, target: 5 };
      }
      const rate = Math.floor((won / total) * 100);
      return { unlocked: rate >= 60, progress: rate, target: 60 };
    },
  },
  big_winner: {
    id: 'big_winner',
    label: '大赢家',
    description: '单笔竞猜净赚 ≥ 5000 积分',
    icon: '💰',
    tone: 'amber',
    evaluate: (userId) => {
      const maxProfit = Math.max(
        0,
        ...getUserPredictions(userId).map((p) => p.settledProfit || 0),
      );
      return { unlocked: maxProfit >= 5000, progress: Math.min(maxProfit, 5000), target: 5000 };
    },
  },
  profit_king: {
    id: 'profit_king',
    label: '盈利之王',
    description: '累计净赚 ≥ 50000 积分',
    icon: '👑',
    tone: 'violet',
    evaluate: (userId) => {
      const wonTransactions = getUserTransactions(userId).filter(
        (t) => t.type === 'PREDICTION_WIN',
      );
      const total = wonTransactions.reduce((sum, t) => sum + t.amount, 0);
      return { unlocked: total >= 50000, progress: Math.min(total, 50000), target: 50000 };
    },
  },
  long_term_player: {
    id: 'long_term_player',
    label: '长线玩家',
    description: '参与一次长线冠军/金靴/金球竞猜',
    icon: '🏆',
    tone: 'cyan',
    evaluate: (userId) => {
      const count = getUserTournamentBets(userId).length;
      return { unlocked: count >= 1, progress: Math.min(count, 1), target: 1 };
    },
  },
  history_scholar: {
    id: 'history_scholar',
    label: '历史学者',
    description: '访问历史长廊 3 次以上',
    icon: '📚',
    tone: 'slate',
    evaluate: (userId) => {
      const db = dbService.getData();
      const acts = (db as any).activities || [];
      const visits = acts.filter(
        (a: any) => a.userId === userId && a.type === 'HISTORY_VISIT',
      ).length;
      return { unlocked: visits >= 3, progress: Math.min(visits, 3), target: 3 };
    },
  },
  daily_checkin: {
    id: 'daily_checkin',
    label: '签到达人',
    description: '连续签到 7 天',
    icon: '📅',
    tone: 'rose',
    evaluate: (userId) => {
      const db = dbService.getData();
      const checkinLog = db.checkinLog || [];
      const dates = Array.from(
        new Set(
          checkinLog
            .filter((c) => c.userId === userId)
            .map((c) => String(c.date || c.createdAt?.slice(0, 10) || ''))
            .filter((d: string) => d.length > 0),
        ),
      ).sort();
      // 计算最大连续天数
      let maxStreak = 0;
      let cur = 0;
      let prev: Date | null = null;
      for (const d of dates) {
        const curDate = new Date(String(d));
        if (prev) {
          const diff = (curDate.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
          if (diff <= 1.5) {
            cur += 1;
          } else {
            cur = 1;
          }
        } else {
          cur = 1;
        }
        maxStreak = Math.max(maxStreak, cur);
        prev = curDate;
      }
      return { unlocked: maxStreak >= 7, progress: Math.min(maxStreak, 7), target: 7 };
    },
  },
};

export function getBadgeDefinitions(): BadgeDefinition[] {
  return Object.values(BADGE_DEFINITIONS);
}

export function getBadgeDefinition(id: BadgeId): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS[id];
}

// ─── 持久化存储 ───

function ensureUserBadges(): UserBadgeRecord[] {
  const db = dbService.getData();
  if (!Array.isArray((db as any).userBadges)) {
    (db as any).userBadges = [];
  }
  return (db as any).userBadges as UserBadgeRecord[];
}

function ensureUserTitles(): Map<string, UserTitleRecord> {
  const db = dbService.getData();
  if (!Array.isArray(db.userTitles)) {
    db.userTitles = [];
  }
  return new Map((db.userTitles || []).map((item) => [item.userId, item]));
}

function saveUserTitles(records: Map<string, UserTitleRecord>) {
  const db = dbService.getData();
  db.userTitles = Array.from(records.values()).sort((a, b) => a.userId.localeCompare(b.userId));
}

/**
 * 评估并同步指定用户的所有徽章状态
 * 如果有新的徽章解锁，触发群内动态
 */
export function evaluateUserBadges(userId: string, displayName: string, avatarUrl?: string): {
  newlyUnlocked: BadgeId[];
  records: UserBadgeRecord[];
} {
  const records = ensureUserBadges();
  const now = new Date().toISOString();
  const newlyUnlocked: BadgeId[] = [];
  const updated: UserBadgeRecord[] = [];

  for (const def of Object.values(BADGE_DEFINITIONS)) {
    const result = def.evaluate(userId);
    const existing = records.find((r) => r.userId === userId && r.badgeId === def.id);

    if (!existing) {
      const newRec: UserBadgeRecord = {
        userId,
        badgeId: def.id,
        unlocked: result.unlocked,
        progress: result.progress,
        target: result.target,
        unlockedAt: result.unlocked ? now : undefined,
        updatedAt: now,
      };
      updated.push(newRec);
      if (result.unlocked) newlyUnlocked.push(def.id);
    } else {
      if (!existing.unlocked && result.unlocked) {
        existing.unlocked = true;
        existing.unlockedAt = now;
        newlyUnlocked.push(def.id);
      }
      existing.progress = result.progress;
      existing.target = result.target;
      existing.updatedAt = now;
      updated.push(existing);
    }
  }

  // 写回持久化
  // 删除旧记录
  const otherRecords = records.filter((r) => r.userId !== userId);
  otherRecords.push(...updated);
  const db = dbService.getData();
  (db as any).userBadges = otherRecords;

  // 触发动态
  for (const id of newlyUnlocked) {
    const def = BADGE_DEFINITIONS[id];
    try {
      emitBadgeUnlocked({
        userId,
        displayName,
        avatarUrl,
        badgeId: id,
        badgeLabel: def.label,
      });
    } catch (e) {
      logger.error('触发徽章动态失败', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { newlyUnlocked, records: updated };
}

/**
 * 评估所有用户的徽章
 */
export function evaluateAllBadges(): { totalUnlocked: number; affectedUsers: number } {
  const db = dbService.getData();
  let totalUnlocked = 0;
  let affectedUsers = 0;

  for (const user of db.users) {
    const { newlyUnlocked } = evaluateUserBadges(user.id, user.displayName, user.avatarUrl);
    if (newlyUnlocked.length > 0) {
      totalUnlocked += newlyUnlocked.length;
      affectedUsers += 1;
    }
  }

  logger.info('全员徽章评估完成', { totalUnlocked, affectedUsers });
  return { totalUnlocked, affectedUsers };
}

/**
 * 获取用户的徽章列表
 */
export function getUserBadges(userId: string): UserBadgeRecord[] {
  const records = ensureUserBadges().filter((r) => r.userId === userId);
  // 如果用户没有记录，立即评估一次
  if (records.length === 0) {
    const user = dbService.getUsers().find((u) => u.id === userId);
    if (user) {
      return evaluateUserBadges(userId, user.displayName, user.avatarUrl).records;
    }
  }
  return records;
}

// ─── 称号系统 ───

/**
 * 评估用户的称号
 * 规则（按优先级）：
 * 1. 老炮：累计净赚 >= 100000 或 命中次数 >= 50
 * 2. 金杯投资人：参与长线竞猜且当前余额 > 80000
 * 3. 冷门先知：押过冷门高赔率（>= 5.0）且命中至少 3 次
 * 4. 连红猎手：最大连中 >= 5
 * 5. 稳健分析师：命中率 >= 55% 且至少 10 单
 * 6. 群聊新星：累计下注 < 5
 * 7. 默认：群聊新星
 */
export function evaluateUserTitle(userId: string): PlayerTitle {
  const predictions = getUserPredictions(userId);
  const settled = predictions.filter((p) => p.status === 'WON' || p.status === 'LOST');
  const totalSettled = settled.length;
  const wonCount = settled.filter((p) => p.status === 'WON').length;
  const winRate = totalSettled > 0 ? wonCount / totalSettled : 0;
  const maxStreak = (() => {
    let max = 0;
    let cur = 0;
    for (const p of [...settled].sort(
      (a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime(),
    )) {
      if (p.status === 'WON') {
        cur += 1;
        max = Math.max(max, cur);
      } else {
        cur = 0;
      }
    }
    return max;
  })();

  const totalWonAmount = getUserTransactions(userId)
    .filter((t) => t.type === 'PREDICTION_WIN')
    .reduce((sum, t) => sum + t.amount, 0);

  const wallet = getUserWallet(userId);
  const balance = wallet?.balance || 0;

  const longTermCount = getUserTournamentBets(userId).length;

  const longShotHits = settled.filter(
    (p) => p.status === 'WON' && p.oddsDecimal >= 5.0,
  ).length;

  // 1. 老炮
  if (totalWonAmount >= 100000 || wonCount >= 50) return '世界杯老炮';
  // 2. 金杯投资人
  if (longTermCount >= 1 && balance >= 80000) return '金杯投资人';
  // 3. 冷门先知
  if (longShotHits >= 3) return '冷门先知';
  // 4. 连红猎手
  if (maxStreak >= 5) return '连红猎手';
  // 5. 稳健分析师
  if (winRate >= 0.55 && totalSettled >= 10) return '稳健分析师';
  // 6 & 7. 新星
  return '群聊新星';
}

/**
 * 同步用户的当前称号，如果有变化则触发群内动态
 */
export function syncUserTitle(userId: string, displayName: string, avatarUrl?: string): PlayerTitle {
  const records = ensureUserTitles();
  const prev = records.get(userId);
  const newTitle = evaluateUserTitle(userId);
  const now = new Date().toISOString();

  if (!prev || prev.title !== newTitle) {
    records.set(userId, { userId, title: newTitle, updatedAt: now });
    saveUserTitles(records);
    if (prev) {
      try {
        emitTitleChanged({
          userId,
          displayName,
          avatarUrl,
          oldTitle: prev.title,
          newTitle,
        });
      } catch (e) {
        logger.error('触发称号动态失败', { error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return newTitle;
}

/**
 * 同步所有用户的称号
 */
export function syncAllTitles(): { changed: number; total: number } {
  const db = dbService.getData();
  const records = ensureUserTitles();
  let changed = 0;

  for (const user of db.users) {
    const prev = records.get(user.id);
    const newTitle = evaluateUserTitle(user.id);
    if (!prev || prev.title !== newTitle) {
      records.set(user.id, { userId: user.id, title: newTitle, updatedAt: new Date().toISOString() });
      if (prev) changed += 1;
    }
  }
  saveUserTitles(records);
  logger.info('全员称号同步完成', { changed, total: db.users.length });
  return { changed, total: db.users.length };
}

/**
 * 获取用户当前称号
 */
export function getUserTitle(userId: string): PlayerTitle {
  const records = ensureUserTitles();
  const rec = records.get(userId);
  if (rec) return rec.title;
  // 计算一次
  return evaluateUserTitle(userId);
}
