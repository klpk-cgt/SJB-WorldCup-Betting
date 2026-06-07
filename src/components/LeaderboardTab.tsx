/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart2,
  Coins,
  Flame,
  Medal,
  RefreshCw,
  Sparkles,
  Trophy,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiRequest } from '../utils/api';

interface LeaderboardTabProps {
  user: any;
}

type LeaderboardKey = 'total' | 'today' | 'rate' | 'streak' | 'wonProfit';

type LeaderboardEntry = {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  aiBadge?: string;
  aiStyle?: string;
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
};

const tabMeta: Record<
  LeaderboardKey,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  total: {
    label: '总积分榜',
    description: '按当前总积分排序，谁的娱乐积分最厚。',
    icon: Trophy,
  },
  today: {
    label: '今日榜',
    description: '只看今天的收益变化，适合观察短线状态。',
    icon: Zap,
  },
  wonProfit: {
    label: '收获榜',
    description: '统计命中场次带来的累计收获，不含未命中的损耗。',
    icon: Coins,
  },
  rate: {
    label: '命中率',
    description: '看命中效率，至少完成过一场预测才更有参考价值。',
    icon: Award,
  },
  streak: {
    label: '连胜榜',
    description: '看火热手感和连续命中状态，谁在气势上最强。',
    icon: Flame,
  },
};

function formatSignedNumber(value?: number) {
  if (typeof value !== 'number') return '--';
  return value > 0 ? `+${value}` : `${value}`;
}

