// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 称号 / 徽章服务
 *
 * 服务端是徽章和称号的唯一真实规则源。前端只消费这里序列化后的结果，
 * 避免出现“后端已解锁、资料页看不到”的双规则问题。
 */

import { dbService } from '../db/db_service';
import logger from './logger';
import { emitBadgeUnlocked, emitTitleChanged } from './activity_service';

export type BadgeCategory =
  | 'newbie'
  | 'streak'
  | 'funny'
  | 'profit'
  | 'precision'
  | 'playstyle'
  | 'tournament'
  | 'activity'
  | 'knowledge'
  | 'history';

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgePolarity = 'positive' | 'funny' | 'negative';
export type BadgeTone = 'emerald' | 'amber' | 'violet' | 'cyan' | 'rose' | 'slate';

export type BadgeId =
  | 'first_bet'
  | 'three_streak'
  | 'five_streak'
  | 'hit_rate_60'
  | 'big_winner'
  | 'profit_king'
  | 'long_term_player'
  | 'history_scholar'
  | 'daily_checkin'
  | 'seven_streak'
  | 'ten_streak'
  | 'beacon_certified'
  | 'comeback_hit'
  | 'rich_50k'
  | 'overnight_rich'
  | 'comeback_master'
  | 'charity_king'
  | 'bankruptcy_edge'
  | 'perfect_shooter'
  | 'score_prophet'
  | 'score_king'
  | 'total_goals_master'
  | 'clean_sweep_day'
  | 'heavy_bettor'
  | 'wide_net'
  | 'specialist_player'
  | 'longshot_hunter'
  | 'last_five_minutes'
  | 'champion_eye'
  | 'golden_boot_prophet'
  | 'golden_ball_scout'
  | 'full_attendance'
  | 'quiz_master'
  | 'perfect_student'
  | 'social_master'
  | 'history_regular';

export type PlayerTitle =
  | '群聊新星'
  | '稳健分析师'
  | '连红猎手'
  | '冷门先知'
  | '金杯投资人'
  | '世界杯老炮'
  | '传奇球王'
  | '全胜将军'
  | '比分之王'
  | '新晋黑马'
  | '知识达人'
  | '明灯本灯'
  | '慈善赌王'
  | '破产兄弟';

interface BadgeProgressResult {
  unlocked: boolean;
  progress: number;
  target: number;
}

interface BadgeStats {
  totalPredictions: number;
  settledCount: number;
  wonCount: number;
  hitRate: number;
  maxWinStreak: number;
  maxLoseStreak: number;
  hasComebackHit: boolean;
  biggestWin: number;
  netProfit: number;
  totalLoss: number;
  maxDailyProfit: number;
  hasRecoveredToInitial: boolean;
  correctScoreHits: number;
  totalGoalsHits: number;
  hasCleanSweepDay: boolean;
  biggestStake: number;
  maxMarketsInSingleMatch: number;
  maxSingleMarketCount: number;
  longShotHits: number;
  lastFiveMinuteBets: number;
  longTermCount: number;
  championHits: number;
  goldenBootHits: number;
  goldenBallHits: number;
  balance: number;
  initialPoints: number;
  maxCheckinStreak: number;
  quizCorrectCount: number;
  hasPerfectQuizDay: boolean;
  historyVisitCount: number;
  recentSevenDayProfit: number;
}

