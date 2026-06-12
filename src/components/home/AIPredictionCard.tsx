/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiRequest } from '../../utils/api';

interface AIPredictionMatch {
  matchId: string;
  home: string;
  away: string;
  matchTime: string;
  predictResult: string;
  predictScore: string;
  confidence: string;
  totalGoals?: string;
  odds?: string;
  reason: string;
  disclaimer: string;
}

interface AIPredictionCardData {
  success: boolean;
  updatedAt: string;
  title: string;
  summary: string;
  matches: AIPredictionMatch[];
}

export default function AIPredictionCard() {
  const [data, setData] = useState<AIPredictionCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchPredictionCard();
  }, []);

  const fetchPredictionCard = async () => {
    setLoading(true);
    setError(false);
    try {
      const resp = await apiRequest('/api/home/ai-prediction-card');
      setData(resp);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 rounded-lg bg-slate-200" />
          <div className="h-4 w-48 rounded-lg bg-slate-100" />
          <div className="h-20 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !data || !data.success) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-cyan-500" />
          <h3 className="text-sm font-black text-slate-900">AI 预测</h3>
        </div>
        <div className="mt-3 rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 ring-1 ring-slate-100">
          <p className="text-xs text-slate-600">AI预测数据暂时开小差了，稍后再来看看。</p>
        </div>
      </div>
    );
  }

  if (!data.matches || data.matches.length === 0) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-cyan-500" />
          <h3 className="text-sm font-black text-slate-900">{data.title}</h3>
        </div>
        <div className="mt-3 rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 ring-1 ring-slate-100">
          <p className="text-xs text-slate-600">{data.summary}</p>
        </div>
        <p className="mt-3 text-[9px] text-amber-600/70">AI预测仅供娱乐参考，不作为任何建议</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-cyan-500" />
          <h3 className="text-sm font-black text-slate-900">{data.title}</h3>
        </div>
        <span className="text-[9px] text-slate-400">
          {new Date(data.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-600">{data.summary}</p>

      <div className="mt-4 space-y-3">
        {data.matches.map((match) => (
          <div
            key={match.matchId}
            className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <span>{match.home}</span>
                <span className="text-slate-400">vs</span>
                <span>{match.away}</span>
              </div>
              <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700 ring-1 ring-cyan-100">
                {match.confidence}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-bold text-slate-500">预测结果</div>
                <div className="mt-1 text-xs font-black text-slate-900">{match.predictResult}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500">比分参考</div>
                <div className="mt-1 text-xs font-black text-slate-900">{match.predictScore}</div>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-white/60 p-3">
              <p className="text-[11px] leading-5 text-slate-700">{match.reason}</p>
            </div>

            <p className="mt-2 text-[9px] text-amber-600/70">{match.disclaimer}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[9px] text-amber-600/70">AI预测仅供娱乐参考，不作为任何建议</p>
    </div>
  );
}
