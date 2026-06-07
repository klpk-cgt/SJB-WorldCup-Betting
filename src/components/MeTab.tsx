/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Award, Coins, LogOut, RefreshCw, Target, Ticket, TrendingUp, Trophy } from 'lucide-react';
import { Prediction, TournamentBet, Transaction } from '../types';
import { apiRequest, formatDate } from '../utils/api';

interface MeTabProps {
  user: any;
  wallet: any;
  onLogout: () => void;
}

type PredictionWithMatch = Prediction & { match?: any | null };

function formatSigned(value: number) {
  if (value > 0) return `+${value.toLocaleString()}`;
  return value.toLocaleString();
}

function getPredictionTone(status: string) {
  if (status === 'WON') return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  if (status === 'LOST') return 'text-rose-700 bg-rose-50 border-rose-100';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}

export default function MeTab({ user, wallet, onLogout }: MeTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([]);
  const [tournamentBets, setTournamentBets] = useState<TournamentBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfileCenter() {
      try {
        const [txsData, predictionsData, tournamentPayload] = await Promise.all([
          apiRequest('/api/me/transactions'),
          apiRequest('/api/predictions/me'),
          apiRequest('/api/tournament-bets'),
        ]);

        setTransactions(txsData);
        setPredictions(predictionsData);
        setTournamentBets(tournamentPayload.bets || []);
      } catch (error) {
        console.error('Failed to load me center data', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfileCenter();
  }, []);

  const stats = useMemo(() => {
    const settled = predictions.filter((item) => item.status === 'WON' || item.status === 'LOST');
    const wins = settled.filter((item) => item.status === 'WON');
    const hitRate = settled.length > 0 ? Math.round((wins.length / settled.length) * 100) : 0;
    const netProfit = settled.reduce((sum, item) => sum + (item.settledProfit || 0), 0);

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

  const styleTags = useMemo(() => {
    const tags: string[] = [];
    if (stats.hitRate >= 60 && stats.settledCount >= 3) tags.push('稳健命中');
    if (stats.maxStreak >= 3) tags.push('连胜节奏');
    if (stats.netProfit > 3000) tags.push('收益向上');
    if (tournamentBets.length > 0) tags.push('长线参与');
    if (tags.length === 0) tags.push('观察中');
    return tags;
  }, [stats, tournamentBets]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">正在整理你的战绩中心...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-[0_20px_48px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">Record Center</p>
            <h2 className="mt-2 text-2xl font-black">{user?.displayName || '观赛玩家'}</h2>
            <p className="mt-2 text-xs leading-6 text-slate-300">这一页不讲故事，直接看你这届世界杯目前打成什么样。</p>
          </div>
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
              <Trophy className="h-4 w-4" />
              最长连胜
            </div>
            <p className="mt-3 text-3xl font-black tracking-tight">{stats.maxStreak}</p>
            <p className="mt-1 text-[11px] text-slate-300">长线参与 {stats.longTermCount} 项</p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">我的标签</h3>
            <p className="mt-1 text-xs text-slate-500">先看你现在更像哪一类玩家。</p>
          </div>
          <Award className="h-4.5 w-4.5 text-amber-500" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {styleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">长线竞猜</h3>
            <p className="mt-1 text-xs text-slate-500">冠军、金靴、金球这些更看整届走势。</p>
          </div>
          <Ticket className="h-4.5 w-4.5 text-emerald-600" />
        </div>

        {tournamentBets.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            你还没有参与长线竞猜，后续开放后会在竞猜页里进入。
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {tournamentBets.slice(0, 4).map((bet) => (
              <div
                key={bet.id}
                className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-black text-slate-900">{(bet as any).marketLabel || bet.type}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {bet.targetLabel}
                    {bet.targetSubLabel ? ` · ${bet.targetSubLabel}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{bet.potentialReturn.toLocaleString()} PTS</p>
                  <p className="mt-1 text-[11px] text-slate-500">{bet.stakePoints} PTS 投入</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">最近结算</h3>
            <p className="mt-1 text-xs text-slate-500">先看最近几单到底是红是黑。</p>
          </div>
          <Trophy className="h-4.5 w-4.5 text-amber-500" />
        </div>

        {recentSettlements.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            还没有结算记录，等第一批比赛结束后这里会开始滚动起来。
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {recentSettlements.map((prediction) => (
              <div
                key={prediction.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
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
            <h3 className="text-sm font-black text-slate-900">近期操作</h3>
            <p className="mt-1 text-xs text-slate-500">账本和下注动作放一起，方便快速复盘。</p>
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
                <p className="mt-1 text-[11px] text-slate-500">余额 {tx.balanceAfter.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
