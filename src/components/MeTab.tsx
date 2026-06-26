/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  Award,
  BadgeCheck,
  Download,
  Gift,
  Layers3,
  LogOut,
  Medal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
} from 'lucide-react';
import { AchievementBadgeSummary, Prediction, TournamentBet, Transaction, UserProfileSummary } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import SmartAvatar from './SmartAvatar';
import FlagBadge from './home/FlagBadge';
import { useGameContext } from './GameContext';
import { getLevelByNetProfit, LEVEL_CONFIGS } from '../server/config';
import './profile/profileStyles.css';
import NetProfitChart from './profile/NetProfitChart';
import BadgeDetailModal from './profile/BadgeDetailModal';

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

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: 'overview', label: '总览' },
  { id: 'reports', label: '战报' },
  { id: 'badges', label: '徽章' },
  { id: 'items', label: '道具' },
];

const PROFILE_ICON_BASE = '/profile-icons';

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

// SVG 等级环常量
const LEVEL_RING_R = 22;
const LEVEL_RING_C = 2 * Math.PI * LEVEL_RING_R; // ≈138.23

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
    case '稳健分析师': return '判断稳定，适合做群里的稳盘参考。';
    case '连红猎手': return '最近手感正在升温，连中节奏值得关注。';
    case '冷门先知': return '擅长捕捉赔率背后的反差机会。';
    case '金杯投资人': return '收益曲线领先，已经打出资产感。';
    case '世界杯老炮': return '参与够深，经验值正在持续累积。';
    case '传奇球王': return '收益和命中双线封神，群聊顶级身份已坐实。';
    case '全胜将军': return '连红气势拉满，最近每一手都有压迫感。';
    case '比分之王': return '能把比分猜到点上，属于真正的预言家流派。';
    case '新晋黑马': return '近况突然起飞，短期收益曲线很有冲击力。';
    case '知识达人': return '不只会下注，世界杯知识储备也很能打。';
    case '明灯本灯': return '群聊反向风向标上线，节目效果已经拉满。';
    case '慈善赌王': return '娱乐精神很足，群聊名场面贡献值很高。';
    case '破产兄弟': return '低谷不丢人，下一场就是翻身局。';
    default: return '新一轮竞猜征程已经开启。';
  }
}

function getProgressPercent(item: AchievementBadgeSummary) {
  if (item.target <= 0) return 0;
  return Math.min(100, Math.round((item.current / item.target) * 100));
}

function getBadgeImageSrc(badge: AchievementBadgeSummary) {
  return BADGE_ICON_SRC[badge.id];
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
      .then((value) => { window.clearTimeout(timer); resolve(value); })
      .catch(() => { window.clearTimeout(timer); resolve(fallback); });
  });
}

