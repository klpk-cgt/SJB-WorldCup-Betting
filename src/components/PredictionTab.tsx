/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, ChevronDown, Coins, Copy, Download, History, ImageIcon, Sparkles, Trophy, X } from 'lucide-react';
import { Match, MatchOdds, MatchOperationalStatus, Prediction } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import { getMatchesForNearestDays } from '../utils/matchDisplay';
import { COMMON_CORRECT_SCORE_KEYS, mergeCorrectScoreOdds, parseScoreLabel } from '../utils/odds';
import FlagBadge from './home/FlagBadge';

interface PredictionTabProps {
  user: any;
  wallet: any;
  onRefreshWallet: () => void;
  focusedMatchId?: string;
}

type ModeFilter = 'H2H' | 'CORRECT_SCORE' | 'TOTAL_GOALS';
type MatchCategory = 'BETTABLE' | 'WAITING_SETTLEMENT' | 'SETTLED';

interface BetOption {
  key: string;
  label: string;
  odds: number;
}

interface ShareCardResult {
  id: string;
  mode: 'image' | 'text';
  text: string;
  imageDataUrl?: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  createdAt: string;
}

const MARKET_LABELS: Record<ModeFilter, string> = {
  H2H: '胜平负',
  CORRECT_SCORE: '比分',
  TOTAL_GOALS: '总进球',
};

const STAKE_SUGGESTIONS = [200, 500, 1000, 2000];

function getMatchCategory(match: Match): MatchCategory {
  if (match.operationalStatus === 'SETTLED') return 'SETTLED';
  if (match.operationalStatus === 'WAITING_SETTLEMENT') return 'WAITING_SETTLEMENT';
  return 'BETTABLE';
}

function buildOptions(match: Match, mode: ModeFilter) {
  const odds: MatchOdds | null | undefined = match.odds;
  if (!odds) return [];

  if (mode === 'H2H') {
    return [
      { key: 'home', label: `${match.homeTeam?.nameZh} 胜`, odds: odds.h2h.homeWin },
      { key: 'draw', label: '平局', odds: odds.h2h.draw },
      { key: 'away', label: `${match.awayTeam?.nameZh} 胜`, odds: odds.h2h.awayWin },
    ];
  }

  if (mode === 'TOTAL_GOALS') {
    return [
      { key: 'over_2_5', label: '大于 2.5 球', odds: odds.totalGoals.over25 },
      { key: 'under_2_5', label: '小于 2.5 球', odds: odds.totalGoals.under25 },
    ];
  }

  return mergeCorrectScoreOdds(odds.correctScore).map((score) => ({
    key: `correctScore_${score.score.replace('-', '_')}`,
    label: score.score,
    odds: score.odds,
  }));
}

function getStatusText(status: MatchOperationalStatus | undefined) {
  if (status === 'LOCKING_SOON') return '即将锁盘';
  if (status === 'LOCKED') return '已锁盘';
  if (status === 'WAITING_SETTLEMENT') return '等待结算';
  if (status === 'SETTLED') return '已结算';
  if (status === 'CANCELLED') return '已取消';
  return '可竞猜';
}

function splitScoreOptions(options: BetOption[]) {
  const featured: BetOption[] = [];
  const remaining: BetOption[] = [];

  for (const option of options) {
    if (COMMON_CORRECT_SCORE_KEYS.includes(option.label as any)) {
      featured.push(option);
    } else {
      remaining.push(option);
    }
  }

  const orderedFeatured = COMMON_CORRECT_SCORE_KEYS.map((label) => featured.find((item) => item.label === label)).filter(Boolean) as BetOption[];
  return { featured: orderedFeatured, remaining };
}

function groupExtendedScoreOptions(options: BetOption[]) {
  const groups = {
    homeWin: [] as BetOption[],
    draw: [] as BetOption[],
    awayWin: [] as BetOption[],
    extra: [] as BetOption[],
  };

  for (const option of options) {
    const parsed = parseScoreLabel(option.label);
    if (!parsed) {
      groups.extra.push(option);
      continue;
    }

    if (parsed.home > parsed.away) {
      groups.homeWin.push(option);
    } else if (parsed.home === parsed.away) {
      groups.draw.push(option);
    } else {
      groups.awayWin.push(option);
    }
  }

  return groups;
}

