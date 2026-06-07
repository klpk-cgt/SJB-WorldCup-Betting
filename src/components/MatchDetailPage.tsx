import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, Flag, History, Info, MapPin, Shirt, Trophy } from 'lucide-react';
import { Match, Player, TeamHistoryResult } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import { resolvePlayerAvatar } from '../utils/playerAvatar';
import FlagBadge from './home/FlagBadge';
import SmartAvatar from './SmartAvatar';
import TeamDetailDrawer from './TeamDetailDrawer';

type MatchDetailTab = 'overview' | 'lineup' | 'history' | 'stats';

interface MatchDetailPageProps {
  matchId?: string;
  defaultTab?: MatchDetailTab;
  onBackToMatches: () => void;
  onGoPrediction: (matchId?: string) => void;
}

const POSITION_LABELS: Record<Player['position'], string> = {
  GK: '门将',
  DEF: '后卫',
  MID: '中场',
  FWD: '前锋',
};

const POSITION_COLORS: Record<Player['position'], string> = {
  GK: 'bg-amber-100 text-amber-800',
  DEF: 'bg-blue-100 text-blue-800',
  MID: 'bg-green-100 text-green-800',
  FWD: 'bg-rose-100 text-rose-800',
};

function formatMarketValue(value?: number): string {
  if (!value) return '-';
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
  return `${value}`;
}

const TAB_META: Array<{
  key: MatchDetailTab;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'overview', label: '概览', icon: <Info className="h-3.5 w-3.5" /> },
  { key: 'lineup', label: '阵容', icon: <Shirt className="h-3.5 w-3.5" /> },
  { key: 'history', label: '战绩', icon: <History className="h-3.5 w-3.5" /> },
  { key: 'stats', label: '统计', icon: <BarChart3 className="h-3.5 w-3.5" /> },
];

