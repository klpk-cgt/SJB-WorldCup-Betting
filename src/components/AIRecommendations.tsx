/**
 * AI 推荐跟投页面
 * 展示 AI 分析后的推荐投注方案，支持一键跟投
 */
import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Shield, Target, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../utils/api';
import { useToast } from './ToastProvider';

interface Recommendation {
  matchId: string;
  label: string;
  market: string;
  option: string;
  optionLabel: string;
  odds: number;
  confidence: number;
  reason: string;
  suggestedStake: number;
}

interface RecommendationData {
  recommendations: Recommendation[];
  total: number;
  aiNote: string;
  generatedAt: string;
}

export default function AIRecommendations({ onNavigate }: { onNavigate: (tab: string, matchId?: string) => void }) {
  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const resp = await apiRequest('/api/ai/recommendations');
      setData(resp);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (rec: Recommendation) => {
    setFollowing(rec.matchId);
    try {
      const userResp = await apiRequest('/api/user/profile');
      const wallet = userResp.wallet;

      if (wallet.balance < rec.suggestedStake) {
        toast.error('积分不足', `需要 ${rec.suggestedStake} 积分，当前余额 ${wallet.balance}`);
        return;
      }

      await apiRequest('/api/predictions', {
        method: 'POST',
        body: JSON.stringify({
          matchId: rec.matchId,
          market: rec.market,
          optionKey: rec.option,
          optionLabel: rec.optionLabel,
          stakePoints: rec.suggestedStake,
        }),
      });

      toast.success('跟投成功', `已跟投 ${rec.optionLabel}，${rec.suggestedStake} 积分`);

      onNavigate('predictions');
    } catch (e: any) {
      toast.error('跟投失败', e.message || '请稍后重试');
    } finally {
      setFollowing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-sm text-slate-400">AI 正在分析...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            AI 推荐
          </h2>
          <p className="text-xs text-slate-500 mt-1">基于赔率分析的推荐方案</p>
        </div>
        <button
          onClick={fetchRecommendations}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
        >
          刷新推荐
        </button>
      </div>

      {data?.aiNote && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="text-xs text-amber-700">{data.aiNote}</p>
        </div>
      )}

      {!data?.recommendations || data.recommendations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Target className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">暂无推荐</p>
          <p className="text-xs text-slate-400 mt-1">比赛未锁定或无可用赔率时，AI 会暂时不提供推荐</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.recommendations.map((rec, i) => (
            <div
              key={rec.matchId}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100 mb-1">
                    <Sparkles className="h-3 w-3" />
                    推荐 #{i + 1}
                  </span>
                  <h3 className="text-sm font-black text-slate-900">{rec.label}</h3>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-slate-900">{rec.odds.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400">赔率</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] font-bold text-slate-400">推荐选项</div>
                  <div className="text-sm font-black text-slate-900">{rec.optionLabel}</div>
                  <div className="text-[10px] text-slate-400">胜平负</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] font-bold text-slate-400">建议投入</div>
                  <div className="text-sm font-black text-slate-900">{rec.suggestedStake} 积分</div>
                  <div className="text-[10px] text-slate-400">
                    预期回报 {Math.round(rec.suggestedStake * rec.odds)}
                  </div>
                </div>
              </div>

              {/* 置信度条 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500">置信度</span>
                  <span className="text-[10px] font-bold text-slate-900">{rec.confidence}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      rec.confidence >= 60 ? 'bg-emerald-500' : rec.confidence >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${rec.confidence}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-4">{rec.reason}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => onNavigate('match-detail', rec.matchId)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <Target className="h-3.5 w-3.5 inline mr-1" />
                  查看比赛
                </button>
                <button
                  onClick={() => handleFollow(rec)}
                  disabled={following === rec.matchId}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {following === rec.matchId ? (
                    '跟投中...'
                  ) : (
                    <>
                      <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
                      一键跟投
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.generatedAt && (
        <div className="text-center text-[10px] text-slate-400">
          推荐生成时间: {new Date(data.generatedAt).toLocaleString('zh-CN')}
        </div>
      )}
    </div>
  );
}