function formatRankBadge(index: number) {
  if (index === 0) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
        <Trophy className="h-5 w-5" />
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-200 text-slate-700 ring-1 ring-slate-300">
        <Medal className="h-5 w-5" />
      </div>
    );
  }

  if (index === 2) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 ring-1 ring-orange-200">
        <Medal className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-xs font-black text-slate-600 ring-1 ring-slate-200">
      #{index + 1}
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

  const fetchRanks = async () => {
    setLoading(true);
    try {
      const resp = await apiRequest('/api/leaderboards');
      setTotalList(resp.totalList || []);
      setTodayList(resp.todayList || []);
      setRateList(resp.rateList || []);
      setStreakList(resp.streakList || []);
      setWonProfitList(resp.wonProfitList || []);
    } catch (error) {
      console.error('Failed to get leaderboards data', error);
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
    } catch (error) {
      console.error('Failed to get user trend data', error);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    fetchRanks();
  }, []);

  useEffect(() => {
    if (totalList.length === 0) return;
    const meExists = totalList.find((item) => item.userId === user?.id);
    setSelectedUserId(meExists ? meExists.userId : totalList[0].userId);
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

  const getLocallySynthesizedAIReview = () => {
    if (totalList.length === 0) {
      return '榜单还在升温中。等大家陆续参与之后，这里会给出一段更像朋友群赛后闲聊的趣味点评。';
    }

    const leader = totalList[0];
    const tailUser = totalList[totalList.length - 1];
    const topWin = [...totalList].sort((a, b) => (b.biggestWin || 0) - (a.biggestWin || 0))[0];

    return [
      `当前领跑的是 ${leader?.displayName}，总积分来到 ${leader?.balance?.toLocaleString() || 0}，属于今晚榜单里最稳的那位。`,
      `${tailUser?.displayName || '后段选手'} 现在更像在憋一波反弹，短期看分数不高，但往往很适合在焦点战里突然翻身。`,
      `${topWin?.displayName || '高光选手'} 目前保持单场最高收获 ${topWin?.biggestWin?.toLocaleString() || 0}，爆发力还是很有存在感。`,
    ].join('\n\n');
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-white shadow-xl">
        <p className="font-extrabold text-emerald-400">{payload[0].payload.dateStr}</p>
        <div className="my-2 h-px bg-slate-800" />
        <p className="font-bold text-slate-200">
          积分余额 <span className="text-amber-300">{payload[0].value?.toLocaleString()} PTS</span>
        </p>
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-[10px] text-white shadow-xl">
        <p className="flex items-center gap-1.5 font-extrabold">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: data.color }} />
          {data.name}
        </p>
        {total > 0 ? (
          <p className="mt-1 text-slate-300">
            场次 <span className="font-bold text-white">{data.value} 场</span>
          </p>
        ) : (
          <p className="mt-1 text-slate-300">尚未形成有效样本</p>
        )}
      </div>
    );
  };

  const ActiveTabIcon = tabMeta[activeLeaderboardTab].icon;

  return (
    <div className="space-y-6 pb-20 text-left">
      <div className="grid grid-cols-5 gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        {(Object.keys(tabMeta) as LeaderboardKey[]).map((key) => {
          const meta = tabMeta[key];
          const Icon = meta.icon;
          const active = key === activeLeaderboardTab;

          return (
            <button
              key={key}
              onClick={() => setActiveLeaderboardTab(key)}
              className={`flex flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-[10px] font-bold transition sm:text-xs ${
                active
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-[0_12px_24px_rgba(139,92,246,0.24)]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-amber-200' : 'text-slate-400'}`} />
              <span className="truncate">{meta.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white py-20 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="relative mx-auto flex h-12 w-12 items-center justify-center">
            <RefreshCw className="absolute h-8 w-8 animate-spin text-violet-600" />
          </div>
          <p className="text-xs font-bold text-slate-500">正在整理本轮排行榜数据...</p>
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-slate-950 via-violet-950 to-fuchsia-950 p-5 text-white">
              <div className="absolute inset-0 opacity-15">
                <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100%" height="100%" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <circle cx="50%" cy="50%" r="36" fill="none" stroke="#fff" strokeWidth="1.5" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#fff" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold text-violet-100">
                    <ActiveTabIcon className="h-3.5 w-3.5 text-amber-200" />
                    <span>{tabMeta[activeLeaderboardTab].label}</span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white">群友实时排行榜</h3>
                  <p className="max-w-xl text-sm leading-6 text-slate-300">
                    {tabMeta[activeLeaderboardTab].description}
                  </p>
                </div>

                <div className="shrink-0 rounded-full border border-violet-300/20 bg-violet-900/30 px-3 py-1 text-[10px] font-bold text-violet-100">
                  榜单滚动更新中
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <div className="flex items-center">
                <span className="w-[14%] text-center">排名</span>
                <span className="w-[40%]">群友</span>
                <span className="w-[23%] text-right">表现</span>
                <span className="w-[23%] text-right">结果</span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {activeList.map((item, idx) => {
                const isCurrentUser = item.userId === user?.id;
                const isSelected = selectedUserId === item.userId;
                const isFirst = idx === 0;

                return (
                  <button
                    key={item.userId}
                    onClick={() => setSelectedUserId(item.userId)}
                    className={`flex w-full items-center rounded-[22px] border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-violet-300 bg-violet-50 shadow-[0_12px_24px_rgba(139,92,246,0.12)]'
                        : isFirst
                          ? 'border-amber-200 bg-amber-50/70'
                          : isCurrentUser
                            ? 'border-cyan-200 bg-cyan-50/70'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-[14%] shrink-0 text-center">{formatRankBadge(idx)}</div>

                    <div className="w-[40%] min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.avatarUrl || '🙂'}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">
                            {item.displayName}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isFirst
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.aiBadge || item.aiStyle || '稳健懂球派'}
                            </span>
                            {isCurrentUser && (
                              <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-700">
                                我
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-[23%] text-right">
                      {activeLeaderboardTab === 'streak' ? (
                        <>
                          <p className="text-sm font-black text-rose-600">
                            {item.maxStreak || 0} 连红
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">历史最佳</p>
                        </>
                      ) : activeLeaderboardTab === 'rate' ? (
                        <>
                          <p className="text-sm font-black text-violet-700">{item.rate || 0}%</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">命中率</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-black text-slate-900">{item.rate || 0}%</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            {item.wonCount || 0}/{item.totalCount || 0} 场
                          </p>
                        </>
                      )}
                    </div>

                    <div className="w-[23%] text-right">
                      {activeLeaderboardTab === 'total' && (
                        <>
                          <p className="text-sm font-black text-slate-950">
                            {item.balance?.toLocaleString?.() || item.balance || 0}
                          </p>
                          <p
                            className={`mt-1 text-[11px] font-bold ${
                              (item.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatSignedNumber(item.netProfit)}
                          </p>
                        </>
                      )}

                      {activeLeaderboardTab === 'today' && (
                        <>
                          <p
                            className={`text-sm font-black ${
                              (item.todayProfit || 0) > 0
                                ? 'text-emerald-600'
                                : (item.todayProfit || 0) < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-700'
                            }`}
                          >
                            {formatSignedNumber(item.todayProfit)}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">今日变化</p>
                        </>
                      )}

                      {activeLeaderboardTab === 'wonProfit' && (
                        <>
                          <p className="text-sm font-black text-violet-700">
                            +{item.totalWonProfit?.toLocaleString?.() || 0}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">累计收获</p>
                        </>
                      )}

                      {activeLeaderboardTab === 'rate' && (
                        <>
                          <p className="text-sm font-black text-slate-900">{item.wonCount || 0} 场</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500">
                            共 {item.totalCount || 0} 场
                          </p>
                        </>
                      )}

                      {activeLeaderboardTab === 'streak' && (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            (item.currentStreak || 0) > 0
                              ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
                              : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                          }`}
                        >
                          {(item.currentStreak || 0) > 0 ? `${item.currentStreak} 连中` : '暂无连中'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {activeList.length === 0 && (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-xs font-semibold text-slate-500">
                  暂无榜单数据，先去参与一场焦点战吧。
                </div>
              )}
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
                  当前聚焦 <span className="font-bold text-violet-700">{selectedUserName || '加载中'}</span>{' '}
                  的积分走势与命中分布。
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
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    财富曲线
                  </span>
                </div>

                <div className="h-[200px] rounded-3xl border border-slate-200 bg-slate-50 p-3">
                  {trendLoading ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                      <p className="text-[11px] font-semibold text-slate-500">正在加载走势数据...</p>
                    </div>
                  ) : trendData.length === 0 ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-[11px] font-semibold text-slate-500">
                      该用户最近没有形成足够的数据波动，走势会在更多参与后出现。
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 12, right: 16, left: -12, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="balance"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          dot={{ r: 4, stroke: '#8b5cf6', strokeWidth: 1.5, fill: '#fff' }}
                          activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2, fill: '#c4b5fd' }}
                        />
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
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={48}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-black text-slate-900">
                          {selectedUserDetail?.rate || 0}%
                        </span>
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

          <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="absolute right-4 top-4 opacity-10">
              <Sparkles className="h-10 w-10 text-violet-500" />
            </div>

            <div className="flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-violet-500" />
              <h4 className="text-sm font-black text-slate-900">AI 榜单点评</h4>
            </div>

            <div className="mt-4 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-4 text-sm leading-7 text-slate-700">
              {getLocallySynthesizedAIReview()}
            </div>
          </section>
        </>
      )}

      <div className="px-2 text-center text-[10px] font-semibold leading-relaxed text-slate-400">
        榜单与积分会在比赛结算后自动刷新，页面展示为娱乐积分用途。
      </div>
    </div>
  );
}
