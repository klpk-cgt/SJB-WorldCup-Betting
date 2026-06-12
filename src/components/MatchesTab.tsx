/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calendar, ChevronDown, Filter, Info, RefreshCw, Sparkles } from 'lucide-react';
import { Match, MatchStatus, Team } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import { getMatchesForNearestDays, groupMatchesByDay, sortMatchesByKickoff } from '../utils/matchDisplay';
import { useToast } from './ToastProvider';
import FlagBadge from './home/FlagBadge';
import TeamDetailDrawer from './TeamDetailDrawer';
import GroupStandings from './GroupStandings';

interface MatchesTabProps {
  onNavigate: (tab: string, matchId?: string, detailTab?: string) => void;
  selectedMatchId?: string;
  isAdmin: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  'Group Stage': '小组赛',
  'Round of 32': '32 强',
  'Round of 16': '16 强',
  'Quarter-finals': '1/4 决赛',
  'Semi-finals': '半决赛',
  Final: '决赛',
  'Third-place play-off': '季军赛',
};

function getStatusBadge(match: Match) {
  if (match.status === MatchStatus.LIVE || match.status === MatchStatus.HT) {
    return { label: '进行中', tone: 'bg-rose-50 text-rose-600 ring-rose-100' };
  }
  if ([MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(match.status)) {
    return { label: '已结束', tone: 'bg-slate-100 text-slate-600 ring-slate-200' };
  }
  if (match.operationalStatus === 'LOCKED' || match.operationalStatus === 'LOCKING_SOON') {
    return { label: '即将锁盘', tone: 'bg-amber-50 text-amber-700 ring-amber-100' };
  }
  return { label: '未开赛', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100' };
}

function buildDateKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function MatchesTab({ onNavigate, selectedMatchId, isAdmin }: MatchesTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);
  const [filterTeam, setFilterTeam] = useState('');
  const [filterStage, setFilterStage] = useState<'All' | Match['stage']>('All');
  const [teamDetailId, setTeamDetailId] = useState<string | null>(null);
  const [teamDetailOpen, setTeamDetailOpen] = useState(false);
  const toast = useToast();

  const loadMatches = async () => {
    const data = await apiRequest('/api/matches');
    setMatches(data);
    // 从比赛数据中提取球队
    const teamMap = new Map<string, Team>();
    for (const m of data as Match[]) {
      if (m.homeTeam) teamMap.set(m.homeTeam.id, m.homeTeam);
      if (m.awayTeam) teamMap.set(m.awayTeam.id, m.awayTeam);
    }
    setTeams(Array.from(teamMap.values()));
  };

  useEffect(() => {
    async function init() {
      try {
        await loadMatches();
      } catch (error) {
        console.error('Failed to load matches', error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    const loadingId = toast.loading('正在同步赛程', '会同时刷新赛程和相关赔率状态。');
    try {
      await apiRequest('/api/admin/sync/fixtures', { method: 'POST' });
      await loadMatches();
      toast.dismissToast(loadingId);
      toast.success('赛程同步完成', '页面已经刷新为最新数据。');
    } catch (error: any) {
      toast.dismissToast(loadingId);
      toast.error('赛程同步失败', error.message || '请稍后重试。');
    } finally {
      setSyncing(false);
    }
  };

  const featuredMatch = useMemo(() => {
    const live = matches.find((match) => match.status === MatchStatus.LIVE || match.status === MatchStatus.HT);
    if (live) return live;
    return sortMatchesByKickoff(matches).find((match) => ![MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(match.status)) || matches[0];
  }, [matches]);

  const visibleWindowIds = useMemo(() => new Set(getMatchesForNearestDays(matches, 2).map((match) => match.id)), [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const homeName = match.homeTeam?.nameZh || '';
      const awayName = match.awayTeam?.nameZh || '';

      if (filterTeam && !homeName.includes(filterTeam) && !awayName.includes(filterTeam)) {
        return false;
      }

      if (filterStage !== 'All' && match.stage !== filterStage) {
        return false;
      }

      if (showAllDays) {
        return true;
      }

      return visibleWindowIds.has(match.id);
    });
  }, [filterStage, filterTeam, matches, showAllDays, visibleWindowIds]);

  const groupedMatches = useMemo(() => groupMatchesByDay(filteredMatches), [filteredMatches]);

  const stageOptions = useMemo(() => [...new Set(matches.map((match) => match.stage))], [matches]);

  const hasSelectionInWindow = useMemo(
    () => Boolean(selectedMatchId && filteredMatches.some((match) => match.id === selectedMatchId)),
    [filteredMatches, selectedMatchId],
  );

  if (loading) {
    return (
      <div className="space-y-4 pb-6">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="h-5 w-24 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-3 space-y-3">
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600">赛程中心</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">赛程页回归轻量，只负责找比赛和进资料页</h3>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              默认只展示最近两天的比赛，远期赛程收纳到展开入口里，避免整页过长。
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-white disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '同步中' : '同步赛程'}
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">搜索球队</label>
            <input
              type="text"
              value={filterTeam}
              onChange={(event) => setFilterTeam(event.target.value)}
              placeholder="输入国家名"
              className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">比赛阶段</label>
            <select
              value={filterStage}
              onChange={(event) => setFilterStage(event.target.value as 'All' | Match['stage'])}
              className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
            >
              <option value="All">全部阶段</option>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage] || stage}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAllDays((value) => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800"
          >
            <Filter className="h-3.5 w-3.5" />
            {showAllDays ? '只看最近两天' : '展开全部赛程'}
          </button>
        </div>
      </section>

      {featuredMatch && (
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 px-5 py-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">焦点比赛</p>
                <h3 className="mt-2 text-xl font-black">
                  {featuredMatch.homeTeam?.nameZh} vs {featuredMatch.awayTeam?.nameZh}
                </h3>
                <p className="mt-2 text-xs text-white/70">
                  {STAGE_LABELS[featuredMatch.stage] || featuredMatch.stage} · {formatDate(featuredMatch.startTimeUtc)}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white/85">
                {getStatusBadge(featuredMatch).label}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <button
                type="button"
                className="min-w-0 text-left"
                onClick={() => {
                  setTeamDetailId(featuredMatch.homeTeam?.id || null);
                  setTeamDetailOpen(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <FlagBadge flagCode={featuredMatch.homeTeam?.code} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-black">{featuredMatch.homeTeam?.nameZh}</p>
                    <p className="mt-1 text-[11px] text-white/60">{featuredMatch.homeTeam?.name}</p>
                  </div>
                </div>
              </button>

              <div className="text-center">
                <p className="text-3xl font-black tracking-tight">
                  {[MatchStatus.LIVE, MatchStatus.HT, MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(featuredMatch.status)
                    ? `${featuredMatch.homeScore ?? 0} : ${featuredMatch.awayScore ?? 0}`
                    : 'VS'}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-100">{featuredMatch.roundName}</p>
              </div>

              <button
                type="button"
                className="min-w-0 text-right"
                onClick={() => {
                  setTeamDetailId(featuredMatch.awayTeam?.id || null);
                  setTeamDetailOpen(true);
                }}
              >
                <div className="flex items-center justify-end gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black">{featuredMatch.awayTeam?.nameZh}</p>
                    <p className="mt-1 text-[11px] text-white/60">{featuredMatch.awayTeam?.name}</p>
                  </div>
                  <FlagBadge flagCode={featuredMatch.awayTeam?.code} size="lg" />
                </div>
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('match-detail', featuredMatch.id, 'overview')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
              >
                查看比赛资料
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('prediction', featuredMatch.id)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
              >
                去竞猜
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 px-4 py-4">
            {[
              { label: `${featuredMatch.homeTeam?.nameZh} 胜`, value: featuredMatch.odds?.h2h.homeWin ?? '--' },
              { label: '平局', value: featuredMatch.odds?.h2h.draw ?? '--' },
              { label: `${featuredMatch.awayTeam?.nameZh} 胜`, value: featuredMatch.odds?.h2h.awayWin ?? '--' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 px-3 py-3 text-center ring-1 ring-slate-200">
                <p className="text-[10px] font-bold text-slate-500">{item.label}</p>
                <p className="mt-2 text-lg font-black text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <GroupStandings matches={matches} teams={teams} />

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-slate-700" />
            <div>
              <h3 className="text-sm font-black text-slate-900">赛程列表</h3>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {showAllDays ? '当前展示全部赛程' : '当前展示最近两天赛程'}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            {filteredMatches.length} 场
          </span>
        </div>

        <div className="mt-4 space-y-5">
          {groupedMatches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-xs text-slate-500">
              当前筛选条件下没有找到比赛。
            </div>
          ) : (
            groupedMatches.map((group) => (
              <div key={group.dayKey} className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                  <div>
                    <p className="text-sm font-black text-slate-900">{group.label}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{group.matches.length} 场比赛</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                    {buildDateKey(group.matches[0].startTimeUtc)}
                  </span>
                </div>

                {group.matches.map((match) => {
                  const badge = getStatusBadge(match);
                  const isSelected = hasSelectionInWindow && selectedMatchId === match.id;

                  return (
                    <div
                      key={match.id}
                      className={`rounded-3xl border px-4 py-4 transition ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50/70 shadow-[0_12px_24px_rgba(16,185,129,0.08)]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onNavigate('match-detail', match.id, 'overview')}
                          onKeyDown={(e) => { if (e.key === 'Enter') onNavigate('match-detail', match.id, 'overview'); }}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <span>{STAGE_LABELS[match.stage] || match.stage}</span>
                            <span className="text-slate-300">·</span>
                            <span>{formatDate(match.startTimeUtc)}</span>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <button
                                type="button"
                                className="shrink-0"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setTeamDetailId(match.homeTeam?.id || null);
                                  setTeamDetailOpen(true);
                                }}
                              >
                                <FlagBadge flagCode={match.homeTeam?.code} size="sm" />
                              </button>
                              <span className="truncate text-sm font-black text-slate-900">{match.homeTeam?.nameZh}</span>
                            </div>

                            <span className="shrink-0 text-sm font-black text-slate-400">
                              {[MatchStatus.LIVE, MatchStatus.HT, MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(match.status)
                                ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`
                                : 'VS'}
                            </span>

                            <div className="flex min-w-0 items-center justify-end gap-2">
                              <span className="truncate text-sm font-black text-slate-900">{match.awayTeam?.nameZh}</span>
                              <button
                                type="button"
                                className="shrink-0"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setTeamDetailId(match.awayTeam?.id || null);
                                  setTeamDetailOpen(true);
                                }}
                              >
                                <FlagBadge flagCode={match.awayTeam?.code} size="sm" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${badge.tone}`}>
                            {badge.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => onNavigate('match-detail', match.id, 'overview')}
                            className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-700 transition hover:bg-slate-200"
                          >
                            资料
                            <Info className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {!showAllDays && matches.length > filteredMatches.length && (
          <button
            type="button"
            onClick={() => setShowAllDays(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-white"
          >
            展开全部赛程
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </section>

      <TeamDetailDrawer teamId={teamDetailId} open={teamDetailOpen} onClose={() => setTeamDetailOpen(false)} />
    </div>
  );
}
