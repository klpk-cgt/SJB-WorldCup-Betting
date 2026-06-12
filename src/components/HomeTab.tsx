/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Brain, Calendar, CheckCircle2, ChevronRight, Coins, Sparkles, Timer, XCircle, Zap } from 'lucide-react';
import { AIContent, Match, MatchStatus } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import { useStaggerReveal, useFadeIn } from '../animations';
import { getBeijingDayLabel, getMatchesForNearestDay } from '../utils/matchDisplay';
import FocusMatchCard from './home/FocusMatchCard';
import AIPredictionCard from './home/AIPredictionCard';
import { FocusMatch, FocusMatchStatus, TeamStats, mockFocusMatch } from './home/focusMatch';
import FlagBadge from './home/FlagBadge';
import SmartAvatar from './SmartAvatar';
import TeamDetailDrawer from './TeamDetailDrawer';
import { useToast } from './ToastProvider';
import ActivityFeed, { ActivityItem } from './ActivityFeed';

interface HomeTabProps {
  user: any;
  wallet: any;
  onRefreshWallet: () => void;
  onNavigate: (tab: string, matchId?: string, detailTab?: string) => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function formatCountdown(target: string, now: number) {
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return '00:00:00';

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => value.toString().padStart(2, '0')).join(':');
}

function formatBeijingTime(iso: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(new Date(iso));
}

function stageLabel(stage: Match['stage']) {
  const labels: Record<Match['stage'], string> = {
    'Group Stage': '小组赛',
    'Round of 32': '32 强',
    'Round of 16': '16 强',
    'Quarter-finals': '1/4 决赛',
    'Semi-finals': '半决赛',
    Final: '决赛',
    'Third-place play-off': '季军赛',
  };
  return labels[stage] || stage;
}

function groupLabel(groupName?: string) {
  if (!groupName) return undefined;
  const match = groupName.match(/Group\s+([A-Z])/i);
  return match ? `${match[1]} 组` : groupName;
}

const showcaseStatsByTeamCode: Record<string, TeamStats> = {
  ARG: { goals: 13, avgGoals: 2.17, worldRank: 1 },
  BRA: { goals: 12, avgGoals: 2.0, worldRank: 5 },
  ENG: { goals: 10, avgGoals: 1.67, worldRank: 4 },
  ESP: { goals: 11, avgGoals: 1.83, worldRank: 8 },
  FRA: { goals: 12, avgGoals: 2.0, worldRank: 3 },
  GER: { goals: 11, avgGoals: 1.83, worldRank: 12 },
  ITA: { goals: 9, avgGoals: 1.5, worldRank: 9 },
  JPN: { goals: 8, avgGoals: 1.33, worldRank: 18 },
  MEX: { goals: 7, avgGoals: 1.17, worldRank: 14 },
  NED: { goals: 9, avgGoals: 1.5, worldRank: 7 },
  POR: { goals: 10, avgGoals: 1.67, worldRank: 6 },
  USA: { goals: 8, avgGoals: 1.33, worldRank: 11 },
};

