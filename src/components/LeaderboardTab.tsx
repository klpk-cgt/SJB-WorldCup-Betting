/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Award, BarChart2, Coins, Flame, Medal, RefreshCw, Sparkles, Star, TrendingDown, TrendingUp, Trophy, Zap } from 'lucide-react';
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { User } from '../types';
import { apiRequest } from '../utils/api';
import SmartAvatar from './SmartAvatar';
import { useStaggerReveal, useScrollReveal } from '../animations';

interface LeaderboardTabProps {
  user: User | null;
}

type LeaderboardKey = 'total' | 'today' | 'rate' | 'streak' | 'wonProfit';

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  balance?: number;
  netProfit?: number;
  todayProfit?: number;
  totalWonProfit?: number;
  rate?: number;
  wonCount?: number;
  totalCount?: number;
  currentStreak?: number;
  maxStreak?: number;
  biggestWin?: number;
  rankDelta?: number;
  todayStar?: boolean;
  title?: string;
  featuredBadge?: string | null;
  badgeTone?: 'emerald' | 'amber' | 'violet' | 'cyan' | 'rose' | 'slate';
};

const tabMeta: Record<
  LeaderboardKey,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  total: { label: '总积分', description: '优先看谁在群里稳定领跑。', icon: Trophy },
  today: { label: '今日榜', description: '只看今天的盈亏变化。', icon: Zap },
  wonProfit: { label: '收益榜', description: '命中带来的累计收益排行。', icon: Coins },
  rate: { label: '命中率', description: '谁的下单更准，一眼看清。', icon: Award },
  streak: { label: '连胜榜', description: '谁正处在连中状态里。', icon: Flame },
};

const TONE_CLASS: Record<NonNullable<LeaderboardEntry['badgeTone']>, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  cyan: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

function formatSignedNumber(value?: number) {
  if (typeof value !== 'number') return '--';
  return value > 0 ? `+${value}` : `${value}`;
}

function getRankDeltaMeta(delta?: number) {
  if (!delta) return null;
  if (delta > 0) {
    return {
      icon: <TrendingUp className="h-3 w-3" />,
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
      label: `上升 ${delta}`,
    };
  }
  return {
    icon: <TrendingDown className="h-3 w-3" />,
    className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
    label: `下降 ${Math.abs(delta)}`,
  };
}

