import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Crown, Flag, History, Lightbulb, Medal, Trophy, UserRound } from 'lucide-react';
import FlagBadge from './home/FlagBadge';
import SmartAvatar from './SmartAvatar';
import { PLAYER_AVATAR_MAP } from '../data/playerAvatars';
import { toLocalAvatarUrl } from '../utils/playerAvatar';
import { CHAMPION_TIMELINE, CLASSIC_TEAMS, FUN_FACTS, FUN_FACT_CATEGORY_META, GOLDEN_BOOT_WINNERS, LEGEND_PLAYERS, WORLD_CUP_RECORDS } from '../data/historyHall';
import type { FunFactCategory } from '../data/historyHall';
import { CLASSIC_MATCHES } from '../data/worldcup/classicMatches';
import { PLAYER_PROFILES } from '../data/worldcup/playerProfiles';
import type { PlayerProfileType } from '../data/worldcup/playerProfiles';
import { CONTINENT_TITLES, GOALS_PER_TOURNAMENT, HOST_PERFORMANCE, PENALTY_SHOOTOUT_RECORDS } from '../data/worldcup/visualStats';

type HistoryTab = 'champions' | 'teams' | 'players' | 'records' | 'funfacts' | 'goldenboot' | 'classicmatches' | 'visualstats';

const PIE_COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444', '#64748b'];

const TAB_META: Array<{
  key: HistoryTab;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'champions', label: '冠军年表', icon: <Trophy className="h-3.5 w-3.5" /> },
  { key: 'goldenboot', label: '金靴榜', icon: <Medal className="h-3.5 w-3.5" /> },
  { key: 'classicmatches', label: '经典比赛', icon: <Flag className="h-3.5 w-3.5" /> },
  { key: 'visualstats', label: '数据图鉴', icon: <Crown className="h-3.5 w-3.5" /> },
  { key: 'teams', label: '经典球队', icon: <Crown className="h-3.5 w-3.5" /> },
  { key: 'players', label: '球星档案', icon: <UserRound className="h-3.5 w-3.5" /> },
  { key: 'records', label: '世界杯纪录', icon: <Flag className="h-3.5 w-3.5" /> },
  { key: 'funfacts', label: '冷知识', icon: <Lightbulb className="h-3.5 w-3.5" /> },
];

