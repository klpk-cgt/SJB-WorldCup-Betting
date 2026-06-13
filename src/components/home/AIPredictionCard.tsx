/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Sparkles, MapPin, AlertTriangle, Star, Flame } from 'lucide-react';
import { apiRequest } from '../../utils/api';

interface AIPredictionMatch {
  matchId: string;
  home: string;
  away: string;
  matchTime: string;
  predictResult: string;
  predictScore: string;
  confidence: string;
  confidenceLevel: string;
  confidenceColor: string;
  totalGoals?: string;
  odds?: string;
  injury?: string;
  venue?: string;
  isFocus?: boolean;
  tags?: string[];
  reason: string;
  source: string;
  disclaimer: string;
}

interface AIPredictionCardData {
  success: boolean;
  updatedAt: string;
  title: string;
  summary: string;
  matches: AIPredictionMatch[];
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-200', dot: 'bg-cyan-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-200', dot: 'bg-slate-400' },
};

const TAG_ICONS: Record<string, React.ReactNode> = {
  '揭幕战': <Star className="h-3 w-3" />,
  '焦点战': <Star className="h-3 w-3" />,
  '死亡之组': <Flame className="h-3 w-3" />,
};

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
      const response = await apiRequest('/api/home/ai-prediction-card');
      setData(response);
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
          <h3 className="text-sm font-black text-slate-900">今日 AI 娱乐预测</h3>
        </div>
        <div className="mt-3 rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 ring-1 ring-slate-100">
          <p className="text-xs text-slate-600">AI 预测暂时加载失败，请稍后刷新再试。</p>
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
        <p className="mt-3 text-[9px] text-amber-600/70">AI 预测仅供群内娱乐参考，不构成正式建议。</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-cyan-500" />
          <h3 className="text-sm font-black text-slate-900">{data.title}</h3>
        </div>
        <span className="text-[9px] text-slate-400">
          {new Date(data.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 更新
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-600">{data.summary}</p>

      {/* Match cards */}
      <div className="mt-4 space-y-3">
        {data.matches.map((match) => {
          const colorKey = match.confidenceColor || 'slate';
          const style = LEVEL_STYLES[colorKey] || LEVEL_STYLES.slate;

          return (
            <div
              key={match.matchId}
              className={`rounded-2xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ${style.ring} relative overflow-hidden`}
            >
              {/* Focus indicator */}
              {match.isFocus && (
                <div className="absolute top-0 right-0 rounded-bl-xl bg-amber-400 px-2 py-0.5">
                  <span className="text-[9px] font-bold text-white">焦点战</span>
                </div>
              )}

              {/* Team names + confidence badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <span>{match.home}</span>
                  <span className="text-slate-400 text-xs font-normal">vs</span>
                  <span>{match.away}</span>
                </div>
                <span className={`rounded-full ${style.bg} px-2.5 py-0.5 text-[10px] font-bold ${style.text} ring-1 ${style.ring} flex items-center gap-1`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                  {match.confidence}
                </span>
              </div>

              {/* Tags */}
              {match.tags && match.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {match.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 ring-1 ring-amber-100">
                      {TAG_ICONS[tag]}
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Prediction details grid */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/70 p-2">
                  <div className="text-[9px] font-bold text-slate-400">预测结果</div>
                  <div className="mt-0.5 text-xs font-black text-slate-900">{match.predictResult}</div>
                </div>
                <div className="rounded-xl bg-white/70 p-2">
                  <div className="text-[9px] font-bold text-slate-400">参考比分</div>
                  <div className="mt-0.5 text-xs font-black text-slate-900">{match.predictScore}</div>
                </div>
                <div className="rounded-xl bg-white/70 p-2">
                  <div className="text-[9px] font-bold text-slate-400">竞彩赔率</div>
                  <div className="mt-0.5 text-[10px] font-bold text-slate-900 font-mono">{match.odds || '待定'}</div>
                </div>
              </div>

              {/* Injury info */}
              {match.injury && (
                <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50/60 p-2 ring-1 ring-amber-100/50">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                  <p className="text-[10px] leading-4 text-amber-800">{match.injury}</p>
                </div>
              )}

              {/* Venue */}
              {match.venue && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{match.venue}</span>
                </div>
              )}

              <p className="mt-2 text-[9px] text-amber-600/70">{match.disclaimer}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[9px] text-amber-600/70">AI 预测仅供群内娱乐参考，不构成正式建议。</p>
    </div>
  );
}
