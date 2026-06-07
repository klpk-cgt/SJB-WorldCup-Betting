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
  HelpCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Match, MatchOdds, MatchStatus } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import { getBeijingDayLabel, getMatchesForNearestDays, groupMatchesByDay, sortMatchesByKickoff } from '../utils/matchDisplay';
import FlagBadge from './home/FlagBadge';

interface MatchesTabProps {
  onNavigate: (tab: string, matchId?: string) => void;
  selectedMatchId?: string;
  isAdmin: boolean;
}

function formatCountdown(target: string, now: number) {
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return '00:00:00';

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}

function stageLabel(stage: Match['stage']) {
  const labels: Record<Match['stage'], string> = {
    'Group Stage': '小组赛',
    'Round of 32': '32 强',
    'Round of 16': '16 强',
    'Quarter-finals': '1/4 决赛',
    'Semi-finals': '半决赛',
    Final: '决赛',
    'Third-place play-off': '季军赛',
  };
  return labels[stage] || stage;
}

function TeamMark({ team }: { team: Match['homeTeam'] | Match['awayTeam'] }) {
  if (!team || team.id === 'TBD') {
    return (
      <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.24)]">
        <HelpCircle className="h-8 w-8 text-slate-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.24)]">
      <FlagBadge flagCode={team.code} size="lg" />
    </div>
  );
}