export default function MatchDetailPage({
  matchId,
  defaultTab = 'overview',
  onBackToMatches,
  onGoPrediction,
}: MatchDetailPageProps) {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MatchDetailTab>(defaultTab);
  const [teamDetailId, setTeamDetailId] = useState<string | null>(null);
  const [teamDetailOpen, setTeamDetailOpen] = useState(false);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [homeHistory, setHomeHistory] = useState<TeamHistoryResult[]>([]);
  const [awayHistory, setAwayHistory] = useState<TeamHistoryResult[]>([]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, matchId]);

  useEffect(() => {
    if (!matchId) {
      setMatch(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiRequest(`/api/matches/${matchId}`)
      .then((data) => setMatch(data))
      .catch(() => setMatch(null))
      .finally(() => setLoading(false));
  }, [matchId]);

  // 加载双方球队球员和历史数据
  useEffect(() => {
    if (!match?.homeTeam?.id || !match?.awayTeam?.id) return;
    Promise.all([
      apiRequest(`/api/teams/${match.homeTeam.id}/detail`),
      apiRequest(`/api/teams/${match.awayTeam.id}/detail`),
    ]).then(([home, away]) => {
      setHomePlayers(home.players || []);
      setAwayPlayers(away.players || []);
      setHomeHistory(home.history || []);
      setAwayHistory(away.history || []);
    }).catch(() => {
      setHomePlayers([]);
      setAwayPlayers([]);
      setHomeHistory([]);
      setAwayHistory([]);
    });
  }, [match?.homeTeam?.id, match?.awayTeam?.id]);

  const sentimentRows = useMemo(() => {
    const sentiment = (match as Match & { sentiment?: { home: number; draw: number; away: number } })?.sentiment;
    if (!match || !sentiment) return [];
    return [
      { label: `${match.homeTeam?.nameZh} 支持率`, value: sentiment.home, tone: 'bg-emerald-500' },
      { label: '平局支持率', value: sentiment.draw, tone: 'bg-slate-500' },
      { label: `${match.awayTeam?.nameZh} 支持率`, value: sentiment.away, tone: 'bg-cyan-500' },
    ];
  }, [match]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">正在加载比赛资料...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <p className="text-sm font-black text-slate-900">这场比赛的资料暂时不可用</p>
        <p className="text-xs text-slate-500">你可以先回到赛程页继续查看其他比赛。</p>
        <button
          onClick={onBackToMatches}
          className="mx-auto inline-flex rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
        >
          返回赛程
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 px-5 py-5 text-white">
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToMatches}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/85 transition hover:bg-white/15"
            >
              返回赛程
            </button>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-emerald-200">
              {match.roundName}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <button className="min-w-0 text-left" onClick={() => { setTeamDetailId(match.homeTeam?.id || null); setTeamDetailOpen(true); }}>
              <div className="flex items-center gap-3">
                <FlagBadge flagCode={match.homeTeam?.code} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">{match.homeTeam?.nameZh}</p>
                  <p className="mt-1 text-xs text-white/60">{match.homeTeam?.name}</p>
                </div>
              </div>
            </button>

            <div className="text-center">
              <p className="text-3xl font-black tracking-tight">
                {typeof match.homeScore === 'number' && typeof match.awayScore === 'number' && match.status !== 'NS'
                  ? `${match.homeScore} : ${match.awayScore}`
                  : 'VS'}
              </p>
              <p className="mt-1 text-[11px] font-bold text-emerald-200">{match.stage}</p>
            </div>

            <button className="min-w-0 text-right" onClick={() => { setTeamDetailId(match.awayTeam?.id || null); setTeamDetailOpen(true); }}>
              <div className="flex items-center justify-end gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">{match.awayTeam?.nameZh}</p>
                  <p className="mt-1 text-xs text-white/60">{match.awayTeam?.name}</p>
                </div>
                <FlagBadge flagCode={match.awayTeam?.code} size="lg" />
              </div>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-white/70">
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDate(match.startTimeUtc)}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{match.venueName || match.venueCity || '世界杯球场'}</span>
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-100 bg-slate-50 p-2">
          {TAB_META.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs font-bold transition ${
                activeTab === tab.key ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: `${match.homeTeam?.nameZh} 胜`, value: match.odds?.h2h.homeWin ?? '--' },
                  { label: '平局', value: match.odds?.h2h.draw ?? '--' },
                  { label: `${match.awayTeam?.nameZh} 胜`, value: match.odds?.h2h.awayWin ?? '--' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-slate-50 px-3 py-3 text-center ring-1 ring-slate-200">
                    <p className="text-[10px] font-bold text-slate-500">{item.label}</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>

              {sentimentRows.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-black text-slate-900">群内倾向</h4>
                  <div className="mt-4 space-y-3">
                    {sentimentRows.map((row) => (
                      <div key={row.label}>
                        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-600">
                          <span>{row.label}</span>
                          <span>{row.value}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white">
                          <div className={`h-full rounded-full ${row.tone}`} style={{ width: `${row.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <InfoCard title="比赛信息" value={match.stage} sub={`${match.roundName} · ${match.status}`} />
                <InfoCard title="场地" value={match.venueName || '待更新'} sub={match.venueCity || '主办城市待更新'} />
              </div>
            </div>
          )}

          {activeTab === 'lineup' && (
            <LineupPanel
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              homePlayers={homePlayers}
              awayPlayers={awayPlayers}
              matchLineups={match.lineups}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPanel
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              homeHistory={homeHistory}
              awayHistory={awayHistory}
            />
          )}

          {activeTab === 'stats' && <StatsPanel match={match} />}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <button
            onClick={() => onGoPrediction(match.id)}
            className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-600"
          >
            去竞猜这场比赛
          </button>
        </div>
      </section>

      <TeamDetailDrawer teamId={teamDetailId} open={teamDetailOpen} onClose={() => setTeamDetailOpen(false)} />
    </div>
  );
}

function InfoCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function LineupPanel({
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  matchLineups,
}: {
  homeTeam?: Match['homeTeam'];
  awayTeam?: Match['awayTeam'];
  homePlayers: Player[];
  awayPlayers: Player[];
  matchLineups?: Match['lineups'];
}) {
  // 优先使用API返回的球员数据，否则用match.lineups
  const hasPlayerData = homePlayers.length > 0 || awayPlayers.length > 0;

  if (!hasPlayerData && !matchLineups) {
    return <EmptyState text="阵容暂未公布。" />;
  }

  // 如果有球员数据，用新布局
  if (hasPlayerData) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <TeamLineupColumn team={homeTeam} players={homePlayers} formation={matchLineups?.home?.formation} coach={matchLineups?.home?.coach} />
        <TeamLineupColumn team={awayTeam} players={awayPlayers} formation={matchLineups?.away?.formation} coach={matchLineups?.away?.coach} />
      </div>
    );
  }

  // 回退到旧布局
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(['home', 'away'] as const).map((side) => (
        <div key={side} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900">{side === 'home' ? homeTeam?.nameZh : awayTeam?.nameZh}</h4>
            <span className="text-xs font-bold text-emerald-700">{matchLineups?.[side].formation}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">主教练：{matchLineups?.[side].coach}</p>
          <div className="mt-4 space-y-2">
            {matchLineups?.[side].starting.map((player, index) => (
              <div key={`${side}-${index}`} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm">
                <span className="font-semibold text-slate-800">{player.number}. {player.name}</span>
                <span className="text-xs font-bold text-slate-400">{player.position}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamLineupColumn({
  team,
  players,
  formation,
  coach,
}: {
  team?: Match['homeTeam'];
  players: Player[];
  formation?: string;
  coach?: string;
}) {
  const grouped = useMemo(
    () =>
      players.reduce<Record<string, Player[]>>((acc, player) => {
        const key = player.position;
        if (!acc[key]) acc[key] = [];
        acc[key].push(player);
        return acc;
      }, {}),
    [players],
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <FlagBadge flagCode={team?.code} size="sm" />
        <h4 className="text-sm font-black text-slate-900">{team?.nameZh}</h4>
        {formation && <span className="ml-auto text-xs font-bold text-emerald-700">{formation}</span>}
      </div>
      {coach && <p className="mt-1 text-xs text-slate-500">主教练：{coach}</p>}

      <div className="mt-3 space-y-3">
        {(['GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => {
          const group = grouped[pos];
          if (!group || group.length === 0) return null;
          return (
            <div key={pos}>
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${POSITION_COLORS[pos]}`}>
                  {POSITION_LABELS[pos]}
                </span>
                <span className="text-[9px] text-slate-400">{group.length}人</span>
              </div>
              <div className="space-y-1.5">
                {group.map((player) => (
                  <div key={player.id} className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2">
                    <SmartAvatar
                      name={player.nameZh || player.name}
                      src={resolvePlayerAvatar(player)}
                      size={32}
                      className="shrink-0 ring-1 ring-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate text-xs font-bold text-slate-900">{player.nameZh || player.name}</span>
                        {player.isCaptain && (
                          <span className="rounded bg-amber-100 px-0.5 text-[8px] font-bold text-amber-700">C</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                        {player.age && <span>{player.age}岁</span>}
                        {player.club && <span>· {player.club}</span>}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-black text-emerald-600">{formatMarketValue(player.marketValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryPanel({
  homeTeam,
  awayTeam,
  homeHistory,
  awayHistory,
}: {
  homeTeam?: Match['homeTeam'];
  awayTeam?: Match['awayTeam'];
  homeHistory: TeamHistoryResult[];
  awayHistory: TeamHistoryResult[];
}) {
  if (homeHistory.length === 0 && awayHistory.length === 0) {
    return <EmptyState text="暂无双方球队历史战绩数据。" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TeamHistoryColumn team={homeTeam} history={homeHistory} />
      <TeamHistoryColumn team={awayTeam} history={awayHistory} />
    </div>
  );
}

function TeamHistoryColumn({
  team,
  history,
}: {
  team?: Match['homeTeam'];
  history: TeamHistoryResult[];
}) {
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    return history.reduce(
      (acc, item) => ({
        matchesPlayed: acc.matchesPlayed + item.matchesPlayed,
        wins: acc.wins + item.wins,
        draws: acc.draws + item.draws,
        losses: acc.losses + item.losses,
        goalsFor: acc.goalsFor + item.goalsFor,
      }),
      { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0 },
    );
  }, [history]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <FlagBadge flagCode={team?.code} size="sm" />
        <h4 className="text-sm font-black text-slate-900">{team?.nameZh}</h4>
      </div>

      {stats && (
        <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
          <div className="rounded-lg bg-white p-1.5">
            <p className="text-sm font-black text-slate-900">{stats.matchesPlayed}</p>
            <p className="text-[9px] text-slate-400">场次</p>
          </div>
          <div className="rounded-lg bg-white p-1.5">
            <p className="text-sm font-black text-emerald-600">{stats.wins}</p>
            <p className="text-[9px] text-slate-400">胜</p>
          </div>
          <div className="rounded-lg bg-white p-1.5">
            <p className="text-sm font-black text-slate-500">{stats.draws}</p>
            <p className="text-[9px] text-slate-400">平</p>
          </div>
          <div className="rounded-lg bg-white p-1.5">
            <p className="text-sm font-black text-rose-500">{stats.losses}</p>
            <p className="text-[9px] text-slate-400">负</p>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {history.map((item) => (
          <div key={item.id} className="rounded-xl bg-white p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">{item.year}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    item.result.includes('冠军')
                      ? 'bg-amber-100 text-amber-700'
                      : item.result.includes('亚军')
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.result}
                </span>
              </div>
              <span className="text-[9px] text-slate-400">{item.host}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[9px] text-slate-500">
              <span>{item.wins}胜 {item.draws}平 {item.losses}负</span>
              <span>{item.goalsFor}球</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsPanel({ match }: { match: Match }) {
  if (!match.statistics) {
    return <EmptyState text="比赛统计会在开赛后逐步出现。" />;
  }

  const statRows = [
    { label: '射正', home: match.statistics.shotsOnGoal?.home ?? 0, away: match.statistics.shotsOnGoal?.away ?? 0 },
    { label: '犯规', home: match.statistics.fouls?.home ?? 0, away: match.statistics.fouls?.away ?? 0 },
    { label: '角球', home: match.statistics.cornerKicks?.home ?? 0, away: match.statistics.cornerKicks?.away ?? 0 },
  ];

  return (
    <div className="space-y-4">
      {match.statistics.ballPossession && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>{match.homeTeam?.nameZh} 控球率</span>
            <span>
              {match.statistics.ballPossession.home} / {match.statistics.ballPossession.away}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: match.statistics.ballPossession.home }} />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {statRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm font-black text-emerald-700">{row.home}</span>
            <span className="text-xs font-bold text-slate-500">{row.label}</span>
            <span className="text-sm font-black text-cyan-700">{row.away}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
      {text}
    </div>
  );
}