export interface BadgeDefinition {
  id: BadgeId;
  label: string;
  description: string;
  icon: string;
  tone: BadgeTone;
  category: BadgeCategory;
  rarity: BadgeRarity;
  polarity: BadgePolarity;
  sortOrder: number;
  evaluate: (stats: BadgeStats) => BadgeProgressResult;
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

export interface UserTitleRecord {
  userId: string;
  title: PlayerTitle;
  updatedAt: string;
}

export interface SerializedBadge {
  id: BadgeId;
  label: string;
  description: string;
  icon: string;
  tone: BadgeTone;
  category: BadgeCategory;
  rarity: BadgeRarity;
  polarity: BadgePolarity;
  sortOrder: number;
  unlocked: boolean;
  progress: number;
  current: number;
  target: number;
  unlockedAt?: string;
}

const RARITY_WEIGHT: Record<BadgeRarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

function clampProgress(value: number, target: number) {
  return Math.max(0, Math.min(value, target));
}

function progress(value: number, target: number): BadgeProgressResult {
  return { unlocked: value >= target, progress: clampProgress(value, target), target };
}

function flag(unlocked: boolean, progressValue = 0, target = 1): BadgeProgressResult {
  return { unlocked, progress: unlocked ? target : clampProgress(progressValue, target), target };
}

function toDateKey(iso?: string) {
  return String(iso || '').slice(0, 10);
}

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

function getMaxConsecutiveDates(dates: string[]) {
  const uniqueDates = Array.from(new Set(dates.filter(Boolean))).sort();
  let maxStreak = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const date of uniqueDates) {
    const currentDate = new Date(date);
    if (Number.isNaN(currentDate.getTime())) continue;
    if (previous) {
      const diffDays = (currentDate.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24);
      current = diffDays <= 1.5 ? current + 1 : 1;
    } else {
      current = 1;
    }
    maxStreak = Math.max(maxStreak, current);
    previous = currentDate;
  }

  return maxStreak;
}

