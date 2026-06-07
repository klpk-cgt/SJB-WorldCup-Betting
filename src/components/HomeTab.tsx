/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Brain, Calendar, CheckCircle2, Coins, GitBranch, Sparkles, UserRound, XCircle } from 'lucide-react';
import { AIContent, Match, MatchStatus } from '../types';
import { apiRequest, formatDate } from '../utils/api';
import { getBeijingDayLabel, getMatchesForNearestDay } from '../utils/matchDisplay';
import FocusMatchCard from './home/FocusMatchCard';
import { FocusMatch, FocusMatchStatus, TeamStats, mockFocusMatch } from './home/focusMatch';
import FlagBadge from './home/FlagBadge';
import TeamDetailDrawer from './TeamDetailDrawer';

interface HomeTabProps {
  user: any;
  wallet: any;
  onRefreshWallet: () => void;
  onNavigate: (tab: string, matchId?: string) => void;
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
      : match.status === MatchStatus.FT || match.status === MatchStatus.AET || match.status === MatchStatus.PEN
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
      riskWarning: '临场首发和锁盘时间都可能改变判断，娱乐积分建议分档操作。',
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
  const [teamDetailId, setTeamDetailId] = useState<string | null>(null);
  const [teamDetailOpen, setTeamDetailOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function initHome() {
      try {
        const [matchesData, aiData] = await Promise.all([
          apiRequest('/api/matches'),
          apiRequest('/api/ai/daily'),
        ]);

        setMatches(matchesData);
        setDailyAI(aiData);

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
      alert(error.message || '获取今日问答失败，请稍后重试。');
      setShowQuizModal(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    if (answered || !quizQuestions[currentQIndex]) return;
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
      // Keep the local feedback even if the request fails
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

  const liveMatch = matches.find((match) => match.status === MatchStatus.LIVE);
  const nearestDayMatches = getMatchesForNearestDay(matches);
  const recentMatches = nearestDayMatches.slice(0, 4);
  const featuredMatch = liveMatch || recentMatches[0] || matches[0];
  const focusMatch = useMemo(() => buildFocusMatch(featuredMatch, now), [featuredMatch, now]);
  const aiView = extractAiView(dailyAI);
  const nearestDayLabel = recentMatches[0] ? getBeijingDayLabel(recentMatches[0].startTimeUtc) : '';

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-xs font-medium text-slate-500">正在加载世界杯首页...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <section className="flex items-center justify-between rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600 ring-1 ring-emerald-100">
            {user?.avatarUrl || '🎯'}
          </div>
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

      <FocusMatchCard
        match={focusMatch}
        onPrimaryAction={() => onNavigate('prediction', featuredMatch?.id)}
        onSecondaryAction={() => onNavigate('matches', featuredMatch?.id)}
        onQuickNavigate={(target) => {
          const tabMap: Record<string, string> = {
            schedule: 'matches',
            lineup: 'matches',
            score: 'matches',
            leaderboard: 'leaderboard',
          };
          onNavigate(tabMap[target] || 'matches', featuredMatch?.id);
        }}
        onTeamClick={(teamCode) => { setTeamDetailId(teamCode); setTeamDetailOpen(true); }}
      />

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-cyan-500" />
            <h3 className="text-sm font-black text-slate-900">AI 看点</h3>
          </div>
          <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700 ring-1 ring-cyan-100">
            {aiView.provider}
          </span>
        </div>

        <div className="mt-3 rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 ring-1 ring-slate-100">
          <p className="text-sm font-black text-slate-900">{aiView.title}</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">{aiView.summary}</p>

          {aiView.bullets.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {aiView.bullets.slice(0, 2).map((bullet) => (
                <div key={bullet} className="flex items-start gap-1.5 text-xs text-slate-600">
                  <span className="mt-1 h-1 w-1 rounded-full bg-cyan-500 shrink-0" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-[10px] leading-4 text-amber-700/70">
            风险提醒：{aiView.riskWarning}
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-slate-700" />
            <div>
              <h3 className="text-sm font-black text-slate-900">最近赛程</h3>
              {nearestDayLabel && <p className="mt-1 text-[11px] font-semibold text-slate-500">{nearestDayLabel}</p>}
            </div>
          </div>
          <button onClick={() => onNavigate('matches')} className="text-xs font-bold text-slate-500 transition hover:text-slate-800">
            去赛程页
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {recentMatches.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
              最近还没有可展示的赛程，稍后回来看看。
            </div>
          ) : (
            recentMatches.map((match) => {
              const isLive = match.status === MatchStatus.LIVE;
              const isFinished = match.status === MatchStatus.FT;

              return (
                <button
                  key={match.id}
                  onClick={() => onNavigate('matches', match.id)}
                  className="flex w-full items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                      <span>{stageLabel(match.stage)}</span>
                      <span className="text-slate-300">·</span>
                      <span>{formatDate(match.startTimeUtc)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-black text-slate-900">
                      <span
                        className="cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setTeamDetailId(match.homeTeam?.id); setTeamDetailOpen(true); }}
                      >
                        <FlagBadge flagCode={match.homeTeam?.code} size="sm" />
                      </span>
                      <span className="truncate">{match.homeTeam?.nameZh}</span>
                      <span className="text-slate-400">
                        {isLive || isFinished ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}` : 'VS'}
                      </span>
                      <span className="truncate">{match.awayTeam?.nameZh}</span>
                      <span
                        className="cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setTeamDetailId(match.awayTeam?.id); setTeamDetailOpen(true); }}
                      >
                        <FlagBadge flagCode={match.awayTeam?.code} size="sm" />
                      </span>
                    </div>
                  </div>

                  <div className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold ring-1 ring-slate-200">
                    <span className={isLive ? 'text-rose-600' : isFinished ? 'text-slate-600' : 'text-emerald-700'}>
                      {isLive ? '进行中' : isFinished ? '已结束' : '未开赛'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {recentMatches.length > 0 && (
          <button
            onClick={() => onNavigate('matches')}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
          >
            查看这一天的完整赛程
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
              onClick={(e) => e.stopPropagation()}
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
                      {quizScore > 0 ? '🏅' : '🫡'}
                    </div>
                  </motion.div>
                  <h3 className="mt-4 text-lg font-black text-slate-950">
                    {quizScore > 0 ? '挑战完成' : '今日挑战结束'}
                  </h3>
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
                    {quizQuestions.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < currentQIndex ? 'bg-violet-400' : i === currentQIndex ? 'bg-violet-500' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  {quizQuestions[currentQIndex] && (
                    <div className="mt-5">
                      <p className="text-sm font-black leading-6 text-slate-900">{quizQuestions[currentQIndex].question}</p>

                      <div className="mt-4 space-y-2.5">
                        {quizQuestions[currentQIndex].options.map((option, i) => {
                          const isCorrect = i === quizQuestions[currentQIndex].correctIndex;
                          const isSelected = selectedOption === i;
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
                              key={i}
                              type="button"
                              onClick={() => handleAnswer(i)}
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
                                  String.fromCharCode(65 + i)
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

      <TeamDetailDrawer
        teamId={teamDetailId}
        open={teamDetailOpen}
        onClose={() => setTeamDetailOpen(false)}
      />
    </div>
  );
}
