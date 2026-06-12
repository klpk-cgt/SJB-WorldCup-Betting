/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Flame,
  Sparkles,
  CheckCircle2,
  XCircle,
  Award,
  Settings,
  Calendar,
  Crown,
} from 'lucide-react';
import SmartAvatar from './SmartAvatar';

export interface ActivityItem {
  id: string;
  type:
    | 'PREDICTION_PLACED'
    | 'PREDICTION_WON'
    | 'PREDICTION_LOST'
    | 'PREDICTION_VOID'
    | 'BIG_WIN'
    | 'STREAK_HIT'
    | 'POINTS_ADJUSTED'
    | 'CHECKIN'
    | 'QUIZ_ANSWERED'
    | 'BADGE_UNLOCKED'
    | 'TITLE_CHANGED'
    | 'TOURNAMENT_BET'
    | 'JOINED';
  userId: string;
  displayName: string;
  avatarUrl?: string;
  message: string;
  deltaPoints?: number;
  badgeId?: string;
  badgeLabel?: string;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  emptyText?: string;
  limit?: number;
}

const TONE_CLASS: Record<string, { bg: string; ring: string; text: string; icon: string }> = {
  PREDICTION_PLACED: { bg: 'bg-sky-50', ring: 'ring-sky-100', text: 'text-sky-700', icon: 'text-sky-500' },
  PREDICTION_WON: { bg: 'bg-emerald-50', ring: 'ring-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-500' },
  PREDICTION_LOST: { bg: 'bg-rose-50', ring: 'ring-rose-100', text: 'text-rose-700', icon: 'text-rose-500' },
  PREDICTION_VOID: { bg: 'bg-slate-50', ring: 'ring-slate-100', text: 'text-slate-500', icon: 'text-slate-400' },
  BIG_WIN: { bg: 'bg-amber-50', ring: 'ring-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
  STREAK_HIT: { bg: 'bg-rose-50', ring: 'ring-rose-100', text: 'text-rose-700', icon: 'text-rose-500' },
  POINTS_ADJUSTED: { bg: 'bg-violet-50', ring: 'ring-violet-100', text: 'text-violet-700', icon: 'text-violet-500' },
  CHECKIN: { bg: 'bg-cyan-50', ring: 'ring-cyan-100', text: 'text-cyan-700', icon: 'text-cyan-500' },
  QUIZ_ANSWERED: { bg: 'bg-violet-50', ring: 'ring-violet-100', text: 'text-violet-700', icon: 'text-violet-500' },
  BADGE_UNLOCKED: { bg: 'bg-amber-50', ring: 'ring-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
  TITLE_CHANGED: { bg: 'bg-amber-50', ring: 'ring-amber-100', text: 'text-amber-700', icon: 'text-amber-500' },
  TOURNAMENT_BET: { bg: 'bg-cyan-50', ring: 'ring-cyan-100', text: 'text-cyan-700', icon: 'text-cyan-500' },
  JOINED: { bg: 'bg-slate-50', ring: 'ring-slate-100', text: 'text-slate-700', icon: 'text-slate-500' },
};

function ActivityIcon({ type, className = 'h-4 w-4' }: { type: ActivityItem['type']; className?: string }) {
  switch (type) {
    case 'PREDICTION_PLACED':
      return <Target className={className} />;
    case 'PREDICTION_WON':
      return <CheckCircle2 className={className} />;
    case 'PREDICTION_LOST':
      return <XCircle className={className} />;
    case 'PREDICTION_VOID':
      return <Settings className={className} />;
    case 'BIG_WIN':
      return <Trophy className={className} />;
    case 'STREAK_HIT':
      return <Flame className={className} />;
    case 'POINTS_ADJUSTED':
      return <Coins className={className} />;
    case 'CHECKIN':
      return <Calendar className={className} />;
    case 'QUIZ_ANSWERED':
      return <Sparkles className={className} />;
    case 'BADGE_UNLOCKED':
      return <Award className={className} />;
    case 'TITLE_CHANGED':
      return <Crown className={className} />;
    case 'TOURNAMENT_BET':
      return <Trophy className={className} />;
    case 'JOINED':
      return <Sparkles className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - t) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export default function ActivityFeed({ activities, loading, emptyText = '群里最近有点安静～', limit }: ActivityFeedProps) {
  const list = limit ? activities.slice(0, limit) : activities;
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (!list.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {list.map((act, idx) => {
        const tone = TONE_CLASS[act.type] || TONE_CLASS.PREDICTION_PLACED;
        const delta = act.deltaPoints;
        return (
          <motion.div
            key={act.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(idx * 0.02, 0.3) }}
            className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-slate-200"
          >
            <SmartAvatar
              name={act.displayName}
              src={act.avatarUrl}
              size={36}
              className="ring-1 ring-slate-200"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ring-1 ${tone.bg} ${tone.ring}`}>
                  <ActivityIcon type={act.type} className={`h-3 w-3 ${tone.icon}`} />
                </span>
                <span className="truncate font-black text-slate-900">{act.displayName}</span>
                {delta !== undefined && delta !== null && delta !== 0 && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      delta > 0
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                    }`}
                  >
                    {delta > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {delta > 0 ? '+' : ''}
                    {delta.toLocaleString()}
                  </span>
                )}
                <span className="ml-auto text-[10px] font-semibold text-slate-400">{formatRelativeTime(act.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{act.message}</p>
              {act.type === 'BADGE_UNLOCKED' && act.badgeLabel && (
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-100">
                  <Award className="h-3 w-3" />
                  成就解锁
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
