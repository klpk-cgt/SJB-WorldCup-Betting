/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  Award,
  BadgeCheck,
  BarChart3,
  Download,
  Flame,
  Gift,
  Layers3,
  LogOut,
  Medal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Ticket,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { AchievementBadgeSummary, Prediction, TournamentBet, Transaction, UserProfileSummary } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import SmartAvatar from './SmartAvatar';
import FlagBadge from './home/FlagBadge';
import { useGameContext } from './GameContext';
import { getLevelByNetProfit, LEVEL_CONFIGS } from '../server/config';

interface MeTabProps {
  onLogout: () => void;
  onAdminLogin?: () => void;
}

type PredictionWithMatch = Prediction & { match?: any | null };
type ProfileTab = 'overview' | 'reports' | 'badges' | 'items';

const TONE_CLASS: Record<AchievementBadgeSummary['tone'], string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  cyan: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

const TABS: Array<{ id: ProfileTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: '总览', icon: ShieldCheck },
  { id: 'reports', label: '战报', icon: BarChart3 },
  { id: 'badges', label: '徽章', icon: Medal },
  { id: 'items', label: '道具', icon: Gift },
];

const PROFILE_ICON_BASE = '/profile-icons';
const PROFILE_ASSETS_BASE = '/assets/player-profile';

const STAT_ICON_SRC = {
  points: `${PROFILE_ICON_BASE}/points-coin.png`,
  hitRate: `${PROFILE_ICON_BASE}/hit-rate-target.png`,
  netProfit: `${PROFILE_ICON_BASE}/net-profit-trend.png`,
  streak: `${PROFILE_ICON_BASE}/streak-flame.png`,
  biggestWin: `${PROFILE_ICON_BASE}/big-win-trophy.png`,
  predictionTicket: `${PROFILE_ICON_BASE}/prediction-ticket.png`,
} as const;

const BADGE_ICON_SRC: Partial<Record<AchievementBadgeSummary['id'], string>> = {
  first_win: `${PROFILE_ICON_BASE}/first-win.png`,
  first_bet: `${PROFILE_ICON_BASE}/first-win.png`,
  three_streak: `${PROFILE_ICON_BASE}/three-streak.png`,
  five_streak: `${PROFILE_ICON_BASE}/three-streak.png`,
  seven_streak: `${PROFILE_ICON_BASE}/three-streak.png`,
  ten_streak: `${PROFILE_ICON_BASE}/three-streak.png`,
  hit_rate_60: `${PROFILE_ICON_BASE}/hit-rate-60.png`,
  perfect_shooter: `${PROFILE_ICON_BASE}/hit-rate-60.png`,
  big_win: `${PROFILE_ICON_BASE}/big-win.png`,
  big_winner: `${PROFILE_ICON_BASE}/big-win.png`,
  profit_king: `${PROFILE_ICON_BASE}/big-win-trophy.png`,
  rich_50k: `${PROFILE_ICON_BASE}/points-coin.png`,
  overnight_rich: `${PROFILE_ICON_BASE}/net-profit-trend.png`,
  long_term_player: `${PROFILE_ICON_BASE}/long-term-player.png`,
  champion_eye: `${PROFILE_ICON_BASE}/big-win-trophy.png`,
  golden_boot_prophet: `${PROFILE_ICON_BASE}/big-win-trophy.png`,
  golden_ball_scout: `${PROFILE_ICON_BASE}/big-win-trophy.png`,
  history_scholar: `${PROFILE_ICON_BASE}/history-scholar.png`,
  history_regular: `${PROFILE_ICON_BASE}/history-scholar.png`,
};

const CATEGORY_LABEL: Record<string, string> = {
  newbie: '新手',
  streak: '连红',
  funny: '名场面',
  profit: '收益',
  precision: '精准',
  playstyle: '玩法',
  tournament: '长线',
  activity: '活跃',
  knowledge: '知识',
  history: '历史',
};

const RARITY_LABEL: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

const RARITY_CLASS: Record<string, string> = {
  common: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  rare: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
  epic: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  legendary: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
};