function PodiumCard({ item, rank, tabKey }: { item: LeaderboardEntry; rank: 1 | 2 | 3; tabKey: LeaderboardKey }) {
  const rankMeta = {
    1: { bg: 'from-amber-300 to-yellow-100', badge: 'bg-amber-500 text-white', height: 'h-28' },
    2: { bg: 'from-slate-300 to-slate-50', badge: 'bg-slate-500 text-white', height: 'h-20' },
    3: { bg: 'from-orange-300 to-amber-50', badge: 'bg-orange-500 text-white', height: 'h-16' },
  }[rank];

  // 根据榜单类型显示对应的核心数据
  const displayValue = (() => {
    switch (tabKey) {
      case 'total':
        return item.balance?.toLocaleString() || 0;
      case 'today':
        return formatSignedNumber(item.todayProfit);
      case 'wonProfit':
        return `+${item.totalWonProfit?.toLocaleString() || 0}`;
      case 'rate':
        return `${item.rate || 0}%`;
      case 'streak':
        return `${item.currentStreak || 0} 连中`;
      default:
        return item.balance?.toLocaleString() || 0;
    }
  })();

  return (
    <div className="flex flex-1 flex-col items-center">
      <SmartAvatar name={item.displayName} src={item.avatarUrl} size={42} className="z-10 ring-2 ring-white" />
      <div className="mt-2 text-center">
        <div className="truncate text-xs font-black text-slate-900">{item.displayName}</div>
        <div className="mt-1 text-[10px] text-slate-500">{item.title || '群聊新星'}</div>
      </div>
      <div className={`mt-3 flex w-full flex-col items-center justify-end rounded-t-3xl bg-gradient-to-b ${rankMeta.bg} ${rankMeta.height} px-2 py-3`}>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${rankMeta.badge}`}>#{rank}</span>
        <div className="mt-2 text-sm font-black text-slate-900">{displayValue}</div>
        {item.featuredBadge && (
          <span className={`mt-2 rounded-full px-2 py-0.5 text-[9px] font-bold ${TONE_CLASS[item.badgeTone || 'slate']}`}>
            {item.featuredBadge}
          </span>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardTab({ user }: LeaderboardTabProps) {
  const [totalList, setTotalList] = useState<LeaderboardEntry[]>([]);
  const [todayList, setTodayList] = useState<LeaderboardEntry[]>([]);
  const [rateList, setRateList] = useState<LeaderboardEntry[]>([]);
  const [streakList, setStreakList] = useState<LeaderboardEntry[]>([]);
  const [wonProfitList, setWonProfitList] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<LeaderboardKey>('total');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useStaggerReveal(listRef, '.leaderboard-row', { stagger: 0.04, y: 10 });
  useScrollReveal(headerRef);

  const fetchRanks = async () => {
    setLoading(true);
    try {
      const resp = await apiRequest('/api/leaderboards');
      setTotalList(resp.totalList || []);
      setTodayList(resp.todayList || []);
      setRateList(resp.rateList || []);
      setStreakList(resp.streakList || []);
      setWonProfitList(resp.wonProfitList || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrend = async (userId: string) => {
    if (!userId) return;
    setTrendLoading(true);
    try {
      const data = await apiRequest(`/api/users/${userId}/trend`);
      setTrendData(data.trend || []);
      setSelectedUserName(data.displayName || '');
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    fetchRanks();
  }, []);

  useEffect(() => {
    if (totalList.length === 0) return;
    const me = totalList.find((item) => item.userId === user?.id);
    setSelectedUserId(me ? me.userId : totalList[0].userId);
  }, [totalList, user]);

  useEffect(() => {
    if (selectedUserId) {
      fetchTrend(selectedUserId);
    }
  }, [selectedUserId]);

  const activeList = useMemo(() => {
    if (activeLeaderboardTab === 'total') return totalList;
    if (activeLeaderboardTab === 'today') return todayList;
    if (activeLeaderboardTab === 'wonProfit') return wonProfitList;
    if (activeLeaderboardTab === 'rate') return rateList;
    return streakList;
  }, [activeLeaderboardTab, rateList, streakList, todayList, totalList, wonProfitList]);

  const selectedUserDetail =
    totalList.find((item) => item.userId === selectedUserId) ||
    todayList.find((item) => item.userId === selectedUserId) ||
    wonProfitList.find((item) => item.userId === selectedUserId) ||
    rateList.find((item) => item.userId === selectedUserId) ||
    streakList.find((item) => item.userId === selectedUserId);

  const won = selectedUserDetail?.wonCount || 0;
  const total = selectedUserDetail?.totalCount || 0;
  const lost = Math.max(0, total - won);
  const pieData =
    total > 0
      ? [
          { name: '命中场次', value: won, color: '#8b5cf6' },
          { name: '未命中场次', value: lost, color: '#f43f5e' },
        ]
      : [{ name: '暂无预测数据', value: 1, color: '#cbd5e1' }];

  return (
    <div className="space-y-5 pb-24 text-left">
      <section ref={headerRef} className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">排行榜</div>
            <h2 className="mt-1 text-lg font-black text-slate-900">群聊排行榜</h2>
          </div>
          <button
            onClick={fetchRanks}
            className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </button>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1 rounded-full bg-slate-100 p-1">
          {(Object.keys(tabMeta) as LeaderboardKey[]).map((key) => {
            const meta = tabMeta[key];
            const Icon = meta.icon;
            const active = key === activeLeaderboardTab;
            return (
              <button
                key={key}
                onClick={() => setActiveLeaderboardTab(key)}
                className={`flex flex-col items-center gap-1 rounded-full px-1 py-2 text-[10px] font-bold transition ${
                  active ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {!loading && totalList.length > 0 && (
          <div className="mt-5">
            {/* 收米之星 */}
            {todayList.length > 0 && todayList[0]?.todayProfit > 0 && (
              <div className="mb-4 rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 p-4 shadow-[0_8px_24px_rgba(245,158,11,0.1)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                    👑
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">收米之星</span>
                      <span className="text-[11px] font-semibold text-amber-700">今日最高分</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <SmartAvatar name={todayList[0].displayName} src={todayList[0].avatarUrl} size={24} />
                      <span className="text-sm font-black text-slate-900">{todayList[0].displayName}</span>
                      <span className="text-sm font-black text-emerald-600">+{todayList[0].todayProfit}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-amber-700">
                      命中 {todayList[0].wonCount || 0} 场 · 命中率 {todayList[0].rate || 0}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-black text-slate-900">前三领奖台</div>
              <div className="text-[11px] font-medium text-slate-500">{tabMeta[activeLeaderboardTab].label}</div>
            </div>
            <div className="flex items-end gap-2">
              {activeList[1] && <PodiumCard item={activeList[1]} rank={2} tabKey={activeLeaderboardTab} />}
              {activeList[0] && <PodiumCard item={activeList[0]} rank={1} tabKey={activeLeaderboardTab} />}
              {activeList[2] && <PodiumCard item={activeList[2]} rank={3} tabKey={activeLeaderboardTab} />}
            </div>
          </div>
        )}
      </section>

      {loading ? (
        <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white py-20 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="relative mx-auto flex h-12 w-12 items-center justify-center">
            <RefreshCw className="absolute h-8 w-8 animate-spin text-violet-600" />
          </div>
          <p className="text-xs font-bold text-slate-500">正在整理排行榜数据...</p>
        </div>
      ) : (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="rounded-2xl bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <div className="flex items-center">
                <span className="w-[14%] text-center">排名</span>
                <span className="w-[44%]">群友</span>
                <span className="w-[18%] text-right">命中</span>
                <span className="w-[24%] text-right">结果</span>
              </div>
            </div>

            <div ref={listRef} className="mt-3 space-y-2">
              {activeList.slice(3).map((item, idx) => {
                const rank = idx + 4;
                const isCurrentUser = item.userId === user?.id;
                const isSelected = selectedUserId === item.userId;
                const deltaMeta = getRankDeltaMeta(item.rankDelta);
                return (
                  <button
                    key={item.userId}
                    onClick={() => setSelectedUserId(item.userId)}
                    className={`leaderboard-row flex w-full items-center rounded-[22px] border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-violet-300 bg-violet-50 shadow-[0_12px_24px_rgba(139,92,246,0.12)]'
                        : isCurrentUser
                          ? 'border-cyan-200 bg-cyan-50/70'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-[14%] shrink-0 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                        #{rank}
                      </div>
                    </div>

                    <div className="w-[44%] min-w-0">
                      <div className="flex items-center gap-3">
                        <SmartAvatar name={item.displayName} src={item.avatarUrl} size={40} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">{item.displayName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {item.title || '群聊新星'}
                            </span>
                            {item.featuredBadge && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[item.badgeTone || 'slate']}`}>
                                {item.featuredBadge}
                              </span>
                            )}
                            {item.todayStar && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-100">
                                今日之星
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-[18%] text-right">
                      {activeLeaderboardTab === 'streak' ? (
                        <>
                          <p className="text-sm font-black text-rose-600">{item.currentStreak || 0} 连中</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">最高 {item.maxStreak || 0}</p>
                        </>
                      ) : activeLeaderboardTab === 'rate' ? (
                        <>
                          <p className="text-sm font-black text-violet-700">{item.rate || 0}%</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            {item.wonCount || 0}/{item.totalCount || 0}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-black text-slate-900">{item.rate || 0}%</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">{item.currentStreak || 0} 连中</p>
                        </>
                      )}
                    </div>

                    <div className="w-[24%] text-right">
                      {activeLeaderboardTab === 'total' && (
                        <>
                          <p className="text-sm font-black text-slate-950">{item.balance?.toLocaleString() || 0}</p>
                          <p className={`mt-1 text-[11px] font-bold ${(item.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatSignedNumber(item.netProfit)}
                          </p>
                        </>
                      )}
                      {activeLeaderboardTab === 'today' && (
                        <>
                          <p className={`text-sm font-black ${(item.todayProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatSignedNumber(item.todayProfit)}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">今日变化</p>
                        </>
                      )}
                      {activeLeaderboardTab === 'wonProfit' && (
                        <>
                          <p className="text-sm font-black text-violet-700">+{item.totalWonProfit?.toLocaleString() || 0}</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">累计收益</p>
                        </>
                      )}
                      {activeLeaderboardTab === 'rate' && (
                        <>
                          <p className="text-sm font-black text-slate-900">{item.wonCount || 0} 场</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">净收益 {formatSignedNumber(item.netProfit)}</p>
                        </>
                      )}
                      {activeLeaderboardTab === 'streak' && (
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${(item.currentStreak || 0) > 0 ? 'bg-rose-50 text-rose-600 ring-rose-100' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                          {(item.currentStreak || 0) > 0 ? `${item.currentStreak} 连中` : '暂无连中'}
                        </span>
                      )}
                      {deltaMeta && activeLeaderboardTab !== 'streak' && (
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${deltaMeta.className}`}>
                            {deltaMeta.icon}
                            {deltaMeta.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <BarChart2 className="h-4.5 w-4.5 text-emerald-500" />
                  战绩分析
                </h3>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  当前聚焦 <span className="font-bold text-violet-700">{selectedUserName || '加载中'}</span> 的积分走势与命中分布。
                </p>
              </div>
              <span className="self-start rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 ring-1 ring-violet-100">
                点击上方用户即可切换
              </span>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
                    近七日积分走势
                  </h4>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">财富曲线</span>
                </div>
                <div className="h-[200px] rounded-3xl border border-slate-200 bg-slate-50 p-3">
                  {trendLoading ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                      <p className="text-[11px] font-semibold text-slate-500">正在加载趋势数据...</p>
                    </div>
                  ) : trendData.length === 0 ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-[11px] font-semibold text-slate-500">
                      该用户最近还没有形成足够的数据波动，趋势会在更多参与后出现。
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} domain={['auto', 'auto']} />
                        <Tooltip />
                        <Line type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, stroke: '#8b5cf6', strokeWidth: 1.5, fill: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Award className="h-3.5 w-3.5 text-pink-500" />
                    命中分布
                  </h4>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-100">
                    {selectedUserDetail?.rate || 0}% 命中率
                  </span>
                </div>
                <div className="h-[200px] rounded-3xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex h-full flex-col items-center justify-between">
                    <div className="relative h-[124px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={3} dataKey="value">
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-black text-slate-900">{selectedUserDetail?.rate || 0}%</span>
                        <span className="mt-1 text-[10px] font-semibold text-slate-500">命中率</span>
                      </div>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-[11px]">
                      <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                        <span className="font-semibold text-slate-600">
                          命中 <span className="font-black text-violet-700">{won} 场</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <span className="font-semibold text-slate-600">
                          未中 <span className="font-black text-rose-600">{lost} 场</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-violet-500" />
              <h4 className="text-sm font-black text-slate-900">群聊观察</h4>
            </div>
            <div className="mt-4 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-4 text-sm leading-7 text-slate-700">
              现在首屏优先展示直观排名，走势图和分析下沉到这里，方便先看榜、再复盘。
            </div>
          </section>
        </>
      )}
    </div>
  );
}