function buildUserBadgeStats(userId: string): BadgeStats {
  const db = dbService.getData();
  const predictions = getUserPredictions(userId);
  const settled = predictions
    .filter((p) => p.status === 'WON' || p.status === 'LOST')
    .sort((a, b) => new Date(a.settledAt || a.placedAt).getTime() - new Date(b.settledAt || b.placedAt).getTime());
  const won = settled.filter((p) => p.status === 'WON');
  const wallet = getUserWallet(userId);
  const initialPoints = wallet?.initialPoints || 10000;
  const balance = wallet?.balance || 0;
  const transactions = getUserTransactions(userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const tournamentBets = getUserTournamentBets(userId);

  let maxWinStreak = 0;
  let currentWinStreak = 0;
  let maxLoseStreak = 0;
  let currentLoseStreak = 0;
  let previousLoseStreak = 0;
  let hasComebackHit = false;

  for (const prediction of settled) {
    if (prediction.status === 'WON') {
      currentWinStreak += 1;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      if (previousLoseStreak >= 5) hasComebackHit = true;
      currentLoseStreak = 0;
      previousLoseStreak = 0;
    } else {
      currentLoseStreak += 1;
      previousLoseStreak = currentLoseStreak;
      maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
      currentWinStreak = 0;
    }
  }

  const dailyProfit = new Map<string, number>();
  for (const prediction of settled) {
    const date = toDateKey(prediction.settledAt || prediction.placedAt);
    dailyProfit.set(date, (dailyProfit.get(date) || 0) + (prediction.settledProfit || 0));
  }

  const predictionsByDay = new Map<string, typeof settled>();
  for (const prediction of settled) {
    const date = toDateKey(prediction.placedAt);
    const list = predictionsByDay.get(date) || [];
    list.push(prediction);
    predictionsByDay.set(date, list);
  }

  const matchMarketMap = new Map<string, Set<string>>();
  const marketCount = new Map<string, number>();
  for (const prediction of predictions) {
    const market = String(prediction.market || '').toUpperCase();
    marketCount.set(market, (marketCount.get(market) || 0) + 1);
    const markets = matchMarketMap.get(prediction.matchId) || new Set<string>();
    if (market) markets.add(market);
    matchMarketMap.set(prediction.matchId, markets);
  }

  const matchStartMap = new Map(db.matches.map((match) => [match.id, match.startTimeUtc]));
  const lastFiveMinuteBets = predictions.filter((prediction) => {
    const start = matchStartMap.get(prediction.matchId);
    if (!start) return false;
    const diff = new Date(start).getTime() - new Date(prediction.placedAt).getTime();
    return diff >= 0 && diff <= 5 * 60 * 1000;
  }).length;

  const hasRecoveredToInitial = transactions.some((tx) => tx.balanceAfter < initialPoints) && balance >= initialPoints;
  const netProfit = balance - initialPoints;
  const quizLogs = db.quizLogs || [];
  const userQuizLogs = quizLogs.filter((log) => log.userId === userId);
  const correctByDay = new Map<string, number>();
  for (const log of userQuizLogs) {
    correctByDay.set(log.date, (correctByDay.get(log.date) || 0) + (log.correctCount || 0));
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentSevenDayProfit = settled
    .filter((prediction) => new Date(prediction.settledAt || prediction.placedAt).getTime() >= sevenDaysAgo)
    .reduce((sum, prediction) => sum + (prediction.settledProfit || 0), 0);

  return {
    totalPredictions: predictions.length,
    settledCount: settled.length,
    wonCount: won.length,
    hitRate: settled.length > 0 ? Math.round((won.length / settled.length) * 100) : 0,
    maxWinStreak,
    maxLoseStreak,
    hasComebackHit,
    biggestWin: won.reduce((max, p) => Math.max(max, p.settledProfit || 0), 0),
    netProfit,
    totalLoss: Math.max(0, initialPoints - balance),
    maxDailyProfit: Math.max(0, ...Array.from(dailyProfit.values())),
    hasRecoveredToInitial,
    correctScoreHits: won.filter((p) => String(p.market).toUpperCase() === 'CORRECT_SCORE').length,
    totalGoalsHits: won.filter((p) => String(p.market).toUpperCase() === 'TOTAL_GOALS').length,
    hasCleanSweepDay: Array.from(predictionsByDay.values()).some((items) => items.length >= 3 && items.every((p) => p.status === 'WON')),
    biggestStake: predictions.reduce((max, p) => Math.max(max, p.stakePoints || 0), 0),
    maxMarketsInSingleMatch: Math.max(0, ...Array.from(matchMarketMap.values()).map((set) => set.size)),
    maxSingleMarketCount: Math.max(0, ...Array.from(marketCount.values())),
    longShotHits: won.filter((p) => Number(p.oddsDecimal || 0) >= 5).length,
    lastFiveMinuteBets,
    longTermCount: tournamentBets.length,
    championHits: tournamentBets.filter((bet) => bet.type === 'champion' && bet.status === 'WON').length,
    goldenBootHits: tournamentBets.filter((bet) => bet.type === 'golden_boot' && bet.status === 'WON').length,
    goldenBallHits: tournamentBets.filter((bet) => bet.type === 'golden_ball' && bet.status === 'WON').length,
    balance,
    initialPoints,
    maxCheckinStreak: getMaxConsecutiveDates((db.checkinLog || []).filter((log) => log.userId === userId).map((log) => log.date)),
    quizCorrectCount: userQuizLogs.reduce((sum, log) => sum + (log.correctCount || 0), 0),
    hasPerfectQuizDay: Array.from(correctByDay.values()).some((count) => count >= 3),
    historyVisitCount: (db.activities || []).filter((activity: any) => activity.userId === userId && activity.type === 'HISTORY_VISIT').length,
    recentSevenDayProfit,
  };
}

const BADGE_DEFINITIONS: Record<BadgeId, BadgeDefinition> = {
  first_bet: {
    id: 'first_bet',
    label: '初次下注',
    description: '完成第一笔竞猜即可解锁',
    icon: '🎯',
    tone: 'cyan',
    category: 'newbie',
    rarity: 'common',
    polarity: 'positive',
    sortOrder: 10,
    evaluate: (stats) => progress(stats.totalPredictions, 1),
  },
  three_streak: {
    id: 'three_streak',
    label: '三连红',
    description: '连续命中 3 场竞猜',
    icon: '🔥',
    tone: 'rose',
    category: 'streak',
    rarity: 'rare',
    polarity: 'positive',
    sortOrder: 20,
    evaluate: (stats) => progress(stats.maxWinStreak, 3),
  },
  five_streak: {
    id: 'five_streak',
    label: '五连红',
    description: '连续命中 5 场竞猜',
    icon: '🌟',
    tone: 'amber',
    category: 'streak',
    rarity: 'epic',
    polarity: 'positive',
    sortOrder: 30,
    evaluate: (stats) => progress(stats.maxWinStreak, 5),
  },
  seven_streak: {
    id: 'seven_streak',
    label: '七连红',
    description: '连续命中 7 场竞猜',
    icon: '⚡',
    tone: 'amber',
    category: 'streak',
    rarity: 'epic',
    polarity: 'positive',
    sortOrder: 40,
    evaluate: (stats) => progress(stats.maxWinStreak, 7),
  },
  ten_streak: {
    id: 'ten_streak',
    label: '十连红',
    description: '连续命中 10 场竞猜，传说级手感',
    icon: '🐐',
    tone: 'violet',
    category: 'streak',
    rarity: 'legendary',
    polarity: 'positive',
    sortOrder: 50,
    evaluate: (stats) => progress(stats.maxWinStreak, 10),
  },
  beacon_certified: {
    id: 'beacon_certified',
    label: '明灯认证',
    description: '连续未中 5 场，群聊反向指标上线',
    icon: '💡',
    tone: 'rose',
    category: 'funny',
    rarity: 'rare',
    polarity: 'negative',
    sortOrder: 60,
    evaluate: (stats) => progress(stats.maxLoseStreak, 5),
  },
  comeback_hit: {
    id: 'comeback_hit',
    label: '绝地翻盘',
    description: '连续未中 5 场后，下一笔成功命中',
    icon: '🧗',
    tone: 'emerald',
    category: 'funny',
    rarity: 'epic',
    polarity: 'funny',
    sortOrder: 70,
    evaluate: (stats) => flag(stats.hasComebackHit, stats.maxLoseStreak, 5),
  },
  hit_rate_60: {
    id: 'hit_rate_60',
    label: '神准',
    description: '命中率达到 60%，至少 5 单已结算',
    icon: '🎯',
    tone: 'emerald',
    category: 'precision',
    rarity: 'rare',
    polarity: 'positive',
    sortOrder: 80,
    evaluate: (stats) => stats.settledCount < 5 ? progress(stats.settledCount, 5) : progress(stats.hitRate, 60),
  },
  perfect_shooter: {
    id: 'perfect_shooter',
    label: '百发百中',
    description: '命中率达到 80%，至少 10 单已结算',
    icon: '🏹',
    tone: 'violet',
    category: 'precision',
    rarity: 'legendary',
    polarity: 'positive',
    sortOrder: 90,
    evaluate: (stats) => stats.settledCount < 10 ? progress(stats.settledCount, 10) : progress(stats.hitRate, 80),
  },
  score_prophet: {
    id: 'score_prophet',
    label: '比分预言家',
    description: '正确比分命中 2 次',
    icon: '🔮',
    tone: 'violet',
    category: 'precision',
    rarity: 'epic',
    polarity: 'positive',
    sortOrder: 100,
    evaluate: (stats) => progress(stats.correctScoreHits, 2),
  },
  score_king: {
    id: 'score_king',
    label: '比分之王',
    description: '正确比分命中 5 次',
    icon: '👑',
    tone: 'violet',
    category: 'precision',
    rarity: 'legendary',
    polarity: 'positive',
    sortOrder: 110,
    evaluate: (stats) => progress(stats.correctScoreHits, 5),
  },
  total_goals_master: {
    id: 'total_goals_master',
    label: '总进球大师',
    description: '总进球玩法命中 5 次',
    icon: '🥅',
    tone: 'cyan',
    category: 'precision',
    rarity: 'epic',
    polarity: 'positive',
    sortOrder: 120,
    evaluate: (stats) => progress(stats.totalGoalsHits, 5),
  },
  clean_sweep_day: {
    id: 'clean_sweep_day',
    label: '全垒打',
    description: '同一天至少 3 单已结算竞猜全部命中',
    icon: '🧹',
    tone: 'emerald',
    category: 'precision',
    rarity: 'epic',
    polarity: 'positive',
    sortOrder: 130,
    evaluate: (stats) => flag(stats.hasCleanSweepDay, stats.maxWinStreak, 3),
  },
  big_winner: {
    id: 'big_winner',
    label: '大赢家',
    description: '单笔竞猜净赚 5000 积分',
    icon: '💰',
    tone: 'amber',
    category: 'profit',
    rarity: 'rare',
    polarity: 'positive',
    sortOrder: 140,
    evaluate: (stats) => progress(stats.biggestWin, 5000),
  },
  profit_king: {
    id: 'profit_king',
    label: '盈利之王',
    description: '当前净赚达到 50000 积分',
    icon: '👑',
    tone: 'violet',
    category: 'profit',
    rarity: 'epic',
    polarity: 'positive',
    sortOrder: 150,
    evaluate: (stats) => progress(stats.netProfit, 50000),
  },
  rich_50k: {
    id: 'rich_50k',
    label: '万元户',
    description: '当前余额突破 50000 积分',
    icon: '🪙',
    tone: 'amber',
    category: 'profit',
    rarity: 'rare',
    polarity: 'positive',
    sortOrder: 160,
    evaluate: (stats) => progress(stats.balance, 50000),
  },
  overnight_rich: {
    id: 'overnight_rich',
    label: '一夜暴富',
    description: '单日净赚达到 10000 积分',
    icon: '🚀',
    tone: 'amber',
    category: 'profit',
    rarity: 'epic',
    polarity: 'positive',
    sortOrder: 170,
    evaluate: (stats) => progress(stats.maxDailyProfit, 10000),
  },
  comeback_master: {
    id: 'comeback_master',
    label: '回本大师',
    description: '曾低于初始积分，后来回到初始积分以上',
    icon: '📈',
    tone: 'emerald',
    category: 'profit',
    rarity: 'rare',
    polarity: 'positive',
    sortOrder: 180,
    evaluate: (stats) => flag(stats.hasRecoveredToInitial, stats.balance, stats.initialPoints),
  },
  charity_king: {
    id: 'charity_king',
    label: '慈善赌王',
    description: '累计净亏损达到 20000 积分，群聊贡献感拉满',
    icon: '🎁',
    tone: 'rose',
    category: 'funny',
    rarity: 'epic',
    polarity: 'negative',
    sortOrder: 190,
    evaluate: (stats) => progress(stats.totalLoss, 20000),
  },
  bankruptcy_edge: {
    id: 'bankruptcy_edge',
    label: '破产边缘',
    description: '当前余额低于 1000 积分',
    icon: '🕳️',
    tone: 'rose',
    category: 'funny',
    rarity: 'rare',
    polarity: 'negative',
    sortOrder: 200,
    evaluate: (stats) => flag(stats.balance > 0 && stats.balance < 1000, stats.totalLoss, Math.max(1, stats.initialPoints - 1000)),
  },
  heavy_bettor: {
    id: 'heavy_bettor',
    label: '重注狂人',
    description: '单笔下注达到 5000 积分',
    icon: '💎',
    tone: 'amber',
    category: 'playstyle',
    rarity: 'rare',
    polarity: 'positive',
    sortOrder: 210,
    evaluate: (stats) => progress(stats.biggestStake, 5000),
  },
  wide_net: {
    id: 'wide_net',
    label: '撒网达人',
    description: '同一场比赛下注 3 个不同玩法',
    icon: '🕸️',
    tone: 'cyan',
    category: 'playstyle',
    rarity: 'rare',
    polarity: 'funny',
    sortOrder: 220,
    evaluate: (stats) => progress(stats.maxMarketsInSingleMatch, 3),
  },
  specialist_player: {
    id: 'specialist_player',
    label: '专一玩家',
    description: '同一种玩法累计下注 20 次',
    icon: '🧭',
    tone: 'slate',
    category: 'playstyle',
    rarity: 'rare',
    polarity: 'positive',
    sortOrder: 230,
    evaluate: (stats) => progress(stats.maxSingleMarketCount, 20),
  },
  longshot_hunter: {
    id: 'longshot_hunter',
    label: '高赔猎人',
    description: '命中赔率 5.0 及以上竞猜 3 次',
    icon: '🦅',
    tone: 'violet',
    category: 'playstyle',
    rarity: 'epic',
    polarity: 'positive',
    sortOrder: 240,
    evaluate: (stats) => progress(stats.longShotHits, 3),
  },
  last_five_minutes: {
    id: 'last_five_minutes',
    label: '最后五分钟',
    description: '开赛前 5 分钟内下注 5 次',
    icon: '⏱️',
    tone: 'amber',
    category: 'playstyle',
    rarity: 'rare',
    polarity: 'funny',
    sortOrder: 250,
    evaluate: (stats) => progress(stats.lastFiveMinuteBets, 5),
  },
  long_term_player: {
    id: 'long_term_player',
    label: '长线玩家',
    description: '参与一次冠军/金靴/金球长线竞猜',
    icon: '🏆',
    tone: 'cyan',
    category: 'tournament',
    rarity: 'common',
    polarity: 'positive',
    sortOrder: 260,
    evaluate: (stats) => progress(stats.longTermCount, 1),
  },
  champion_eye: {
    id: 'champion_eye',
    label: '冠军之眼',
    description: '冠军长线竞猜命中',
    icon: '🏆',
    tone: 'amber',
    category: 'tournament',
    rarity: 'legendary',
    polarity: 'positive',
    sortOrder: 270,
    evaluate: (stats) => progress(stats.championHits, 1),
  },
  golden_boot_prophet: {
    id: 'golden_boot_prophet',
    label: '金靴先知',
    description: '金靴长线竞猜命中',
    icon: '👟',
    tone: 'amber',
    category: 'tournament',
    rarity: 'legendary',
    polarity: 'positive',
    sortOrder: 280,
    evaluate: (stats) => progress(stats.goldenBootHits, 1),
  },
  golden_ball_scout: {
    id: 'golden_ball_scout',
    label: '金球伯乐',
    description: '金球长线竞猜命中',
    icon: '⚽',
    tone: 'amber',
    category: 'tournament',
    rarity: 'legendary',
    polarity: 'positive',
    sortOrder: 290,
    evaluate: (stats) => progress(stats.goldenBallHits, 1),
  },
  daily_checkin: {
    id: 'daily_checkin',
    label: '签到达人',
    description: '连续签到 7 天',
    icon: '📅',
    tone: 'rose',
    category: 'activity',
    rarity: 'common',
    polarity: 'positive',
    sortOrder: 300,
    evaluate: (stats) => progress(stats.maxCheckinStreak, 7),
  },
  full_attendance: {
    id: 'full_attendance',
    label: '全勤王',
    description: '连续签到 30 天',
    icon: '🗓️',
    tone: 'emerald',
    category: 'activity',
    rarity: 'epic',
    polarity: 'positive',
    sortOrder: 310,
    evaluate: (stats) => progress(stats.maxCheckinStreak, 30),
  },
  social_master: {
    id: 'social_master',
    label: '社交达人',
    description: '累计完成 100 次竞猜',
    icon: '🤝',
    tone: 'cyan',
    category: 'activity',
    rarity: 'epic',
    polarity: 'positive',
    sortOrder: 320,
    evaluate: (stats) => progress(stats.totalPredictions, 100),
  },
  quiz_master: {
    id: 'quiz_master',
    label: '答题达人',
    description: '每日问答累计答对 30 题',
    icon: '🧠',
    tone: 'violet',
    category: 'knowledge',
    rarity: 'rare',
    polarity: 'positive',
    sortOrder: 330,
    evaluate: (stats) => progress(stats.quizCorrectCount, 30),
  },
  perfect_student: {
    id: 'perfect_student',
    label: '满分学霸',
    description: '一天内 3 道每日问答全部答对',
    icon: '🎓',
    tone: 'emerald',
    category: 'knowledge',
    rarity: 'rare',
    polarity: 'positive',
    sortOrder: 340,
    evaluate: (stats) => flag(stats.hasPerfectQuizDay, stats.quizCorrectCount, 3),
  },
  history_scholar: {
    id: 'history_scholar',
    label: '历史学者',
    description: '访问历史长廊 3 次',
    icon: '📚',
    tone: 'slate',
    category: 'history',
    rarity: 'common',
    polarity: 'positive',
    sortOrder: 350,
    evaluate: (stats) => progress(stats.historyVisitCount, 3),
  },
  history_regular: {
    id: 'history_regular',
    label: '历史馆常客',
    description: '访问历史长廊 10 次',
    icon: '🏛️',
    tone: 'slate',
    category: 'history',
    rarity: 'rare',
    polarity: 'positive',
    sortOrder: 360,
    evaluate: (stats) => progress(stats.historyVisitCount, 10),
  },
};

export function getBadgeDefinitions(): BadgeDefinition[] {
  return Object.values(BADGE_DEFINITIONS).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getBadgeDefinition(id: BadgeId): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS[id];
}

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

export function evaluateUserBadges(userId: string, displayName: string, avatarUrl?: string): {
  newlyUnlocked: BadgeId[];
  records: UserBadgeRecord[];
} {
  const records = ensureUserBadges();
  const now = new Date().toISOString();
  const stats = buildUserBadgeStats(userId);
  const newlyUnlocked: BadgeId[] = [];
  const updated: UserBadgeRecord[] = [];

  for (const def of getBadgeDefinitions()) {
    const result = def.evaluate(stats);
    const existing = records.find((record) => record.userId === userId && record.badgeId === def.id);

    if (!existing) {
      const newRecord: UserBadgeRecord = {
        userId,
        badgeId: def.id,
        unlocked: result.unlocked,
        progress: result.progress,
        target: result.target,
        unlockedAt: result.unlocked ? now : undefined,
        updatedAt: now,
      };
      updated.push(newRecord);
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

  const db = dbService.getData();
  (db as any).userBadges = records.filter((record) => record.userId !== userId);
  (db as any).userBadges.push(...updated);

  // 存储新解锁成就的通知（供机器人轮询推送）
  if (newlyUnlocked.length > 0) {
    const notifs = (db as any).achievementNotifications || [];
    for (const id of newlyUnlocked) {
      const def = BADGE_DEFINITIONS[id];
      notifs.push({
        id: `${userId}-${id}-${Date.now()}`,
        userId,
        displayName,
        badgeId: id,
        badgeLabel: def.label,
        badgeRarity: def.rarity,
        matchId: '',
        createdAt: new Date().toISOString(),
        pushed: false,
      });
    }
    (db as any).achievementNotifications = notifs;
  }
  dbService.save();

  for (const id of newlyUnlocked) {
    const def = BADGE_DEFINITIONS[id];
    try {
      emitBadgeUnlocked({
        userId,
        displayName,
        avatarUrl,
        badgeId: id,
        badgeLabel: def.label,
        polarity: def.polarity,
      });
    } catch (e) {
      logger.error('触发徽章动态失败', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  return { newlyUnlocked, records: updated };
}

export function evaluateAllBadges(): { totalUnlocked: number; affectedUsers: number } {
  const db = dbService.getData();
  let totalUnlocked = 0;
  let affectedUsers = 0;

  for (const user of db.users) {
    if (user.status === 'DISABLED') continue;
    const { newlyUnlocked } = evaluateUserBadges(user.id, user.displayName, user.avatarUrl);
    if (newlyUnlocked.length > 0) {
      totalUnlocked += newlyUnlocked.length;
      affectedUsers += 1;
    }
  }

  logger.info('全员徽章评估完成', { totalUnlocked, affectedUsers });
  return { totalUnlocked, affectedUsers };
}

export function getUserBadges(userId: string): UserBadgeRecord[] {
  const records = ensureUserBadges().filter((record) => record.userId === userId);
  const missingDefinitions = getBadgeDefinitions().some((def) => !records.some((record) => record.badgeId === def.id));
  if (records.length === 0 || missingDefinitions) {
    const user = dbService.getUsers().find((item) => item.id === userId);
    if (user) {
      return evaluateUserBadges(userId, user.displayName, user.avatarUrl).records;
    }
  }
  return records;
}

export function serializeUserBadges(userId: string): SerializedBadge[] {
  const records = getUserBadges(userId);
  const recordMap = new Map(records.map((record) => [record.badgeId, record]));

  return getBadgeDefinitions()
    .map((def) => {
      const record = recordMap.get(def.id);
      const stats = record ? null : buildUserBadgeStats(userId);
      const fallback = stats ? def.evaluate(stats) : { unlocked: false, progress: 0, target: 1 };
      const current = record?.progress ?? fallback.progress;
      const target = record?.target ?? fallback.target;
      return {
        id: def.id,
        label: def.label,
        description: def.description,
        icon: def.icon,
        tone: def.tone,
        category: def.category,
        rarity: def.rarity,
        polarity: def.polarity,
        sortOrder: def.sortOrder,
        unlocked: record?.unlocked ?? fallback.unlocked,
        progress: current,
        current: Math.min(current, target),
        target,
        unlockedAt: record?.unlockedAt,
      };
    })
    .sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      if (RARITY_WEIGHT[a.rarity] !== RARITY_WEIGHT[b.rarity]) return RARITY_WEIGHT[b.rarity] - RARITY_WEIGHT[a.rarity];
      return a.sortOrder - b.sortOrder;
    });
}

export function evaluateUserTitle(userId: string): PlayerTitle {
  const stats = buildUserBadgeStats(userId);

  if (stats.netProfit >= 200000 && stats.wonCount >= 100) return '传奇球王';
  if (stats.maxWinStreak >= 10) return '全胜将军';
  if (stats.correctScoreHits >= 5) return '比分之王';
  if (stats.totalPredictions >= 100 || stats.wonCount >= 50) return '世界杯老炮';
  if (stats.longTermCount >= 1 && stats.balance >= 80000) return '金杯投资人';
  if (stats.longShotHits >= 3) return '冷门先知';
  if (stats.recentSevenDayProfit >= 15000) return '新晋黑马';
  if (stats.hitRate >= 55 && stats.settledCount >= 10) return '稳健分析师';
  if (stats.quizCorrectCount >= 50) return '知识达人';
  if (stats.hitRate <= 25 && stats.settledCount >= 20) return '明灯本灯';
  if (stats.totalLoss >= 50000) return '慈善赌王';
  if (stats.balance > 0 && stats.balance < 500) return '破产兄弟';
  return '群聊新星';
}

export function syncUserTitle(userId: string, displayName: string, avatarUrl?: string): PlayerTitle {
  const records = ensureUserTitles();
  const prev = records.get(userId);
  const newTitle = evaluateUserTitle(userId);
  const now = new Date().toISOString();

  if (!prev || prev.title !== newTitle) {
    records.set(userId, { userId, title: newTitle, updatedAt: now });
    saveUserTitles(records);
    dbService.save();
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
  dbService.save();
  logger.info('全员称号同步完成', { changed, total: db.users.length });
  return { changed, total: db.users.length };
}

export function getUserTitle(userId: string): PlayerTitle {
  const records = ensureUserTitles();
  const rec = records.get(userId);
  if (rec) return rec.title;
  return evaluateUserTitle(userId);
}

export function getUserProfileSummary(userId: string) {
  const currentTitle = getUserTitle(userId);
  const badges = serializeUserBadges(userId);
  const achievementBadges = badges.filter((badge) => badge.unlocked);
  const achievementProgress = badges
    .filter((badge) => !badge.unlocked)
    .sort((a, b) => (b.current / Math.max(1, b.target)) - (a.current / Math.max(1, a.target)));
  const featuredBadge =
    [...achievementBadges].sort((a, b) => RARITY_WEIGHT[b.rarity] - RARITY_WEIGHT[a.rarity] || a.sortOrder - b.sortOrder)[0] || null;

  return {
    currentTitle,
    featuredBadge,
    achievementBadges,
    achievementProgress,
    badges,
    rareUnlockedCount: achievementBadges.filter((badge) => badge.rarity === 'epic' || badge.rarity === 'legendary').length,
    totalBadgeCount: badges.length,
  };
}