const CARD_ICON_SRC: Record<string, string> = {
  NO_LOSS: `${PROFILE_ICON_BASE}/no-loss-card.png`,
  no_loss: `${PROFILE_ICON_BASE}/no-loss-card.png`,
  'no-loss': `${PROFILE_ICON_BASE}/no-loss-card.png`,
  DOUBLE: `${PROFILE_ICON_BASE}/double-card.png`,
  double: `${PROFILE_ICON_BASE}/double-card.png`,
  REGRET: `${PROFILE_ICON_BASE}/regret-card.png`,
  regret: `${PROFILE_ICON_BASE}/regret-card.png`,
  FLOOR: `${PROFILE_ICON_BASE}/floor-card.png`,
  floor: `${PROFILE_ICON_BASE}/floor-card.png`,
};

function formatSigned(value?: number | null) {
  if (value == null) return '0';
  if (value > 0) return `+${value.toLocaleString()}`;
  return value.toLocaleString();
}

function formatCompact(value?: number | null) {
  return Number(value || 0).toLocaleString();
}

function getTitleCopy(title?: string) {
  switch (title) {
    case '稳健分析师':
      return '判断稳定，适合做群里的稳盘参考。';
    case '连红猎手':
      return '最近手感正在升温，连中节奏值得关注。';
    case '冷门先知':
      return '擅长捕捉赔率背后的反差机会。';
    case '金杯投资人':
      return '收益曲线领先，已经打出资产感。';
    case '世界杯老炮':
      return '参与够深，经验值正在持续累积。';
    case '传奇球王':
      return '收益和命中双线封神，群聊顶级身份已坐实。';
    case '全胜将军':
      return '连红气势拉满，最近每一手都有压迫感。';
    case '比分之王':
      return '能把比分猜到点上，属于真正的预言家流派。';
    case '新晋黑马':
      return '近况突然起飞，短期收益曲线很有冲击力。';
    case '知识达人':
      return '不只会下注，世界杯知识储备也很能打。';
    case '明灯本灯':
      return '群聊反向风向标上线，节目效果已经拉满。';
    case '慈善赌王':
      return '娱乐精神很足，群聊名场面贡献值很高。';
    case '破产兄弟':
      return '低谷不丢人，下一场就是翻身局。';
    default:
      return '新一轮竞猜征程已经开启。';
  }
}

function getProgressPercent(item: AchievementBadgeSummary) {
  if (item.target <= 0) return 0;
  return Math.min(100, Math.round((item.current / item.target) * 100));
}

function getBadgeImageSrc(badge: AchievementBadgeSummary) {
  return BADGE_ICON_SRC[badge.id];
}

function getRarityClass(rarity?: string) {
  return RARITY_CLASS[rarity || 'common'] || RARITY_CLASS.common;
}

function groupBadgesByCategory(badges: AchievementBadgeSummary[]) {
  return badges.reduce<Record<string, AchievementBadgeSummary[]>>((groups, badge) => {
    const category = badge.category || 'newbie';
    if (!groups[category]) groups[category] = [];
    groups[category].push(badge);
    return groups;
  }, {});
}

function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(timer);
        resolve(fallback);
      });
  });
}

function ProfileImageIcon({
  src,
  alt,
  size = 32,
  fallback,
  className = '',
}: {
  src?: string;
  alt: string;
  size?: number;
  fallback?: React.ReactNode;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-white/80 text-slate-500 ring-1 ring-slate-200 ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={`shrink-0 object-contain drop-shadow-[0_7px_12px_rgba(15,23,42,0.16)] ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

function StatTileLight({
  icon: Icon,
  iconSrc,
  label,
  value,
  iconBg = 'bg-emerald-50',
  iconColor = 'text-emerald-600',
  valueColor,
}: {
  icon: React.ElementType;
  iconSrc?: string;
  label: string;
  value: string;
  iconBg?: string;
  iconColor?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-[20px] p-4 flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] shadow-[0_12px_30px_rgba(15,23,42,0.05)] cursor-default">
      <span className="text-xs font-semibold text-slate-500 mb-1">{label}</span>
      <span className={`text-2xl font-extrabold tabular-nums leading-none ${valueColor || 'text-[#0f172a]'}`}>{value}</span>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} mt-2`}>
        <ProfileImageIcon src={iconSrc} alt={label} size={36} fallback={<Icon className={`h-4 w-4 ${iconColor}`} />} />
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm font-medium text-slate-500">
      {children}
    </div>
  );
}