export default function HistoryHallPage() {
  const [activeTab, setActiveTab] = useState<HistoryTab>('champions');
  const [funFactCategory, setFunFactCategory] = useState<FunFactCategory | 'all'>('all');
  const [playerType, setPlayerType] = useState<PlayerProfileType | 'all'>('all');

  const filteredFunFacts = useMemo(() => {
    if (funFactCategory === 'all') return FUN_FACTS;
    return FUN_FACTS.filter((f) => f.category === funFactCategory);
  }, [funFactCategory]);

  const filteredPlayers = useMemo(() => {
    if (playerType === 'all') return PLAYER_PROFILES;
    return PLAYER_PROFILES.filter((p) => p.type === playerType);
  }, [playerType]);

  const activeCount = useMemo(() => {
    if (activeTab === 'champions') return CHAMPION_TIMELINE.length;
    if (activeTab === 'goldenboot') return GOLDEN_BOOT_WINNERS.length;
    if (activeTab === 'classicmatches') return CLASSIC_MATCHES.length;
    if (activeTab === 'visualstats') return 4;
    if (activeTab === 'teams') return CLASSIC_TEAMS.length;
    if (activeTab === 'players') return filteredPlayers.length;
    if (activeTab === 'funfacts') return filteredFunFacts.length;
    return WORLD_CUP_RECORDS.length;
  }, [activeTab, filteredFunFacts, filteredPlayers]);

  return (
    <div className="space-y-5 pb-24">
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 px-5 py-5 text-white shadow-[0_10px_30px_rgba(15,23,42,0.10)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
              <History className="h-3.5 w-3.5" />
              历史长廊
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight">从近到远，回看世界杯冠军、传奇球队与时代记忆</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              涵盖 22 届世界杯完整数据，包括决赛比分、金靴奖、经典球队与传奇球星。
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-right ring-1 ring-white/10">
            <div className="text-[10px] font-bold text-emerald-200">当前栏目</div>
            <div className="mt-1 text-sm font-black text-white">{activeCount} 条</div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
          {TAB_META.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold transition ${
                  active ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === 'champions' && (
        <section className="space-y-3">
          {CHAMPION_TIMELINE.map((item) => (
            <div key={item.year} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    {item.year} · {item.host}
                  </div>
                  <h3 className="mt-3 text-xl font-black text-slate-900">{item.champion} 登顶</h3>
                </div>
                <div className="rounded-2xl bg-amber-50 px-3 py-2 text-right ring-1 ring-amber-100">
                  <div className="text-[10px] font-bold text-amber-700">决赛比分</div>
                  <div className="mt-1 text-sm font-black text-amber-900 font-mono">{item.score}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                  <div className="flex items-center gap-3">
                    <FlagBadge flagCode={item.championCode} size="md" />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">冠军</div>
                      <div className="mt-1 text-base font-black text-slate-900">{item.champion}</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                  <div className="flex items-center gap-3">
                    <FlagBadge flagCode={item.runnerUpCode} size="md" />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">亚军</div>
                      <div className="mt-1 text-base font-black text-slate-900">{item.runnerUp}</div>
                    </div>
                  </div>
                </div>
              </div>

              {item.topScorer && (
                <div className="mt-3 rounded-3xl bg-violet-50 px-4 py-3 ring-1 ring-violet-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500">金靴奖</div>
                      <div className="mt-1 text-sm font-black text-violet-900">{item.topScorer}</div>
                    </div>
                    <div className="rounded-xl bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-700">
                      {item.topScorerGoals} 球
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 rounded-3xl bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-4 py-4 ring-1 ring-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">重点记忆</div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{item.note}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'visualstats' && (
        <section className="space-y-4">
          {/* 各大洲夺冠分布 */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-black text-slate-900">各大洲夺冠次数分布</h3>
            <p className="mt-1 text-[10px] text-slate-500">22届世界杯冠军全部被欧洲和南美洲包揽</p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CONTINENT_TITLES.filter((c) => c.titles > 0 || c.runnerUps > 0)}
                    dataKey="titles"
                    nameKey="continentZh"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ continentZh, titles }) => `${continentZh} ${titles}冠`}
                  >
                    {CONTINENT_TITLES.filter((c) => c.titles > 0 || c.runnerUps > 0).map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} 次`, '夺冠次数']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {CONTINENT_TITLES.filter((c) => c.teams.length > 0).map((c) => (
                <div key={c.continent} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{c.continentZh}</span>
                    <span className="text-[10px] font-bold text-slate-500">{c.titles}冠 {c.runnerUps}亚</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">{c.teams.join('、')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 历届进球趋势 */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-black text-slate-900">历届进球数趋势</h3>
            <p className="mt-1 text-[10px] text-slate-500">1954年场均5.38球为历史最高，1990年场均2.21球为最低</p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={GOALS_PER_TOURNAMENT}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 9 }} interval={3} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(value: number, name: string) => {
                    if (name === 'avgGoals') return [`${value.toFixed(2)}`, '场均进球'];
                    return [value, '总进球'];
                  }} />
                  <Bar dataKey="avgGoals" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 东道主成绩 */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-black text-slate-900">东道主成绩统计</h3>
            <p className="mt-1 text-[10px] text-slate-500">6次东道主夺冠，2次小组出局（南非、卡塔尔）</p>
            <div className="mt-3 space-y-1.5">
              {HOST_PERFORMANCE.map((item) => (
                <div key={item.year} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                  <span className="w-10 text-[10px] font-black text-slate-500">{item.year}</span>
                  <FlagBadge flagCode={item.hostCode} size="sm" />
                  <span className="flex-1 text-xs font-bold text-slate-700">{item.host}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                    item.finalRank === 1 ? 'bg-amber-100 text-amber-700' :
                    item.finalRank <= 3 ? 'bg-emerald-100 text-emerald-700' :
                    item.finalRank <= 8 ? 'bg-slate-100 text-slate-600' :
                    'bg-red-50 text-red-600'
                  }`}>{item.result}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 点球大战胜率 */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-black text-slate-900">点球大战胜率排行</h3>
            <p className="mt-1 text-[10px] text-slate-500">德国4战4胜100%胜率，英格兰4战1胜是"点球魔咒"的受害者</p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PENALTY_SHOOTOUT_RECORDS} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} unit="%" />
                  <YAxis type="category" dataKey="team" tick={{ fontSize: 10 }} width={50} />
                  <Tooltip formatter={(value: number) => [`${value}%`, '胜率']} />
                  <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                    {PENALTY_SHOOTOUT_RECORDS.map((item, idx) => (
                      <Cell key={idx} fill={item.winRate === 100 ? '#10b981' : item.winRate >= 60 ? '#8b5cf6' : item.winRate >= 40 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {PENALTY_SHOOTOUT_RECORDS.map((item) => (
                <div key={item.code} className="flex items-center gap-2 text-[10px]">
                  <FlagBadge flagCode={item.code} size="sm" />
                  <span className="font-bold text-slate-700">{item.team}</span>
                  <span className="text-slate-400">{item.wins}胜{item.losses}负</span>
                  <span className={`ml-auto font-black ${item.winRate >= 60 ? 'text-emerald-600' : item.winRate >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{item.winRate}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'teams' && (
        <section className="grid gap-4">
          {CLASSIC_TEAMS.map((item) => (
            <div key={item.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FlagBadge flagCode={item.code} size="lg" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{item.era}</div>
                    <h3 className="mt-1 text-lg font-black text-slate-900">{item.title}</h3>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100">
                  {item.highlight}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.summary}</p>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'players' && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-1.5 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
            <button
              onClick={() => setPlayerType('all')}
              className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition ${
                playerType === 'all'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              全部 {PLAYER_PROFILES.length}
            </button>
            <button
              onClick={() => setPlayerType('legend')}
              className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition ${
                playerType === 'legend'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              传奇球星 {PLAYER_PROFILES.filter((p) => p.type === 'legend').length}
            </button>
            <button
              onClick={() => setPlayerType('active')}
              className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition ${
                playerType === 'active'
                  ? 'bg-violet-500 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              当红球星 {PLAYER_PROFILES.filter((p) => p.type === 'active').length}
            </button>
          </div>
          <div className="grid gap-4">
            {filteredPlayers.map((item) => {
              const avatarKey = `${item.teamId}:${item.name}`;
              const avatarUrl = toLocalAvatarUrl(PLAYER_AVATAR_MAP[avatarKey] || '');

              return (
                <div key={item.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <SmartAvatar name={item.nameZh} src={avatarUrl} size={56} />
                    <FlagBadge flagCode={item.teamId} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                          item.type === 'legend' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' : 'bg-violet-50 text-violet-700 ring-1 ring-violet-100'
                        }`}>
                          {item.type === 'legend' ? '传奇' : '当红'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{item.era}</span>
                      </div>
                      <h3 className="mt-1 text-lg font-black text-slate-900">{item.nameZh}</h3>
                      <p className="text-xs text-slate-500">{item.name} · {item.team} · {item.position}</p>
                    </div>
                  </div>
                  {item.nickname && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                      {item.nickname}
                    </span>
                  )}
                </div>

                {item.nicknameOrigin && (
                  <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                    <p className="text-[10px] text-slate-500"><span className="font-bold text-slate-600">绰号由来：</span>{item.nicknameOrigin}</p>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-400">世界杯参赛</div>
                    <div className="mt-1 text-lg font-black text-slate-900">{item.worldCupAppearances} 届</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-400">世界杯进球</div>
                    <div className="mt-1 text-lg font-black text-slate-900">{item.worldCupGoals} 球</div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-4 py-3 ring-1 ring-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">标志性时刻</div>
                  <p className="mt-1.5 text-xs leading-5 text-slate-700">{item.signatureMoment}</p>
                </div>

                <div className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">趣味数据</div>
                  <p className="mt-1.5 text-xs leading-5 text-amber-800">{item.funFact}</p>
                </div>

                {item.quote && (
                  <div className="mt-2 border-l-2 border-emerald-300 pl-3">
                    <p className="text-xs italic text-slate-500">"{item.quote}"</p>
                  </div>
                )}

                <p className="mt-3 text-xs leading-5 text-slate-600">{item.summary}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 'records' && (
        <section className="grid gap-4">
          {WORLD_CUP_RECORDS.map((item) => (
            <div key={item.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Flag className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
                  <h3 className="mt-1 text-xl font-black text-slate-900">{item.value}</h3>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-3xl bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                <FlagBadge flagCode={item.holderCode} size="md" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">纪录保持者</div>
                  <div className="mt-1 text-base font-black text-slate-900">{item.holder}</div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">{item.note}</p>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'goldenboot' && (
        <section className="space-y-2">
          {GOLDEN_BOOT_WINNERS.map((item, idx) => {
            const avatarKey = `${item.code}:${item.player}`;
            const avatarUrl = toLocalAvatarUrl(PLAYER_AVATAR_MAP[avatarKey] || '');
            
            return (
            <div key={item.year} className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                    idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-100 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'
                  }`}>{item.year}</span>
                  <SmartAvatar name={item.player} src={avatarUrl} size={40} />
                  <FlagBadge flagCode={item.code} size="sm" />
                  <div>
                    <p className="text-sm font-black text-slate-900">{item.player}</p>
                    <p className="text-[10px] text-slate-500">{item.team}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-amber-600">{item.goals}</span>
                  <span className="text-[10px] font-bold text-slate-400">球</span>
                </div>
              </div>
            </div>
            );
          })}
        </section>
      )}

      {activeTab === 'classicmatches' && (
        <section className="grid gap-4">
          {CLASSIC_MATCHES.map((match) => (
            <div key={match.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                    <Flag className="h-3 w-3 text-emerald-500" />
                    {match.year} · {match.stage}
                  </div>
                  <h3 className="mt-2 text-lg font-black text-slate-900">
                    {match.homeTeam} vs {match.awayTeam}
                  </h3>
                </div>
                <div className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-2 text-right ring-1 ring-emerald-100">
                  <div className="text-[10px] font-bold text-emerald-700">比分</div>
                  <div className="mt-1 text-sm font-black text-emerald-900 font-mono">{match.score}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <FlagBadge flagCode={match.homeTeamCode} size="sm" />
                <span className="text-xs font-bold text-slate-500">vs</span>
                <FlagBadge flagCode={match.awayTeamCode} size="sm" />
                <span className="ml-auto text-[10px] text-slate-400">{match.venue}</span>
              </div>

              {match.keyEvents.length > 0 && (
                <div className="mt-3 space-y-1.5 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">关键事件</div>
                  {match.keyEvents.map((evt, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">{evt.minute}</span>
                      <span className="text-xs text-slate-600">{evt.event}</span>
                    </div>
                  ))}
                </div>
              )}

              {match.heroPlayer && (
                <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">本场英雄</div>
                  <div className="mt-1 text-sm font-black text-amber-900">{match.heroPlayer}</div>
                  {match.heroAction && <p className="mt-1 text-xs text-amber-700">{match.heroAction}</p>}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {match.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">{tag}</span>
                ))}
              </div>

              <div className="mt-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-4 py-3 ring-1 ring-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">历史意义</div>
                <p className="mt-1.5 text-xs leading-5 text-slate-700">{match.significance}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === 'funfacts' && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-1.5 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
            <button
              onClick={() => setFunFactCategory('all')}
              className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition ${
                funFactCategory === 'all'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              全部 {FUN_FACTS.length}
            </button>
            {(Object.entries(FUN_FACT_CATEGORY_META) as [FunFactCategory, typeof FUN_FACT_CATEGORY_META[FunFactCategory]][]).map(([key, meta]) => {
              const count = FUN_FACTS.filter((f) => f.category === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setFunFactCategory(key)}
                  className={`rounded-xl px-3 py-1.5 text-[10px] font-bold transition ${
                    funFactCategory === key
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {meta.icon} {meta.label} {count}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3">
            {filteredFunFacts.map((item) => (
              <div key={item.title} className="rounded-[22px] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  <h3 className="text-sm font-black text-slate-900">{item.title}</h3>
                  <span className="ml-auto rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-bold text-slate-400 ring-1 ring-slate-200">
                    {FUN_FACT_CATEGORY_META[item.category].label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.fact}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
