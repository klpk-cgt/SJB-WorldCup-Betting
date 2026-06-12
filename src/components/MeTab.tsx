/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BadgeCheck,
  Coins,
  Flame,
  LogOut,
  RefreshCw,
  Sparkles,
  Target,
  Ticket,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { AchievementBadgeSummary, Prediction, TournamentBet, Transaction } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import { buildUserProfileSummary } from '../utils/achievements';
import SmartAvatar from './SmartAvatar';
import FlagBadge from './home/FlagBadge';

interface MeTabProps {
  user: any;
  wallet: any;
  onLogout: () => void;
  onAdminLogin?: () => void;
}

type PredictionWithMatch = Prediction & { match?: any | null };

const TONE_CLASS: Record<AchievementBadgeSummary['tone'], string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  cyan: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

function formatSigned(value?: number | null) {
  if (value == null) return '0';
  if (value > 0) return `+${value.toLocaleString()}`;
  return value.toLocaleString();
}

function getPredictionTone(status: string) {
  if (status === 'WON') return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  if (status === 'LOST') return 'text-rose-700 bg-rose-50 border-rose-100';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}

function getTitleCopy(title?: string) {
  switch (title) {
    case '稳健分析师':
      return '命中率稳定、判断克制，属于群里最让人安心的下注风格。';
    case '连红猎手':
      return '连续抓红能力出色，最近的手感和节奏都在上升。';
    case '冷门先知':
      return '擅长捕捉赔率背后的反差机会，爆点常常比别人更早一步。';
    case '金杯投资人':
      return '收益长期领先，已经把娱乐竞猜打成了自己的资产曲线。';
    case '世界杯老炮':
      return '参与深、场次多，对赛事节奏和长期走势都更有经验。';
    default:
      return '已经进入本届世界杯互动局，接下来每一场都可能刷新你的身份。';
  }
}