const METAB_CSS = `
  .metab-stadium-bg {
    background-image:
      linear-gradient(180deg, rgba(248,251,255,0.35) 0%, rgba(246,248,251,0.75) 60%, rgba(255,255,255,0.96) 100%),
      url('/assets/player-profile/stadium-light-bg.svg');
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
  }
  .metab-glass {
    background: rgba(255,255,255,0.86);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(255,255,255,0.72);
    box-shadow: 0 24px 60px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.70);
  }
  @supports not (backdrop-filter: blur(18px)) {
    .metab-glass { background: rgba(255,255,255,0.96); }
  }
  .metab-avatar-ring {
    box-shadow: 0 14px 30px rgba(15,23,42,0.12);
  }
  .metab-bar-animate {
    transition: width 1s cubic-bezier(0.22, 0.61, 0.36, 1);
  }
  .metab-btn-glass {
    background: rgba(255,255,255,0.72);
    border: 1px solid rgba(255,255,255,0.9);
    box-shadow: 0 10px 28px rgba(15,23,42,0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  @supports not (backdrop-filter: blur(12px)) {
    .metab-btn-glass { background: rgba(255,255,255,0.96); }
  }
  .metab-btn-glass:hover { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(15,23,42,0.12); }
  .metab-btn-glass:active { transform: scale(0.95); }
  .metab-green-btn {
    background: #16a34a;
    box-shadow: 0 10px 26px rgba(22,163,74,0.20);
  }
  .metab-green-btn:hover { background: #15803d; transform: translateY(-1px); }
  .metab-green-btn:active { transform: scale(0.98); }
  .font-display { font-family: 'Bebas Neue', cursive; }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .metab-tab-enter {
    animation: fadeIn 0.3s ease-out;
  }
  .metab-header-decor {
    opacity: 0.5;
    pointer-events: none;
    user-select: none;
  }
`;