function buildFocusMatch(match: Match | undefined, now: number): FocusMatch {
  if (!match?.homeTeam || !match.awayTeam) {
    return mockFocusMatch;
  }

  const status: FocusMatchStatus =
    match.status === MatchStatus.LIVE
      ? 'live'
      : [MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(match.status)
        ? 'finished'
        : 'upcoming';

  return {
    id: match.id,
    stage: stageLabel(match.stage),
    groupName: groupLabel(match.homeTeam.groupName || match.awayTeam.groupName),
    startTimeBeijing: formatBeijingTime(match.startTimeUtc),
    countdownText: status === 'upcoming' ? formatCountdown(match.startTimeUtc, now) : undefined,
    venue: match.venueCity,
    headlineTag: '2026 世界杯',
    hotLabel: match.status === MatchStatus.LIVE ? '热战' : '热门',
    status,
    scoreText: status === 'upcoming' ? undefined : `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`,
    homeTeam: {
      name: match.homeTeam.nameZh,
      flagCode: match.homeTeam.code,
      stats: {
        goals: showcaseStatsByTeamCode[match.homeTeam.code]?.goals,
        avgGoals: showcaseStatsByTeamCode[match.homeTeam.code]?.avgGoals,
        worldRank: match.homeTeam.fifaRank,
      },
    },
    awayTeam: {
      name: match.awayTeam.nameZh,
      flagCode: match.awayTeam.code,
      stats: {
        goals: showcaseStatsByTeamCode[match.awayTeam.code]?.goals,
        avgGoals: showcaseStatsByTeamCode[match.awayTeam.code]?.avgGoals,
        worldRank: match.awayTeam.fifaRank,
      },
    },
    odds: {
      homeWin: match.odds?.h2h.homeWin,
      draw: match.odds?.h2h.draw,
      awayWin: match.odds?.h2h.awayWin,
    },
  };
}

function extractAiView(ai: AIContent | null) {
  if (!ai) {
    return {
      summary: '今晚先盯焦点战节奏，再决定娱乐积分怎么分配。',
      bullets: ['首发出来后再加注', '热门方向别一把压满', '比分玩法更适合小档位试水'],
      riskWarning: '临场首发和锁盘时间都可能改变判断，建议娱乐积分分档操作。',
      provider: 'AI 赛前助手',
      title: '今日焦点推荐已生成',
    };
  }

  return {
    summary: ai.summary || ai.content.split('\n').find(Boolean) || ai.title,
    bullets: ai.bullets?.slice(0, 3) || [],
    riskWarning: ai.riskWarning || '注意临场变化，娱乐积分别一次性压太重。',
    provider: ai.provider || ai.model || 'AI 赛前助手',
    title: ai.title,
  };
}

function ColdAlerts() {
  const [alerts, setAlerts] = useState<Array<{ matchId: string; homeTeam: string; awayTeam: string; alert: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiRequest('/api/ai/cold-alerts')
      .then((data) => {
        setAlerts(data.alerts || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || alerts.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-700">
        <Zap className="h-3 w-3" />
        冷门提醒
      </div>
      <div className="mt-2 space-y-1.5">
        {alerts.slice(0, 3).map((a) => (
          <div key={a.matchId} className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs text-amber-800">
            {a.alert}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomeTab({ user, wallet, onRefreshWallet, onNavigate }: HomeTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [dailyAI, setDailyAI] = useState<AIContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinishedToday, setQuizFinishedToday] = useState(false);
  const quizSubmittingRef = useRef(false);
  const matchesContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // 动画
  useStaggerReveal(matchesContainerRef, '.match-card-item', { stagger: 0.06, y: 15 });
  useFadeIn(headerRef, { delay: 0.1 });
  const [teamDetailId, setTeamDetailId] = useState<string | null>(null);
  const [teamDetailOpen, setTeamDetailOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function initHome() {
      try {
        const [matchesData, aiData, activityData] = await Promise.all([
          apiRequest('/api/matches'),
          apiRequest('/api/ai/daily'),
          apiRequest('/api/activities?limit=20'),
        ]);
        setMatches(matchesData);
        setDailyAI(aiData);
        setActivities(activityData.activities || []);
        setActivitiesLoading(false);

        if (user) {
          try {
            const statusResult = await apiRequest('/api/quiz/status');
            setQuizFinishedToday(statusResult.completedToday);
          } catch {
            // Ignore quiz status failures on home page
          }
        }
      } catch (error) {
        console.error('Failed to load home data', error);
      } finally {
        setLoading(false);
      }
    }

    initHome();
  }, [user]);

  const startQuiz = async () => {
    if (quizFinishedToday) return;
    setQuizLoading(true);
    setShowQuizModal(true);
    setCurrentQIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setQuizCompleted(false);
    setQuizScore(0);

    try {
      const data = await apiRequest('/api/quiz/daily');
      setQuizQuestions(data.questions);
    } catch (error: any) {
      toast.error('获取今日问答失败', error.message || '请稍后重试。');
      setShowQuizModal(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    if (answered || quizSubmittingRef.current || !quizQuestions[currentQIndex]) return;
    quizSubmittingRef.current = true;
    setSelectedOption(optionIndex);
    setAnswered(true);

    const isCorrect = optionIndex === quizQuestions[currentQIndex].correctIndex;

    try {
      const res = await apiRequest('/api/quiz/answer', {
        method: 'POST',
        body: JSON.stringify({
          questionId: quizQuestions[currentQIndex].id,
          selectedIndex: optionIndex,
        }),
      });

      if (isCorrect) {
        setQuizScore((prev) => prev + (res.pointsEarned || 100));
      }
    } catch {
      // Keep local feedback even if request fails
    } finally {
      quizSubmittingRef.current = false;
    }
  };

  const goNextQuestion = () => {
    if (currentQIndex < quizQuestions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setAnswered(false);
      return;
    }

    setQuizCompleted(true);
    setQuizFinishedToday(true);
    onRefreshWallet();
  };

  const liveMatch = matches.find((match) => match.status === MatchStatus.LIVE || match.status === MatchStatus.HT);
  const nearestDayMatches = getMatchesForNearestDay(matches);
  const recentMatches = nearestDayMatches.slice(0, 8);

  // 焦点战卡片优先级：进行中 > 即将开赛 > 未来最近 > 已结束最近
  const featuredMatch = useMemo(() => {
    // 1. 优先显示正在进行的比赛
    if (liveMatch) return liveMatch;

    // 2. 显示下一场即将开赛的比赛（今天或未来最近）
    const upcomingMatches = matches
      .filter((m) => m.status === MatchStatus.NS && new Date(m.startTimeUtc).getTime() > now)
      .sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime());

    if (upcomingMatches.length > 0) return upcomingMatches[0];

    // 3. 如果今天没有未开赛比赛，显示未来最近一场
    const futureMatches = matches
      .filter((m) => new Date(m.startTimeUtc).getTime() > now)
      .sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime());

    if (futureMatches.length > 0) return futureMatches[0];

    // 4. 如果全部比赛都结束，显示最近一场已结束比赛
    const finishedMatches = matches
      .filter((m) => [MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(m.status))
      .sort((a, b) => new Date(b.startTimeUtc).getTime() - new Date(a.startTimeUtc).getTime());

    if (finishedMatches.length > 0) return finishedMatches[0];

    // 兜底
    return matches[0];
  }, [matches, liveMatch, now]);
  const focusMatch = useMemo(() => buildFocusMatch(featuredMatch, now), [featuredMatch, now]);
  const aiView = extractAiView(dailyAI);
  const nearestDayLabel = recentMatches[0] ? getBeijingDayLabel(recentMatches[0].startTimeUtc) : '';

  // 下一场未开赛的比赛倒计时
  const nextUpcoming = useMemo(() => {
    const upcoming = matches
      .filter((m) => m.status === MatchStatus.NS && new Date(m.startTimeUtc).getTime() > now)
      .sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime());
    return upcoming[0] || null;
  }, [matches, now]);

  const countdownText = useMemo(() => {
    if (!nextUpcoming) return null;
    return formatCountdown(nextUpcoming.startTimeUtc, now);
  }, [nextUpcoming, now]);

  // AI 今日推荐 3 场
  const aiRecommendations = useMemo(() => {
    const upcoming = matches
      .filter((m) => m.status === MatchStatus.NS && new Date(m.startTimeUtc).getTime() > now)
      .sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime())
      .slice(0, 3);
    return upcoming;
  }, [matches, now]);

  if (loading) {
    return (
      <div className="space-y-5 pb-6">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-3 h-4 w-48 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="h-5 w-24 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-3 space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="h-5 w-28 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-3 h-32 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <section ref={headerRef} className="flex items-center justify-between rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <SmartAvatar name={user?.displayName || '游客观赛模式'} src={user?.avatarUrl} size={48} className="ring-1 ring-emerald-100" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">{user?.displayName || '游客观赛模式'}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">群聊入口</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {user ? '最近赛程和焦点战已经就位。' : '先看焦点战和最近赛程，再决定要不要入场竞猜。'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-emerald-700">
            <Coins className="h-3.5 w-3.5" />
            娱乐积分
          </div>
          <p className="mt-1 text-sm font-black text-emerald-900">{wallet?.balance?.toLocaleString() || '10,000'}</p>
        </div>
      </section>

      {/* 下一场开赛倒计时 */}
      {nextUpcoming && countdownText && (
        <section className="rounded-[28px] border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-black text-emerald-800">下一场开赛倒计时</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">{formatBeijingTime(nextUpcoming.startTimeUtc)}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <FlagBadge flagCode={nextUpcoming.homeTeam?.code} size="sm" />
              <span className="truncate">{nextUpcoming.homeTeam?.nameZh}</span>
              <span className="text-slate-400">vs</span>
              <span className="truncate">{nextUpcoming.awayTeam?.nameZh}</span>
              <FlagBadge flagCode={nextUpcoming.awayTeam?.code} size="sm" />
            </div>
            <div className="ml-auto shrink-0 rounded-2xl bg-emerald-600 px-3 py-1.5 font-mono text-lg font-black tracking-wider text-white">
              {countdownText}
            </div>
          </div>
        </section>
      )}

      <FocusMatchCard
        match={focusMatch}
        onPrimaryAction={() => onNavigate('prediction', featuredMatch?.id)}
        onSecondaryAction={() => onNavigate('matches', featuredMatch?.id)}
        onQuickNavigate={(target) => {
          if (target === 'lineup') {
            onNavigate('match-detail', featuredMatch?.id, 'lineup');
            return;
          }
          if (target === 'score') {
            onNavigate('match-detail', featuredMatch?.id, 'overview');
            return;
          }
          if (target === 'leaderboard') {
            onNavigate('leaderboard');
            return;
          }
          onNavigate('matches', featuredMatch?.id);
        }}
        onTeamClick={(teamCode) => {
          setTeamDetailId(teamCode);
          setTeamDetailOpen(true);
        }}
      />

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4.5 w-4.5 text-rose-500" />
            <h3 className="text-sm font-black text-slate-900">群内动态</h3>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-100">
              LIVE
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">最近 20 条</span>
        </div>

        <div className="mt-4">
          <ActivityFeed
            activities={activities}
            loading={activitiesLoading}
            emptyText="群里最近有点安静，快去下个注或者签个到带节奏吧～"
            limit={6}
          />
        </div>
      </section>



      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-slate-700" />
            <div>
              <h3 className="text-sm font-black text-slate-900">今日赛程</h3>
              {nearestDayLabel && <p className="mt-1 text-[11px] font-semibold text-slate-500">{nearestDayLabel}</p>}
            </div>
          </div>
          <button onClick={() => onNavigate('matches')} className="flex items-center gap-1 text-xs font-bold text-slate-500 transition hover:text-slate-800">
            全部赛程
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentMatches.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
            最近还没有可展示的赛程，稍后回来看看。
          </div>
        ) : (
          <div ref={matchesContainerRef} className="mt-4 -mx-1 flex gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory">
            {recentMatches.map((match) => {
              const isLive = match.status === MatchStatus.LIVE;
              const isFinished = [MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN].includes(match.status);
              const matchCountdown = !isLive && !isFinished ? formatCountdown(match.startTimeUtc, now) : null;

              return (
                <button
                  key={match.id}
                  onClick={() => onNavigate('match-detail', match.id, 'overview')}
                  className="match-card-item snap-start shrink-0 w-[200px] rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left transition hover:border-emerald-200 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <span>{stageLabel(match.stage)}</span>
                    {isLive && (
                      <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px] font-black text-white">LIVE</span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5">
                    <FlagBadge flagCode={match.homeTeam?.code} size="sm" />
                    <span className="truncate text-xs font-black text-slate-900">{match.homeTeam?.nameZh}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <FlagBadge flagCode={match.awayTeam?.code} size="sm" />
                    <span className="truncate text-xs font-black text-slate-900">{match.awayTeam?.nameZh}</span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    {isLive || isFinished ? (
                      <span className="text-sm font-black text-slate-900">{match.homeScore ?? 0} : {match.awayScore ?? 0}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600">{formatBeijingTime(match.startTimeUtc)}</span>
                    )}
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${
                      isLive ? 'bg-rose-50 text-rose-600' : isFinished ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {isLive ? '进行中' : isFinished ? '已结束' : '未开赛'}
                    </span>
                  </div>

                  {!isLive && !isFinished && matchCountdown && matchCountdown !== '00:00:00' && (
                    <div className="mt-2 rounded-xl bg-emerald-50 px-2 py-1 text-center">
                      <span className="font-mono text-[10px] font-black text-emerald-700">{matchCountdown}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {recentMatches.length > 0 && (
          <button
            onClick={() => onNavigate('matches')}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
          >
            查看完整赛程
          </button>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4.5 w-4.5 text-violet-500" />
            <h3 className="text-sm font-black text-slate-900">每日足球问答</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">答对 +100 积分/题</span>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
          <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-slate-50 p-4 ring-1 ring-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Brain className="h-4 w-4 text-violet-400" />
              今日挑战
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              3 <span className="ml-1 text-xs font-bold text-slate-400">道题</span>
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              {quizFinishedToday ? '今天已经答完了，明天再来继续挑战。' : '轻量问答不扣分，适合每天顺手领一点积分。'}
            </p>
          </div>

          {user ? (
            <button
              onClick={startQuiz}
              disabled={quizFinishedToday}
              className={`rounded-3xl px-4 py-4 text-left transition active:scale-[0.98] ${
                quizFinishedToday
                  ? 'border border-violet-200 bg-violet-50 text-violet-800'
                  : 'bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-[0_16px_30px_rgba(139,92,246,0.18)]'
              }`}
            >
              <div className="flex h-full min-w-[100px] flex-col justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4.5 w-4.5" />
                  <span className="text-[11px] font-black">{quizFinishedToday ? '已完成' : '开始答题'}</span>
                </div>
                <p className="mt-5 text-sm font-black">{quizFinishedToday ? '明日再来' : '3 题挑战'}</p>
              </div>
            </button>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-xs font-medium text-slate-500">
              登录后可参与每日问答
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {showQuizModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQuizModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl"
            >
              {quizLoading ? (
                <div className="flex flex-col items-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                  <p className="mt-4 text-xs font-bold text-slate-500">正在生成今日题目...</p>
                </div>
              ) : quizCompleted ? (
                <div className="py-6 text-center">
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-amber-100 text-3xl">
                      {quizScore > 0 ? '🏆' : '🫡'}
                    </div>
                  </motion.div>
                  <h3 className="mt-4 text-lg font-black text-slate-950">{quizScore > 0 ? '挑战完成' : '今日挑战结束'}</h3>
                  <motion.p
                    className="mt-2 text-3xl font-black text-violet-600"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [0.5, 1.2, 1], opacity: [0, 1, 1] }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    +{quizScore} PTS
                  </motion.p>
                  <p className="mt-2 text-xs text-slate-500">
                    {quizScore >= 300
                      ? '满分通关，你已经是群里的世界杯达人。'
                      : quizScore >= 200
                        ? '表现很稳，明天继续冲。'
                        : quizScore >= 100
                          ? '拿到积分了，明天继续补全。'
                          : '今天没答对也没关系，明天继续。'}
                  </p>
                  <button
                    onClick={() => setShowQuizModal(false)}
                    className="mt-6 w-full rounded-2xl bg-violet-500 py-3 text-sm font-black text-white transition hover:bg-violet-600"
                  >
                    好的
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-500">每日问答</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">
                        第 {currentQIndex + 1} / {quizQuestions.length} 题
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowQuizModal(false)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500"
                    >
                      关闭
                    </button>
                  </div>

                  <div className="mt-3 flex gap-1.5">
                    {quizQuestions.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          index < currentQIndex ? 'bg-violet-400' : index === currentQIndex ? 'bg-violet-500' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  {quizQuestions[currentQIndex] && (
                    <div className="mt-5">
                      <p className="text-sm font-black leading-6 text-slate-900">{quizQuestions[currentQIndex].question}</p>

                      <div className="mt-4 space-y-2.5">
                        {quizQuestions[currentQIndex].options.map((option, index) => {
                          const isCorrect = index === quizQuestions[currentQIndex].correctIndex;
                          const isSelected = selectedOption === index;
                          let optionStyle = 'border-slate-200 bg-slate-50 text-slate-800';

                          if (answered) {
                            if (isCorrect) {
                              optionStyle = 'border-emerald-300 bg-emerald-50 text-emerald-900';
                            } else if (isSelected) {
                              optionStyle = 'border-rose-300 bg-rose-50 text-rose-900';
                            } else {
                              optionStyle = 'border-slate-200 bg-slate-50/50 text-slate-400';
                            }
                          } else if (isSelected) {
                            optionStyle = 'border-violet-300 bg-violet-50 text-violet-900';
                          }

                          return (
                            <motion.button
                              key={index}
                              type="button"
                              onClick={() => handleAnswer(index)}
                              disabled={answered}
                              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${optionStyle} ${
                                !answered ? 'hover:border-violet-200 hover:bg-violet-50/50 active:scale-[0.98]' : ''
                              }`}
                              whileTap={!answered ? { scale: 0.98 } : {}}
                            >
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                                  answered && isCorrect
                                    ? 'bg-emerald-500 text-white'
                                    : answered && isSelected
                                      ? 'bg-rose-500 text-white'
                                      : 'bg-white text-slate-600 ring-1 ring-slate-200'
                                }`}
                              >
                                {answered && isCorrect ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : answered && isSelected ? (
                                  <XCircle className="h-4 w-4" />
                                ) : (
                                  String.fromCharCode(65 + index)
                                )}
                              </span>
                              <span className="flex-1">{option}</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      <AnimatePresence>
                        {answered && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-4"
                          >
                            <div
                              className={`rounded-2xl border px-4 py-3 text-xs leading-5 ${
                                selectedOption === quizQuestions[currentQIndex].correctIndex
                                  ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                                  : 'border-amber-100 bg-amber-50 text-amber-800'
                              }`}
                            >
                              <p className="font-black">
                                {selectedOption === quizQuestions[currentQIndex].correctIndex ? '回答正确，+100 积分' : '回答错误'}
                              </p>
                              <p className="mt-1">{quizQuestions[currentQIndex].explanation}</p>
                            </div>

                            <button
                              onClick={goNextQuestion}
                              className="mt-3 w-full rounded-2xl bg-violet-500 py-3 text-sm font-black text-white transition hover:bg-violet-600 active:scale-[0.98]"
                            >
                              {currentQIndex < quizQuestions.length - 1 ? '下一题' : '查看结果'}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TeamDetailDrawer teamId={teamDetailId} open={teamDetailOpen} onClose={() => setTeamDetailOpen(false)} />
    </div>
  );
}