export default function PredictionTab({ user, wallet, onRefreshWallet, focusedMatchId }: PredictionTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [myBets, setMyBets] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<ModeFilter>('H2H');
  const [activeCategory, setActiveCategory] = useState<MatchCategory>('BETTABLE');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedOption, setSelectedOption] = useState<BetOption | null>(null);
  const [stake, setStake] = useState(500);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [showAllBettableMatches, setShowAllBettableMatches] = useState(false);
  const [expandedScoreMatchIds, setExpandedScoreMatchIds] = useState<Record<string, boolean>>({});
  const [placedPrediction, setPlacedPrediction] = useState<Prediction | null>(null);
  const [shareCard, setShareCard] = useState<ShareCardResult | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const fetchMatches = async () => {
    const data = await apiRequest('/api/matches');
    setMatches(data);

    if (focusedMatchId) {
      const focus = data.find((match: Match) => match.id === focusedMatchId);
      if (focus) {
        if (getMatchCategory(focus) === 'BETTABLE') {
          setActiveCategory('BETTABLE');
          setExpandedMatchId(focus.id);
          if (!getMatchesForNearestDays(data.filter((match: Match) => getMatchCategory(match) === 'BETTABLE'), 2).some((match) => match.id === focus.id)) {
            setShowAllBettableMatches(true);
          }
        }
      }
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const history = await apiRequest('/api/predictions/me');
      setMyBets(history);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([fetchMatches(), fetchHistory()]);
      } catch (error) {
        console.error('Failed to load prediction data', error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [focusedMatchId, user]);

  const categoryMatches = useMemo(
    () => matches.filter((match) => getMatchCategory(match) === activeCategory),
    [activeCategory, matches],
  );

  const bettableWindowMatches = useMemo(
    () => getMatchesForNearestDays(matches.filter((match) => getMatchCategory(match) === 'BETTABLE'), 2),
    [matches],
  );

  const visibleMatches = useMemo(() => {
    if (activeCategory !== 'BETTABLE') {
      return categoryMatches;
    }

    if (showAllBettableMatches) {
      return categoryMatches;
    }

    const visibleIds = new Set(bettableWindowMatches.map((match) => match.id));
    if (focusedMatchId) {
      visibleIds.add(focusedMatchId);
    }
    return categoryMatches.filter((match) => visibleIds.has(match.id));
  }, [activeCategory, bettableWindowMatches, categoryMatches, focusedMatchId, showAllBettableMatches]);

  const pendingBets = useMemo(() => myBets.filter((bet) => bet.status === 'PENDING' || bet.status === 'LOCKED'), [myBets]);
  const settledBets = useMemo(() => myBets.filter((bet) => bet.status === 'WON' || bet.status === 'LOST'), [myBets]);

  const handleOpenBetModal = (match: Match, option: BetOption) => {
    setSelectedMatch(match);
    setSelectedOption(option);
    const defaultStake = Math.min(500, Math.max(100, Math.floor((wallet?.balance || 10000) * 0.1)));
    setStake(defaultStake);
    setMessage(null);
    setPlacedPrediction(null);
    setShareCard(null);
  };

  const closeModal = () => {
    if (submitting) return;
    setSelectedOption(null);
    setSelectedMatch(null);
    setPlacedPrediction(null);
    setShareCard(null);
    setShareLoading(false);
  };

  const handleGenerateShareCard = async () => {
    if (!placedPrediction) return;
    setShareLoading(true);
    try {
      const result = await apiRequest('/api/ai/share/bet', {
        method: 'POST',
        body: JSON.stringify({
          predictionId: placedPrediction.id,
        }),
      });
      setShareCard(result);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '生成分享卡失败，请稍后重试。' });
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareText = async () => {
    if (!shareCard?.text) return;
    try {
      await navigator.clipboard.writeText(shareCard.text);
      setMessage({ type: 'success', text: '分享文案已复制，可以直接发到群里。' });
    } catch {
      setMessage({ type: 'error', text: '复制失败，请手动复制文案。' });
    }
  };

  const handleDownloadShareCard = () => {
    if (!shareCard?.imageDataUrl) return;
    const link = document.createElement('a');
    link.href = shareCard.imageDataUrl;
    link.download = `world-cup-share-${placedPrediction?.id || 'card'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage({ type: 'success', text: '分享卡已下载，可以发到群聊里。' });
  };

  const handleSubmitPrediction = async () => {
    if (!selectedMatch || !selectedOption) return;
    if (stake <= 0) {
      setMessage({ type: 'error', text: '请输入有效的积分数量。' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiRequest('/api/predictions', {
        method: 'POST',
        body: JSON.stringify({
          matchId: selectedMatch.id,
          market: activeMode,
          optionKey: selectedOption.key,
          optionLabel: selectedOption.label,
          stakePoints: stake,
        }),
      });

      setMessage({
        type: 'success',
        text: `已提交 ${stake} 积分，命中后预计可回收 ${res.prediction.potentialReturn} 积分。`,
      });
      setPlacedPrediction({
        ...res.prediction,
        match: res.match,
      } as Prediction);
      setShareCard(null);
      setSelectedOption(null);
      setSelectedMatch(null);
      await Promise.all([fetchMatches(), fetchHistory(), onRefreshWallet()]);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '提交失败，请稍后重试。' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="my-6 space-y-4 rounded-3xl border border-slate-200/80 bg-white/90 p-6 text-center shadow-[0_8px_30px_rgba(148,163,184,0.03)] backdrop-blur-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-xl text-emerald-600 shadow-xs">
          <Trophy className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-black text-slate-800">当前是游客看球模式</h3>
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-500">
          登录后可以查看最近两天可竞猜比赛，也能参与比分、胜平负和总进球玩法。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-left">
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">竞猜中心</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">先看最近两天，再展开更多比赛</h2>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-right">
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              <Coins className="h-3.5 w-3.5" />
              当前余额
            </div>
            <div className="mt-1 text-sm font-black text-emerald-900">{wallet?.balance?.toLocaleString()} PTS</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
          {(['BETTABLE', 'WAITING_SETTLEMENT', 'SETTLED'] as MatchCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                activeCategory === category ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {category === 'BETTABLE' ? '可竞猜' : category === 'WAITING_SETTLEMENT' ? '等待结算' : '已结算'}
            </button>
          ))}
        </div>

        {activeCategory === 'BETTABLE' && (
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
            {(['H2H', 'CORRECT_SCORE', 'TOTAL_GOALS'] as ModeFilter[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  activeMode === mode ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {MARKET_LABELS[mode]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          {activeCategory === 'BETTABLE'
            ? `最近可竞猜比赛 · ${MARKET_LABELS[activeMode]}`
            : activeCategory === 'WAITING_SETTLEMENT'
              ? '等待结算'
              : '已结算'}
        </h3>
        <button
          onClick={() => {
            setShowHistory((value) => !value);
            if (!showHistory) {
              fetchHistory();
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
        >
          <History className="h-3.5 w-3.5" />
          {showHistory ? '收起记录' : '我的记录'}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : 'border-rose-100 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {placedPrediction && (
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                投注已提交
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                {placedPrediction.matchId} · {placedPrediction.optionLabel} · 赔率 {placedPrediction.oddsDecimal.toFixed(2)} · 投入 {placedPrediction.stakePoints} PTS
              </p>
            </div>
            <button
              onClick={() => {
                setPlacedPrediction(null);
                setShareCard(null);
              }}
              className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!shareCard ? (
            <button
              onClick={handleGenerateShareCard}
              disabled={shareLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {shareLoading ? '生成分享卡中...' : '生成分享卡'}
              {!shareLoading && <ImageIcon className="h-4 w-4" />}
            </button>
          ) : (
            <div className="space-y-3">
              {shareCard.imageDataUrl && (
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                  <img src={shareCard.imageDataUrl} alt="Bet share card" className="block h-auto w-full" />
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-slate-900">
                    {shareCard.provider} · {shareCard.model}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                    {shareCard.fallbackUsed ? '模板回退' : '模型生成'}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line">{shareCard.text}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCopyShareText}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  复制文案
                </button>
                <button
                  onClick={handleDownloadShareCard}
                  disabled={!shareCard.imageDataUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  下载图片
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showHistory && (
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900">我的竞猜记录</h4>
            {historyLoading && <span className="text-xs text-slate-400">刷新中...</span>}
          </div>

          {myBets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
              你还没有竞猜记录。
            </div>
          ) : (
            <div className="space-y-3">
              <RecordBlock title="等待结算" bets={pendingBets} />
              <RecordBlock title="已结算" bets={settledBets} />
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3 py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-xs font-bold text-slate-500">正在加载可竞猜比赛...</p>
        </div>
      ) : visibleMatches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
          这一栏现在还是空的，等比赛进入可竞猜或结算状态后会自动补上。
        </div>
      ) : (
        <div className="space-y-4">
          {activeCategory === 'BETTABLE' && !showAllBettableMatches && bettableWindowMatches.length > 0 && (
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              首屏只展示最近两天可竞猜比赛，其它比赛可以继续展开。
            </div>
          )}

          {visibleMatches.map((match) => {
            const isExpanded = expandedMatchId === match.id;
            const options = activeCategory === 'BETTABLE' ? buildOptions(match, activeMode) : [];
            const { featured, remaining } = splitScoreOptions(options);
            const extendedScoreGroups = groupExtendedScoreOptions(remaining);

            return (
              <div key={match.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      {match.roundName} · {formatDate(match.startTimeUtc)}
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-900">{match.stage}</div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      activeCategory === 'WAITING_SETTLEMENT'
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                        : activeCategory === 'SETTLED'
                          ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                          : match.operationalStatus === 'LOCKING_SOON'
                            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                            : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                    }`}
                  >
                    {getStatusText(match.operationalStatus)}
                  </span>
                </div>

                <button
                  onClick={() => setExpandedMatchId((value) => (value === match.id ? null : match.id))}
                  className="mt-4 flex w-full items-center justify-between text-left"
                >
                  <div className="flex w-[40%] items-center gap-2">
                    <FlagBadge flagCode={match.homeTeam?.code} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-900">{match.homeTeam?.nameZh}</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                      {activeCategory === 'BETTABLE' ? 'VS' : `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-500">{match.venueCity || '比赛场地待更新'}</div>
                  </div>

                  <div className="flex w-[40%] items-center justify-end gap-2">
                    <div className="min-w-0 text-right">
                      <div className="truncate text-sm font-black text-slate-900">{match.awayTeam?.nameZh}</div>
                    </div>
                    <FlagBadge flagCode={match.awayTeam?.code} />
                  </div>

                  <ChevronDown className={`ml-3 h-4 w-4 shrink-0 text-slate-400 transition ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && activeCategory === 'BETTABLE' && (
                  <>
                    {activeMode === 'CORRECT_SCORE' ? (
                      <div className="mt-4 space-y-4">
                        <div>
                          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">常用比分</div>
                          <div className="grid grid-cols-3 gap-2">
                            {featured.map((option) => (
                              <button
                                key={option.key}
                                onClick={() => handleOpenBetModal(match, option)}
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                              >
                                <div className="text-xs font-bold text-slate-700">{option.label}</div>
                                <div className="mt-2 text-base font-black text-slate-900">{option.odds.toFixed(2)}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {remaining.length > 0 && (
                          <>
                            {!expandedScoreMatchIds[match.id] ? (
                              <button
                                onClick={() => setExpandedScoreMatchIds((value) => ({ ...value, [match.id]: true }))}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-white"
                              >
                                展开全部比分
                              </button>
                            ) : (
                              <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                {[
                                  { label: '主胜比分', items: extendedScoreGroups.homeWin },
                                  { label: '平局比分', items: extendedScoreGroups.draw },
                                  { label: '客胜比分', items: extendedScoreGroups.awayWin },
                                  { label: '其它比分', items: extendedScoreGroups.extra },
                                ]
                                  .filter((group) => group.items.length > 0)
                                  .map((group) => (
                                    <div key={group.label}>
                                      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{group.label}</div>
                                      <div className="grid grid-cols-3 gap-2">
                                        {group.items.map((option) => (
                                          <button
                                            key={option.key}
                                            onClick={() => handleOpenBetModal(match, option)}
                                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                                          >
                                            <div className="text-xs font-bold text-slate-700">{option.label}</div>
                                            <div className="mt-2 text-base font-black text-slate-900">{option.odds.toFixed(2)}</div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}

                                <button
                                  onClick={() => setExpandedScoreMatchIds((value) => ({ ...value, [match.id]: false }))}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                                >
                                  收起扩展比分
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {options.map((option) => (
                          <button
                            key={option.key}
                            onClick={() => handleOpenBetModal(match, option)}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50"
                          >
                            <div className="text-xs font-bold text-slate-700">{option.label}</div>
                            <div className="mt-2 text-base font-black text-slate-900">{option.odds.toFixed(2)}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
                      <span>锁盘前会按当前赔率写入快照，结算时只认你下单那一刻的指数。</span>
                    </div>
                  </>
                )}

                {isExpanded && activeCategory !== 'BETTABLE' && (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {activeCategory === 'WAITING_SETTLEMENT'
                      ? '这场比赛已经踢完，系统会在确认赛果后自动结算。'
                      : '这场比赛已经完成结算，可以到“我的记录”里查看明细。'}
                  </div>
                )}
              </div>
            );
          })}

          {activeCategory === 'BETTABLE' && matches.filter((match) => getMatchCategory(match) === 'BETTABLE').length > bettableWindowMatches.length && (
            <button
              onClick={() => setShowAllBettableMatches((value) => !value)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              {showAllBettableMatches ? '收起远期比赛' : '展开更多比赛'}
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedMatch && selectedOption && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 pb-4 pt-10 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">{MARKET_LABELS[activeMode]}</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">{selectedOption.label}</h3>
                </div>
                <button onClick={closeModal} className="rounded-full border border-slate-200 p-2 text-slate-500">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm font-black text-slate-900">
                  <span>{selectedMatch.homeTeam?.nameZh}</span>
                  <span className="text-slate-400">VS</span>
                  <span>{selectedMatch.awayTeam?.nameZh}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                    <div className="text-[11px] font-bold text-slate-500">当前赔率</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{selectedOption.odds.toFixed(2)}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                    <div className="text-[11px] font-bold text-slate-500">预计返还</div>
                    <div className="mt-1 text-lg font-black text-emerald-700">{(stake * selectedOption.odds).toFixed(1)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                已选玩法：{MARKET_LABELS[activeMode]} · {selectedOption.label}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600">本次投入积分</label>
                  <span className="text-xs text-slate-400">余额 {wallet?.balance?.toLocaleString()} PTS</span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {STAKE_SUGGESTIONS.filter((value) => value <= (wallet?.balance || 0)).map((value) => (
                    <button
                      key={value}
                      onClick={() => setStake(value)}
                      className={`rounded-xl px-2 py-2 text-xs font-bold transition ${
                        stake === value ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min={10}
                  step={10}
                  value={stake}
                  onChange={(event) => setStake(Number(event.target.value))}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus:border-emerald-300 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                提交后系统会记录这次赔率快照，并在锁盘后保持不变。单场总投入仍会按风险规则限制。
              </div>

              <button
                onClick={handleSubmitPrediction}
                disabled={submitting || Boolean(placedPrediction)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-black text-white shadow-[0_14px_28px_rgba(16,185,129,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? '提交中...' : '确认提交'}
                {!submitting && <Sparkles className="h-4 w-4" />}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecordBlock({ title, bets }: { title: string; bets: Prediction[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</div>
      {bets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-xs text-slate-500">
          暂无记录。
        </div>
      ) : (
        bets.map((bet: any) => (
          <div key={bet.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-900">
                  {bet.match?.homeTeam?.nameZh} vs {bet.match?.awayTeam?.nameZh}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {bet.optionLabel} · 赔率 {bet.oddsDecimal?.toFixed(2)} · 投入 {bet.stakePoints}
                </div>
              </div>
              <div className="text-right">
                {bet.status === 'WON' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                    <CheckCircle2 className="h-3 w-3" />
                    +{bet.settledProfit}
                  </span>
                ) : bet.status === 'LOST' ? (
                  <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 ring-1 ring-rose-100">
                    {bet.settledProfit}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-100">
                    等待结算
                  </span>
                )}
                <div className="mt-1 text-[10px] text-slate-400">{formatDate(bet.placedAt)}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
