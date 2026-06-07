/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Coins,
  FileText,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Transaction } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import FlagBadge from './home/FlagBadge';

interface MeTabProps {
  user: any;
  wallet: any;
  onLogout: () => void;
}

interface AchievementCard {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  suffix?: string;
  unlocked: boolean;
}

function getTxTypeLabel(type: string) {
  switch (type) {
    case 'INITIAL_GRANT':
      return '初始赠送';
    case 'PREDICTION_STAKE':
      return '竞猜投入';
    case 'PREDICTION_WIN':
      return '竞猜命中';
    case 'PREDICTION_LOSE':
      return '竞猜未中';
    case 'ADMIN_ADJUST':
      return '系统调整';
    case 'REFUND':
      return '回滚退款';
    default:
      return type;
  }
}

export default function MeTab({ user, wallet, onLogout }: MeTabProps) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPredictionDetails, setShowPredictionDetails] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  useEffect(() => {
    async function loadLogs() {
      try {
        const [txsData, predsData] = await Promise.all([
          apiRequest('/api/me/transactions'),
          apiRequest('/api/predictions/me'),
        ]);
        setTxs(txsData);
        setPredictions(predsData);
      } catch (e) {
        console.error('Failed to load profile data', e);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const settledPredictions = useMemo(
    () => predictions.filter((item) => item.status === 'WON' || item.status === 'LOST'),
    [predictions],
  );
  const wonPredictions = useMemo(() => predictions.filter((item) => item.status === 'WON'), [predictions]);

  const accuracy = settledPredictions.length > 0 ? Math.round((wonPredictions.length / settledPredictions.length) * 100) : 0;
  const netProfit = settledPredictions.reduce((total, prediction) => total + Number(prediction.settledProfit || 0), 0);

  const maxStreak = useMemo(() => {
    let current = 0;
    let best = 0;

    for (const prediction of [...predictions].sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime())) {
      if (prediction.status === 'WON') {
        current += 1;
        best = Math.max(best, current);
      } else if (prediction.status === 'LOST') {
        current = 0;
      }
    }

    return best;
  }, [predictions]);

  const recentActions = useMemo(() => {
    return txs
      .filter((tx) => tx.type !== 'INITIAL_GRANT')
      .slice(0, 6)
      .map((tx) => ({
        id: tx.id,
        title: getTxTypeLabel(tx.type),
        note: tx.note,
        amount: tx.amount,
        createdAt: tx.createdAt,
      }));
  }, [txs]);

  const achievements: AchievementCard[] = [
    {
      id: 'first-prediction',
      title: '开局入场',
      description: '完成第一笔竞猜',
      current: Math.min(predictions.length, 1),
      target: 1,
      unlocked: predictions.length >= 1,
    },
    {
      id: 'streak',
      title: '连胜挑战',
      description: '达成 3 连胜',
      current: Math.min(maxStreak, 3),
      target: 3,
      unlocked: maxStreak >= 3,
    },
    {
      id: 'accuracy',
      title: '稳定命中',
      description: '结算命中率达到 60%',
      current: Math.min(accuracy, 60),
      target: 60,
      suffix: '%',
      unlocked: settledPredictions.length >= 3 && accuracy >= 60,
    },
    {
      id: 'score-master',
      title: '比分捕手',
      description: '命中 1 次比分玩法',
      current: predictions.some((item) => item.market === 'CORRECT_SCORE' && item.status === 'WON') ? 1 : 0,
      target: 1,
      unlocked: predictions.some((item) => item.market === 'CORRECT_SCORE' && item.status === 'WON'),
    },
  ];

  return (
    <div className="space-y-6 pb-20 text-left">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-900/80 bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl ring-1 ring-white/10">
              {user?.avatarUrl || '👤'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">{user?.displayName || '观赛用户'}</h2>
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-400/20">
                  单群使用
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300">身份卡 · 战绩概览 · 成就进度</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
              <KeyRound className="h-3.5 w-3.5 text-emerald-300" />
              登录码
            </div>
            <div className="mt-3 text-lg font-black tracking-[0.08em] text-white">{user?.loginCode || 'WC0000'}</div>
            <p className="mt-1 text-[11px] text-slate-400">只展示登录码，不再展示 PIN。</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
              <Coins className="h-3.5 w-3.5 text-emerald-300" />
              当前积分
            </div>
            <div className="mt-3 text-lg font-black text-white">{wallet?.balance?.toLocaleString() || '10,000'} PTS</div>
            <p className="mt-1 text-[11px] text-slate-400">当前群内观赛积分资产。</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-3 text-xs text-emerald-100">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          PIN 已从个人页移除，当前只保留群内使用所需的身份信息。
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4.5 w-4.5 text-emerald-600" />
          <h3 className="text-sm font-black text-slate-900">战绩概览</h3>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: '当前积分', value: `${wallet?.balance?.toLocaleString() || '10,000'} PTS`, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
            { label: '命中率', value: `${accuracy}%`, tone: 'text-cyan-700 bg-cyan-50 border-cyan-100' },
            { label: '净收益', value: `${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(1)} PTS`, tone: `${netProfit >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-rose-700 bg-rose-50 border-rose-100'}` },
            { label: '最长连胜', value: `${maxStreak} 场`, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
          ].map((item) => (
            <div key={item.label} className={`rounded-3xl border px-4 py-4 ${item.tone}`}>
              <div className="text-[11px] font-bold">{item.label}</div>
              <div className="mt-3 text-xl font-black">{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-4.5 w-4.5 text-amber-500" />
            <h3 className="text-sm font-black text-slate-900">成就进度</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            已解锁 {achievements.filter((item) => item.unlocked).length}/{achievements.length}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {achievements.map((achievement) => {
            const progress = Math.min((achievement.current / achievement.target) * 100, 100);

            return (
              <div
                key={achievement.id}
                className={`rounded-3xl border px-4 py-4 ${
                  achievement.unlocked ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{achievement.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          achievement.unlocked
                            ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                            : 'bg-white text-slate-500 ring-1 ring-slate-200'
                        }`}
                      >
                        {achievement.unlocked ? '已解锁' : '进行中'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{achievement.description}</p>
                  </div>
                  <div className="text-right text-xs font-bold text-slate-500">
                    {achievement.current}
                    {achievement.suffix || ''}
                    {' / '}
                    {achievement.target}
                    {achievement.suffix || ''}
                  </div>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${achievement.unlocked ? 'bg-amber-500' : 'bg-slate-300'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
          <h3 className="text-sm font-black text-slate-900">最近操作</h3>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-xs text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              正在加载最近操作...
            </div>
          ) : recentActions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
              还没有新的操作记录，去首页或竞猜页看看。
            </div>
          ) : (
            recentActions.map((action) => (
              <div key={action.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">{action.title}</div>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{action.note}</p>
                  </div>
                  <div className={`text-sm font-black ${action.amount >= 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {action.amount >= 0 ? `+${action.amount}` : action.amount}
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-400">{formatDate(action.createdAt)}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-cyan-500" />
            <h3 className="text-sm font-black text-slate-900">更多明细</h3>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => setShowPredictionDetails((value) => !value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-white"
          >
            {showPredictionDetails ? '收起竞猜明细' : '查看竞猜明细'}
          </button>
          <button
            onClick={() => setShowTransactions((value) => !value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-white"
          >
            {showTransactions ? '收起积分流水' : '查看积分流水'}
          </button>
        </div>

        {showPredictionDetails && (
          <div className="mt-4 space-y-3">
            {predictions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
                还没有竞猜明细。
              </div>
            ) : (
              predictions.slice(0, 12).map((prediction) => (
                <div key={prediction.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <FlagBadge flagCode={prediction.match?.homeTeam?.code} size="sm" />
                        <span>{prediction.match?.homeTeam?.nameZh}</span>
                        <span className="text-slate-400">vs</span>
                        <span>{prediction.match?.awayTeam?.nameZh}</span>
                        <FlagBadge flagCode={prediction.match?.awayTeam?.code} size="sm" />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {prediction.optionLabel} · 赔率 {Number(prediction.oddsDecimal).toFixed(2)} · 投入 {prediction.stakePoints} PTS
                      </p>
                    </div>
                    <div
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        prediction.status === 'WON'
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                          : prediction.status === 'LOST'
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                      }`}
                    >
                      {prediction.status === 'WON' ? '命中' : prediction.status === 'LOST' ? '未中' : '待结算'}
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">{formatDate(prediction.placedAt)}</div>
                </div>
              ))
            )}
          </div>
        )}

        {showTransactions && (
          <div className="mt-4 space-y-3">
            {txs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
                暂无积分流水。
              </div>
            ) : (
              txs.slice(0, 16).map((tx) => (
                <div key={tx.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-900">{getTxTypeLabel(tx.type)}</div>
                      <p className="mt-1 text-xs text-slate-500">{tx.note}</p>
                    </div>
                    <div className={`text-sm font-black ${tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatDate(tx.createdAt)}</span>
                    <span>余额 {tx.balanceAfter}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