function ProfileImageIcon({
  src, alt, size = 32, fallback, className = '',
}: { src?: string; alt: string; size?: number; fallback?: React.ReactNode; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className={`inline-flex items-center justify-center rounded-full bg-white/80 text-slate-500 ring-1 ring-slate-200 ${className}`}
        style={{ width: size, height: size }} aria-label={alt}>{fallback}</span>
    );
  }
  return (
    <img src={src} alt={alt} width={size} height={size} loading="lazy"
      className={`shrink-0 object-contain drop-shadow-[0_7px_12px_rgba(15,23,42,0.16)] ${className}`}
      style={{ width: size, height: size }} onError={() => setFailed(true)} />
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm font-medium text-slate-500">
      {children}
    </div>
  );
}

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
  const [showAllSettlements, setShowAllSettlements] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadgeSummary | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleShareCard = async () => {
    if (!shareCardRef.current || sharing) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#f0f9ff',
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

  useEffect(() => { loadProfileCenter(); }, []);

  const stats = useMemo(() => {
    const settled = predictions.filter((item) => item.status === 'WON' || item.status === 'LOST');
    const wins = settled.filter((item) => item.status === 'WON');
    const hitRate = settled.length > 0 ? Math.round((wins.length / settled.length) * 100) : 0;
    const netProfit = settled.reduce((sum, item) => sum + (item.settledProfit || 0), 0);
    const biggestWin = wins.reduce((max, item) => Math.max(max, item.settledProfit || 0), 0);
    const ordered = [...settled].sort((a, b) =>
      new Date(a.settledAt || a.placedAt).getTime() - new Date(b.settledAt || b.placedAt).getTime());
    let currentStreak = 0;
    let maxStreak = 0;
    for (const item of ordered) {
      if (item.status === 'WON') { currentStreak += 1; maxStreak = Math.max(maxStreak, currentStreak); }
      else { currentStreak = 0; }
    }
    return { hitRate, netProfit, maxStreak, biggestWin, totalPredictions: predictions.length,
      settledCount: settled.length, wonCount: wins.length, longTermCount: tournamentBets.length, currentStreak };
  }, [predictions, tournamentBets]);

  const recentSettlements = useMemo(() =>
    predictions.filter((item) => item.status === 'WON' || item.status === 'LOST')
      .sort((a, b) => (b.settledAt || b.placedAt).localeCompare(a.settledAt || a.placedAt)), [predictions]);

  const recentTransactions = useMemo(() => transactions, [transactions]);

  const safeProfileSummary: UserProfileSummary = profileSummary || {
    currentTitle: '群聊新星', featuredBadge: null, achievementBadges: [], achievementProgress: [],
    badges: [], rareUnlockedCount: 0, totalBadgeCount: 0,
  };

  const unlockedBadges = useMemo(() => safeProfileSummary.achievementBadges.filter((item) => item.unlocked), [safeProfileSummary]);
  const upcomingBadges = useMemo(() =>
    [...safeProfileSummary.achievementProgress].filter((item) => !item.unlocked)
      .sort((a, b) => getProgressPercent(b) - getProgressPercent(a)), [safeProfileSummary]);
  const allBadges = useMemo(() => safeProfileSummary.badges || [...unlockedBadges, ...upcomingBadges],
    [safeProfileSummary, unlockedBadges, upcomingBadges]);
  const totalBadgeCount = safeProfileSummary.totalBadgeCount || allBadges.length || unlockedBadges.length + upcomingBadges.length;
  const badgeGroups = useMemo(() => groupBadgesByCategory(allBadges), [allBadges]);
  const badgeCategoryOrder = useMemo(() =>
    Object.keys(badgeGroups).sort((a, b) => {
      const first = badgeGroups[a]?.[0]?.sortOrder ?? 999;
      const second = badgeGroups[b]?.[0]?.sortOrder ?? 999;
      return first - second;
    }), [badgeGroups]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4 profile-page-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        <p className="text-xs font-bold text-slate-500">正在整理你的战绩档案...</p>
      </div>
    );
  }

  // 等级系统
  const gameNetProfit = (wallet?.balance || 0) - (wallet?.initialPoints || 10000);
  const currentLevel = getLevelByNetProfit(gameNetProfit);
  const nextLevel = LEVEL_CONFIGS.find(l => l.level === currentLevel.level + 1);
  const levelProgress = nextLevel
    ? Math.min(100, Math.max(0, ((gameNetProfit - currentLevel.minNetProfit) / (nextLevel.minNetProfit - currentLevel.minNetProfit)) * 100))
    : 100;
  const levelDashOffset = LEVEL_RING_C * (1 - levelProgress / 100);

  return (
    <div className="relative min-h-screen text-[#111827] profile-page-bg">

      {/* ═══════════ HEADER 区 ═══════════ */}
      <div ref={shareCardRef} className="relative z-10 pt-7 pb-5 px-4">
        {/* 标题行 */}
        <div className="flex items-center justify-between mb-[18px] max-w-xl mx-auto">
          <span className="text-[13px] font-bold text-slate-500 tracking-[0.06em] uppercase">个人资料</span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50/80 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            在线
          </span>
        </div>

        {/* 主身份卡 glass-1 */}
        <div className="glass-1 rounded-[22px] px-[18px] py-5 max-w-xl mx-auto">
          {/* 上半：头像 + 信息 + 等级环 */}
          <div className="flex items-center gap-3.5">
            {/* 头像 72px + conic 光环 */}
            <div className="relative shrink-0">
              <div className="avatar-conic-ring" />
              <div className="avatar-dash-ring" />
              <div className="avatar-img-wrap w-[72px] h-[72px] border-[3px] border-white/90">
                <SmartAvatar name={user?.displayName || '世界杯玩家'} src={user?.avatarUrl} size={72} className="w-full h-full" />
              </div>
              {/* 认证角标 */}
              <div className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 border-2 border-white flex items-center justify-center shadow-[0_2px_6px_rgba(14,165,233,0.35)] z-10">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            {/* 信息区 */}
            <div className="min-w-0 flex-1">
              <div className="text-xl font-extrabold text-[#0f172a] tracking-[-0.02em] leading-tight">
                {user?.displayName || '世界杯玩家'}
              </div>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-violet-700 bg-gradient-to-r from-violet-50/80 to-sky-50/80 rounded-full px-2.5 py-0.5 border border-violet-100/60">
                ⚡ {safeProfileSummary.currentTitle}
              </div>
              {/* 积分 + 净收益 */}
              <div className="flex items-center gap-4 mt-[6px]">
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">积分</span>
                  <span className="text-[17px] font-extrabold text-[#0f172a] leading-none">{formatCompact(wallet?.balance)}</span>
                </div>
                <div className="w-px h-5 bg-slate-200 rounded-full" />
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">净收益</span>
                  <span className={`text-[15px] font-bold leading-none ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {formatSigned(stats.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* 圆形等级进度环 */}
            <div className="shrink-0 flex flex-col items-center gap-[3px]">
              <div className="relative w-[56px] h-[56px]">
                <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="levelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle className="level-ring-bg" cx="28" cy="28" r={LEVEL_RING_R} />
                  <circle className="level-ring-fill" cx="28" cy="28" r={LEVEL_RING_R}
                    strokeDasharray={LEVEL_RING_C} strokeDashoffset={levelDashOffset} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-[#0f172a] leading-none">Lv{currentLevel.level}</span>
                  <span className="text-[9px] font-semibold text-slate-500 leading-tight">{currentLevel.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 列统计横条 */}
          <div className="stat-strip mt-3.5">
            <div className="stat-strip-cell">
              <div className="stat-strip-val">{stats.hitRate}%</div>
              <div className="stat-strip-lbl">命中率</div>
            </div>
            <div className="stat-strip-cell">
              <div className="stat-strip-val">{stats.maxStreak}连</div>
              <div className="stat-strip-lbl">最长连中</div>
            </div>
            <div className="stat-strip-cell">
              <div className="stat-strip-val">{formatSigned(stats.biggestWin)}</div>
              <div className="stat-strip-lbl">单场最高</div>
            </div>
            <div className="stat-strip-cell">
              <div className="stat-strip-val">{stats.totalPredictions}场</div>
              <div className="stat-strip-lbl">竞猜场次</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ TAB 导航 ═══════════ */}
      <div className="relative z-20 px-4 -mt-2.5 max-w-xl mx-auto">
        <nav className="profile-tab-nav-v2 sticky top-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`profile-tab-btn-v2 ${active ? 'active-v2' : ''}`}>
                <span className="tab-dot" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ═══════════ 内容区 ═══════════ */}
      <div className="relative z-20 mx-auto max-w-xl px-4 space-y-3 pt-3 pb-3">

        {/* ── 总览 Tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-3 metab-tab-enter">
            {/* 代表徽章 3 列 */}
            {unlockedBadges.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-[13px] font-bold text-slate-600 tracking-[0.02em]">代表徽章</h3>
                  <span className="text-[11px] font-semibold text-slate-400">{unlockedBadges.length} / {totalBadgeCount}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {unlockedBadges.slice(0, 6).map((badge) => (
                    <BadgeMini key={badge.id} badge={badge} unlocked onClick={() => setSelectedBadge(badge)} />
                  ))}
                </div>
              </div>
            )}

            {/* 最近战报 */}
            <div className="glass-2 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <h3 className="text-[13px] font-bold text-slate-600">最近战报</h3>
                </div>
                <button onClick={() => setActiveTab('reports')} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition">查看全部 ›</button>
              </div>
              {recentSettlements.length === 0 ? (
                <EmptyState>还没有结算记录。</EmptyState>
              ) : (
                <div className="flex flex-col gap-1">
                  {recentSettlements.slice(0, 3).map((prediction) => (
                    <SettlementRow key={prediction.id} prediction={prediction} />
                  ))}
                </div>
              )}
            </div>

            {/* 即将解锁 */}
            {upcomingBadges.length > 0 && (
              <div className="glass-2 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <h3 className="text-[13px] font-bold text-slate-600">即将解锁</h3>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {upcomingBadges.slice(0, 3).map((badge) => (
                    <BadgeMini key={badge.id} badge={badge} unlocked={false} onClick={() => setSelectedBadge(badge)} />
                  ))}
                </div>
              </div>
            )}

            {/* 长期预测 */}
            <div className="glass-2 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-[15px] w-[15px] text-amber-500" strokeWidth={2.5} />
                  <h3 className="text-[13px] font-bold text-slate-600">长期预测</h3>
                </div>
              </div>
              {tournamentBets.length === 0 ? (
                <EmptyState>你还没有参与长线竞猜。</EmptyState>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {tournamentBets.slice(0, 2).map((bet) => {
                    const market = tournamentMarkets.find((m: any) => m.type === bet.type);
                    return (
                      <div key={bet.id} className="tournament-card">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                            <Trophy className="h-4 w-4 text-amber-500" strokeWidth={2} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 truncate">{market?.label || bet.type}</p>
                            <p className="text-xs font-bold text-[#0f172a] truncate">{bet.targetLabel}</p>
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

        {/* ── 战报 Tab ── */}
        {activeTab === 'reports' && (
          <div className="space-y-3 metab-tab-enter">
            <NetProfitChart transactions={transactions} />

            <div className="glass-2 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <h3 className="text-[13px] font-bold text-slate-600">最近结算</h3>
                </div>
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              {recentSettlements.length === 0 ? (
                <EmptyState>暂无结算战报。</EmptyState>
              ) : (
                <div className="flex flex-col gap-1">
                  {(showAllSettlements ? recentSettlements : recentSettlements.slice(0, 5)).map((prediction) => (
                    <SettlementRow key={prediction.id} prediction={prediction} />
                  ))}
                  {!showAllSettlements && recentSettlements.length > 5 && (
                    <button onClick={() => setShowAllSettlements(true)}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition active:scale-[0.98]">
                      加载更多（共 {recentSettlements.length} 条）
                    </button>
                  )}
                  {showAllSettlements && recentSettlements.length > 5 && (
                    <button onClick={() => setShowAllSettlements(false)}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition active:scale-[0.98]">
                      收起
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="glass-2 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <h3 className="text-[13px] font-bold text-slate-600">积分流水</h3>
                </div>
                <Layers3 className="h-4 w-4 text-cyan-500" />
              </div>
              {recentTransactions.length === 0 ? (
                <EmptyState>暂无积分流水。</EmptyState>
              ) : (
                <>
                  <TransactionList transactions={showAllTransactions ? recentTransactions : recentTransactions.slice(0, 6)} />
                  {!showAllTransactions && recentTransactions.length > 6 && (
                    <button onClick={() => setShowAllTransactions(true)}
                      className="w-full mt-3 rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition active:scale-[0.98]">
                      加载更多（共 {recentTransactions.length} 条）
                    </button>
                  )}
                  {showAllTransactions && recentTransactions.length > 6 && (
                    <button onClick={() => setShowAllTransactions(false)}
                      className="w-full mt-3 rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition active:scale-[0.98]">
                      收起
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 徽章 Tab ── */}
        {activeTab === 'badges' && (
          <div className="glass-2 rounded-2xl p-4 metab-tab-enter">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[13px] font-bold text-slate-600">徽章雷达</h3>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                  已解锁 {unlockedBadges.length} / {totalBadgeCount} 枚 · 稀有以上 {safeProfileSummary.rareUnlockedCount || 0} 枚
                </p>
              </div>
              <BadgeCheck className="h-5 w-5 text-emerald-500" />
            </div>

            {safeProfileSummary.featuredBadge && (
              <div className="mb-3 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <ProfileImageIcon src={getBadgeImageSrc(safeProfileSummary.featuredBadge)} alt={safeProfileSummary.featuredBadge.label} size={38}
                      fallback={<span className="text-xl">{safeProfileSummary.featuredBadge.icon}</span>} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">代表徽章</p>
                    <p className="mt-0.5 text-sm font-black text-slate-950">{safeProfileSummary.featuredBadge.label}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-slate-500">{safeProfileSummary.featuredBadge.description}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black"
                    style={{
                      background: safeProfileSummary.featuredBadge.rarity === 'legendary'
                        ? 'linear-gradient(135deg,#fbbf24,#f59e0b)'
                        : safeProfileSummary.featuredBadge.rarity === 'epic'
                        ? 'linear-gradient(135deg,#a78bfa,#8b5cf6)'
                        : safeProfileSummary.featuredBadge.rarity === 'rare'
                        ? '#cffafe'
                        : '#f1f5f9',
                      color: (safeProfileSummary.featuredBadge.rarity === 'legendary' || safeProfileSummary.featuredBadge.rarity === 'epic')
                        ? '#fff'
                        : safeProfileSummary.featuredBadge.rarity === 'rare' ? '#0e7490' : '#64748b',
                    }}
                  >
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
                    <div className="grid grid-cols-3 gap-1.5">
                      {badgeGroups[category].map((badge) => (
                        <BadgeMini key={badge.id} badge={badge} unlocked={badge.unlocked} onClick={() => setSelectedBadge(badge)} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── 道具 Tab ── */}
        {activeTab === 'items' && (
          <div className="space-y-3 metab-tab-enter">
            <div className="glass-2 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                    <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/>
                  </svg>
                  <h3 className="text-[13px] font-bold text-slate-600">道具卡</h3>
                </div>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
              <CardInventoryGrid cardInventory={cardInventory} />
            </div>

            <div className="glass-2 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                  <h3 className="text-[13px] font-bold text-slate-600">长线竞猜</h3>
                </div>
                <Ticket className="h-4 w-4 text-amber-500" />
              </div>
              <TournamentBetStrip tournamentBets={tournamentBets} tournamentMarkets={tournamentMarkets} expanded />
            </div>

            {onAdminLogin && (
              <button onClick={onAdminLogin}
                className="btn-admin-glass mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-xs font-bold text-emerald-700 active:scale-[0.98]">
                <ShieldCheck className="h-4 w-4" />
                管理后台
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══════════ 底部操作栏 ═══════════ */}
      <div className="relative z-10 mx-auto max-w-xl flex gap-2.5 pt-1 pb-4 px-4">
        <button onClick={handleShareCard} disabled={sharing}
          className="btn-share-primary flex-1 flex items-center justify-center gap-2 rounded-[14px] py-3 text-[13px] font-bold disabled:opacity-50">
          {sharing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          保存战绩图
        </button>
        <button onClick={onLogout}
          className="btn-logout-glass flex items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-[13px] font-semibold text-slate-400 active:scale-[0.98]">
          <LogOut className="h-4 w-4" />
          退出
        </button>
      </div>

      <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} iconSrc={selectedBadge ? getBadgeImageSrc(selectedBadge) : undefined} />
    </div>
  );
}

/* ============================================================
 * 子组件
 * ============================================================ */

function SettlementRow({ prediction }: { prediction: PredictionWithMatch; key?: React.Key }) {
  const isWin = prediction.status === 'WON';
  const homeFlag = prediction.match?.homeTeam?.flagCode || '⚽';
  const awayFlag = prediction.match?.awayTeam?.flagCode || '⚽';
  return (
    <div className="settle-row">
      <span className="text-lg leading-none shrink-0">{homeFlag}</span>
      <span className="text-sm font-bold tabular-nums text-slate-800 min-w-[30px] text-center shrink-0">
        {prediction.match?.homeScore ?? '-'} : {prediction.match?.awayScore ?? '-'}
      </span>
      <span className="text-lg leading-none shrink-0">{awayFlag}</span>
      <span className={`inline-flex items-center ml-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
        isWin ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
      }`}>
        {isWin ? '命中' : '未中'}
      </span>
      <span className={`text-sm font-bold tabular-nums ml-auto shrink-0 ${Number(prediction.settledProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
        {formatSigned(prediction.settledProfit || 0)}
      </span>
    </div>
  );
}

function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return <EmptyState>暂无积分流水。</EmptyState>;
  return (
    <div className="divide-y divide-slate-100/60">
      {transactions.map((tx) => {
        const isPos = tx.amount >= 0;
        return (
          <div key={tx.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${isPos ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                {isPos ? '✅' : '🎯'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-700">{tx.note}</p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-400">{formatDate(tx.createdAt)}</p>
              </div>
            </div>
            <div className="shrink-0 text-right ml-3">
              <p className={`text-[13px] font-bold ${isPos ? 'text-emerald-600' : 'text-slate-600'}`}>{formatSigned(tx.amount)}</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">{formatCompact(tx.balanceAfter)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BadgeMini({ badge, unlocked = false, onClick }: {
  badge: AchievementBadgeSummary; unlocked?: boolean; key?: React.Key; onClick?: () => void;
}) {
  const progress = getProgressPercent(badge);
  const rarityClass = badge.rarity ? `badge-${badge.rarity}` : 'badge-common';
  const tone = TONE_CLASS[badge.tone] || TONE_CLASS.slate;
  return (
    <div onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${badge.label} - ${RARITY_LABEL[badge.rarity || 'common']}${unlocked ? ' 已解锁' : ' 未解锁'}`}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClick) { e.preventDefault(); onClick(); } }}
      className={`rounded-[14px] border p-2.5 transition cursor-pointer active:scale-[0.96] text-center ${rarityClass} ${!unlocked ? 'badge-locked' : ''}`}>
      <div className="profile-badge-icon-wrap mx-auto">
        <ProfileImageIcon src={getBadgeImageSrc(badge)} alt={badge.label} size={32} fallback={<span className="text-lg">{badge.icon}</span>} />
      </div>
      <p className={`mt-2 text-[11px] font-bold leading-tight line-clamp-2 ${unlocked ? 'text-slate-800' : 'text-slate-500'}`}>{badge.label}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/60">
          <div className="progress-fill h-full rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] font-bold text-slate-400 shrink-0">{badge.current}/{badge.target}</span>
      </div>
    </div>
  );
}

function CardInventoryGrid({ cardInventory }: { cardInventory: any }) {
  if (!cardInventory?.definitions?.length) {
    return <EmptyState>暂无道具卡，后续活动会继续发放。</EmptyState>;
  }
  const ITEM_GRADIENT: Record<string, string> = {
    NO_LOSS: 'item-emerald', no_loss: 'item-emerald', 'no-loss': 'item-emerald',
    DOUBLE: 'item-amber', double: 'item-amber',
    REGRET: 'item-rose', regret: 'item-rose',
    FLOOR: 'item-cyan', floor: 'item-cyan',
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {cardInventory.definitions.map((def: any) => {
        const count = cardInventory.cards?.[def.id] || 0;
        const cardIconSrc = CARD_ICON_SRC[def.id] || CARD_ICON_SRC[String(def.id).toUpperCase()] || CARD_ICON_SRC[String(def.id).toLowerCase()];
        const gradientClass = ITEM_GRADIENT[def.id] || ITEM_GRADIENT[String(def.id).toUpperCase()] || 'item-emerald';
        return (
          <div key={def.id} className={`rounded-2xl border p-3 relative overflow-hidden ${gradientClass}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-white/95 shadow-sm">
                <ProfileImageIcon src={cardIconSrc} alt={def.shortLabel || def.label} size={32} fallback={<span className="text-xl">{def.icon}</span>} />
              </div>
              {count > 0 && (
                <span className="absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[11px] font-black text-white"
                  style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>x{count}</span>
              )}
            </div>
            <p className="mt-2.5 text-sm font-black text-slate-900">{def.shortLabel || def.label}</p>
            <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-600">{def.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function TournamentBetStrip({
  tournamentBets, tournamentMarkets, expanded = false,
}: { tournamentBets: TournamentBet[]; tournamentMarkets: any[]; expanded?: boolean }) {
  if (tournamentBets.length === 0) return <EmptyState>你还没有参与长线竞猜。</EmptyState>;
  const bets = expanded ? tournamentBets : tournamentBets.slice(0, 2);
  return (
    <div className="flex flex-col gap-2">
      {bets.map((bet) => {
        const market = tournamentMarkets.find((m: any) => m.type === bet.type);
        const option = market?.options?.find((o: any) => o.id === bet.targetId);
        return (
          <div key={bet.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
            <div className="relative shrink-0">
              {option?.avatarUrl ? (
                <img src={option.avatarUrl} alt={bet.targetLabel}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
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
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{bet.targetLabel}{bet.targetSubLabel ? ` · ${bet.targetSubLabel}` : ''}</p>
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