export default function MatchesTab({ onNavigate, selectedMatchId, isAdmin }: MatchesTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'events' | 'lineup' | 'stats'>('events');
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showAllMatches, setShowAllMatches] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadMatches = async () => {
    try {
      const data = await apiRequest('/api/matches');
      setMatches(data);

      if (selectedMatchId) {
        const target = data.find((match: Match) => match.id === selectedMatchId);
        if (target) {
          await handleMatchSelect(target);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to query matches', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [selectedMatchId]);

  const handleMatchSelect = async (match: Match) => {
    try {
      const detailed = await apiRequest(`/api/matches/${match.id}`);
      setActiveMatch(detailed);
      setActiveDetailTab('events');

      const aiResponse = await apiRequest(`/api/ai/match/${match.id}`);
      const info = aiResponse.find((item: any) => item.type === 'PRE_MATCH_ANALYSIS') || aiResponse[0];
      setAiReport(info || null);
    } catch (e) {
      console.error('Failed to get match details', e);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await apiRequest('/api/admin/sync/fixtures', { method: 'POST' });
      await loadMatches();
    } catch (e: any) {
      alert(e.message || '赛程同步失败，请稍后重试。');
    } finally {
      setSyncing(false);
    }
  };

  const triggerGeminiReport = async () => {
    if (!activeMatch) return;
    setGeneratingAi(true);
    try {
      const res = await apiRequest(`/api/ai/match/${activeMatch.id}/preview`, {
        method: 'POST',
      });
      setAiReport(res.aiContent);
    } catch (e: any) {
      alert(e.message || 'AI 看点生成失败，请稍后重试。');
    } finally {
      setGeneratingAi(false);
    }
  };

  const filtered = useMemo(() => {
    return sortMatchesByKickoff(
      matches.filter((match) => {
        const homeName = match.homeTeam?.nameZh || '';
        const awayName = match.awayTeam?.nameZh || '';
        const matchesTeam = filterTeam === '' || homeName.includes(filterTeam) || awayName.includes(filterTeam);

        if (!matchesTeam) return false;
        if (filterStage === 'All') return true;
        if (filterStage === 'Group Stage') return (match.stage || '').toLowerCase().includes('group');
        return match.stage === filterStage;
      }),
    );
  }, [filterStage, filterTeam, matches]);

  const recentWindowMatches = useMemo(() => getMatchesForNearestDays(filtered, 2), [filtered]);
  const displayedMatches = useMemo(() => (showAllMatches ? filtered : recentWindowMatches), [filtered, recentWindowMatches, showAllMatches]);
  const groupedMatches = useMemo(() => groupMatchesByDay(displayedMatches), [displayedMatches]);

  useEffect(() => {
    if (loading || filtered.length === 0) return;

    const stillVisible = activeMatch && filtered.some((match) => match.id === activeMatch.id);
    if (stillVisible) return;

    handleMatchSelect(filtered[0]);
  }, [activeMatch, filtered, loading]);

  const heroStatus = useMemo(() => {
    if (!activeMatch) return null;

    if (activeMatch.status === MatchStatus.LIVE) {
      return {
        badge: '比赛进行中',
        value: `${activeMatch.homeScore ?? 0} : ${activeMatch.awayScore ?? 0}`,
        caption: '实时比分',
        tone: 'bg-rose-500/15 text-rose-100 border-rose-300/20',
      };
    }

    if ([MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(activeMatch.status)) {
      return {
        badge: '赛后结果',
        value: `${activeMatch.homeScore ?? 0} : ${activeMatch.awayScore ?? 0}`,
        caption: '全场比分',
        tone: 'bg-white/10 text-white/90 border-white/15',
      };
    }

    return {
      badge: stageLabel(activeMatch.stage),
      value: formatCountdown(activeMatch.startTimeUtc, now),
      caption: '距离开赛',
      tone: 'bg-white/10 text-white/90 border-white/15',
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

  const hiddenDayCount = Math.max(groupMatchesByDay(filtered).length - groupedMatches.length, 0);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">正在加载赛程中心...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20">
      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">赛程与比赛详情</h3>
            <p className="mt-1 text-xs text-slate-500">默认先看最近两天，想找更远的比赛再展开全部赛程。</p>
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

        <div className="mt-4 grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="搜索球队"
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
          />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white"
          >
            <option value="All">全部阶段</option>
            <option value="Group Stage">小组赛</option>
            <option value="Round of 32">32 强淘汰赛</option>
            <option value="Round of 16">16 强淘汰赛</option>
            <option value="Quarter-finals">1/4 决赛</option>
            <option value="Semi-finals">半决赛</option>
            <option value="Final">决赛</option>
          </select>
        </div>
      </section>

      {activeMatch && heroStatus && (
        <>
          <section className="overflow-hidden rounded-[32px] border border-slate-900/80 bg-slate-950 px-5 py-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
            <div className="pointer-events-none absolute inset-x-12 mt-24 h-20 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${heroStatus.tone}`}>
                  {heroStatus.badge}
                </span>
                <h2 className="mt-3 text-[26px] font-black tracking-tight">
                  {activeMatch.homeTeam?.nameZh} vs {activeMatch.awayTeam?.nameZh}
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  {activeMatch.roundName} · {activeMatch.venueName || '待更新球场'}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
                {formatDate(activeMatch.startTimeUtc)}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="text-center">
                <TeamMark team={activeMatch.homeTeam} />
                <p className="mt-3 text-base font-black">{activeMatch.homeTeam?.nameZh || '待定'}</p>
              </div>

              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-200/80">{heroStatus.caption}</p>
                <p className="mt-2 text-3xl font-black tracking-[0.1em]">{heroStatus.value}</p>
                <p className="mt-2 text-xs text-slate-300">{stageLabel(activeMatch.stage)}</p>
              </div>

              <div className="text-center">
                <TeamMark team={activeMatch.awayTeam} />
                <p className="mt-3 text-base font-black">{activeMatch.awayTeam?.nameZh || '待定'}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {activeMatch.homeTeamId !== 'TBD' && activeMatch.awayTeamId !== 'TBD' ? (
                <>
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
                    查看比赛动态
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setActiveDetailTab('events')}
                  className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/14 active:scale-[0.98]"
                >
                  查看比赛动态
                </button>
              )}
            </div>
          </section>

          {activeMatch.homeTeamId !== 'TBD' && activeMatch.awayTeamId !== 'TBD' && oddsCards.length > 0 && (
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4.5 w-4.5 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-900">竞猜入口与赔率摘要</h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">90 分钟胜平负</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
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
                    <p className="text-sm font-black text-slate-900">先判断走势，再进竞猜页细看玩法</p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      这里先看主胜/平局/客胜的粗粒度赔率，想投比分或总进球再进入竞猜页。
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('prediction', activeMatch.id)}
                    className="shrink-0 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                  >
                    去竞猜
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-indigo-500" />
              <h3 className="text-sm font-black text-slate-900">群友倾向</h3>
            </div>

            <div className="mt-4 space-y-3">
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
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-cyan-500" />
                <h3 className="text-sm font-black text-slate-900">AI 赛前 / 赛后看点</h3>
              </div>
              {isAdmin && (
                <button
                  onClick={triggerGeminiReport}
                  disabled={generatingAi}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-white disabled:opacity-60"
                >
                  {generatingAi ? '生成中...' : '刷新 AI 看点'}
                </button>
              )}
            </div>

            <div className="mt-4 rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 ring-1 ring-slate-100">
              <p className="text-base font-black text-slate-900">{aiReport?.title || 'AI 看点暂未生成'}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {aiReport?.content || '这里会展示一段轻量赛前分析、节奏提醒，或赛后复盘文案。'}
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
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
              {activeDetailTab === 'events' && (
                <div className="space-y-3">
                  {activeMatch.events?.length ? (
                    activeMatch.events.map((event: any, index: number) => (
                      <div key={`${event.type}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span>{event.minute}'</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200">
                            {event.type}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-black text-slate-900">{event.playerName}</p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">{event.detail || '比赛关键节点记录。'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
                      这场比赛暂时还没有可展示的事件流。
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'lineup' && (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeMatch.lineups ? (
                    <>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900">{activeMatch.homeTeam?.nameZh}</h4>
                          <span className="text-xs font-bold text-emerald-700">{activeMatch.lineups.home.formation}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">主教练：{activeMatch.lineups.home.coach}</p>
                        <div className="mt-4 space-y-2">
                          {activeMatch.lineups.home.starting.map((player: any, index: number) => (
                            <div key={index} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm">
                              <span className="font-semibold text-slate-800">
                                {player.number}. {player.name}
                              </span>
                              <span className="text-xs font-bold text-slate-400">{player.position}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900">{activeMatch.awayTeam?.nameZh}</h4>
                          <span className="text-xs font-bold text-indigo-700">{activeMatch.lineups.away.formation}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">主教练：{activeMatch.lineups.away.coach}</p>
                        <div className="mt-4 space-y-2">
                          {activeMatch.lineups.away.starting.map((player: any, index: number) => (
                            <div key={index} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm">
                              <span className="font-semibold text-slate-800">
                                {player.number}. {player.name}
                              </span>
                              <span className="text-xs font-bold text-slate-400">{player.position}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
                      阵容暂未公布。
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'stats' && (
                <div className="space-y-4">
                  {activeMatch.statistics ? (
                    <>
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4.5 w-4.5 text-emerald-600" />
                          <h4 className="text-sm font-black text-slate-900">基础数据</h4>
                        </div>

                        <div className="mt-4 space-y-4">
                          <div>
                            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
                              <span>{activeMatch.homeTeam?.nameZh} 控球率</span>
                              <span>
                                {activeMatch.statistics.ballPossession.home} / {activeMatch.statistics.ballPossession.away}
                              </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: activeMatch.statistics.ballPossession.home }}
                              />
                            </div>
                          </div>

                          {[
                            { label: '射正', home: activeMatch.statistics.shotsOnGoal.home, away: activeMatch.statistics.shotsOnGoal.away },
                            { label: '犯规', home: activeMatch.statistics.fouls.home, away: activeMatch.statistics.fouls.away },
                            { label: '角球', home: activeMatch.statistics.cornerKicks.home, away: activeMatch.statistics.cornerKicks.away },
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
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          这里保留轻量数据解读，帮助你在不切换到复杂体育站的情况下，快速知道谁更主动、谁更占优。
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
                      比赛统计会在开赛后逐步补齐。
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-slate-700" />
            <h3 className="text-sm font-black text-slate-900">赛程列表</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {displayedMatches.length} / {filtered.length} 场
          </span>
        </div>

        {!showAllMatches && recentWindowMatches[0] && (
          <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            当前只显示最近两天赛程：从 {getBeijingDayLabel(recentWindowMatches[0].startTimeUtc)} 开始。
          </div>
        )}

        <div className="mt-4 space-y-4">
          {groupedMatches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
              没有找到符合筛选条件的比赛。
            </div>
          ) : (
            groupedMatches.map((group) => (
              <div key={group.dayKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">{group.label}</div>
                    <div className="mt-1 text-[11px] font-medium text-slate-500">{group.matches.length} 场比赛</div>
                  </div>
                </div>

                {group.matches.map((match) => {
                  const selected = activeMatch?.id === match.id;
                  const statusText =
                    match.status === MatchStatus.LIVE
                      ? '进行中'
                      : match.status === MatchStatus.FT
                        ? '已结束'
                        : match.homeTeamId === 'TBD' || match.awayTeamId === 'TBD'
                          ? '待定对阵'
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
                            <span>{stageLabel(match.stage)}</span>
                            <span className="text-slate-300">·</span>
                            <span>{formatDate(match.startTimeUtc)}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-sm font-black text-slate-900">
                            <FlagBadge flagCode={match.homeTeam?.code} size="sm" />
                            <span className="truncate">{match.homeTeam?.nameZh || '待定'}</span>
                            <span className="text-slate-400">
                              {match.status === MatchStatus.LIVE || match.status === MatchStatus.FT
                                ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`
                                : 'VS'}
                            </span>
                            <span className="truncate">{match.awayTeam?.nameZh || '待定'}</span>
                            <FlagBadge flagCode={match.awayTeam?.code} size="sm" />
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
                })}
              </div>
            ))
          )}
        </div>

        {filtered.length > recentWindowMatches.length && (
          <button
            onClick={() => setShowAllMatches((value) => !value)}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-white"
          >
            {showAllMatches ? '收起远期赛程' : `展开全部赛程${hiddenDayCount > 0 ? `（还有 ${hiddenDayCount} 天）` : ''}`}
          </button>
        )}
      </section>
    </div>
  );
}
