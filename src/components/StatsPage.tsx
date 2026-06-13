import React, { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Target } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { useScrollReveal } from '../animations';

type ChartDatum = { label: string; value: number };

type AccuracyDatum = { label: string; value: number; settled: number; won: number };

type StatsSummary = {
  userPredictionDistribution: ChartDatum[];
  popularBetOptions: ChartDatum[];
  championPickDistribution: ChartDatum[];
  correctScoreHeat: ChartDatum[];
  userAccuracyRank: AccuracyDatum[];
};

const PIE_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444', '#64748b'];

export default function StatsPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);

  useScrollReveal(section1Ref);
  useScrollReveal(section2Ref);
  useScrollReveal(section3Ref);
  useScrollReveal(section4Ref);

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
      <section ref={section1Ref} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
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

      <section ref={section2Ref} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
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
        <section ref={section3Ref} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
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
        <ChartCard ref={section4Ref} title="比分选择热度" data={stats.correctScoreHeat} color="#f59e0b" />
      </section>

      {/* 群内预测准确率排行 */}
      {stats.userAccuracyRank && stats.userAccuracyRank.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2">
            <Target className="h-4.5 w-4.5 text-emerald-500" />
            <h3 className="text-sm font-black text-slate-900">群内预测准确率</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">谁的眼光最准？按命中率排名，至少参与 1 场已结算竞猜。</p>
          <div className="mt-4 space-y-2">
            {stats.userAccuracyRank.map((item, idx) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'
                }`}>{idx + 1}</span>
                <span className="flex-1 text-sm font-bold text-slate-800">{item.label}</span>
                <span className="text-xs text-slate-500">{item.won}/{item.settled} 中</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${item.value >= 60 ? 'bg-emerald-500' : item.value >= 40 ? 'bg-amber-500' : 'bg-rose-400'}`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <span className={`text-sm font-black ${item.value >= 60 ? 'text-emerald-600' : item.value >= 40 ? 'text-amber-600' : 'text-rose-500'}`}>
                    {item.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const ChartCard = React.forwardRef<HTMLDivElement, { title: string; data: ChartDatum[]; color: string }>(
  function ChartCard({ title, data, color }, ref) {
    return (
      <section ref={ref} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
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
  },
);
