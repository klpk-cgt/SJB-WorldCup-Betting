// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 赛后群战报卡片组件
 *
 * 支持两种模式：
 * - compact：首页精简版（标题+比分+用户头衔+AI点评一句）
 * - full：详情页/战报墙完整版（全部字段渲染）
 */

import React from 'react';
import { motion } from 'motion/react';
import { Brain } from 'lucide-react';
import SmartAvatar from './SmartAvatar';

export interface BattleReportData {
  matchId: string;
  title: string;
  finalScoreLabel: string;
  hitRate: number;
  totalParticipants: number;
  biggestWinner?: { userId?: string; displayName: string; profit: number };
  biggestLoss?: { userId?: string; displayName: string; profit: number };
  exactPredictor?: { userId?: string; displayName: string; guessedScore: string; profit: number };
  darkHorse?: { userId?: string; displayName: string; streak: number };
  popularOpinion?: string;
  aiCommentary?: string;
}

interface BattleReportCardProps {
  report: BattleReportData;
  mode?: 'compact' | 'full';
  onClick?: (matchId: string) => void;
  className?: string;
}

function parseScoreFromTitle(title: string) {
  const match = title.match(/^(.+?)\s+(\d+):(\d+)\s+(.+?)\s+赛后战报$/);
  if (match) {
    return { homeTeam: match[1], homeScore: match[2], awayScore: match[3], awayTeam: match[4] };
  }
  return { homeTeam: '主队', homeScore: '0', awayScore: '0', awayTeam: '客队' };
}

function formatPts(profit: number) {
  if (profit >= 1000) return '+' + (profit / 1000).toFixed(1) + 'K';
  if (profit >= 0) return '+' + profit;
  return profit.toString();
}

/** 单个玩家行：avatar + 角色标签 + 昵称 + 数值 */
function StatRow({
  emoji,
  label,
  name,
  value,
  valueColor = 'text-slate-700',
  bgClass = 'bg-slate-50',
}: {
  emoji: string;
  label: string;
  name: string;
  value: string;
  valueColor?: string;
  bgClass?: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl ${bgClass} px-3 py-2.5`}>
      <span className="text-lg leading-none">{emoji}</span>
      <SmartAvatar name={name} size={32} className="shrink-0 ring-1 ring-white/70" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-slate-400 leading-tight">{label}</p>
        <p className="text-xs font-black text-slate-800 truncate leading-tight">{name}</p>
      </div>
      <span className={`shrink-0 text-xs font-black tabular-nums ${valueColor}`}>{value}</span>
    </div>
  );
}

export default function BattleReportCard({
  report,
  mode = 'full',
  onClick,
  className = '',
}: BattleReportCardProps) {
  const { homeTeam, homeScore, awayScore, awayTeam } = parseScoreFromTitle(report.title);
  const isCompact = mode === 'compact';
  const hasAnyData = report.totalParticipants > 0;

  const stats: React.ReactNode[] = [];

  if (hasAnyData && report.biggestWinner) {
    stats.push(
      <StatRow
        key="winner"
        emoji="🏆"
        label="最大赢家"
        name={report.biggestWinner.displayName}
        value={formatPts(report.biggestWinner.profit) + ' PTS'}
        valueColor="text-emerald-600"
        bgClass="bg-emerald-50/70"
      />
    );
  }

  if (hasAnyData && report.biggestLoss) {
    stats.push(
      <StatRow
        key="loss"
        emoji="📉"
        label="最惨玩家"
        name={report.biggestLoss.displayName}
        value={formatPts(report.biggestLoss.profit) + ' PTS'}
        valueColor="text-rose-600"
        bgClass="bg-rose-50/70"
      />
    );
  }

  if (hasAnyData && report.exactPredictor) {
    stats.push(
      <StatRow
        key="exact"
        emoji="🎯"
        label="最准预言家"
        name={report.exactPredictor.displayName}
        value={report.exactPredictor.guessedScore}
        valueColor="text-blue-600"
        bgClass="bg-blue-50/70"
      />
    );
  }

  if (hasAnyData && report.darkHorse) {
    stats.push(
      <StatRow
        key="dark"
        emoji="🕯️"
        label="反向明灯"
        name={report.darkHorse.displayName}
        value={'连黑' + report.darkHorse.streak + '场'}
        valueColor="text-violet-600"
        bgClass="bg-violet-50/70"
      />
    );
  }

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-[28px] border border-amber-200/60 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30 shadow-[0_8px_30px_rgba(245,158,11,0.10)] ${
        isCompact ? 'p-4' : 'p-5'
      } ${
        onClick
          ? 'cursor-pointer transition hover:shadow-[0_12px_36px_rgba(245,158,11,0.16)] hover:-translate-y-0.5'
          : ''
      } ${className}`}
    >
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-amber-400/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-20 rounded-full bg-orange-300/5 blur-2xl" />

      {/* ── 标题行 ── */}
      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
              {homeTeam}
            </span>
            <span className="text-lg font-black tabular-nums tracking-tight text-amber-600 sm:text-xl">
              {homeScore}
            </span>
            <span className="text-sm font-bold text-slate-400">:</span>
            <span className="text-lg font-black tabular-nums tracking-tight text-amber-600 sm:text-xl">
              {awayScore}
            </span>
            <span className="text-base font-black tracking-tight text-slate-900 sm:text-lg">
              {awayTeam}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-[10px] font-bold text-amber-500">赛后战报</p>
            {report.popularOpinion && (
              <span className="rounded-full bg-amber-100/70 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                {report.popularOpinion}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 rounded-2xl bg-amber-100/70 px-3 py-1.5 text-center">
          <div className="text-[10px] font-bold text-amber-700">命中率</div>
          <div className="text-lg font-black tabular-nums text-amber-800">{report.hitRate}%</div>
        </div>
      </div>

      {/* ── 无参与数据 ── */}
      {!hasAnyData && !isCompact && (
        <div className="relative mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-bold text-slate-400">
          该场比赛暂无参与数据
        </div>
      )}

      {/* ── 玩家统计（单列，均匀排列） ── */}
      {stats.length > 0 && (
        <div className="relative mt-3 flex flex-col gap-2">{stats}</div>
      )}

      {/* ── AI 点评 ── */}
      {report.aiCommentary && (
        <div className="relative mt-3 flex items-start gap-2 rounded-2xl bg-amber-50/40 border border-amber-100/30 px-3 py-2">
          <Brain className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
          <p className={`text-[11px] leading-relaxed text-slate-500 ${isCompact ? 'line-clamp-1' : 'line-clamp-2'}`}>
            {report.aiCommentary}
          </p>
        </div>
      )}

      {/* ── 参与人数 ── */}
      <div className="relative mt-2.5 flex items-center gap-1 text-[10px] font-bold text-slate-400">
        <span>{report.totalParticipants} 人参与</span>
        {!isCompact && onClick && (
          <span className="ml-auto text-amber-500">点击查看详情 →</span>
        )}
      </div>
    </motion.div>
  );

  if (onClick) {
    return <div onClick={() => onClick(report.matchId)}>{cardContent}</div>;
  }
  return cardContent;
}
