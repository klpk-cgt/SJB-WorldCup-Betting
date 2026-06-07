import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { apiRequest } from '../utils/api';

type ChartDatum = { label: string; value: number };

type StatsSummary = {
  userPredictionDistribution: ChartDatum[];
  popularBetOptions: ChartDatum[];
  championPickDistribution: ChartDatum[];
  correctScoreHeat: ChartDatum[];
};

const PIE_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444', '#64748b'];

export default function StatsPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/stats/summary')
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white py-20 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-bold text-slate-500">正在整理群聊竞猜统计...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-12 text-center text-xs text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        暂时没有足够的竞猜统计数据。
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4.5 w-4.5 text-emerald-500" />
          <h3 className="text-sm font-black text-slate-900">用户预测分布</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">看看最近谁最活跃，谁是本群真正的高频参赛者。</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.userPredictionDistribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <PieChartIcon className="h-4.5 w-4.5 text-violet-500" />
          <h3 className="text-sm font-black text-slate-900">热门投注分布</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">群友最爱投哪些玩法与方向，一眼就能看出热度倾斜。</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stats.popularBetOptions} dataKey="value" nameKey="label" outerRadius={92} innerRadius={48}>
                {stats.popularBetOptions.map((item, index) => (
                  <Cell key={item.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-black text-slate-900">冠军选择分布</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">群友都看好谁捧杯？饼图一目了然。</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.championPickDistribution} dataKey="value" nameKey="label" outerRadius={80} innerRadius={40}>
                  {stats.championPickDistribution.map((item, index) => (
                    <Cell key={item.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        <ChartCard title="比分选择热度" data={stats.correctScoreHeat} color="#f59e0b" />
      </section>
    </div>
  );
}

function ChartCard({ title, data, color }: { title: string; data: ChartDatum[]; color: string }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={55} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" fill={color} radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
