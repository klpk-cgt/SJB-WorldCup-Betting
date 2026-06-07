import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { Match, MatchStatus, Team } from '../types';
import FlagBadge from './home/FlagBadge';

interface GroupStandingsProps {
  matches: Match[];
  teams: Team[];
}

interface GroupRow {
  teamId: string;
  team: Team | undefined;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function computeGroupStandings(matches: Match[], teams: Team[]): Record<string, GroupRow[]> {
  const teamMap = new Map(teams.map(t => [t.id, t]));
  const groups: Record<string, Record<string, GroupRow>> = {};

  for (const team of teams) {
    const g = team.groupName;
    if (!g) continue;
    if (!groups[g]) groups[g] = {};
    groups[g][team.id] = {
      teamId: team.id,
      team: teamMap.get(team.id),
      played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0,
    };
  }

  for (const match of matches) {
    if (match.stage !== 'Group Stage') continue;
    if (![MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(match.status)) continue;
    const hs = match.homeScore ?? 0;
    const as = match.awayScore ?? 0;
    const homeGroup = match.homeTeam?.groupName;
    const awayGroup = match.awayTeam?.groupName;
    if (!homeGroup || !groups[homeGroup]) continue;

    const home = groups[homeGroup][match.homeTeamId];
    const away = groups[awayGroup || homeGroup]?.[match.awayTeamId];
    if (!home || !away) continue;

    home.played++; away.played++;
    home.gf += hs; home.ga += as;
    away.gf += as; away.ga += hs;

    if (hs > as) {
      home.won++; home.points += 3; away.lost++;
    } else if (hs < as) {
      away.won++; away.points += 3; home.lost++;
    } else {
      home.drawn++; away.drawn++; home.points++; away.points++;
    }
  }

  const result: Record<string, GroupRow[]> = {};
  for (const [gName, rowMap] of Object.entries(groups)) {
    result[gName] = Object.values(rowMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.gf - a.ga, gdB = b.gf - b.ga;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });
  }
  return result;
}

function getThirdPlaceTeams(groupStandings: Record<string, GroupRow[]>): GroupRow[] {
  const thirds: GroupRow[] = [];
  for (const rows of Object.values(groupStandings)) {
    if (rows.length >= 3) thirds.push(rows[2]);
  }
  return thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.gf - a.ga, gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  }).slice(0, 8);
}

export default function GroupStandings({ matches, teams }: GroupStandingsProps) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const groupStandings = useMemo(() => computeGroupStandings(matches, teams), [matches, teams]);
  const thirdPlaceTeams = useMemo(() => getThirdPlaceTeams(groupStandings), [groupStandings]);
  const thirdPlaceIds = useMemo(() => new Set(thirdPlaceTeams.map(t => t.teamId)), [thirdPlaceTeams]);

  const sortedGroups = useMemo(() => {
    return GROUP_NAMES
      .map(g => `Group ${g}`)
      .filter(g => groupStandings[g]?.length)
      .map(g => ({ name: g, rows: groupStandings[g] }));
  }, [groupStandings]);

  if (sortedGroups.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2">
        <Trophy className="h-4.5 w-4.5 text-emerald-500" />
        <h3 className="text-sm font-black text-slate-900">小组积分榜</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">实时积分排名，小组前2名和8个成绩最好的第3名晋级32强。</p>

      <div className="mt-4 space-y-2">
        {sortedGroups.map(({ name, rows }) => {
          const isExpanded = expanded === name;
          return (
            <div key={name} className="rounded-2xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : name)}
                className="flex w-full items-center justify-between bg-slate-50 px-4 py-2.5 text-left transition hover:bg-slate-100"
              >
                <span className="text-xs font-black text-slate-800">{name.replace('Group ', '')}组</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500">
                    {rows[0] ? `${rows[0].team?.nameZh || rows[0].team?.name} ${rows[0].points}分` : ''}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 py-2">
                  <div className="grid grid-cols-[2rem_1fr_2rem_2rem_2rem_2rem_3rem_3rem_3rem] gap-1 px-2 pb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    <span>#</span><span>球队</span><span>赛</span><span>胜</span><span>平</span><span>负</span><span>进</span><span>失</span><span>积分</span>
                  </div>
                  {rows.map((row, idx) => {
                    const isTop2 = idx < 2;
                    const isBestThird = thirdPlaceIds.has(row.teamId);
                    const qualifies = isTop2 || isBestThird;
                    return (
                      <div
                        key={row.teamId}
                        className={`grid grid-cols-[2rem_1fr_2rem_2rem_2rem_2rem_3rem_3rem_3rem] gap-1 items-center rounded-xl px-2 py-2 text-xs ${
                          isTop2 ? 'bg-emerald-50/60' : isBestThird ? 'bg-amber-50/60' : ''
                        }`}
                      >
                        <span className={`font-black ${qualifies ? 'text-emerald-600' : 'text-slate-400'}`}>{idx + 1}</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FlagBadge flagCode={row.team?.code} size="sm" />
                          <span className="truncate font-bold text-slate-900">{row.team?.nameZh || row.team?.name}</span>
                          {isBestThird && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-black text-amber-700">最佳3rd</span>}
                        </div>
                        <span className="text-center font-semibold text-slate-700">{row.played}</span>
                        <span className="text-center font-semibold text-slate-700">{row.won}</span>
                        <span className="text-center font-semibold text-slate-700">{row.drawn}</span>
                        <span className="text-center font-semibold text-slate-700">{row.lost}</span>
                        <span className="text-center font-semibold text-slate-700">{row.gf}</span>
                        <span className="text-center font-semibold text-slate-700">{row.ga}</span>
                        <span className="text-center font-black text-emerald-700">{row.points}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 小组第三晋级概览 */}
      {thirdPlaceTeams.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">最佳小组第三</span>
            <span className="text-[11px] font-semibold text-amber-700">前8名晋级32强</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {thirdPlaceTeams.map((row, idx) => (
              <div key={row.teamId} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-amber-200">
                <span className="text-[10px] font-black text-amber-600">#{idx + 1}</span>
                <FlagBadge flagCode={row.team?.code} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">{row.team?.nameZh || row.team?.name}</p>
                  <p className="text-[10px] text-amber-700">{row.points}分 ({row.gf}-{row.ga})</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