export default function MeTab({ onLogout, onAdminLogin }: MeTabProps) {
  const { user, wallet } = useGameContext();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([]);
  const [tournamentBets, setTournamentBets] = useState<TournamentBet[]>([]);
  const [tournamentMarkets, setTournamentMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setRefreshing] = useState(false);
  const [cardInventory, setCardInventory] = useState<any>(null);
  const [sharing, setSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [profileSummary, setProfileSummary] = useState<UserProfileSummary | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleShareCard = async () => {
    if (!shareCardRef.current || sharing) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `worldcup-profile-${user?.displayName || 'player'}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Failed to generate profile share card', e);
    } finally {
      setSharing(false);
    }
  };

  const loadProfileCenter = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);

    try {
      const [txsData, predictionsData, tournamentPayload, cardData, profileSummaryData] = await Promise.all([
        withTimeout(apiRequest('/api/me/transactions'), [] as Transaction[]),
        withTimeout(apiRequest('/api/predictions/me'), [] as PredictionWithMatch[]),
        withTimeout(apiRequest('/api/tournament-bets'), { bets: [] as TournamentBet[] }),
        withTimeout(apiRequest('/api/cards/inventory'), null).catch(() => null),
        withTimeout(apiRequest('/api/me/profile-summary'), null).catch(() => null),
      ]);

      setTransactions(txsData || []);
      setPredictions(predictionsData || []);
      setTournamentBets(tournamentPayload?.bets || []);
      setTournamentMarkets(tournamentPayload?.markets || []);
      setCardInventory(cardData);
      setProfileSummary(profileSummaryData);
    } catch (error) {
      console.error('Failed to load me center data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfileCenter();
  }, []);

  const stats = useMemo(() => {
    const settled = predictions.filter((item) => item.status === 'WON' || item.status === 'LOST');
    const wins = settled.filter((item) => item.status === 'WON');
    const hitRate = settled.length > 0 ? Math.round((wins.length / settled.length) * 100) : 0;
    const netProfit = settled.reduce((sum, item) => sum + (item.settledProfit || 0), 0);
    const biggestWin = wins.reduce((max, item) => Math.max(max, item.settledProfit || 0), 0);

    const ordered = [...settled].sort(
      (a, b) => new Date(a.settledAt || a.placedAt).getTime() - new Date(b.settledAt || b.placedAt).getTime(),
    );

    let currentStreak = 0;
    let maxStreak = 0;
    for (const item of ordered) {
      if (item.status === 'WON') {
        currentStreak += 1;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return {
      hitRate,
      netProfit,
      maxStreak,
      biggestWin,
      totalPredictions: predictions.length,
      settledCount: settled.length,
      wonCount: wins.length,
      longTermCount: tournamentBets.length,
      currentStreak,
    };
  }, [predictions, tournamentBets]);

  const recentSettlements = useMemo(
    () =>
      predictions
        .filter((item) => item.status === 'WON' || item.status === 'LOST')
        .sort((a, b) => (b.settledAt || b.placedAt).localeCompare(a.settledAt || a.placedAt))
        .slice(0, 5),
    [predictions],
  );

  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);

  const safeProfileSummary: UserProfileSummary = profileSummary || {
    currentTitle: '群聊新星',
    featuredBadge: null,
    achievementBadges: [],
    achievementProgress: [],
    badges: [],
    rareUnlockedCount: 0,
    totalBadgeCount: 0,
  };

  const unlockedBadges = useMemo(
    () => safeProfileSummary.achievementBadges.filter((item) => item.unlocked),
    [safeProfileSummary],
  );

  const upcomingBadges = useMemo(
    () =>
      [...safeProfileSummary.achievementProgress]
        .filter((item) => !item.unlocked)
        .sort((a, b) => getProgressPercent(b) - getProgressPercent(a)),
    [safeProfileSummary],
  );

  const allBadges = useMemo(
    () => safeProfileSummary.badges || [...unlockedBadges, ...upcomingBadges],
    [safeProfileSummary, unlockedBadges, upcomingBadges],
  );

  const totalBadgeCount = safeProfileSummary.totalBadgeCount || allBadges.length || unlockedBadges.length + upcomingBadges.length;
  const badgeGroups = useMemo(() => groupBadgesByCategory(allBadges), [allBadges]);
  const badgeCategoryOrder = useMemo(
    () => Object.keys(badgeGroups).sort((a, b) => {
      const first = badgeGroups[a]?.[0]?.sortOrder ?? 999;
      const second = badgeGroups[b]?.[0]?.sortOrder ?? 999;
      return first - second;
    }),
    [badgeGroups],
  );

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4 bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-bold text-slate-500">正在整理你的战绩档案...</p>
      </div>
    );
  }

  // 等级系统：基于净收益阈值，只升不降
  const gameNetProfit = (wallet?.balance || 0) - (wallet?.initialPoints || 10000);
  const currentLevel = getLevelByNetProfit(gameNetProfit);
  const nextLevel = LEVEL_CONFIGS.find(l => l.level === currentLevel.level + 1);
  const levelProgress = nextLevel
    ? Math.min(100, Math.max(0, ((gameNetProfit - currentLevel.minNetProfit) / (nextLevel.minNetProfit - currentLevel.minNetProfit)) * 100))
    : 100;

  return (
    <div className="relative min-h-screen text-[#111827]" style={{ overflow: 'hidden' }}>
      {/* 全宽背景层 */}
      <div className="absolute inset-0 pointer-events-none -mx-4 sm:mx-0" style={{
        background: 'radial-gradient(circle at 20% 0%, rgba(34,197,94,0.10), transparent 30%), radial-gradient(circle at 85% 10%, rgba(59,130,246,0.12), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #f6f8fb 42%, #ffffff 100%)',
      }} />
      <style>{METAB_CSS}</style>

      {/* ===== 浅色体育场 Header 全宽 ===== */}
      <header className="metab-stadium-bg relative flex flex-col items-center justify-start pt-2 pb-8 -mx-4 sm:mx-0 sm:rounded-t-2xl">
        <div ref={shareCardRef} className="relative z-10 w-full max-w-xl px-4">
          {/* 右上角装饰: 奖杯 + 足球 */}
          <div className="metab-header-decor absolute right-6 top-6 flex flex-col items-end gap-1">
            <img src={`${PROFILE_ASSETS_BASE}/worldcup-trophy.svg`} alt="" className="w-16 h-auto drop-shadow-[0_6px_14px_rgba(217,119,6,0.15)]" />
            <img src={`${PROFILE_ASSETS_BASE}/football.svg`} alt="" className="w-11 h-auto mt-1 opacity-70 drop-shadow-[0_4px_10px_rgba(15,23,42,0.1)]" />
          </div>

          {/* 毛玻璃资料主卡 */}
          <div className="metab-glass w-full rounded-[28px] px-5 py-5 relative z-10">
            {/* 上半: 头像 + 信息 */}
            <div className="flex items-start gap-4">
              {/* 头像 92px */}
              <div className="relative shrink-0">
                <div className="avatar-box w-[92px] h-[92px] rounded-full border-4 border-white/90 overflow-hidden metab-avatar-ring bg-gradient-to-br from-emerald-50 to-emerald-100">
                  <SmartAvatar
                    name={user?.displayName || '世界杯玩家'}
                    src={user?.avatarUrl}
                    size={92}
                    className="w-full h-full"
                  />
                </div>
                {/* 认证角标 */}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-[3px] border-white flex items-center justify-center shadow-sm">
                  <svg width="12" height="12" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                </div>
              </div>

              {/* 信息区 */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[28px] font-extrabold leading-none tracking-tight text-[#0f172a]">{user?.displayName || '世界杯玩家'}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-50 to-sky-50 text-[10px] font-bold text-slate-500 px-2 py-0.5 border border-slate-200/60">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    {safeProfileSummary.featuredBadge?.label || '新星'}
                  </span>
                </div>
                {/* 称号标签 */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="tag-worldcup inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold">
                    <Award className="h-3 w-3 text-emerald-600" />
                    {safeProfileSummary.currentTitle}
                  </span>
                  {safeProfileSummary.featuredBadge && (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[safeProfileSummary.featuredBadge.tone]}`}>
                      {safeProfileSummary.featuredBadge.icon} {safeProfileSummary.featuredBadge.label}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs font-medium text-slate-500 line-clamp-1">{getTitleCopy(safeProfileSummary.currentTitle)}</p>
              </div>
            </div>

            {/* 分割线 */}
            <div className="mt-4 border-t border-slate-100"></div>

            {/* 下半: 积分 / 净收益 / 等级进度 */}
            <div className="mt-4 flex items-center gap-6">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none">当前积分</p>
                <p className="mt-0.5 text-[26px] font-extrabold leading-none tabular-nums text-[#0f172a]">{formatCompact(wallet?.balance)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none">净收益</p>
                <p className={`mt-0.5 text-[22px] font-extrabold leading-none tabular-nums ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatSigned(stats.netProfit)}</p>
              </div>
              <div className="flex-1 min-w-0 pl-3 border-l border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-bold tracking-wider whitespace-nowrap ${currentLevel.color}`}>
                    Lv.{currentLevel.level} {currentLevel.label}
                  </span>
                  {nextLevel && (
                    <span className="text-[10px] font-bold tabular-nums text-slate-400">{Math.round(levelProgress)}%</span>
                  )}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`metab-bar-animate h-full rounded-full bg-gradient-to-r ${currentLevel.barGradient}`}
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        </header>

      {/* ===== 内容区 居中 ===== */}
      <div className="relative z-20 mx-auto max-w-xl space-y-3.5 pt-2">

        {/* ===== Tab 导航 (底部下划线 active) ===== */}
        <nav className="relative z-20 -mt-3 mx-4 flex items-center h-[52px] rounded-[22px] bg-white/90 border border-slate-200 px-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex items-center justify-center gap-1 h-full text-sm font-semibold transition-all duration-300 ${
                  active ? 'text-[#16a34a] font-bold' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {tab.label}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-[3px] bg-green-500 rounded-t-sm animate-[fadeIn_0.25s_ease-out]" />
                )}
              </button>
            );
          })}
        </nav>

        {activeTab === 'overview' && (
          <div className="space-y-3.5 animate-[fadeIn_0.25s_ease-out]">
            {/* 极简统计 2x2 竖排 */}
            <section className="grid grid-cols-2 gap-2.5">
              <StatTileLight icon={Target} iconSrc={STAT_ICON_SRC.hitRate} label="命中率" value={`${stats.hitRate}%`} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <StatTileLight icon={TrendingUp} iconSrc={STAT_ICON_SRC.netProfit} label="净收益" value={formatSigned(stats.netProfit)} iconBg={stats.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'} iconColor={stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'} valueColor={stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'} />
              <StatTileLight icon={Flame} iconSrc={STAT_ICON_SRC.streak} label="最长连中" value={`${stats.maxStreak} 场`} iconBg="bg-orange-50" iconColor="text-orange-500" />
              <StatTileLight icon={Trophy} iconSrc={STAT_ICON_SRC.biggestWin} label="单场最高" value={formatCompact(stats.biggestWin)} iconBg="bg-amber-50" iconColor="text-amber-500" />
            </section>

            {/* 徽章进度 */}
            <div className="soft-card bg-white border border-slate-200 rounded-[20px] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <h3 className="text-sm font-bold text-[#0f172a]">徽章进度</h3>
                </div>
                <span className="text-xs font-bold text-emerald-600 tabular-nums">{unlockedBadges.length} / {totalBadgeCount}</span>
              </div>
              <div className="space-y-3">
                {upcomingBadges.slice(0, 3).map((badge) => (
                  <div key={badge.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-emerald-50">
                          <span className="text-sm font-extrabold text-emerald-600">{badge.icon}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{badge.label}</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 tabular-nums">{badge.current}/{badge.target}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="metab-bar-animate h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400" style={{ width: `${getProgressPercent(badge)}%` }} />
                    </div>
                  </div>
                ))}
                {upcomingBadges.length === 0 && unlockedBadges.length > 0 && (
                  <p className="text-[10px] font-semibold text-slate-400">全部徽章已点亮 🎉</p>
                )}
              </div>
            </div>

            {/* 最近战报 */}
            <div className="soft-card bg-white border border-slate-200 rounded-[20px] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <h3 className="text-sm font-bold text-[#0f172a]">最近战报</h3>
                </div>
                <button onClick={() => setActiveTab('reports')} className="text-[11px] font-semibold text-slate-400">查看全部 ›</button>
              </div>
              {recentSettlements.length === 0 ? (
                <EmptyState>还没有结算记录。</EmptyState>
              ) : (
                <div className="space-y-2">
                  {recentSettlements.slice(0, 3).map((prediction) => (
                    <SettlementRow key={prediction.id} prediction={prediction} />
                  ))}
                </div>
              )}
            </div>

            {/* 长线竞猜 */}
            <div className="soft-card bg-white border border-slate-200 rounded-[20px] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <h3 className="text-sm font-bold text-[#0f172a]">长期预测</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">查看全部 ›</span>
              </div>
              {tournamentBets.length === 0 ? (
                <EmptyState>你还没有参与长线竞猜。</EmptyState>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {tournamentBets.slice(0, 2).map((bet) => {
                    const market = tournamentMarkets.find((m: any) => m.type === bet.type);
                    return (
                      <div key={bet.id} className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-3 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                            <Trophy className="h-5 w-5 text-amber-500" strokeWidth={2} />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400">{market?.label || bet.type}</p>
                            <p className="text-xs font-bold text-[#0f172a]">{bet.targetLabel}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                          <span>投入 <strong className="text-slate-700">{bet.stakePoints}</strong></span>
                          <span>回报 <strong className="text-emerald-600">{formatCompact(bet.potentialReturn)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-3.5 metab-tab-enter">
            <section className="soft-card bg-white border border-slate-200 rounded-[20px] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <h3 className="text-sm font-bold text-[#0f172a]">最近结算</h3>
                </div>
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              {recentSettlements.length === 0 ? (
                <EmptyState>暂无结算战报。</EmptyState>
              ) : (
                <div className="space-y-2">
                  {recentSettlements.map((prediction) => (
                    <SettlementRow key={prediction.id} prediction={prediction} />
                  ))}
                </div>
              )}
            </section>

            <section className="soft-card bg-white border border-slate-200 rounded-[20px] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <h3 className="text-sm font-bold text-[#0f172a]">积分流水</h3>
                </div>
                <Layers3 className="h-4 w-4 text-cyan-600" />
              </div>
              <TransactionList transactions={recentTransactions} />
            </section>
          </div>
        )}

        {activeTab === 'badges' && (
          <section className="soft-card bg-white border border-slate-200 rounded-[20px] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)] metab-tab-enter">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-sm font-bold text-[#0f172a]">徽章雷达</h3>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  已解锁 {unlockedBadges.length} / {totalBadgeCount} 枚 · 稀有以上 {safeProfileSummary.rareUnlockedCount || 0} 枚
                </p>
              </div>
              <BadgeCheck className="h-5 w-5 text-emerald-600" />
            </div>

            {safeProfileSummary.featuredBadge && (
              <div className="mb-3 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <ProfileImageIcon src={getBadgeImageSrc(safeProfileSummary.featuredBadge)} alt={safeProfileSummary.featuredBadge.label} size={38} fallback={<span className="text-xl">{safeProfileSummary.featuredBadge.icon}</span>} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">代表徽章</p>
                    <p className="mt-0.5 text-sm font-black text-slate-950">{safeProfileSummary.featuredBadge.label}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-slate-500">{safeProfileSummary.featuredBadge.description}</p>
                  </div>
                  <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${getRarityClass(safeProfileSummary.featuredBadge.rarity)}`}>
                    {RARITY_LABEL[safeProfileSummary.featuredBadge.rarity || 'common']}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {badgeCategoryOrder.length === 0 ? (
                <EmptyState>暂无徽章数据。</EmptyState>
              ) : (
                badgeCategoryOrder.map((category) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-700">{CATEGORY_LABEL[category] || category}</h4>
                      <span className="text-[10px] font-bold text-slate-400">
                        {badgeGroups[category].filter((badge) => badge.unlocked).length}/{badgeGroups[category].length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {badgeGroups[category].map((badge) => (
                        <BadgeCard key={badge.id} badge={badge} unlocked={badge.unlocked} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === 'items' && (
          <div className="space-y-3.5 metab-tab-enter">
            <section className="soft-card bg-white border border-slate-200 rounded-[20px] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>
                  <h3 className="text-sm font-bold text-[#0f172a]">道具卡</h3>
                </div>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
              <CardInventoryGrid cardInventory={cardInventory} />
            </section>

            <section className="soft-card bg-white border border-slate-200 rounded-[20px] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  <h3 className="text-sm font-bold text-[#0f172a]">长线竞猜</h3>
                </div>
                <ProfileImageIcon src={STAT_ICON_SRC.predictionTicket} alt="长线竞猜" size={24} fallback={<Ticket className="h-4 w-4 text-amber-500" />} />
              </div>
              <TournamentBetStrip tournamentBets={tournamentBets} tournamentMarkets={tournamentMarkets} expanded />
            </section>

            {onAdminLogin && (
              <button
                onClick={onAdminLogin}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 active:scale-[0.98] transition"
              >
                <ShieldCheck className="h-4 w-4" />
                管理后台
              </button>
            )}
          </div>
        )}

      </div>

        {/* 底部操作栏 */}
        <div className="relative z-10 mx-auto max-w-xl flex gap-3 pt-1 pb-2 px-4">
          <button
            onClick={handleShareCard}
            disabled={sharing}
            className="metab-green-btn flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {sharing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            保存战绩图
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-6 py-3.5 text-sm font-semibold text-slate-500 hover:text-rose-600 hover:border-rose-200 transition active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </div>
    </div>
  );
}

function SettlementRow({ prediction }: { prediction: PredictionWithMatch; key?: React.Key }) {
  const isWin = prediction.status === 'WON';
  const homeFlag = prediction.match?.homeTeam?.flagCode || '⚽';
  const awayFlag = prediction.match?.awayTeam?.flagCode || '⚽';
  return (
    <div className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 transition cursor-default ${
      isWin ? 'bg-slate-50/80 hover:bg-emerald-50/50' : 'bg-slate-50/80 hover:bg-rose-50/30'
    }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xl leading-none">{homeFlag}</span>
        <span className="text-sm font-bold tabular-nums text-[#0f172a] min-w-[32px] text-center">
          {prediction.match?.homeScore ?? '-'} : {prediction.match?.awayScore ?? '-'}
        </span>
        <span className="text-xl leading-none">{awayFlag}</span>
        <span className={`inline-flex items-center ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isWin ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
        }`}>
          {isWin ? '命中' : '未中'}
        </span>
      </div>
      <span className={`text-sm font-bold tabular-nums shrink-0 ml-2 ${Number(prediction.settledProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
        {formatSigned(prediction.settledProfit || 0)}
      </span>
    </div>
  );
}

function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <EmptyState>暂无积分流水。</EmptyState>;
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div key={tx.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">{tx.note}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(tx.createdAt)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-sm font-black ${tx.amount >= 0 ? 'text-emerald-700' : 'text-slate-700'}`}>{formatSigned(tx.amount)}</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">{formatCompact(tx.balanceAfter)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgeCard({ badge, unlocked = false }: { badge: AchievementBadgeSummary; unlocked?: boolean; key?: React.Key }) {
  const progress = getProgressPercent(badge);
  const polarityLabel = badge.polarity === 'negative' ? '反向公开' : badge.polarity === 'funny' ? '名场面' : '成就';
  return (
    <div className={`rounded-2xl border p-3 transition ${unlocked ? 'border-emerald-100 bg-emerald-50/70' : 'border-slate-100 bg-slate-50 opacity-80'}`}>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-white/70">
          <ProfileImageIcon src={getBadgeImageSrc(badge)} alt={badge.label} size={32} fallback={<span className="text-lg">{badge.icon}</span>} />
        </div>
        <div className="min-w-0">
          <span className={`inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-[11px] font-black ${TONE_CLASS[badge.tone]}`}>
            {badge.label}
          </span>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${getRarityClass(badge.rarity)}`}>
              {RARITY_LABEL[badge.rarity || 'common']}
            </span>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${badge.polarity === 'negative' ? 'bg-rose-50 text-rose-600' : badge.polarity === 'funny' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {polarityLabel}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{badge.description}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
          <div className={`h-full rounded-full ${unlocked ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-slate-300'}`} style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] font-black text-slate-400">{badge.current}/{badge.target}</span>
      </div>
    </div>
  );
}

function CardInventoryGrid({ cardInventory }: { cardInventory: any }) {
  if (!cardInventory?.definitions?.length) {
    return <EmptyState>暂无道具卡，后续活动会继续发放。</EmptyState>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {cardInventory.definitions.map((def: any) => {
        const count = cardInventory.cards?.[def.id] || 0;
        const cardIconSrc = CARD_ICON_SRC[def.id] || CARD_ICON_SRC[String(def.id).toUpperCase()] || CARD_ICON_SRC[String(def.id).toLowerCase()];
        return (
          <div key={def.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                <ProfileImageIcon src={cardIconSrc} alt={def.shortLabel || def.label} size={32} fallback={<span className="text-xl">{def.icon}</span>} />
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${count > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                x{count}
              </span>
            </div>
            <p className="mt-2 text-sm font-black text-slate-900">{def.shortLabel || def.label}</p>
            <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-500">{def.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function TournamentBetStrip({
  tournamentBets,
  tournamentMarkets,
  expanded = false,
}: {
  tournamentBets: TournamentBet[];
  tournamentMarkets: any[];
  expanded?: boolean;
}) {
  if (tournamentBets.length === 0) {
    return <EmptyState>你还没有参与长线竞猜。</EmptyState>;
  }

  const bets = expanded ? tournamentBets : tournamentBets.slice(0, 2);
  return (
    <div className="space-y-2">
      {bets.map((bet) => {
        const market = tournamentMarkets.find((m: any) => m.type === bet.type);
        const option = market?.options?.find((o: any) => o.id === bet.targetId);
        return (
          <div key={bet.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
            <div className="relative shrink-0">
              {option?.avatarUrl ? (
                <img
                  src={option.avatarUrl}
                  alt={bet.targetLabel}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-slate-500 ring-1 ring-slate-200 ${option?.avatarUrl ? 'hidden' : ''}`}>
                {bet.targetLabel.charAt(0)}
              </div>
              {option?.flagCode && (
                <div className="absolute -bottom-0.5 -right-0.5">
                  <FlagBadge flagCode={option.flagCode} size="sm" className="!h-4 !w-4 !border-white/80" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900">{(bet as any).marketLabel || market?.label || bet.type}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                {bet.targetLabel}
                {bet.targetSubLabel ? ` · ${bet.targetSubLabel}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black text-slate-900">{formatCompact(bet.potentialReturn)}</p>
              <p className="mt-0.5 text-[10px] font-bold text-slate-400">{bet.stakePoints} PTS</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
