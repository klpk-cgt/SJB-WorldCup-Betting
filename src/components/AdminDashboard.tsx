/**
 * 管理员数据仪表盘页面
 * 展示平台运营数据、用户增长、投注统计、实时指标等
 */
import { useState, useEffect, type ReactNode } from 'react';
import {
  Users, TrendingUp, Coins, Trophy, Activity, BarChart3,
  Target, Clock, DollarSign, Zap, ChevronUp, ChevronDown,
} from 'lucide-react';
import { apiRequest, ADMIN_KEY_STORAGE } from '../utils/api';

interface DashboardData {
  overview: {
    totalUsers: number;
    claimedUsers: number;
    unclaimedUsers: number;
    activeUsers: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    totalMatches: number;
    settledMatches: number;
    liveMatches: number;
    upcomingMatches: number;
    totalPredictions: number;
    todayPredictions: number;
    weekPredictions: number;
    totalBetVolume: number;
    todayBetVolume: number;
    weekBetVolume: number;
    totalPayout: number;
    platformProfit: number;
    totalBalance: number;
    initialBalance: number;
    avgBalance: number;
  };
  marketDistribution: Array<{ market: string; count: number }>;
  topMatches: Array<{ matchId: string; label: string; volume: number; status: string; isSettled: boolean }>;
  hourlyTrend: Array<{ hour: string; count: number; volume: number }>;
  dailyUserGrowth: Array<{ date: string; count: number }>;
  topActiveUsers: Array<{ userId: string; displayName: string; avatarUrl: string; loginCode: string; betCount: number; balance: number }>;
  topOptions: Array<{ label: string; count: number }>;
  generatedAt: string;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(ADMIN_KEY_STORAGE) || '';
      const resp = await apiRequest('/api/admin/dashboard/enhanced', {
        headers: { 'X-Admin-Token': token },
      });
      setData(resp);
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60s
    const timer = setInterval(fetchData, 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-sm text-slate-400">加载仪表盘数据...</div>
      </div>
    );
  }

  const { overview } = data;
  const winRate = overview.totalBetVolume > 0
    ? Math.round(overview.totalPayout / overview.totalBetVolume * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">数据仪表盘</h2>
          <p className="text-xs text-slate-500">平台运营数据概览 · 自动刷新</p>
        </div>
        <button
          onClick={fetchData}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
        >
          刷新
        </button>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="总用户"
          value={overview.totalUsers}
          sub={`${overview.claimedUsers} 已激活 / ${overview.unclaimedUsers} 未激活`}
          trend={overview.newUsersThisWeek > 0 ? `+${overview.newUsersThisWeek} 本周` : undefined}
          color="blue"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="今日活跃"
          value={overview.activeUsers}
          sub={`本周投注 ${overview.weekPredictions} 次`}
          color="emerald"
        />
        <StatCard
          icon={<Coins className="h-4 w-4" />}
          label="今日投注额"
          value={overview.todayBetVolume}
          sub={`本周 ${overview.weekBetVolume}`}
          color="amber"
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="平台盈亏"
          value={overview.platformProfit}
          sub={`总投注 ${overview.totalBetVolume} / 总赔付 ${overview.totalPayout}`}
          color={overview.platformProfit >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* 比赛 & 投注统计 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <MiniStat label="比赛总数" value={overview.totalMatches} icon={<Trophy className="h-3 w-3" />} />
        <MiniStat label="已完场" value={overview.settledMatches} icon={<Target className="h-3 w-3" />} />
        <MiniStat label="进行中" value={overview.liveMatches} icon={<Clock className="h-3 w-3" />} highlight />
        <MiniStat label="未开始" value={overview.upcomingMatches} icon={<BarChart3 className="h-3 w-3" />} />
        <MiniStat label="总投注次数" value={overview.totalPredictions} icon={<Zap className="h-3 w-3" />} />
        <MiniStat label="今日投注" value={overview.todayPredictions} icon={<TrendingUp className="h-3 w-3" />} />
      </div>

      {/* 市场分布 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-black text-slate-900">投注市场分布</h3>
        <div className="space-y-2">
          {data.marketDistribution.map((item) => {
            const pct = overview.totalPredictions > 0 ? Math.round((item.count / overview.totalPredictions) * 100) : 0;
            const marketLabels: Record<string, string> = {
              H2H: '胜平负',
              CORRECT_SCORE: '比分',
              TOTAL_GOALS: '总进球',
              QUALIFY: '晋级',
            };
            return (
              <div key={item.market} className="flex items-center gap-3">
                <span className="w-20 text-xs font-bold text-slate-600">{marketLabels[item.market] || item.market}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-bold text-slate-500">{pct}%</span>
                <span className="w-12 text-right text-[10px] text-slate-400">{item.count}次</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 热门比赛 & 投注选项 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-black text-slate-900">热门比赛 TOP10</h3>
          <div className="space-y-2">
            {data.topMatches.map((m, i) => (
              <div key={m.matchId} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${
                    i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="font-bold text-slate-700">{m.label}</span>
                  {m.isSettled && <span className="text-[9px] text-slate-400">已完场</span>}
                </div>
                <span className="font-bold text-slate-900">{m.volume}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-black text-slate-900">热门投注选项</h3>
          <div className="space-y-2">
            {data.topOptions.map((o, i) => (
              <div key={o.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${
                    i < 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="font-bold text-slate-700">{o.label}</span>
                </div>
                <span className="font-bold text-slate-900">{o.count}次</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 活跃用户 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-black text-slate-900">活跃用户 TOP10</h3>
        <div className="space-y-2">
          {data.topActiveUsers.map((u, i) => (
            <div key={u.userId} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${
                  i < 3 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </span>
                <span className="font-bold text-slate-700">{u.displayName}</span>
                <span className="text-[10px] text-slate-400">{u.loginCode}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">{u.betCount}次</span>
                <span className="font-bold text-slate-900">{u.balance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 24小时趋势 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-black text-slate-900">24 小时投注趋势</h3>
        <div className="flex items-end gap-0.5" style={{ height: '80px' }}>
          {data.hourlyTrend.map((h, i) => {
            const maxVol = Math.max(...data.hourlyTrend.map(t => t.volume), 1);
            const height = Math.max(2, (h.volume / maxVol) * 100);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t transition-all duration-300 ${h.volume > 0 ? 'bg-emerald-500' : 'bg-slate-100'}`}
                  style={{ height: `${height}%`, minHeight: h.volume > 0 ? '4px' : '2px' }}
                  title={`${h.hour}: ${h.count}次 / ${h.volume}积分`}
                />
                {i % 4 === 0 && <span className="text-[8px] text-slate-400">{h.hour.slice(0, 2)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-400">
        数据生成时间: {new Date(data.generatedAt).toLocaleString('zh-CN')}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, trend, color }: {
  icon: ReactNode;
  label: string;
  value: number | string;
  sub: string;
  trend?: string;
  color: 'blue' | 'emerald' | 'amber' | 'green' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className={`rounded-lg p-1.5 ${colors[color]}`}>{icon}</div>
        <span className="text-xs font-bold text-slate-500">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
      <div className="mt-1 text-[11px] text-slate-400">{sub}</div>
      {trend && (
        <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
          <ChevronUp className="h-3 w-3" />
          {trend}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon, highlight }: {
  label: string;
  value: number;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center gap-1.5">
        <span className={highlight ? 'text-emerald-600' : 'text-slate-400'}>{icon}</span>
        <span className="text-[10px] font-bold text-slate-500">{label}</span>
      </div>
      <div className="mt-1 text-xl font-black text-slate-900">{value}</div>
    </div>
  );
}
