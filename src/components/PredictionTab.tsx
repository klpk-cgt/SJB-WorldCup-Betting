/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Crown,
  History,
  Lock,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { Match, MatchOdds, MatchOperationalStatus, Prediction, TournamentBet, TournamentBetOption, TournamentBetType } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import FlagBadge from './home/FlagBadge';

interface PredictionTabProps {
  user: any;
  wallet: any;
  onRefreshWallet: () => void;
  focusedMatchId?: string;
}

type ModeFilter = 'H2H' | 'CORRECT_SCORE' | 'TOTAL_GOALS';
type MatchCategory = 'BETTABLE' | 'WAITING_SETTLEMENT' | 'SETTLED';
type BetSurface = 'single' | 'tournament';

interface BetOption {
  key: string;
  label: string;
  odds: number;
}

interface TournamentMarketConfig {
  type: TournamentBetType;
  label: string;
  isOpen: boolean;
  isVisible: boolean;
  openedAt: string | null;
  lockedAt: string | null;
  options: TournamentBetOption[];
  hint: string;
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

  return odds.correctScore.slice(0, 8).map((score) => ({
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

function getTournamentMarketIcon(type: TournamentBetType) {
  if (type === 'champion') return Crown;
  if (type === 'golden_boot') return Target;
  return Star;
}

function getTournamentPostPath(type: TournamentBetType) {
  if (type === 'champion') return '/api/tournament-bets/champion';
  if (type === 'golden_boot') return '/api/tournament-bets/golden-boot';
  return '/api/tournament-bets/golden-ball';
}

export default function PredictionTab({ user, wallet, onRefreshWallet, focusedMatchId }: PredictionTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [myBets, setMyBets] = useState<Prediction[]>([]);
  const [myTournamentBets, setMyTournamentBets] = useState<TournamentBet[]>([]);
  const [tournamentMarkets, setTournamentMarkets] = useState<TournamentMarketConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<ModeFilter>('H2H');
  const [activeCategory, setActiveCategory] = useState<MatchCategory>('BETTABLE');
  const [betSurface, setBetSurface] = useState<BetSurface>('single');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedOption, setSelectedOption] = useState<BetOption | null>(null);
  const [selectedTournamentMarket, setSelectedTournamentMarket] = useState<TournamentMarketConfig | null>(null);
  const [selectedTournamentOption, setSelectedTournamentOption] = useState<TournamentBetOption | null>(null);
  const [stake, setStake] = useState(500);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const VISIBLE_MATCH_LIMIT = 5;

  const fetchMatches = async () => {
    const data = await apiRequest('/api/matches');
    setMatches(data);

    if (focusedMatchId) {
      const focus = data.find((match: Match) => match.id === focusedMatchId);
      if (focus) {
        if (getMatchCategory(focus) === 'BETTABLE') {
          setActiveCategory('BETTABLE');
          setBetSurface('single');
        }
        setSelectedMatch(focus);
      }
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const [history, tournamentPayload] = await Promise.all([
        apiRequest('/api/predictions/me'),
        apiRequest('/api/tournament-bets'),
      ]);
      setMyBets(history);
      setMyTournamentBets(tournamentPayload.bets || []);
      setTournamentMarkets(tournamentPayload.markets || []);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchTournamentData = async () => {
    if (!user) return;
    const payload = await apiRequest('/api/tournament-bets');
    setMyTournamentBets(payload.bets || []);
    setTournamentMarkets(payload.markets || []);
  };

  useEffect(() => {
    async function init() {
      try {
        await fetchMatches();
        if (user) {
          await Promise.all([fetchHistory(), fetchTournamentData()]);
        }
      } catch (error) {
        console.error('Failed to load prediction data', error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [focusedMatchId, user]);

  const visibleMatches = useMemo(
    () => matches.filter((match) => getMatchCategory(match) === activeCategory),
    [activeCategory, matches],
  );

  const selectedMatchOptions = useMemo(
    () => (selectedMatch ? buildOptions(selectedMatch, activeMode) : []),
    [activeMode, selectedMatch],
  );

  const pendingBets = useMemo(() => myBets.filter((bet) => bet.status === 'PENDING' || bet.status === 'LOCKED'), [myBets]);
  const settledBets = useMemo(() => myBets.filter((bet) => bet.status === 'WON' || bet.status === 'LOST'), [myBets]);
  const championMarket = useMemo(
    () => tournamentMarkets.find((market) => market.type === 'champion') || null,
    [tournamentMarkets],
  );
  const secondaryMarkets = useMemo(
    () => tournamentMarkets.filter((market) => market.type !== 'champion'),
    [tournamentMarkets],
  );

  const handleOpenBetModal = (match: Match, option: BetOption) => {
    setSelectedMatch(match);
    setSelectedOption(option);
    setSelectedTournamentMarket(null);
    setSelectedTournamentOption(null);
    const defaultStake = Math.min(500, Math.max(100, Math.floor((wallet?.balance || 10000) * 0.1)));
    setStake(defaultStake);
    setMessage(null);
  };

  const handleOpenTournamentModal = (market: TournamentMarketConfig) => {
    if (!market.isOpen) return;
    setSelectedTournamentMarket(market);
    setSelectedTournamentOption(null);
    setSelectedMatch(null);
    setSelectedOption(null);
    const defaultStake = Math.min(500, Math.max(100, Math.floor((wallet?.balance || 10000) * 0.08)));
    setStake(defaultStake);
    setMessage(null);
  };

  const closeModal = () => {
    if (submitting) return;
    setSelectedOption(null);
    setSelectedTournamentMarket(null);
    setSelectedTournamentOption(null);
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
      closeModal();
      await Promise.all([fetchMatches(), fetchHistory(), onRefreshWallet()]);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '提交失败，请稍后重试。' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTournamentBet = async () => {
    if (!selectedTournamentMarket || !selectedTournamentOption) return;
    if (stake <= 0) {
      setMessage({ type: 'error', text: '请输入有效的积分数量。' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await apiRequest(getTournamentPostPath(selectedTournamentMarket.type), {
        method: 'POST',
        body: JSON.stringify({
          targetId: selectedTournamentOption.id,
          stakePoints: stake,
        }),
      });

      setMessage({
        type: 'success',
        text: `已提交 ${selectedTournamentMarket.label}，本次投入 ${stake} 积分，预计回收 ${res.bet.potentialReturn} 积分。`,
      });
      closeModal();
      await Promise.all([fetchTournamentData(), fetchHistory(), onRefreshWallet()]);
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
          登录后就能参与单场竞猜、冠军竞猜，以及淘汰赛后期开放的金靴和金球长线玩法。
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
            <h2 className="mt-1 text-lg font-black text-slate-900">单场互动在前，长线玩法收进一个分区里</h2>
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
          <>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                onClick={() => setBetSurface('single')}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  betSurface === 'single' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                单场玩法
              </button>
              <button
                onClick={() => setBetSurface('tournament')}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  betSurface === 'tournament' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                长线玩法
              </button>
            </div>

            {betSurface === 'single' && (
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
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          {activeCategory === 'BETTABLE'
            ? betSurface === 'single'
              ? `可竞猜比赛 · ${MARKET_LABELS[activeMode]}`
              : '长线玩法'
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

      {showHistory && (
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900">我的竞猜记录</h4>
            {historyLoading && <span className="text-xs text-slate-400">刷新中...</span>}
          </div>

          {myBets.length === 0 && myTournamentBets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
              你还没有竞猜记录。
            </div>
          ) : (
            <div className="space-y-3">
              <RecordBlock title="等待结算" bets={pendingBets} />
              <RecordBlock title="已结算" bets={settledBets} />
              <TournamentRecordBlock title="长线玩法" bets={myTournamentBets} />
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3 py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-xs font-bold text-slate-500">正在加载竞猜内容...</p>
        </div>
      ) : activeCategory === 'BETTABLE' && betSurface === 'tournament' ? (
        <div className="space-y-4">
          {championMarket && (
            <TournamentMarketCard
              market={championMarket}
              userBet={myTournamentBets.find((bet) => bet.type === 'champion')}
              onOpen={handleOpenTournamentModal}
            />
          )}

          {secondaryMarkets.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">淘汰赛后期玩法</h4>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    金靴和金球不抢前期主界面资源，等淘汰赛进入关键阶段再解锁操作。
                  </p>
                </div>
                <Lock className="h-4.5 w-4.5 text-slate-400" />
              </div>

              <div className="mt-4 grid gap-3">
                {secondaryMarkets.map((market) => (
                  <div key={market.type}>
                    <TournamentMarketCard
                      market={market}
                      userBet={myTournamentBets.find((bet) => bet.type === market.type)}
                      onOpen={handleOpenTournamentModal}
                      subdued
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : visibleMatches.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
          这一栏现在还是空的，等同步或结算跑完就会补上。
        </div>
      ) : (
        <div className="space-y-4">
          {(showAllMatches ? visibleMatches : visibleMatches.slice(0, VISIBLE_MATCH_LIMIT)).map((match) => {
            const options = activeCategory === 'BETTABLE' ? buildOptions(match, activeMode) : [];
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

                <div className="mt-4 flex items-center justify-between">
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
                    <div className="mt-1 text-[11px] font-semibold text-slate-500">{match.venueCity}</div>
                  </div>

                  <div className="flex w-[40%] items-center justify-end gap-2">
                    <div className="min-w-0 text-right">
                      <div className="truncate text-sm font-black text-slate-900">{match.awayTeam?.nameZh}</div>
                    </div>
                    <FlagBadge flagCode={match.awayTeam?.code} />
                  </div>
                </div>

                {activeCategory === 'BETTABLE' ? (
                  <>
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

                    <div className="mt-3 flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
                      <span>锁盘前会按当前指数写入快照，结算时只认下单那一刻的数据。</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {activeCategory === 'WAITING_SETTLEMENT'
                      ? '这场比赛已经打完，系统会在同步确认后自动结算。'
                      : '这场比赛已经完成结算，可以去“我的记录”里看明细。'}
                  </div>
                )}
              </div>
            );
          })}
          {visibleMatches.length > VISIBLE_MATCH_LIMIT && (
            <button
              onClick={() => setShowAllMatches(!showAllMatches)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-600 transition hover:bg-white hover:text-emerald-700 hover:border-emerald-200"
            >
              {showAllMatches ? '收起' : `查看全部 ${visibleMatches.length} 场`}
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {(selectedMatch && selectedOption) || selectedTournamentMarket ? (
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
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                    {selectedTournamentMarket ? selectedTournamentMarket.label : MARKET_LABELS[activeMode]}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {selectedTournamentMarket
                      ? selectedTournamentOption?.label || '先选择一个竞猜目标'
                      : selectedOption?.label}
                  </h3>
                </div>
                <button onClick={closeModal} className="rounded-full border border-slate-200 p-2 text-slate-500">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedTournamentMarket ? (
                <>
                  <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{selectedTournamentMarket.label}</div>
                        <div className="mt-1 text-xs leading-6 text-slate-500">{selectedTournamentMarket.hint}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2 text-right ring-1 ring-slate-200">
                        <div className="text-[11px] font-bold text-slate-500">当前余额</div>
                        <div className="mt-1 text-sm font-black text-slate-950">{wallet?.balance?.toLocaleString()} PTS</div>
                      </div>
                    </div>

                    <div className="mt-4 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
                      {selectedTournamentMarket.options.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSelectedTournamentOption(option)}
                          className={`rounded-2xl border px-3 py-3 text-left transition ${
                            selectedTournamentOption?.id === option.id
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="text-xs font-black text-slate-900">{option.label}</div>
                          {option.subLabel && <div className="mt-1 text-[11px] text-slate-500">{option.subLabel}</div>}
                          <div className="mt-2 text-sm font-black text-slate-950">{option.oddsDecimal.toFixed(2)}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600">本次投入积分</label>
                      <span className="text-xs text-slate-400">
                        {selectedTournamentOption
                          ? `预计回收 ${(stake * selectedTournamentOption.oddsDecimal).toFixed(1)}`
                          : '先选目标再确认'}
                      </span>
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

                  <button
                    onClick={handleSubmitTournamentBet}
                    disabled={submitting || !selectedTournamentOption}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-black text-white shadow-[0_14px_28px_rgba(16,185,129,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? '提交中...' : '确认长线竞猜'}
                    {!submitting && <Sparkles className="h-4 w-4" />}
                  </button>
                </>
              ) : (
                <>
                  <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm font-black text-slate-900">
                      <span>{selectedMatch?.homeTeam?.nameZh}</span>
                      <span className="text-slate-400">VS</span>
                      <span>{selectedMatch?.awayTeam?.nameZh}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                        <div className="text-[11px] font-bold text-slate-500">当前指数</div>
                        <div className="mt-1 text-lg font-black text-slate-950">{selectedOption?.odds.toFixed(2)}</div>
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200">
                        <div className="text-[11px] font-bold text-slate-500">预计回收</div>
                        <div className="mt-1 text-lg font-black text-emerald-700">{(stake * (selectedOption?.odds || 0)).toFixed(1)}</div>
                      </div>
                    </div>
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
                    提交后系统会记录这次的指数快照，并在锁盘后保持不变。单场总投入仍会按风险规则限制。
                  </div>

                  <button
                    onClick={handleSubmitPrediction}
                    disabled={submitting}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-black text-white shadow-[0_14px_28px_rgba(16,185,129,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? '提交中...' : '确认提交'}
                    {!submitting && <Sparkles className="h-4 w-4" />}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function TournamentMarketCard({
  market,
  userBet,
  onOpen,
  subdued = false,
}: {
  market: TournamentMarketConfig;
  userBet?: TournamentBet;
  onOpen: (market: TournamentMarketConfig) => void;
  subdued?: boolean;
}) {
  const Icon = getTournamentMarketIcon(market.type);

  return (
    <div
      className={`rounded-3xl border p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${
        subdued ? 'border-slate-200 bg-slate-50/70' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900">{market.label}</h4>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  market.isOpen ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                }`}
              >
                {market.isOpen ? '开放中' : '即将开放'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-6 text-slate-500">{market.hint}</p>
          </div>
        </div>
        {userBet && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-100">
            已参与
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {market.options.slice(0, market.type === 'champion' ? 6 : 4).map((option) => (
          <div key={option.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <div className="text-xs font-black text-slate-900">{option.label}</div>
            {option.subLabel && <div className="mt-1 text-[11px] text-slate-500">{option.subLabel}</div>}
            <div className="mt-2 text-sm font-black text-slate-950">{option.oddsDecimal.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {userBet ? (
        <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
          你已经选择了 <span className="font-black text-slate-900">{userBet.targetLabel}</span>，投入 {userBet.stakePoints} 积分。
        </div>
      ) : (
        <button
          onClick={() => onOpen(market)}
          disabled={!market.isOpen}
          className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black transition ${
            market.isOpen
              ? 'bg-slate-950 text-white hover:bg-slate-800'
              : 'cursor-not-allowed bg-slate-200 text-slate-500'
          }`}
        >
          {market.isOpen ? '去参与这项竞猜' : '阶段未开放'}
        </button>
      )}
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
                  {bet.optionLabel} · 指数 {bet.oddsDecimal?.toFixed(2)} · 投入 {bet.stakePoints}
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

function TournamentRecordBlock({ title, bets }: { title: string; bets: TournamentBet[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</div>
      {bets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-xs text-slate-500">
          还没有长线玩法记录。
        </div>
      ) : (
        bets.map((bet: any) => (
          <div key={bet.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-slate-900">{bet.marketLabel || bet.type}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {bet.targetLabel}
                  {bet.targetSubLabel ? ` · ${bet.targetSubLabel}` : ''}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  指数 {bet.oddsDecimal?.toFixed(2)} · 投入 {bet.stakePoints}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${
                    bet.status === 'WON'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : bet.status === 'LOST'
                        ? 'bg-rose-50 text-rose-700 ring-rose-100'
                        : 'bg-amber-50 text-amber-700 ring-amber-100'
                  }`}
                >
                  {bet.status === 'OPEN' ? '进行中' : bet.status}
                </span>
                <div className="mt-1 text-[10px] text-slate-400">{formatDate(bet.placedAt)}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
