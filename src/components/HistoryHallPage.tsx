import React, { useMemo, useState } from 'react';
import { Crown, Flag, History, Medal, Trophy, UserRound } from 'lucide-react';
import FlagBadge from './home/FlagBadge';
import { CHAMPION_TIMELINE, CLASSIC_TEAMS, LEGEND_PLAYERS, WORLD_CUP_RECORDS } from '../data/historyHall';

type HistoryTab = 'champions' | 'teams' | 'players' | 'records';

const TAB_META: Array<{
  key: HistoryTab;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'champions', label: '冠军年表', icon: <Trophy className="h-3.5 w-3.5" /> },
  { key: 'teams', label: '经典球队', icon: <Crown className="h-3.5 w-3.5" /> },
  { key: 'players', label: '传奇球星', icon: <UserRound className="h-3.5 w-3.5" /> },
  { key: 'records', label: '世界杯纪录', icon: <Medal className="h-3.5 w-3.5" /> },
];

export default function HistoryHallPage() {
  const [activeTab, setActiveTab] = useState<HistoryTab>('champions');

  const activeCount = useMemo(() => {
    if (activeTab === 'champions') return CHAMPION_TIMELINE.length;
    if (activeTab === 'teams') return CLASSIC_TEAMS.length;
    if (activeTab === 'players') return LEGEND_PLAYERS.length;
    return WORLD_CUP_RECORDS.length;
  }, [activeTab]);

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
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1">
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
        <section className="grid gap-4">
          {LEGEND_PLAYERS.map((item) => (
            <div key={item.name} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FlagBadge flagCode={item.code} size="lg" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{item.era}</div>
                    <h3 className="mt-1 text-lg font-black text-slate-900">{item.name}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.team}</p>
                  </div>
                </div>
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-100">
                  {item.record}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-400">世界杯参赛</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{item.worldCups} 届</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-400">世界杯进球</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{item.goals} 球</div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">{item.summary}</p>
            </div>
          ))}
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
    </div>
  );
}
