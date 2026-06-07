import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trophy,
  Users,
  History,
  Shield,
  Star,
  ChevronRight,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { Team, Player, TeamHistoryResult } from '../types';
import { apiRequest } from '../utils/api';
import FlagBadge from './home/FlagBadge';

interface TeamDetailDrawerProps {
  teamId: string | null;
  open: boolean;
  onClose: () => void;
}

type TabKey = 'overview' | 'squad' | 'history';

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
  FWD: 'bg-red-100 text-red-800',
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
      .then(data => {
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

  // 按位置分组球员
  const groupedPlayers = players.reduce<Record<string, Player[]>>((acc, p) => {
    const key = p.position;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
  const positionOrder: Player['position'][] = ['GK', 'DEF', 'MID', 'FWD'];

  // 历史战绩统计
  const historyStats = history.length > 0
    ? history.reduce(
        (acc, h) => ({
          matchesPlayed: acc.matchesPlayed + h.matchesPlayed,
          wins: acc.wins + h.wins,
          draws: acc.draws + h.draws,
          losses: acc.losses + h.losses,
          goalsFor: acc.goalsFor + h.goalsFor,
          goalsAgainst: acc.goalsAgainst + h.goalsAgainst,
        }),
        { matchesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
      )
    : null;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: '概况', icon: <Shield className="h-3.5 w-3.5" /> },
    { key: 'squad', label: '阵容', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'history', label: '历史', icon: <History className="h-3.5 w-3.5" /> },
  ];

  return (
    <AnimatePresence>
      {open && teamId && (
        <>
          {/* 遮罩 */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 抽屉 */}
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
              <div className="flex h-40 items-center justify-center text-gray-400">
                暂无该球队资料
              </div>
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
                  <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white backdrop-blur"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <FlagBadge flagCode={team.code} size="lg" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-white">{team.nameZh}</h2>
                      <p className="text-sm text-white/70">{team.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {team.fifaRank && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                            FIFA #{team.fifaRank}
                          </span>
                        )}
                        {team.confederation && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                            {CONFEDERATION_LABELS[team.confederation] || team.confederation}
                          </span>
                        )}
                        {team.groupName && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                            {team.groupName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab 切换 */}
                <div className="flex border-b border-gray-100 bg-gray-50/50">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors ${
                        activeTab === tab.key
                          ? 'border-b-2 border-emerald-500 text-emerald-700'
                          : 'text-gray-400'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 内容区 */}
                <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(88vh - 180px)' }}>
                  {/* ─── 概况 Tab ─── */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      {/* 关键数据卡片 */}
                      <div className="grid grid-cols-3 gap-2">
                        {team.formation && (
                          <div className="rounded-xl bg-gray-50 p-3 text-center">
                            <p className="text-[10px] font-bold text-gray-400">阵型</p>
                            <p className="mt-1 text-sm font-black text-gray-900">{team.formation}</p>
                          </div>
                        )}
                        {team.worldCupAppearances !== undefined && (
                          <div className="rounded-xl bg-gray-50 p-3 text-center">
                            <p className="text-[10px] font-bold text-gray-400">参赛次数</p>
                            <p className="mt-1 text-sm font-black text-gray-900">{team.worldCupAppearances}次</p>
                          </div>
                        )}
                        {team.bestResult && (
                          <div className="rounded-xl bg-amber-50 p-3 text-center">
                            <p className="text-[10px] font-bold text-amber-500">最佳成绩</p>
                            <p className="mt-1 text-xs font-black text-amber-700">{team.bestResult}</p>
                          </div>
                        )}
                      </div>

                      {/* 教练信息 */}
                      {team.coachName && (
                        <div className="rounded-xl border border-gray-100 bg-white p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                            <Shield className="h-3.5 w-3.5" />
                            主教练
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-900">{team.coachName}</span>
                            {team.coachNationality && (
                              <span className="text-xs text-gray-400">{team.coachNationality}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 核心球员 */}
                      {team.heroPlayerNames && team.heroPlayerNames.length > 0 && (
                        <div className="rounded-xl border border-gray-100 bg-white p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                            <Star className="h-3.5 w-3.5" />
                            核心球员
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {team.heroPlayerNames.map(name => (
                              <span
                                key={name}
                                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 最近历史战绩摘要 */}
                      {history.length > 0 && (
                        <div
                          className="rounded-xl border border-gray-100 bg-white p-4 cursor-pointer"
                          onClick={() => setActiveTab('history')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                              <Trophy className="h-3.5 w-3.5" />
                              最近世界杯
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-300" />
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {history.slice(0, 3).map(h => (
                              <div key={h.id} className="flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-600">{h.year}</span>
                                <span className="font-bold text-gray-900">{h.result}</span>
                                <span className="text-gray-400">
                                  {h.wins}胜{h.draws}平{h.losses}负
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── 阵容 Tab ─── */}
                  {activeTab === 'squad' && (
                    <div className="space-y-4">
                      {players.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400">
                          暂无该球队阵容数据
                        </div>
                      ) : (
                        positionOrder.map(pos => {
                          const group = groupedPlayers[pos];
                          if (!group || group.length === 0) return null;
                          return (
                            <div key={pos}>
                              <div className="mb-2 flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${POSITION_COLORS[pos]}`}
                                >
                                  {POSITION_LABELS[pos]}
                                </span>
                                <span className="text-[10px] text-gray-400">{group.length}人</span>
                              </div>
                              <div className="space-y-1.5">
                                {group.map(player => (
                                  <div
                                    key={player.id}
                                    className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5"
                                  >
                                    {/* 号码 */}
                                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-gray-700 shadow-sm">
                                      {player.shirtNumber ?? '-'}
                                    </span>
                                    {/* 信息 */}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-bold text-gray-900 truncate">
                                          {player.nameZh || player.name}
                                        </span>
                                        {player.isCaptain && (
                                          <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700">
                                            C
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
                                        {player.club && <span>{player.club}</span>}
                                        {player.preferredFoot && <span>{player.preferredFoot}脚</span>}
                                      </div>
                                    </div>
                                    {/* 身价 */}
                                    {player.marketValue ? (
                                      <span className="flex-shrink-0 text-[10px] font-bold text-emerald-600">
                                        {formatMarketValue(player.marketValue)}
                                      </span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* ─── 历史 Tab ─── */}
                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      {history.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400">
                          暂无该球队历史战绩数据
                        </div>
                      ) : (
                        <>
                          {/* 累计战绩摘要 */}
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
                                  <p className="text-lg font-black text-red-500">{historyStats.losses}</p>
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

                          {/* 历届时间线 */}
                          <div className="space-y-2">
                            {history.map((h, idx) => (
                              <div
                                key={h.id}
                                className="relative rounded-xl border border-gray-100 bg-white p-3"
                              >
                                {/* 年份标签 */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-gray-900">{h.year}</span>
                                    <span className="text-[10px] text-gray-400">
                                      <MapPin className="inline h-3 w-3" /> {h.host}
                                    </span>
                                  </div>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      h.result.includes('冠军')
                                        ? 'bg-amber-100 text-amber-700'
                                        : h.result.includes('亚军')
                                          ? 'bg-gray-200 text-gray-700'
                                          : h.result.includes('季军') || h.result.includes('殿军')
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {h.result}
                                  </span>
                                </div>
                                {/* 战绩详情 */}
                                <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
                                  <span>{h.wins}胜{h.draws}平{h.losses}负</span>
                                  <span>{h.goalsFor}进球</span>
                                  <span>{h.goalsAgainst}失球</span>
                                </div>
                              </div>
                            ))}
                          </div>
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
