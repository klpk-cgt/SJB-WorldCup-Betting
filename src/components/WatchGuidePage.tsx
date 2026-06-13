import React, { useEffect, useState } from 'react';
import { Eye, Flame, Sparkles, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import FlagBadge from './home/FlagBadge';
import { WATCH_GUIDE_2026 } from '../data/worldcup/watchGuide2026';
import type { GroupAnalysis, MustWatchMatch, DebutTeam } from '../data/worldcup/watchGuide2026';
import { apiRequest } from '../utils/api';

type GuideSection = 'groups' | 'mustwatch' | 'debut' | 'prediction';

type StandingRow = {
  teamId: string;
  name: string;
  code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

const SECTION_META: Array<{
  key: GuideSection;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: 'groups', label: '小组分析', icon: <Eye className="h-3.5 w-3.5" /> },
  { key: 'mustwatch', label: '必看比赛', icon: <Flame className="h-3.5 w-3.5" /> },
  { key: 'debut', label: '新军首秀', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { key: 'prediction', label: '整体预测', icon: <TrendingUp className="h-3.5 w-3.5" /> },
];

function GroupCard({ data, standings }: { data: GroupAnalysis; standings?: StandingRow[]; key?: string }) {
  const [expanded, setExpanded] = useState(false);

  const hasStandings = standings && standings.length > 0 && standings.some((s) => s.played > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 active:bg-slate-100"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-black text-emerald-600">
          {data.group}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900">{data.group}组</span>
            <span className="text-[11px] font-medium text-slate-500">· {data.groupName}</span>
            {hasStandings && (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">实时积分</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {data.teams.map((code) => (
              <FlagBadge key={code} flagCode={code} size="sm" />
            ))}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3.5 space-y-3">
          {/* 实时积分榜 */}
          {hasStandings && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-2 py-1.5 text-left font-bold">#</th>
                    <th className="px-2 py-1.5 text-left font-bold">球队</th>
                    <th className="px-2 py-1.5 text-center font-bold">赛</th>
                    <th className="px-2 py-1.5 text-center font-bold">胜</th>
                    <th className="px-2 py-1.5 text-center font-bold">平</th>
                    <th className="px-2 py-1.5 text-center font-bold">负</th>
                    <th className="px-2 py-1.5 text-center font-bold">净胜</th>
                    <th className="px-2 py-1.5 text-center font-bold">积分</th>
                  </tr>
                </thead>
                <tbody>
                  {standings!.map((row, idx) => (
                    <tr key={row.teamId} className={`border-t border-slate-100 ${idx < 2 ? 'bg-emerald-50/50' : ''}`}>
                      <td className="px-2 py-1.5 font-black text-slate-400">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <FlagBadge flagCode={row.code} size="sm" />
                          <span className="font-bold text-slate-800">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center">{row.played}</td>
                      <td className="px-2 py-1.5 text-center font-bold text-emerald-600">{row.won}</td>
                      <td className="px-2 py-1.5 text-center">{row.drawn}</td>
                      <td className="px-2 py-1.5 text-center text-rose-500">{row.lost}</td>
                      <td className={`px-2 py-1.5 text-center font-bold ${row.gd > 0 ? 'text-emerald-600' : row.gd < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {row.gd > 0 ? '+' : ''}{row.gd}
                      </td>
                      <td className="px-2 py-1.5 text-center font-black text-slate-900">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-1.5 bg-slate-50 text-[9px] text-slate-400">
                前2名出线 · 绿色底色为出线区
              </div>
            </div>
          )}

          <p className="text-xs leading-5 text-slate-600">{data.analysis}</p>
          {data.darkHorse && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
              <Flame className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">黑马</span>
                  <FlagBadge flagCode={data.darkHorse} size="sm" />
                </div>
                <p className="mt-1 text-[11px] leading-4 text-amber-800">{data.darkHorseReason}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MustWatchCard({ data, index }: { data: MustWatchMatch; index: number; key?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10 text-[10px] font-black text-red-500">
          {index + 1}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{data.stage}</span>
      </div>
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="flex flex-col items-center gap-1.5">
          <FlagBadge flagCode={data.homeTeamCode} size="md" />
          <span className="text-xs font-bold text-slate-800">{data.homeTeam}</span>
        </div>
        <div className="text-sm font-black text-slate-300">VS</div>
        <div className="flex flex-col items-center gap-1.5">
          <FlagBadge flagCode={data.awayTeamCode} size="md" />
          <span className="text-xs font-bold text-slate-800">{data.awayTeam}</span>
        </div>
      </div>
      <p className="text-[11px] leading-5 text-slate-500 text-center">{data.reason}</p>
    </div>
  );
}

function DebutTeamCard({ data }: { data: DebutTeam; key?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3 mb-3">
        <FlagBadge flagCode={data.teamId} size="lg" />
        <div>
          <h4 className="text-sm font-black text-slate-900">{data.teamName}</h4>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
            <Sparkles className="h-2.5 w-2.5" />
            首次参赛
          </span>
        </div>
      </div>
      <p className="text-[11px] leading-5 text-slate-600 mb-3">{data.story}</p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">核心球员</span>
          <span className="text-xs font-bold text-slate-800">{data.keyPlayer}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">预期目标</span>
          <span className="text-xs text-slate-600">{data.expectation}</span>
        </div>
      </div>
    </div>
  );
}

export default function WatchGuidePage() {
  const [activeSection, setActiveSection] = useState<GuideSection>('groups');
  const [standings, setStandings] = useState<Record<string, StandingRow[]>>({});

  useEffect(() => {
    apiRequest('/api/group-standings')
      .then((data) => setStandings(data || {}))
      .catch(() => setStandings({}));
  }, []);

  return (
    <div className="space-y-5 pb-24">
      {/* 页面标题区域 */}
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 px-5 py-5 text-white shadow-[0_10px_30px_rgba(15,23,42,0.10)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
              <Eye className="h-3.5 w-3.5" />
              观赛攻略
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight">2026世界杯观赛全攻略</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              12组深度分析、10场必看对决、4支新军首秀，助你畅享世界杯盛宴。
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-right ring-1 ring-white/10">
            <div className="text-[10px] font-bold text-emerald-200">赛事规模</div>
            <div className="mt-1 text-sm font-black text-white">48队</div>
          </div>
        </div>
      </section>

      {/* 栏目切换 */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1">
          {SECTION_META.map((tab) => {
            const active = activeSection === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSection(tab.key)}
                className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold transition ${
                  active
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 2)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 小组分析 */}
      {activeSection === 'groups' && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Eye className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-black text-slate-900">12组深度分析</h3>
            <span className="text-[10px] font-medium text-slate-400">点击展开详情</span>
          </div>
          {WATCH_GUIDE_2026.groupAnalyses.map((ga) => (
            <GroupCard key={ga.group} data={ga} standings={standings[ga.group]} />
          ))}
        </section>
      )}

      {/* 必看比赛 */}
      {activeSection === 'mustwatch' && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Flame className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-black text-slate-900">10场必看对决</h3>
          </div>
          {WATCH_GUIDE_2026.mustWatchMatches.map((m, i) => (
            <MustWatchCard key={i} data={m} index={i} />
          ))}
        </section>
      )}

      {/* 新军首秀 */}
      {activeSection === 'debut' && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-black text-slate-900">新军首秀</h3>
            <span className="text-[10px] font-medium text-slate-400">首次踏上世界杯舞台</span>
          </div>
          {WATCH_GUIDE_2026.debutTeams.map((dt) => (
            <DebutTeamCard key={dt.teamId} data={dt} />
          ))}
        </section>
      )}

      {/* 整体预测 */}
      {activeSection === 'prediction' && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-black text-slate-900">整体预测</h3>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-slate-50 border border-violet-100 px-4 py-4">
              <p className="text-sm leading-7 text-slate-700">{WATCH_GUIDE_2026.overallPrediction}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
