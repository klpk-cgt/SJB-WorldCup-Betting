import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import type { Transaction } from '../../types';

interface NetProfitChartProps {
  transactions: Transaction[];
}

function formatSigned(value: number) {
  if (value > 0) return `+${value.toLocaleString()}`;
  return value.toLocaleString();
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function NetProfitChart({ transactions }: NetProfitChartProps) {
  const { data, currentValue, peakValue, isPositive } = useMemo(() => {
    const sorted = [...transactions]
      .filter((tx) => tx.type !== 'INITIAL_GRANT')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const points: Array<{ idx: number; label: string; value: number }> = [
      { idx: 0, label: '起', value: 0 },
    ];

    let cumulative = 0;
    sorted.forEach((tx, i) => {
      cumulative += tx.amount;
      points.push({
        idx: i + 1,
        label: formatDateShort(tx.createdAt),
        value: cumulative,
      });
    });

    const current = cumulative;
    const peak = points.reduce((max, p) => Math.max(max, p.value), 0);
    const positive = current >= 0;

    return { data: points, currentValue: current, peakValue: peak, isPositive: positive };
  }, [transactions]);

  if (data.length <= 1) {
    return (
      <div className="profile-chart-card">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-bold text-slate-600">累计净收益</p>
            <p className={`text-2xl font-extrabold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
              {formatSigned(currentValue)}
            </p>
          </div>
        </div>
        <div className="flex h-[110px] items-center justify-center rounded-xl bg-slate-50 text-xs font-semibold text-slate-400">
          暂无收益数据
        </div>
      </div>
    );
  }

  const color = isPositive ? '#10b981' : '#f43f5e';
  const colorDark = isPositive ? '#059669' : '#e11d48';
  const gradientId = isPositive ? 'profitGradEmerald' : 'profitGradRose';

  return (
    <div className="profile-chart-card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-bold text-slate-600">累计净收益</p>
          <p className={`text-2xl font-extrabold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>
            {formatSigned(currentValue)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-500">峰值</p>
          <p className="text-sm font-extrabold text-amber-600 tabular-nums">{formatSigned(peakValue)}</p>
        </div>
      </div>
      <div style={{ width: '100%', height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 10px',
              }}
              labelStyle={{ color: '#64748b', fontSize: '10px' }}
              formatter={(value: number) => [formatSigned(value), '净收益']}
              labelFormatter={(label: string) => `日期 ${label}`}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={colorDark}
              strokeWidth={2.2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: '#fff', stroke: colorDark, strokeWidth: 2.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
