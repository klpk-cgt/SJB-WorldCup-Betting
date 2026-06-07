import { AchievementBadgeSummary, PlayerTitle, Prediction, TournamentBet, Transaction, Wallet } from '../types';

type AchievementInput = {
  predictions: Prediction[];
  tournamentBets: TournamentBet[];
  transactions: Transaction[];
  wallet?: Wallet | null;
};

const BADGE_META: Array<{
  id: AchievementBadgeSummary['id'];
  label: string;
  description: string;
  icon: string;
  tone: AchievementBadgeSummary['tone'];
  getProgress: (stats: ReturnType<typeof buildAchievementStats>) => { current: number; target: number };
}> = [
  {
    id: 'first_win',
    label: '首胜',
    description: '第一次命中单场竞猜',
    icon: '★',
    tone: 'emerald',
    getProgress: (stats) => ({ current: stats.wonCount, target: 1 }),
  },
  {
    id: 'three_streak',
    label: '三连中',
    description: '拿到 3 场及以上连中',
    icon: '▲',
    tone: 'rose',
    getProgress: (stats) => ({ current: stats.maxStreak, target: 3 }),
  },
  {
    id: 'hit_rate_60',
    label: '命中率60',
    description: '至少 5 场已结算，命中率达到 60%',
    icon: '%',
    tone: 'violet',
    getProgress: (stats) => ({ current: stats.settledCount >= 5 ? stats.hitRate : 0, target: 60 }),
  },
  {
    id: 'big_win',
    label: '单场高光',
    description: '单场盈利达到 2000 积分',
    icon: '◆',
    tone: 'amber',
    getProgress: (stats) => ({ current: stats.biggestWin, target: 2000 }),
  },
  {
    id: 'long_term_player',
    label: '长线玩家',
    description: '参与至少 1 项长线竞猜',
    icon: '◎',
    tone: 'cyan',
    getProgress: (stats) => ({ current: stats.longTermCount, target: 1 }),
  },
  {
    id: 'history_scholar',
    label: '历史学家',
    description: '累计答对 3 次每日问答',
    icon: '◈',
    tone: 'slate',
    getProgress: (stats) => ({ current: stats.quizWinCount, target: 3 }),
  },
];

function buildAchievementStats({ predictions, tournamentBets, transactions, wallet }: AchievementInput) {
  const settled = predictions.filter((item) => item.status === 'WON' || item.status === 'LOST');
  const won = settled.filter((item) => item.status === 'WON');
  const biggestWin = won.reduce((max, item) => Math.max(max, item.settledProfit || 0), 0);
  const hitRate = settled.length > 0 ? Math.round((won.length / settled.length) * 100) : 0;
  const netProfit = (wallet?.balance || wallet?.initialPoints || 10000) - (wallet?.initialPoints || 10000);

  const ordered = [...settled].sort(
    (a, b) => new Date(a.settledAt || a.placedAt).getTime() - new Date(b.settledAt || b.placedAt).getTime(),
  );
  let maxStreak = 0;
  let currentStreak = 0;
  for (const item of ordered) {
    if (item.status === 'WON') {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const quizWinCount = transactions.filter((item) => item.note.includes('每日问答')).length;

  return {
    totalCount: predictions.length,
    settledCount: settled.length,
    wonCount: won.length,
    hitRate,
    biggestWin,
    maxStreak,
    currentStreak,
    netProfit,
    longTermCount: tournamentBets.length,
    quizWinCount,
  };
}

function pickTitle(stats: ReturnType<typeof buildAchievementStats>): PlayerTitle {
  if (stats.maxStreak >= 4) return '连红猎手';
  if (stats.biggestWin >= 3000) return '冷门先知';
  if (stats.netProfit >= 5000) return '金杯投资人';
  if (stats.totalCount >= 12) return '世界杯老炮';
  if (stats.settledCount >= 5 && stats.hitRate >= 60) return '稳健分析师';
  return '群聊新星';
}

export function buildUserProfileSummary(input: AchievementInput) {
  const stats = buildAchievementStats(input);
  const allBadges: AchievementBadgeSummary[] = BADGE_META.map((meta) => {
    const progress = meta.getProgress(stats);
    return {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      icon: meta.icon,
      tone: meta.tone,
      unlocked: progress.current >= progress.target,
      current: Math.min(progress.current, progress.target),
      target: progress.target,
    };
  });

  const unlocked = allBadges.filter((item) => item.unlocked);
  const progress = allBadges
    .filter((item) => !item.unlocked)
    .sort((a, b) => b.current / b.target - a.current / a.target);

  return {
    currentTitle: pickTitle(stats),
    featuredBadge: unlocked[0] || null,
    achievementBadges: unlocked,
    achievementProgress: progress,
  };
}
