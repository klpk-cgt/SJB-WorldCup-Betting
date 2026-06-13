import React from 'react';
import { Check, GitBranch } from 'lucide-react';
import { BracketState, BracketMatchNode } from '../types';
import { formatDate } from '../utils/api';
import FlagBadge from './home/FlagBadge';

interface BracketBoardProps {
  bracket: BracketState | null;
  onOpenMatch: (matchId?: string) => void;
}

export default function BracketBoard({ bracket, onOpenMatch }: BracketBoardProps) {
  if (!bracket) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        暂时还没有可展示的淘汰赛对阵图。
      </div>
    );
  }

  const rounds = bracket.rounds;
  const colCount = rounds.length;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 px-1">
        <GitBranch className="h-4.5 w-4.5 text-emerald-600" />
        <h3 className="text-sm font-black text-slate-900">淘汰赛对阵图</h3>
      </div>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="inline-flex items-stretch" style={{ gap: 0 }}>
          {rounds.map((round, ri) => {
            const isLast = ri === colCount - 1;
            const prevMatchCount = ri > 0 ? rounds[ri - 1].matches.length : 0;
            const matchCount = round.matches.length;
            // 每轮之间的间距随轮次增大
            const rowGap = ri === 0 ? 12 : Math.pow(2, ri) * 20;
            const topPad = ri > 0 ? (prevMatchCount * (48 + 12) - matchCount * (48 + rowGap)) / 2 : 0;

            return (
              <React.Fragment key={round.key}>
                {/* 连接线列 */}
                {ri > 0 && (
                  <div className="flex flex-col justify-center" style={{ width: 32, paddingTop: Math.max(0, topPad) }}>
                    <svg width="32" height={matchCount * (48 + rowGap) - rowGap} className="overflow-visible">
                      {round.matches.map((match, mi) => {
                        const y1 = mi * (48 + rowGap) + 24;
                        const y2 = y1;
                        const x1 = 0;
                        const x2 = 32;
                        // 水平线连接到下一轮
                        return (
                          <g key={match.id}>
                            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 2" />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}

                {/* 比赛列 */}
                <div
                  className="flex flex-col shrink-0"
                  style={{ width: 220, gap: rowGap, paddingTop: Math.max(0, topPad) }}
                >
                  {/* 轮次标题 */}
                  <div className="sticky top-0 z-10 rounded-2xl bg-slate-950 px-4 py-2.5 text-center text-xs font-black text-white">
                    {round.label}
                  </div>

                  {/* 比赛卡片 */}
                  {round.matches.map((match) => (
                    <div key={match.id}>
                      <BracketCard match={match} onOpen={() => onOpenMatch(match.matchId)} />
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function BracketCard({ match, onOpen }: { match: BracketMatchNode; onOpen: (id?: string) => void }) {
  const hasMatch = Boolean(match.matchId);
  const isFinished = Boolean(match.winnerTeamId);
  const isLive = match.status === 'LIVE' || match.status === 'HT' || match.status === 'AET' || match.status === 'PEN';

  return (
    <button
      onClick={() => onOpen(match.matchId)}
      disabled={!hasMatch}
      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
        hasMatch
          ? isFinished
            ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300'
            : isLive
              ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300 animate-pulse'
              : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30'
          : 'cursor-default border-dashed border-slate-200 bg-slate-50'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400">{match.title}</p>
        {isFinished && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
            <Check className="h-2.5 w-2.5" /> 已晋级
          </span>
        )}
        {isLive && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700">进行中</span>
        )}
      </div>
      <div className="space-y-1.5">
        <BracketTeamRow
          code={match.homeTeamCode}
          name={match.homeTeamName || '待定'}
          score={match.homeScore}
          isWinner={match.winnerTeamId === match.homeTeamId}
          isFinished={isFinished}
        />
        <div className="flex items-center justify-center">
          <span className="text-[9px] font-bold text-slate-300">VS</span>
        </div>
        <BracketTeamRow
          code={match.awayTeamCode}
          name={match.awayTeamName || match.slotLabel || '待定'}
          score={match.awayScore}
          isWinner={match.winnerTeamId === match.awayTeamId}
          isFinished={isFinished}
        />
      </div>
      {match.startTimeUtc && (
        <p className="mt-2 text-[10px] text-slate-400">{formatDate(match.startTimeUtc)}</p>
      )}
    </button>
  );
}

function BracketTeamRow({ code, name, score, isWinner, isFinished }: { code?: string; name: string; score?: number; isWinner?: boolean; isFinished?: boolean }) {
  const isEliminated = isFinished && !isWinner;
  return (
    <div className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 ring-1 ${
      isWinner ? 'bg-emerald-50 ring-emerald-200' : isEliminated ? 'bg-slate-50 ring-slate-200 opacity-50' : 'bg-white ring-slate-200'
    }`}>
      <div className="flex min-w-0 items-center gap-1.5">
        <FlagBadge flagCode={code} size="sm" />
        <span className={`truncate text-xs ${isWinner ? 'font-black text-emerald-700' : isEliminated ? 'font-medium text-slate-400 line-through' : 'font-bold text-slate-800'}`}>
          {name}
        </span>
        {isWinner && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
      </div>
      <span className={`text-xs ${isWinner ? 'font-black text-emerald-600' : 'font-black text-slate-900'}`}>
        {typeof score === 'number' ? score : '--'}
      </span>
    </div>
  );
}
