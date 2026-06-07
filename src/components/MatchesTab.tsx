/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Clock3,
  EyeOff,
  GitBranch,
  Info,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { BracketState, Match, MatchOdds, MatchStatus } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import FlagBadge from './home/FlagBadge';
import TeamDetailDrawer from './TeamDetailDrawer';

interface MatchesTabProps {
  onNavigate: (tab: string, matchId?: string, detailTab?: string) => void;
  selectedMatchId?: string;
  isAdmin: boolean;
  defaultDetailTab?: 'events' | 'lineup' | 'stats';
}

type PrimaryView = 'schedule' | 'bracket';

function formatCountdown(target: string, now: number) {
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return '00:00:00';

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}

export default function MatchesTab({ onNavigate, selectedMatchId, isAdmin, defaultDetailTab }: MatchesTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [bracket, setBracket] = useState<BracketState | null>(null);
  const [friendPicks, setFriendPicks] = useState<any[]>([]);
  const [friendVisibility, setFriendVisibility] = useState<'after_kickoff_revealed' | 'hidden_before_kickoff'>(
    'hidden_before_kickoff',
  );
  const [filterTeam, setFilterTeam] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [filterGroup, setFilterGroup] = useState<string>('All');
  const [filterDate, setFilterDate] = useState<string>('2026-06-12');
  const [primaryView, setPrimaryView] = useState<PrimaryView>('schedule');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeMatch, setActiveMatch] = useState<any | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'events' | 'lineup' | 'stats'>('events');
  const [aiPrediction, setAiPrediction] = useState<any | null>(null);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [teamDetailId, setTeamDetailId] = useState<string | null>(null);
  const [teamDetailOpen, setTeamDetailOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadBracket = async () => {
    const data = await apiRequest('/api/bracket');
    setBracket(data);
  };

  const loadMatches = async () => {
    const data = await apiRequest('/api/matches');
    setMatches(data);

    if (selectedMatchId === '__bracket__') {
      setPrimaryView('bracket');
      return;
    }

    if (selectedMatchId) {
      const target = data.find((match: Match) => match.id === selectedMatchId);
      if (target) {
        await handleMatchSelect(target);
      }
    }
  };

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([loadMatches(), loadBracket()]);
      } catch (error) {
        console.error('Failed to load match center data', error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [selectedMatchId]);

  const handleMatchSelect = async (match: Match) => {
    try {
      const [detailed, predictionResponse, analysisResponse, friendResponse] = await Promise.all([
        apiRequest(`/api/matches/${match.id}`),
        apiRequest(`/api/ai/match/${match.id}/prediction`).catch(() => null),
        apiRequest(`/api/ai/match/${match.id}/analysis`).catch(() => null),
        apiRequest(`/api/matches/${match.id}/friend-picks`).catch(() => null),
      ]);

      setPrimaryView('schedule');
      setActiveMatch(detailed);
      setAiPrediction(predictionResponse);
      setAiReport(analysisResponse);
      setFriendPicks(friendResponse?.picks || []);
      setFriendVisibility(friendResponse?.visibility || 'hidden_before_kickoff');
      setActiveDetailTab(defaultDetailTab || 'events');
    } catch (error) {
      console.error('Failed to get match details', error);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await apiRequest('/api/admin/sync/fixtures', { method: 'POST' });
      await Promise.all([loadMatches(), loadBracket()]);
    } catch (error: any) {
      alert(error.message || '赛程同步失败，请稍后重试。');
    } finally {
      setSyncing(false);
    }
  };

  const triggerAiRefresh = async () => {
    if (!activeMatch) return;
    setGeneratingAi(true);
    try {
      const res = await apiRequest(`/api/admin/ai/match/${activeMatch.id}/regenerate`, {
        method: 'POST',
      });
      setAiPrediction(res.prediction || null);
      setAiReport(res.analysis || null);
    } catch (error: any) {
      alert(error.message || 'AI 看点生成失败，请稍后重试。');
    } finally {
      setGeneratingAi(false);
    }
  };

  const dateList = useMemo(() => {
    const dates = [...new Set(matches.map(m => {
      const d = new Date(m.startTimeUtc);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }))];
    dates.sort();
    return dates;
  }, [matches]);

  const groupList = useMemo(() => {
    const groups = [...new Set(matches
      .filter(m => (m.stage || '').toLowerCase().includes('group'))
      .map(m => m.homeTeam?.groupName || m.awayTeam?.groupName || '')
      .filter(Boolean)
    )];
    groups.sort();
    return groups;
  }, [matches]);

  const filtered = useMemo(() => {
    return matches.filter((match) => {
      const homeName = match.homeTeam?.nameZh || '';
      const awayName = match.awayTeam?.nameZh || '';
      const matchesTeam = filterTeam === '' || homeName.includes(filterTeam) || awayName.includes(filterTeam);
      if (!matchesTeam) return false;
      if (filterStage === 'All') {
        // nothing
      } else if (filterStage === 'Group Stage') {
        if (!(match.stage || '').toLowerCase().includes('group')) return false;
      } else {
        if (match.stage !== filterStage) return false;
      }
      if (filterGroup !== 'All') {
        const matchGroup = match.homeTeam?.groupName || match.awayTeam?.groupName || '';
        if (matchGroup !== filterGroup) return false;
      }
      if (filterDate !== 'all') {
        const d = new Date(match.startTimeUtc);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (dateStr !== filterDate) return false;
      }
      return true;
    });
  }, [filterStage, filterTeam, filterGroup, filterDate, matches]);

  useEffect(() => {
    if (loading || primaryView !== 'schedule' || filtered.length === 0) return;
    const activeStillVisible = activeMatch && filtered.some((match) => match.id === activeMatch.id);
    if (!activeStillVisible) {
      handleMatchSelect(filtered[0]);
    }
  }, [activeMatch, filtered, loading, primaryView]);

  const heroStatus = useMemo(() => {
    if (!activeMatch) return null;

    if (activeMatch.status === MatchStatus.LIVE || activeMatch.status === MatchStatus.HT) {
      return {
        badge: '比赛进行中',
        value: `${activeMatch.homeScore ?? 0} : ${activeMatch.awayScore ?? 0}`,
        caption: '实时比分',
      };
    }

    if ([MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(activeMatch.status)) {
      return {
        badge: '赛后结果',
        value: `${activeMatch.homeScore ?? 0} : ${activeMatch.awayScore ?? 0}`,
        caption: '全场比分',
      };
    }

    return {
      badge: activeMatch.stage,
      value: formatCountdown(activeMatch.startTimeUtc, now),
      caption: '距离开赛',
    };
  }, [activeMatch, now]);

  const oddsCards = useMemo(() => {
    if (!activeMatch?.odds) return [];
    const odds: MatchOdds = activeMatch.odds;
    return [
      { label: `${activeMatch.homeTeam?.nameZh} 胜`, value: odds.h2h.homeWin },
      { label: '平局', value: odds.h2h.draw },
      { label: `${activeMatch.awayTeam?.nameZh} 胜`, value: odds.h2h.awayWin },
    ];
  }, [activeMatch]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">正在加载世界赛事中枢...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">赛程与淘汰赛进程</h3>
            <p className="mt-1 text-xs text-slate-500">赛程看单场，对阵图看世界杯整体推进。</p>
          </div>
          {isAdmin && (
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-white disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '同步中' : '同步赛程'}
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => setPrimaryView('schedule')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
              primaryView === 'schedule' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            赛程列表
          </button>
          <button
            onClick={() => setPrimaryView('bracket')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
              primaryView === 'bracket' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            淘汰赛对阵图
          </button>
        </div>

        {primaryView === 'schedule' && (
          <div className="mt-4 space-y-3">
            {/* 日期横滑选择器 - 紧凑双行，默认选中6/12，全部在最后 */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {dateList.map(dateStr => {
                const d = new Date(dateStr + 'T00:00:00');
                const weekday = ['日','一','二','三','四','五','六'][d.getDay()];
                const label = `${d.getMonth()+1}/${d.getDate()}`;
                const count = matches.filter(m => {
                  const md = new Date(m.startTimeUtc);
                  return `${md.getFullYear()}-${String(md.getMonth()+1).padStart(2,'0')}-${String(md.getDate()).padStart(2,'0')}` === dateStr;
                }).length;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setFilterDate(dateStr)}
                    className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                      filterDate === dateStr ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}<span className="opacity-60 ml-0.5">{count}场</span>
                  </button>
                );
              })}
              <button
                onClick={() => setFilterDate('all')}
                className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                  filterDate === 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部
              </button>
            </div>

            {/* 小组筛选 - 仅小组赛阶段显示 */}
            {filterStage === 'Group Stage' && groupList.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <button
                  onClick={() => setFilterGroup('All')}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    filterGroup === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  全部小组
                </button>
                {groupList.map(g => {
                  const letter = g.match(/Group\s+([A-Z])/i)?.[1] || g;
                  return (
                    <button
                      key={g}
                      onClick={() => setFilterGroup(g)}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        filterGroup === g ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {letter}组
                    </button>
                  );
                })}
              </div>
            )}

            {/* 搜索+阶段筛选 */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="搜索国家队"
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
              />
              <select
                value={filterStage}
                onChange={(e) => { setFilterStage(e.target.value); setFilterGroup('All'); }}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
              >
                <option value="All">全部阶段</option>
                <option value="Group Stage">小组赛</option>
                <option value="Round of 32">32 强</option>
                <option value="Round of 16">16 强</option>
                <option value="Quarter-finals">8 强</option>
                <option value="Semi-finals">半决赛</option>
                <option value="Final">决赛</option>
              </select>
            </div>
          </div>
        )}
      </section>

      {primaryView === 'bracket' ? (
        <BracketBoard bracket={bracket} onOpenMatch={(matchId) => matchId && onNavigate('matches', matchId)} />
      ) : (
        <>
          {activeMatch && heroStatus && (
            <>
              <section className="overflow-hidden rounded-[32px] border border-slate-900/80 bg-slate-950 px-5 py-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                      {heroStatus.badge}
                    </span>
                    <h2 className="mt-3 text-[26px] font-black tracking-tight">
                      {activeMatch.homeTeam?.nameZh} vs {activeMatch.awayTeam?.nameZh}
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">
                      {activeMatch.roundName} · {activeMatch.venueName}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
                    {formatDate(activeMatch.startTimeUtc)}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <TeamHeroSide team={activeMatch.homeTeam} align="left" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-200/80">{heroStatus.caption}</p>
                    <p className="mt-2 text-3xl font-black tracking-[0.1em]">{heroStatus.value}</p>
                    <p className="mt-2 text-xs text-slate-300">{activeMatch.stage}</p>
                  </div>
                  <TeamHeroSide team={activeMatch.awayTeam} align="right" />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onNavigate('prediction', activeMatch.id)}
                    className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 active:scale-[0.98]"
                  >
                    去竞猜
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </button>
                  <button
                    onClick={() => setActiveDetailTab('events')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/14 active:scale-[0.98]"
                  >
                    看比赛动态
                  </button>
                </div>
              </section>

              <SimpleSection title="竞猜入口与赔率摘要" icon={<Clock3 className="h-4.5 w-4.5 text-emerald-600" />}>
                <div className="grid grid-cols-3 gap-3">
                  {oddsCards.map((card) => (
                    <div key={card.label} className="rounded-3xl border border-slate-200 bg-slate-50 px-3 py-4 text-center">
                      <p className="text-xs font-bold text-slate-500">{card.label}</p>
                      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{card.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-3xl bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-4 ring-1 ring-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">先完成这一场的娱乐竞猜</p>
                      <p className="mt-1 text-xs leading-6 text-slate-500">看完赔率摘要，再去做单场选择会更顺手。</p>
                    </div>
                    <button
                      onClick={() => onNavigate('prediction', activeMatch.id)}
                      className="shrink-0 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                    >
                      去竞猜
                    </button>
                  </div>
                </div>
              </SimpleSection>

              <SimpleSection title="群友倾向" icon={<Users className="h-4.5 w-4.5 text-indigo-500" />}>
                <div className="space-y-3">
                  {[
                    { label: `${activeMatch.homeTeam?.nameZh} 胜`, value: activeMatch.sentiment?.home ?? 45, color: 'bg-emerald-500' },
                    { label: '平局', value: activeMatch.sentiment?.draw ?? 10, color: 'bg-amber-500' },
                    { label: `${activeMatch.awayTeam?.nameZh} 胜`, value: activeMatch.sentiment?.away ?? 45, color: 'bg-indigo-500' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </SimpleSection>

              <SimpleSection title="好友预测" icon={<Users className="h-4.5 w-4.5 text-violet-500" />}>
                {friendVisibility === 'hidden_before_kickoff' ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                      <EyeOff className="h-4.5 w-4.5" />
                    </div>
                    <p className="mt-3 text-sm font-black text-slate-900">开赛后才展示好友具体选择</p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      赛前先看群体倾向，开赛后再看每个人的具体方向，避免相互抄作业。
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {friendPicks.slice(0, 6).map((pick) => (
                        <span key={pick.id} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                          {pick.avatarUrl} {pick.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : friendPicks.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
                    这场比赛目前还没有好友下注记录。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {friendPicks.map((pick) => (
                      <div key={pick.id} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lg ring-1 ring-slate-200">
                            {pick.avatarUrl || '🙂'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{pick.displayName}</p>
                            <p className="mt-1 text-xs text-slate-500">{pick.optionLabel || '开赛后可见'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-500">{pick.stakePoints ? `${pick.stakePoints} PTS` : '--'}</p>
                          <p
                            className={`mt-1 text-[11px] font-bold ${
                              pick.status === 'WON'
                                ? 'text-emerald-600'
                                : pick.status === 'LOST'
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                            }`}
                          >
                            {pick.status === 'WON'
                              ? `+${pick.settledProfit || 0}`
                              : pick.status === 'LOST'
                                ? `${pick.settledProfit || 0}`
                                : '比赛进行中'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SimpleSection>

              <SimpleSection title="AI 看点" icon={<Sparkles className="h-4.5 w-4.5 text-cyan-500" />}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">官方单一 AI 观点，不做双模型对照。</div>
                  {isAdmin && (
                    <button
                      onClick={triggerAiRefresh}
                      disabled={generatingAi}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-white disabled:opacity-60"
                    >
                      {generatingAi ? '生成中...' : '刷新 AI'}
                    </button>
                  )}
                </div>

                <div className="mt-4 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 ring-1 ring-emerald-100/70">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">AI 倾向</p>
                      <p className="mt-1 text-base font-black text-slate-900">{aiPrediction?.summary || 'AI 预测暂未生成'}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-2 text-right ring-1 ring-emerald-100">
                      <p className="text-[10px] font-bold text-slate-500">参考比分</p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {aiPrediction?.predictionJson?.score_pick || aiPrediction?.outputJson?.score_pick || '--'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {(aiPrediction?.bullets || aiPrediction?.outputJson?.bullets || []).slice(0, 3).map((bullet: string) => (
                      <div key={bullet}>
                        <BulletLine tone="emerald" text={bullet} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                    风险提醒：{aiPrediction?.riskWarning || aiPrediction?.outputJson?.risk_warning || '临场变化可能改变参考判断。'}
                  </div>
                </div>

                <div className="mt-4 rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 ring-1 ring-slate-100">
                  <p className="text-base font-black text-slate-900">{aiReport?.title || 'AI 看点暂未生成'}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {aiReport?.summary || aiReport?.content || '这里会显示 AI 赛前分析、要点提炼和风险提醒。'}
                  </p>
                  <div className="mt-4 space-y-2">
                    {(aiReport?.bullets || aiReport?.outputJson?.bullets || []).slice(0, 3).map((bullet: string) => (
                      <div key={bullet}>
                        <BulletLine tone="cyan" text={bullet} />
                      </div>
                    ))}
                  </div>
                </div>
              </SimpleSection>

              <SimpleSection title="事件 / 阵容 / 统计" icon={<BarChart3 className="h-4.5 w-4.5 text-slate-700" />}>
                <div className="flex rounded-2xl bg-slate-100 p-1">
                  {[
                    { key: 'events', label: '事件' },
                    { key: 'lineup', label: '阵容' },
                    { key: 'stats', label: '统计' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveDetailTab(tab.key as 'events' | 'lineup' | 'stats')}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
                        activeDetailTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="mt-5">
                  {activeDetailTab === 'events' && <EventsPanel events={activeMatch.events || []} />}
                  {activeDetailTab === 'lineup' && <LineupPanel match={activeMatch} />}
                  {activeDetailTab === 'stats' && <StatsPanel match={activeMatch} />}
                </div>
              </SimpleSection>
            </>
          )}

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-slate-700" />
                <h3 className="text-sm font-black text-slate-900">赛程列表</h3>
              </div>
              <span className="text-xs font-semibold text-slate-400">{filtered.length} 场</span>
            </div>

            <div className="mt-4 space-y-3">
              {filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
                  没有找到符合筛选条件的比赛。
                </div>
              ) : (
                filtered.map((match) => {
                  const selected = activeMatch?.id === match.id;
                  const statusText =
                    match.status === MatchStatus.LIVE || match.status === MatchStatus.HT
                      ? '进行中'
                      : [MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(match.status)
                        ? '已结束'
                        : '未开赛';

                  return (
                    <button
                      key={match.id}
                      onClick={() => handleMatchSelect(match)}
                      className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                        selected
                          ? 'border-emerald-300 bg-emerald-50/60 shadow-[0_12px_24px_rgba(16,185,129,0.08)]'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <span>{match.stage}</span>
                            <span className="text-slate-300">·</span>
                            <span>{formatDate(match.startTimeUtc)}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-sm font-black text-slate-900">
                            <span
                              className="truncate cursor-pointer hover:text-emerald-600 transition-colors inline-flex items-center gap-0.5 border-b border-dashed border-emerald-400/40 hover:border-emerald-500"
                              onClick={(e) => { e.stopPropagation(); setTeamDetailId(match.homeTeam?.id); setTeamDetailOpen(true); }}
                            >
                              {match.homeTeam?.nameZh}
                              <Info className="h-3 w-3 text-emerald-500/50" />
                            </span>
                            <span className="text-slate-400">
                              {[MatchStatus.LIVE, MatchStatus.HT, MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(match.status)
                                ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`
                                : 'VS'}
                            </span>
                            <span
                              className="truncate cursor-pointer hover:text-emerald-600 transition-colors inline-flex items-center gap-0.5 border-b border-dashed border-emerald-400/40 hover:border-emerald-500"
                              onClick={(e) => { e.stopPropagation(); setTeamDetailId(match.awayTeam?.id); setTeamDetailOpen(true); }}
                            >
                              {match.awayTeam?.nameZh}
                              <Info className="h-3 w-3 text-emerald-500/50" />
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                            {statusText}
                          </span>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}

      <TeamDetailDrawer
        teamId={teamDetailId}
        open={teamDetailOpen}
        onClose={() => setTeamDetailOpen(false)}
      />
    </div>
  );
}

function SimpleSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TeamHeroSide({ team, align }: { team: any; align: 'left' | 'right' }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white/95 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.24)]">
        <img src={team?.logoUrl} alt={team?.nameZh} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
      </div>
      <p className={`mt-3 text-base font-black ${align === 'left' ? '' : ''}`}>{team?.nameZh}</p>
    </div>
  );
}

function BulletLine({ tone, text }: { tone: 'emerald' | 'cyan'; text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-600">
      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${tone === 'emerald' ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
      <span>{text}</span>
    </div>
  );
}

function BracketBoard({ bracket, onOpenMatch }: { bracket: BracketState | null; onOpenMatch: (matchId?: string) => void }) {
  if (!bracket) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        暂时还没有可展示的淘汰赛对阵图。
      </div>
    );
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 px-1">
        <GitBranch className="h-4.5 w-4.5 text-emerald-600" />
        <h3 className="text-sm font-black text-slate-900">官方真实淘汰赛进程</h3>
      </div>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="flex min-w-[960px] gap-4">
          {bracket.rounds.map((round) => (
            <div key={round.key} className="w-[240px] shrink-0">
              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">{round.label}</div>
              <div className="mt-3 space-y-3">
                {round.matches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => onOpenMatch(match.matchId)}
                    disabled={!match.matchId}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                      match.matchId
                        ? 'border-slate-200 bg-slate-50 hover:border-emerald-200 hover:bg-white'
                        : 'cursor-default border-dashed border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <p className="text-[11px] font-bold text-slate-500">{match.title}</p>
                    <div className="mt-3 space-y-2">
                      <BracketTeamRow code={match.homeTeamCode} name={match.homeTeamName || '待定席位'} score={match.homeScore} />
                      <BracketTeamRow code={match.awayTeamCode} name={match.awayTeamName || match.slotLabel || '待定席位'} score={match.awayScore} />
                    </div>
                    {match.startTimeUtc && <p className="mt-3 text-[11px] text-slate-400">{formatDate(match.startTimeUtc)}</p>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BracketTeamRow({ code, name, score }: { code?: string; name: string; score?: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
      <div className="flex min-w-0 items-center gap-2">
        <FlagBadge flagCode={code} size="sm" />
        <span className="truncate text-sm font-bold text-slate-800">{name}</span>
      </div>
      <span className="text-sm font-black text-slate-900">{typeof score === 'number' ? score : '--'}</span>
    </div>
  );
}

function EventsPanel({ events }: { events: any[] }) {
  if (!events.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
        这场比赛暂时还没有可展示的事件流。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <div key={`${event.type}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>{event.minute}'</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200">{event.type}</span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">{event.playerName}</p>
          <p className="mt-1 text-xs leading-6 text-slate-500">{event.detail || '比赛关键节点记录。'}</p>
        </div>
      ))}
    </div>
  );
}

function LineupPanel({ match }: { match: any }) {
  if (!match.lineups) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
        阵容暂未公布。
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {['home', 'away'].map((side) => (
        <div key={side} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900">{side === 'home' ? match.homeTeam?.nameZh : match.awayTeam?.nameZh}</h4>
            <span className="text-xs font-bold text-emerald-700">{match.lineups[side].formation}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">主教练：{match.lineups[side].coach}</p>
          <div className="mt-4 space-y-2">
            {match.lineups[side].starting.map((player: any, index: number) => (
              <div key={index} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm">
                <span className="font-semibold text-slate-800">
                  {player.number}. {player.name}
                </span>
                <span className="text-xs font-bold text-slate-400">{player.position}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsPanel({ match }: { match: any }) {
  if (!match.statistics) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
        比赛统计将在开赛后逐步出现。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4.5 w-4.5 text-emerald-600" />
          <h4 className="text-sm font-black text-slate-900">基础数据</h4>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>{match.homeTeam?.nameZh} 控球率</span>
              <span>{match.statistics.ballPossession.home} / {match.statistics.ballPossession.away}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: match.statistics.ballPossession.home }} />
            </div>
          </div>

          {[
            { label: '射正', home: match.statistics.shotsOnGoal.home, away: match.statistics.shotsOnGoal.away },
            { label: '犯规', home: match.statistics.fouls.home, away: match.statistics.fouls.away },
            { label: '角球', home: match.statistics.cornerKicks.home, away: match.statistics.cornerKicks.away },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 text-sm">
              <span className="font-black text-emerald-700">{row.home}</span>
              <span className="text-xs font-bold text-slate-500">{row.label}</span>
              <span className="font-black text-indigo-700">{row.away}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-indigo-50 p-4 ring-1 ring-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
          <h4 className="text-sm font-black text-slate-900">比赛走势提示</h4>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-600">这里保留轻量数据解释，帮助用户快速理解谁在控场、谁更主动。</p>
      </div>
    </div>
  );
}
