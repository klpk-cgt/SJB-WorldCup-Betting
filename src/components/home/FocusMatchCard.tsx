import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, Clock3, MapPin, Zap, Trophy, Flame, Radio, ArrowRight, BarChart3, Shirt, Tv, Info } from 'lucide-react';
import stadiumBackground from '../../assets/focus-match-stadium.png';
import { FocusMatch, mockFocusMatch, normalizeFlagCode, toFlagEmoji, formatIndexValue, flagStyles } from './focusMatch';

interface FocusMatchCardProps {
  match?: FocusMatch;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onQuickNavigate?: (target: 'schedule' | 'lineup' | 'score' | 'leaderboard') => void;
  onTeamClick?: (teamCode: string) => void;
}

/* ─── 主组件 ─── */
export default function FocusMatchCard({
  match = mockFocusMatch,
  onPrimaryAction,
  onSecondaryAction,
  onQuickNavigate,
  onTeamClick,
}: FocusMatchCardProps) {
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const isUpcoming = !isLive && !isFinished;

  const homeEmoji = toFlagEmoji(match.homeTeam.flagCode);
  const awayEmoji = toFlagEmoji(match.awayTeam.flagCode);
  const homeCode = normalizeFlagCode(match.homeTeam.flagCode);
  const awayCode = normalizeFlagCode(match.awayTeam.flagCode);

  const navItems = [
    { id: 'schedule', label: '赛程', icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { id: 'lineup', label: '阵容', icon: <Shirt className="h-3.5 w-3.5" /> },
    { id: 'score', label: '比分', icon: <Tv className="h-3.5 w-3.5" /> },
    { id: 'leaderboard', label: '榜单', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  ] as const;

  return (
    <section className="mx-auto w-full max-w-[960px]">
      <motion.div
        className="relative overflow-hidden rounded-2xl"
        style={{
          boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,197,94,0.06)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* 高斯模糊世界杯背景 */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${stadiumBackground})`,
            filter: 'blur(12px) brightness(0.55) saturate(1.2)',
            transform: 'scale(1.1)',
          }}
        />

        {/* 深色渐变叠加 - 减弱遮罩让背景更明显 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,rgba(34,197,94,0.06)_0%,transparent_60%)]" />

        {/* 顶部光带 */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.4), rgba(249,115,22,0.3), transparent)' }}
        />

        {/* 内容 */}
        <div className="relative z-10 px-4 py-3.5 text-white sm:px-5 sm:py-4">
          {/* ── 第一行：标签 ── */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 backdrop-blur-sm">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                <Trophy className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-[10px] font-bold text-amber-400">2026</span>
              <span className="text-[10px] font-medium text-white/60">{match.headlineTag?.replace('2026 ', '') || '世界杯'}</span>
            </div>

            <div className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1">
              {isLive ? (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                  <Radio className="h-3 w-3 text-red-400" />
                  <span className="text-[10px] font-black text-red-400">LIVE</span>
                </>
              ) : (
                <>
                  <Flame className="h-3 w-3 text-orange-400" />
                  <span className="text-[10px] font-bold text-orange-300">{match.hotLabel || '热门'}</span>
                </>
              )}
            </div>
          </div>

          {/* ── 第二行：球队对决 ── */}
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center">
            {/* 主队 */}
            <div className="flex items-center gap-2.5">
              <div
                className="relative flex h-10 w-10 shrink-0 items-center justify-center sm:h-12 sm:w-12 cursor-pointer"
                onClick={() => onTeamClick?.(match.homeTeam.flagCode)}
              >
                <span className="text-[1.75rem] leading-none sm:text-[2.1rem]">{homeEmoji}</span>
                <div className="absolute -right-1.5 -bottom-1 flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white/30 shadow-md">
                  {flagStyles[homeCode] ? (
                    <div className="h-full w-full" style={flagStyles[homeCode]} />
                  ) : (
                    <span className="text-[7px] font-black text-white drop-shadow">{homeCode}</span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <div
                  className="truncate text-sm font-black text-white sm:text-base cursor-pointer hover:text-emerald-300 transition-colors"
                  onClick={() => onTeamClick?.(match.homeTeam.flagCode)}
                >
                  {match.homeTeam.name}
                </div>
                <div className="mt-0.5 flex flex-col items-start gap-0.5">
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400/80">
                    <Trophy className="h-2 w-2" />世界排名{typeof match.homeTeam.stats?.worldRank === 'number' ? match.homeTeam.stats.worldRank : '--'}
                  </span>
                  <button
                    className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold text-white/70 ring-1 ring-white/10 hover:bg-white/20 hover:text-emerald-300 hover:ring-emerald-400/30 transition-all"
                    onClick={(e) => { e.stopPropagation(); onTeamClick?.(match.homeTeam.flagCode); }}
                  >
                    <Info className="h-2.5 w-2.5" />资料
                  </button>
                </div>
              </div>
            </div>

            {/* 中间 VS / 比分 */}
            <div className="mx-3 flex flex-col items-center sm:mx-5">
              <AnimatePresence mode="wait">
                {isUpcoming ? (
                  <motion.div
                    key="vs"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    className="text-xl font-black tracking-widest text-white/80 sm:text-2xl"
                    style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)' }}
                  >
                    VS
                  </motion.div>
                ) : (
                  <motion.div
                    key="score"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-xl font-black tracking-wider text-white sm:text-2xl"
                    style={{ textShadow: isLive ? '0 0 20px rgba(239,68,68,0.3)' : '0 0 16px rgba(255,255,255,0.15)' }}
                  >
                    {match.scoreText || '0 : 0'}
                  </motion.div>
                )}
              </AnimatePresence>
              {isLive && (
                <span className="mt-0.5 text-[9px] font-bold text-red-400/80">进行中</span>
              )}
              {isFinished && (
                <span className="mt-0.5 text-[9px] font-bold text-slate-400/80">已结束</span>
              )}
            </div>

            {/* 客队 */}
            <div className="flex items-center justify-end gap-2.5">
              <div className="min-w-0 text-right">
                <div
                  className="truncate text-sm font-black text-white sm:text-base cursor-pointer hover:text-emerald-300 transition-colors"
                  onClick={() => onTeamClick?.(match.awayTeam.flagCode)}
                >
                  {match.awayTeam.name}
                </div>
                <div className="mt-0.5 flex flex-col items-end gap-0.5">
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400/80">
                    <Trophy className="h-2 w-2" />世界排名{typeof match.awayTeam.stats?.worldRank === 'number' ? match.awayTeam.stats.worldRank : '--'}
                  </span>
                  <button
                    className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold text-white/70 ring-1 ring-white/10 hover:bg-white/20 hover:text-emerald-300 hover:ring-emerald-400/30 transition-all"
                    onClick={(e) => { e.stopPropagation(); onTeamClick?.(match.awayTeam.flagCode); }}
                  >
                    资料<Info className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
              <div
                className="relative flex h-10 w-10 shrink-0 items-center justify-center sm:h-12 sm:w-12 cursor-pointer"
                onClick={() => onTeamClick?.(match.awayTeam.flagCode)}
              >
                <span className="text-[1.75rem] leading-none sm:text-[2.1rem]">{awayEmoji}</span>
                <div className="absolute -left-1.5 -bottom-1 flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white/30 shadow-md">
                  {flagStyles[awayCode] ? (
                    <div className="h-full w-full" style={flagStyles[awayCode]} />
                  ) : (
                    <span className="text-[7px] font-black text-white drop-shadow">{awayCode}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── 第三行：比赛信息 ── */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1 text-[10px] text-white/50">
              <Clock3 className="h-3 w-3 text-green-400/70" />
              <span className="font-bold text-white/80">{match.startTimeBeijing}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-white/50">
              <CalendarDays className="h-3 w-3 text-orange-400/70" />
              <span className="font-bold text-white/80">{match.stage}{match.groupName ? ` · ${match.groupName}` : ''}</span>
            </span>
            {match.venue && (
              <span className="inline-flex items-center gap-1 text-[10px] text-white/50">
                <MapPin className="h-3 w-3 text-cyan-400/70" />
                <span className="font-bold text-white/80">{match.venue}</span>
              </span>
            )}
          </div>

          {/* ── 第四行：赔率指数 ── */}
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[
              { label: '主胜', value: match.odds?.homeWin, tone: 'green', team: match.homeTeam.name },
              { label: '平局', value: match.odds?.draw, tone: 'cyan', team: '' },
              { label: '客胜', value: match.odds?.awayWin, tone: 'orange', team: match.awayTeam.name },
            ].map((item, i) => {
              const tones = {
                green: 'border-green-500/20 hover:border-green-400/40 text-green-300 hover:bg-green-500/[0.08]',
                cyan: 'border-cyan-500/20 hover:border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/[0.08]',
                orange: 'border-orange-500/20 hover:border-orange-400/40 text-orange-300 hover:bg-orange-500/[0.08]',
              };
              return (
                <motion.button
                  key={item.label}
                  type="button"
                  onClick={onPrimaryAction}
                  className={`group rounded-xl border bg-white/[0.03] px-2 py-2 text-center transition-all duration-200 ${tones[item.tone as keyof typeof tones]} active:scale-[0.97]`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="text-[9px] font-medium text-white/40">{item.label}</div>
                  <div className="mt-0.5 text-base font-black tracking-tight sm:text-lg">
                    {formatIndexValue(item.value)}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* ── 第五行：快捷导航 ── */}
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-1 py-1">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => onQuickNavigate?.(item.id as any)}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80 active:scale-[0.96]"
                whileTap={{ scale: 0.96 }}
              >
                {item.icon}
                <span className="text-[9px] font-bold">{item.label}</span>
              </motion.button>
            ))}
            <motion.button
              type="button"
              onClick={onPrimaryAction}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-3 py-1.5 text-[11px] font-black text-white shadow-[0_4px_16px_rgba(34,197,94,0.25)] active:scale-[0.96]"
              whileTap={{ scale: 0.96 }}
            >
              <Zap className="h-3 w-3" />
              <span>竞猜</span>
              <ArrowRight className="h-3 w-3" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
