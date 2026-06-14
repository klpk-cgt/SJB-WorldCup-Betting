/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 赛后群战报卡片组件
 *
 * 支持两种模式：
 * - compact：首页精简版（标题+比分+最大赢家+AI点评首句）
 * - full：详情页/战报墙完整版（全部字段渲染）
 */

import React from 'react';
import { motion } from 'motion/react';
import { TrendingDown, TrendingUp, UserCheck, Zap, Brain } from 'lucide-react';

export interface BattleReportData {
  matchId: string;
  title: string;
  finalScoreLabel: string;
  hitRate: number;
  totalParticipants: number;
  biggestWinner?: { displayName: string; profit: number };
  biggestLoss?: { displayName: string; profit: number };
  exactPredictor?: { displayName: string; guessedScore: string; profit: number };
  darkHorse?: { displayName: string; streak: number };
  popularOpinion?: string;
  aiCommentary?: string;
}

interface BattleReportCardProps {
  report: BattleReportData;
  /** 'compact' 首页精简 | 'full' 完整 */
  mode?: 'compact' | 'full';
  /** 点击卡片回调，传入 matchId */
  onClick?: (matchId: string) => void;
  className?: string;
}

function parseScoreFromTitle(title: string): { homeTeam: string; homeScore: string; awayScore: string; awayTeam: string } {
  // 格式: "主队 2:1 客队 赛后战报"
  const match = title.match(/^(.+?)\s+(\d+):(\d+)\s+(.+?)\s+赛后战报$/);
  if (match) {
    return { homeTeam: match[1], homeScore: match[2], awayScore: match[3], awayTeam: match[4] };
  }
  return { homeTeam: '主队', homeScore: '0', awayScore: '0', awayTeam: '客队' };
}

export default function BattleReportCard({ report, mode = 'full', onClick, className = '' }: BattleReportCardProps) {
  const { homeTeam, homeScore, awayScore, awayTeam } = parseScoreFromTitle(report.title);
  const isCompact = mode === 'compact';
  const hasAnyData = report.totalParticipants > 0;

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-[28px] border border-amber-200/60 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 shadow-[0_8px_30px_rgba(245,158,11,0.10)] ${isCompact ? 'p-4' : 'p-5'} ${
        onClick ? 'cursor-pointer transition hover:shadow-[0_12px_36px_rgba(245,158,11,0.16)] hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-amber-400/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-20 rounded-full bg-orange-300/5 blur-2xl" />

      {/* 标题行：比分 + 标签 */}
      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black tracking-tight text-slate-900 sm:text-xl">
              {homeTeam}
            </span>
            <span className="text-lg font-black tabular-nums tracking-tight text-amber-600 sm:text-2xl">
              {homeScore}
            </span>
            <span className="text-sm font-bold text-slate-400">:</span>
            <span className="text-lg font-black tabular-nums tracking-tight text-amber-600 sm:text-2xl">
              {awayScore}
            </span>
            <span className="text-base font-black tracking-tight text-slate-900 sm:text-xl">
              {awayTeam}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-bold text-amber-500">赛后战报</p>
        </div>
        {/* 命中率徽章 */}
        <div className="shrink-0 rounded-2xl bg-amber-100/70 px-3 py-1.5 text-center">
          <div className="text-[10px] font-bold text-amber-700">命中率</div>
          <div className="text-lg font-black tabular-nums text-amber-800">{report.hitRate}%</div>
        </div>
      </div>

      {!hasAnyData && !isCompact && (
        <div className="relative mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-bold text-slate-400">
          该场比赛暂无参与数据
        </div>
      )}

      {/* 数据行网格 */}
      {hasAnyData && (
        <div className={`relative mt-4 grid gap-2 ${isCompact ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {/* 最大赢家 */}
          {report.biggestWinner && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50/70 px-3 py-2">
              <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-600">
                最大赢家：{report.biggestWinner.displayName}
              </div>
              <span className="shrink-0 text-xs font-black tabular-nums text-emerald-600">
                +{(report.biggestWinner.profit >= 1000 ? (report.biggestWinner.profit / 1000).toFixed(1) + 'K' : report.biggestWinner.profit)} PTS
              </span>
            </div>
          )}

          {/* 最惨玩家 */}
          {report.biggestLoss && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50/70 px-3 py-2">
              <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              <div className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-600">
                最惨玩家：{report.biggestLoss.displayName}
              </div>
              <span className="shrink-0 text-xs font-black tabular-nums text-rose-600">
                {report.biggestLoss.profit >= 1000 ? (report.biggestLoss.profit / 1000).toFixed(1) + 'K' : report.biggestLoss.profit} PTS
              </span>
            </div>
          )}
        </div>
      )}

      {/* 最准预言家 + 反向明灯 （非 compact 模式） */}
      {!isCompact && hasAnyData && (
        <div className="relative mt-2 grid grid-cols-2 gap-2">
          {report.exactPredictor && (
            <div className="flex items-center gap-2 rounded-xl bg-blue-50/60 px-3 py-2">
              <UserCheck className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-600">
                最准预言家：{report.exactPredictor.displayName}
              </div>
              <span className="shrink-0 text-[10px] font-black text-blue-600">
                猜中 {report.exactPredictor.guessedScore}
              </span>
            </div>
          )}

          {report.darkHorse && (
            <div className="flex items-center gap-2 rounded-xl bg-violet-50/60 px-3 py-2">
              <Zap className="h-3.5 w-3.5 shrink-0 text-violet-500" />
              <div className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-600">
                反向明灯：{report.darkHorse.displayName}
              </div>
              <span className="shrink-0 text-[10px] font-black text-violet-600">
                连黑 {report.darkHorse.streak} 场
              </span>
            </div>
          )}
        </div>
      )}

      {/* 群体倾向 pill（精简模式显示） */}
      {isCompact && report.popularOpinion && (
        <div className="relative mt-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/70 px-2.5 py-1 text-[10px] font-black text-amber-700">
            {report.popularOpinion}
          </span>
        </div>
      )}

      {/* AI 点评 */}
      {report.aiCommentary && (
        <div className="relative mt-3 rounded-2xl bg-amber-50/60 border border-amber-100/50 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Brain className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-black text-amber-600">AI 点评</span>
          </div>
          <p className={`text-[11px] leading-relaxed text-slate-600 ${isCompact ? 'line-clamp-2' : ''}`}>
            {report.aiCommentary}
          </p>
        </div>
      )}

      {/* 参与人数角标 */}
      <div className="relative mt-3 flex items-center gap-1 text-[10px] font-bold text-slate-400">
        <span>{report.totalParticipants} 人参与</span>
        {!isCompact && onClick && (
          <span className="ml-auto text-amber-500">点击查看详情 →</span>
        )}
      </div>
    </motion.div>
  );

  if (onClick) {
    return (
      <div onClick={() => onClick(report.matchId)}>
        {cardContent}
      </div>
    );
  }

  return cardContent;
}