function getProgressPercent(item: AchievementBadgeSummary) {
  if (item.target <= 0) return 0;
  return Math.min(100, Math.round((item.current / item.target) * 100));
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

export default function MeTab({ user, wallet, onLogout, onAdminLogin }: MeTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([]);
  const [tournamentBets, setTournamentBets] = useState<TournamentBet[]>([]);
  const [tournamentMarkets, setTournamentMarkets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cardInventory, setCardInventory] = useState<any>(null);

  const loadProfileCenter = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);

    try {
      const [txsData, predictionsData, tournamentPayload, cardData] = await Promise.all([
        withTimeout(apiRequest('/api/me/transactions'), [] as Transaction[]),
        withTimeout(apiRequest('/api/predictions/me'), [] as PredictionWithMatch[]),
        withTimeout(apiRequest('/api/tournament-bets'), { bets: [] as TournamentBet[] }),
        withTimeout(apiRequest('/api/cards/inventory'), null).catch(() => null),
      ]);

      setTransactions(txsData || []);
      setPredictions(predictionsData || []);
      setTournamentBets(tournamentPayload?.bets || []);
      setTournamentMarkets(tournamentPayload?.markets || []);
      setCardInventory(cardData);
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
    };
  }, [predictions, tournamentBets]);

  const recentSettlements = useMemo(
    () =>
      predictions
        .filter((item) => item.status === 'WON' || item.status === 'LOST')
        .sort((a, b) => (b.settledAt || b.placedAt).localeCompare(a.settledAt || a.placedAt))
        .slice(0, 4),
    [predictions],
  );

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  const profileSummary = useMemo(
    () =>
      buildUserProfileSummary({
        predictions,
        tournamentBets,
        transactions,
        wallet,
      }),
    [predictions, tournamentBets, transactions, wallet],
  );

  const unlockedBadges = useMemo(
    () => profileSummary.achievementBadges.filter((item) => item.unlocked),
    [profileSummary],
  );

  const upcomingBadges = useMemo(
    () =>
      [...profileSummary.achievementProgress]
        .filter((item) => !item.unlocked)
        .sort((a, b) => getProgressPercent(b) - getProgressPercent(a)),
    [profileSummary],
  );

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">正在整理你的荣誉和战绩...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-[0_20px_48px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <SmartAvatar name={user?.displayName || '世界杯玩家'} src={user?.avatarUrl} size={54} className="ring-2 ring-white/15" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">Identity Card</p>
              <h2 className="mt-2 text-2xl font-black">{user?.displayName || '世界杯玩家'}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-100 ring-1 ring-white/10">
                  {profileSummary.currentTitle}
                </span>
                {profileSummary.featuredBadge && (
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${TONE_CLASS[profileSummary.featuredBadge.tone]}`}
                  >
                    {profileSummary.featuredBadge.icon} {profileSummary.featuredBadge.label}
                  </span>
                )}
              </div>
              <p className="mt-3 max-w-[16rem] text-xs leading-6 text-slate-300">{getTitleCopy(profileSummary.currentTitle)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {onAdminLogin && (
              <button
                onClick={onAdminLogin}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs font-black text-emerald-300 transition hover:bg-emerald-500/30"
              >
                <span className="inline-flex items-center gap-1.5">
                  管理后台
                </span>
              </button>
            )}
            <button
              onClick={onLogout}
              className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/15"
            >
              <span className="inline-flex items-center gap-1.5">
                <LogOut className="h-3.5 w-3.5" />
                退出
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-white/8 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-200">
              <Coins className="h-4 w-4" />
              当前积分
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight">{wallet?.balance?.toLocaleString() || '0'}</p>
            <p className="mt-1 text-[11px] text-slate-300">娱乐积分余额</p>
          </div>

          <div className="rounded-3xl bg-white/8 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-200">
              <Target className="h-4 w-4" />
              命中率
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight">{stats.hitRate}%</p>
            <p className="mt-1 text-[11px] text-slate-300">
              已结算 {stats.settledCount} 场，命中 {stats.wonCount} 场
            </p>
          </div>

          <div className="rounded-3xl bg-white/8 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
              <TrendingUp className="h-4 w-4" />
              净收益
            </div>
            <p className={`mt-3 text-3xl font-black tracking-tight ${stats.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {formatSigned(stats.netProfit)}
            </p>
            <p className="mt-1 text-[11px] text-slate-300">按已结算单场统计</p>
          </div>

          <div className="rounded-3xl bg-white/8 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-violet-200">
              <Flame className="h-4 w-4" />
              最长连中
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight">{stats.maxStreak}</p>
            <p className="mt-1 text-[11px] text-slate-300">单场高光 {stats.biggestWin?.toLocaleString() ?? 0} PTS</p>
          </div>
        </div>

        {/* 卡牌库存 */}
        {cardInventory && cardInventory.definitions && (
          <div className="mt-3 rounded-3xl bg-white/8 p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                <Sparkles className="h-4 w-4" />
                我的道具卡
              </div>
              <span className="text-[10px] text-slate-300">下注时可用</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {cardInventory.definitions.map((def: any) => {
                const count = cardInventory.cards?.[def.id] || 0;
                return (
                  <div key={def.id} className="rounded-2xl bg-white/10 p-2 text-center ring-1 ring-white/10">
                    <div className="text-lg">{def.icon}</div>
                    <div className="mt-0.5 text-[10px] font-bold text-white">{def.shortLabel}</div>
                    <div className={`mt-1 text-base font-black ${count > 0 ? 'text-amber-200' : 'text-slate-400'}`}>×{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">称号与成就</h3>
            <p className="mt-1 text-xs text-slate-500">现在的外显身份、已解锁徽章，以及下一枚正在逼近的荣誉。</p>
          </div>
          <button
            onClick={() => loadProfileCenter(true)}
            className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="rounded-[24px] border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">Current Title</p>
                <h4 className="mt-2 text-xl font-black text-slate-900">{profileSummary.currentTitle}</h4>
                <p className="mt-2 text-xs leading-6 text-slate-600">{getTitleCopy(profileSummary.currentTitle)}</p>
              </div>
              <div className="rounded-2xl bg-white p-3 text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                <Award className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <BadgeCheck className="h-4 w-4 text-amber-500" />
                主徽章
              </div>
              {profileSummary.featuredBadge ? (
                <div className="mt-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${TONE_CLASS[profileSummary.featuredBadge.tone]}`}>
                    {profileSummary.featuredBadge.icon} {profileSummary.featuredBadge.label}
                  </span>
                  <p className="mt-2 text-xs leading-6 text-slate-500">{profileSummary.featuredBadge.description}</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">继续参与竞猜和问答，这里很快就会点亮第一枚徽章。</p>
              )}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Sparkles className="h-4 w-4 text-violet-500" />
                荣誉概览
              </div>
              <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                <div className="flex items-center justify-between">
                  <span>已解锁徽章</span>
                  <span>{unlockedBadges.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>长线参与</span>
                  <span>{stats.longTermCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>竞猜总场次</span>
                  <span>{stats.totalPredictions}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900">已解锁徽章</h4>
              <span className="text-[11px] font-medium text-slate-500">称号之外，再用徽章展示你的风格</span>
            </div>
            {unlockedBadges.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                你离第一枚徽章已经不远了，先完成一场命中或连续参与几场竞猜。
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {unlockedBadges.map((badge) => (
                  <div key={badge.id} className="rounded-[22px] border border-slate-200 bg-white p-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${TONE_CLASS[badge.tone]}`}>
                      {badge.icon} {badge.label}
                    </span>
                    <p className="mt-2 text-xs leading-6 text-slate-500">{badge.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900">即将解锁</h4>
              <span className="text-[11px] font-medium text-slate-500">把进度最靠前的几枚放在前面</span>
            </div>
            <div className="space-y-3">
              {upcomingBadges.slice(0, 4).map((badge) => (
                <div key={badge.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE_CLASS[badge.tone]}`}>
                          {badge.icon} {badge.label}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {badge.current}/{badge.target}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-slate-500">{badge.description}</p>
                    </div>
                    <span className="text-sm font-black text-slate-700">{getProgressPercent(badge)}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      style={{ width: `${getProgressPercent(badge)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">长线竞猜</h3>
            <p className="mt-1 text-xs text-slate-500">冠军、金靴、金球这些玩法更适合看整届走势。</p>
          </div>
          <Ticket className="h-4.5 w-4.5 text-emerald-600" />
        </div>

        {tournamentBets.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            你还没有参与长线竞猜，后续开放后会在竞猜页里进入。
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {tournamentBets.slice(0, 4).map((bet) => {
              const market = tournamentMarkets.find((m: any) => m.type === bet.type);
              const option = market?.options?.find((o: any) => o.id === bet.targetId);
              return (
                <div key={bet.id} className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                  {/* 头像+国旗 */}
                  <div className="relative shrink-0">
                    {option?.avatarUrl ? (
                      <img
                        src={option.avatarUrl}
                        alt={bet.targetLabel}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-black text-slate-500 ${option?.avatarUrl ? 'hidden' : ''}`}>
                      {bet.targetLabel.charAt(0)}
                    </div>
                    {option?.flagCode && (
                      <div className="absolute -right-0.5 -bottom-0.5">
                        <FlagBadge flagCode={option.flagCode} size="sm" className="!h-4 !w-4 !border-white/80" />
                      </div>
                    )}
                  </div>
                  {/* 信息 */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900">{(bet as any).marketLabel || bet.type}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {bet.targetLabel}
                      {bet.targetSubLabel ? ` · ${bet.targetSubLabel}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{bet.potentialReturn?.toLocaleString() ?? 0} PTS</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{bet.stakePoints} PTS 投入</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">最近结算</h3>
            <p className="mt-1 text-xs text-slate-500">最近几单是红是黑，一眼看清你的即时状态。</p>
          </div>
          <Trophy className="h-4.5 w-4.5 text-amber-500" />
        </div>

        {recentSettlements.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            还没有结算记录，等第一批比赛结束后这里就会开始滚动起来。
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {recentSettlements.map((prediction) => (
              <div key={prediction.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">
                      {prediction.match?.homeTeam?.nameZh || '主队'} vs {prediction.match?.awayTeam?.nameZh || '客队'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {prediction.optionLabel} · {formatDate(prediction.match?.startTimeUtc || prediction.placedAt)}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getPredictionTone(prediction.status)}`}>
                    {prediction.status === 'WON' ? '命中' : '未中'}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">投入 {prediction.stakePoints} PTS</span>
                  <span className={`font-black ${Number(prediction.settledProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatSigned(prediction.settledProfit || 0)} PTS
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">最近操作</h3>
            <p className="mt-1 text-xs text-slate-500">下注、结算、问答和积分变化放在一起，方便快速回看。</p>
          </div>
          <RefreshCw className="h-4.5 w-4.5 text-slate-400" />
        </div>

        <div className="mt-4 space-y-3">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{tx.note}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDate(tx.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${tx.amount >= 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {formatSigned(tx.amount)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">余额 {tx.balanceAfter?.toLocaleString() ?? '-'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
