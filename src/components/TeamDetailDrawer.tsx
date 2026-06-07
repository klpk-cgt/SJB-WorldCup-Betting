import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, ChevronRight, History, MapPin, Shield, Star, TrendingUp, Trophy, Users, X } from 'lucide-react';
import { Player, Team, TeamHistoryResult } from '../types';
import { apiRequest } from '../utils/api';
import { resolvePlayerAvatar } from '../utils/playerAvatar';
import FlagBadge from './home/FlagBadge';
import SmartAvatar from './SmartAvatar';

interface TeamDetailDrawerProps {
  teamId: string | null;
  open: boolean;
  onClose: () => void;
}

type TabKey = 'overview' | 'squad' | 'history' | 'stats';

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

const CONFEDERATION_LABELS: Record<string, string> = {
  UEFA: '欧洲',
  CONMEBOL: '南美',
  CONCACAF: '中北美',
  CAF: '非洲',
  AFC: '亚洲',
  OFC: '大洋洲',
};

function formatMarketValue(value?: number): string {
  if (!value) return '-';
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`;
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
  return `${value}`;
}

function formatTeamMarketValue(value?: number): string {
  if (!value) return '-';
  return `${value.toLocaleString()}万欧`;
}

export default function TeamDetailDrawer({ teamId, open, onClose }: TeamDetailDrawerProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [history, setHistory] = useState<TeamHistoryResult[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId || !open) return;
    setLoading(true);
    setActiveTab('overview');
    apiRequest(`/api/teams/${teamId}/detail`)
      .then((data) => {
        setTeam(data.team);
        setPlayers(data.players || []);
        setHistory(data.history || []);
      })
      .catch(() => {
        setTeam(null);
        setPlayers([]);
        setHistory([]);
      })
      .finally(() => setLoading(false));
  }, [teamId, open]);

  const groupedPlayers = useMemo(
    () =>
      players.reduce<Record<string, Player[]>>((acc, player) => {
        const key = player.position;
        if (!acc[key]) acc[key] = [];
        acc[key].push(player);
        return acc;
      }, {}),
    [players],
  );

  const historyStats = useMemo(
    () =>
      history.length > 0
        ? history.reduce(
            (acc, item) => ({
              matchesPlayed: acc.matchesPlayed + item.matchesPlayed,
              wins: acc.wins + item.wins,
              draws: acc.draws + item.draws,
              losses: acc.losses + item.losses,
              goalsFor: acc.goalsFor + item.goalsFor,
              goalsAgainst: acc.goalsAgainst + item.goalsAgainst,
            }),
            { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
          )
        : null,
    [history],
  );

  const lastWorldCup = useMemo(() => {
    if (history.length === 0) return null;
    const sorted = [...history].sort((a, b) => b.year - a.year);
    return sorted[0];
  }, [history]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: '概览', icon: <Shield className="h-3.5 w-3.5" /> },
    { key: 'squad', label: '阵容', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'history', label: '战绩', icon: <History className="h-3.5 w-3.5" /> },
    { key: 'stats', label: '统计', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  ];

  return (
    <AnimatePresence>
      {open && teamId && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            style={{ maxHeight: '88vh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : !team ? (
              <div className="flex h-40 items-center justify-center text-gray-400">暂无该球队资料</div>
            ) : (
              <>
                {/* 头部 */}
                <div
                  className="relative px-5 pb-4 pt-5"
                  style={{
                    background: team.primaryColor
                      ? `linear-gradient(135deg, ${team.primaryColor}dd, ${team.secondaryColor || team.primaryColor}88)`
                      : 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  }}
                >
                  <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white backdrop-blur">
                    <X className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-4">
                    <div className="shrink-0">
                      <FlagBadge flagCode={team.code} size="lg" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-white">{team.nameZh}</h2>
                      <p className="text-sm text-white/70">{team.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {team.fifaRank && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">FIFA #{team.fifaRank}</span>
                        )}
                        {team.confederation && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                            {CONFEDERATION_LABELS[team.confederation] || team.confederation}
                          </span>
                        )}
                        {team.groupName && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">{team.groupName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 标签页 */}
                <div className="flex border-b border-gray-100 bg-gray-50/50">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors ${
                        activeTab === tab.key ? 'border-b-2 border-emerald-500 text-emerald-700' : 'text-gray-400'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 内容区 */}
                <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(88vh - 180px)' }}>

                  {/* ═══ 概览 ═══ */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      {/* 历史数据 */}
                      <div>
                        <h4 className="mb-2 text-xs font-black text-slate-800">历史数据</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {team.fifaRank && (
                            <div className="rounded-xl bg-slate-50 p-3 text-center">
                              <p className="text-[10px] font-bold text-slate-400">FIFA排名</p>
                              <p className="mt-1 text-lg font-black text-slate-900">#{team.fifaRank}</p>
                            </div>
                          )}
                          {team.worldCupAppearances !== undefined && (
                            <div className="rounded-xl bg-slate-50 p-3 text-center">
                              <p className="text-[10px] font-bold text-slate-400">世界杯参赛</p>
                              <p className="mt-1 text-lg font-black text-slate-900">{team.worldCupAppearances}届</p>
                            </div>
                          )}
                          {team.bestResult && (
                            <div className="rounded-xl bg-amber-50 p-3 text-center">
                              <p className="text-[10px] font-bold text-amber-500">历届最佳</p>
                              <p className="mt-1 text-sm font-black text-amber-700">
                                {team.bestResult}{team.bestResultYear ? ` (${team.bestResultYear})` : ''}
                              </p>
                            </div>
                          )}
                          {team.qualificationStatus && (
                            <div className="rounded-xl bg-emerald-50 p-3 text-center">
                              <p className="text-[10px] font-bold text-emerald-500">预选赛</p>
                              <p className="mt-1 text-sm font-black text-emerald-700">{team.qualificationStatus}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 预选赛信息 */}
                      {(team.qualificationMethod || team.qualificationGroup || team.qualificationRecord || team.qualificationKeyPlayers) && (
                        <div className="rounded-xl border border-gray-100 bg-white p-4">
                          <h4 className="mb-3 text-xs font-black text-slate-800">2026世界杯预选赛表现</h4>
                          <div className="space-y-2">
                            {team.qualificationMethod && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-500">晋级方式</span>
                                <span className="font-bold text-slate-900">{team.qualificationMethod}</span>
                              </div>
                            )}
                            {team.qualificationGroup && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-500">预选赛分组</span>
                                <span className="font-bold text-slate-900">{team.qualificationGroup}</span>
                              </div>
                            )}
                            {team.qualificationRecord && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-500">预选赛战绩</span>
                                <span className="font-bold text-slate-900">{team.qualificationRecord}</span>
                              </div>
                            )}
                            {team.confederation && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-500">所属洲</span>
                                <span className="font-bold text-slate-900">{CONFEDERATION_LABELS[team.confederation] || team.confederation}</span>
                              </div>
                            )}
                            {team.qualificationKeyPlayers && (
                              <div className="mt-2 rounded-lg bg-slate-50 p-2.5">
                                <p className="text-[10px] font-bold text-slate-400">预选赛关键球员</p>
                                <p className="mt-1 text-xs font-bold text-slate-700">{team.qualificationKeyPlayers}</p>
                              </div>
                            )}
                          </div>
                          {team.profileSummary && (
                            <p className="mt-3 text-xs leading-5 text-slate-500">{team.profileSummary}</p>
                          )}
                        </div>
                      )}

                      {/* 主教练 + 阵型 */}
                      {(team.coachName || team.formation) && (
                        <div className="rounded-xl border border-gray-100 bg-white p-4">
                          {team.coachName && (
                            <div>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                <Shield className="h-3.5 w-3.5" />
                                主教练
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-900">{team.coachName}</span>
                                {team.coachNationality && <span className="text-xs text-slate-400">{team.coachNationality}</span>}
                              </div>
                            </div>
                          )}
                          {team.formation && (
                            <div className="mt-3">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">常用阵型</div>
                              <p className="mt-1 text-sm font-black text-slate-900">{team.formation}</p>
                              <p className="text-[10px] text-slate-400">主要战术阵型</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 上届世界杯成绩 */}
                      {lastWorldCup && (
                        <div className="rounded-xl border border-gray-100 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <Trophy className="h-3.5 w-3.5" />
                              上届世界杯成绩
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">年份</span>
                                <span className="font-black text-slate-900">{lastWorldCup.year}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">成绩</span>
                                <span className={`font-black ${
                                  lastWorldCup.result.includes('冠军') ? 'text-amber-600' :
                                  lastWorldCup.result.includes('亚军') ? 'text-slate-600' :
                                  'text-slate-900'
                                }`}>{lastWorldCup.result}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">东道主</span>
                                <span className="font-bold text-slate-900">{lastWorldCup.host}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">场次</span>
                                <span className="font-black text-slate-900">{lastWorldCup.matchesPlayed}</span>
                              </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-2.5">
                              <div className="flex items-center justify-center gap-4 text-xs">
                                <span className="font-bold text-emerald-600">{lastWorldCup.wins}胜</span>
                                <span className="font-bold text-slate-500">{lastWorldCup.draws}平</span>
                                <span className="font-bold text-rose-500">{lastWorldCup.losses}负</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 核心球员 */}
                      {team.heroPlayerNames && team.heroPlayerNames.length > 0 && (
                        <div className="rounded-xl border border-gray-100 bg-white p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Star className="h-3.5 w-3.5" />
                            核心球员
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {team.heroPlayerNames.map((name) => (
                              <span key={name} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 球队身价 */}
                      {team.marketValueMillion && (
                        <div className="rounded-xl border border-gray-100 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">球队总身价</span>
                            <span className="text-sm font-black text-emerald-600">{formatTeamMarketValue(team.marketValueMillion)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══ 阵容 ═══ */}
                  {activeTab === 'squad' && (
                    <div className="space-y-4">
                      {players.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400">暂无该球队阵容数据</div>
                      ) : (
                        (['GK', 'DEF', 'MID', 'FWD'] as Player['position'][]).map((position) => {
                          const group = groupedPlayers[position];
                          if (!group || group.length === 0) return null;
                          return (
                            <div key={position}>
                              <div className="mb-2 flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${POSITION_COLORS[position]}`}>
                                  {POSITION_LABELS[position]}
                                </span>
                                <span className="text-[10px] text-gray-400">{group.length}人</span>
                              </div>
                              <div className="space-y-2">
                                {group.map((player) => (
                                  <div key={player.id} className="flex items-center gap-3 rounded-2xl bg-gray-50 px-3 py-3">
                                    <SmartAvatar
                                      name={player.nameZh || player.name}
                                      src={resolvePlayerAvatar(player)}
                                      size={44}
                                      className="shrink-0 ring-1 ring-slate-200"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="truncate text-sm font-bold text-gray-900">{player.nameZh || player.name}</span>
                                        {player.isCaptain && (
                                          <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700">C</span>
                                        )}
                                      </div>
                                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                                        {player.age && <span>{player.age}岁</span>}
                                        {player.club && <span>{player.club}</span>}
                                      </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <div className="text-[10px] font-bold text-gray-400">身价</div>
                                      <div className="mt-1 text-[11px] font-black text-emerald-600">{formatMarketValue(player.marketValue)}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ═══ 战绩 ═══ */}
                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      {history.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400">暂无该球队历史战绩数据</div>
                      ) : (
                        <>
                          {historyStats && (
                            <div className="rounded-xl bg-gray-50 p-4">
                              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-gray-500">
                                <TrendingUp className="h-3.5 w-3.5" />
                                累计战绩
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                  <p className="text-lg font-black text-gray-900">{historyStats.matchesPlayed}</p>
                                  <p className="text-[10px] text-gray-400">场次</p>
                                </div>
                                <div>
                                  <p className="text-lg font-black text-emerald-600">{historyStats.wins}</p>
                                  <p className="text-[10px] text-gray-400">胜</p>
                                </div>
                                <div>
                                  <p className="text-lg font-black text-gray-500">{historyStats.draws}</p>
                                  <p className="text-[10px] text-gray-400">平</p>
                                </div>
                                <div>
                                  <p className="text-lg font-black text-rose-500">{historyStats.losses}</p>
                                  <p className="text-[10px] text-gray-400">负</p>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-gray-400">
                                <span>进球 {historyStats.goalsFor}</span>
                                <span>失球 {historyStats.goalsAgainst}</span>
                                <span>净胜 {historyStats.goalsFor - historyStats.goalsAgainst}</span>
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            {history.map((item) => (
                              <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="text-base font-black text-slate-900">{item.year}</span>
                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                        item.result.includes('冠军')
                                          ? 'bg-amber-100 text-amber-700'
                                          : item.result.includes('亚军')
                                            ? 'bg-gray-200 text-gray-700'
                                            : item.result.includes('季军') || item.result.includes('殿军')
                                              ? 'bg-orange-100 text-orange-700'
                                              : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {item.result}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    <MapPin className="inline h-3 w-3" /> {item.host}
                                  </span>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  <div className="rounded-lg bg-slate-50 p-2 text-center">
                                    <p className="text-sm font-black text-slate-900">{item.matchesPlayed}</p>
                                    <p className="text-[10px] text-slate-400">场次</p>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-2 text-center">
                                    <p className="text-sm font-black text-slate-700">{item.wins}/{item.draws}/{item.losses}</p>
                                    <p className="text-[10px] text-slate-400">胜/平/负</p>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-2 text-center">
                                    <p className="text-sm font-black text-slate-900">{item.goalsFor}</p>
                                    <p className="text-[10px] text-slate-400">进球</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ═══ 统计 ═══ */}
                  {activeTab === 'stats' && (
                    <div className="space-y-4">
                      {players.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400">暂无统计数据</div>
                      ) : (
                        <>
                          {/* 位置分布 */}
                          <div className="rounded-xl border border-gray-100 bg-white p-4">
                            <h4 className="mb-3 text-xs font-black text-slate-800">位置分布</h4>
                            <div className="grid grid-cols-4 gap-2">
                              {(['GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => {
                                const count = groupedPlayers[pos]?.length || 0;
                                return (
                                  <div key={pos} className="rounded-lg bg-slate-50 p-2 text-center">
                                    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${POSITION_COLORS[pos]}`}>
                                      {POSITION_LABELS[pos]}
                                    </span>
                                    <p className="mt-1 text-lg font-black text-slate-900">{count}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 身价TOP5 */}
                          <div className="rounded-xl border border-gray-100 bg-white p-4">
                            <h4 className="mb-3 text-xs font-black text-slate-800">身价 TOP 5</h4>
                            <div className="space-y-2">
                              {[...players]
                                .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))
                                .slice(0, 5)
                                .map((player, idx) => (
                                  <div key={player.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-600">
                                      {idx + 1}
                                    </span>
                                    <SmartAvatar name={player.nameZh || player.name} src={resolvePlayerAvatar(player)} size={32} />
                                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-900">{player.nameZh || player.name}</span>
                                    <span className="shrink-0 text-xs font-black text-emerald-600">{formatMarketValue(player.marketValue)}</span>
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* 球队总身价 */}
                          {team.marketValueMillion && (
                            <div className="rounded-xl border border-gray-100 bg-white p-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">球队总身价</span>
                                <span className="text-sm font-black text-emerald-600">{formatTeamMarketValue(team.marketValueMillion)}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
