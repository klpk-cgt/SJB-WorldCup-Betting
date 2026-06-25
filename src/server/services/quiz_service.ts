/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbService } from '../../db/db_service';
import { QuizLogRecord } from '../../types';
import { getRuntimeConfig } from '../config';
import {
  QUIZ_POINTS_PER_CORRECT,
  createId,
  getDailyQuizQuestions,
  quizQuestionPool,
  roundPoints,
  toBeijingDateKey,
} from '../helpers';
import logger from '../logger';
import { adjustWalletBalance } from './wallet_service';

interface AIGeneratedQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

function getQuestionErrorMessage() {
  return '题目不存在。';
}

function getCompletedErrorMessage() {
  return '今日问答已完成。';
}

function getAnsweredErrorMessage() {
  return '该题已作答';
}

export function getAIQuizCache(): AIGeneratedQuestion[] {
  const db = dbService.getData();
  return (db as any).aiQuizCache || [];
}

function saveAIQuizCache(questions: AIGeneratedQuestion[]) {
  const db = dbService.getData();
  (db as any).aiQuizCache = questions;
}

export async function generateAIQuizQuestions(): Promise<{
  questions: AIGeneratedQuestion[];
  provider: string;
}> {
  const config = getRuntimeConfig();
  const providers: Array<{ name: string; call: () => Promise<string> }> = [];

  if (config.deepSeekApiKey) {
    providers.push({
      name: 'DeepSeek',
      call: async () => {
        const resp = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.deepSeekApiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            temperature: 0.8,
            messages: [
              { role: 'system', content: 'You are a World Cup football quiz writer. Output strict JSON only.' },
              {
                role: 'user',
                content: `Generate 5 World Cup football quiz questions. Output a JSON array where each item contains question, options, correctIndex, explanation. Avoid repeating these questions: ${quizQuestionPool.slice(0, 10).map((q) => q.question).join(' | ')}`,
              },
            ],
          }),
        });
        if (!resp.ok) throw new Error(`DeepSeek failed: ${resp.status}`);
        const data = (await resp.json()) as any;
        return data.choices?.[0]?.message?.content?.trim() || '';
      },
    });
  }

  if (config.geminiApiKey) {
    providers.push({
      name: 'Gemini',
      call: async () => {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: 'Generate 5 World Cup football quiz questions as a JSON array. Each item must include question, options, correctIndex, explanation.',
                    },
                  ],
                },
              ],
              generationConfig: { temperature: 0.8 },
            }),
          },
        );
        if (!resp.ok) throw new Error(`Gemini failed: ${resp.status}`);
        const data = (await resp.json()) as any;
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      },
    });
  }

  for (const provider of providers) {
    try {
      const raw = await provider.call();
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) continue;

      const questions: AIGeneratedQuestion[] = parsed.slice(0, 5).map((item: any, idx: number) => ({
        id: `ai-${toBeijingDateKey()}-${idx + 1}`,
        question: String(item.question || ''),
        options: Array.isArray(item.options) ? item.options.slice(0, 4).map(String) as [string, string, string, string] : ['', '', '', ''],
        correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
        explanation: String(item.explanation || ''),
      }));

      saveAIQuizCache(questions);
      logger.info(`[QuizService] AI generated ${questions.length} questions`, { provider: provider.name });
      return { questions, provider: provider.name };
    } catch (error) {
      logger.warn(`[QuizService] ${provider.name} failed to generate questions`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.warn('[QuizService] All AI quiz providers failed, skipping AI question generation');
  return { questions: [], provider: 'none' };
}

export function getMergedDailyQuestions(): typeof quizQuestionPool {
  const staticQuestions = getDailyQuizQuestions();
  const aiQuestions = getAIQuizCache();
  const aiFormatted = aiQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));

  if (aiFormatted.length > 0) {
    return [...staticQuestions.slice(0, 2), ...aiFormatted.slice(0, 1)];
  }
  return staticQuestions;
}

function getTodayLogs(userId: string, date: string): QuizLogRecord[] {
  const db = dbService.getData();
  return (db.quizLogs || []).filter((log) => log.userId === userId && log.date === date);
}

export function hasCompletedQuizToday(userId: string, date: string): boolean {
  const todayLogs = getTodayLogs(userId, date);
  const requiredIds = new Set(getMergedDailyQuestions().map((question) => question.id));
  const answeredIds = new Set(
    todayLogs.flatMap((log) => (Array.isArray(log.questionIds) ? log.questionIds : [])),
  );

  if (requiredIds.size === 0) return false;
  for (const questionId of requiredIds) {
    if (!answeredIds.has(questionId)) return false;
  }
  return true;
}

export function getTodayQuiz(userId: string) {
  const today = toBeijingDateKey();
  if (hasCompletedQuizToday(userId, today)) {
    throw new Error(getCompletedErrorMessage());
  }
  return { questions: getMergedDailyQuestions(), date: today };
}

export function submitQuizAnswer(params: {
  userId: string;
  questionId: string;
  selectedIndex: number;
}): { isCorrect: boolean; pointsEarned: number; explanation: string } {
  const db = dbService.getData();
  const today = toBeijingDateKey();
  const todayLogs = getTodayLogs(params.userId, today);

  if (todayLogs.some((log) => Array.isArray(log.questionIds) && log.questionIds.includes(params.questionId))) {
    throw new Error(getAnsweredErrorMessage());
  }

  if (hasCompletedQuizToday(params.userId, today)) {
    throw new Error(getCompletedErrorMessage());
  }

  let question = quizQuestionPool.find((item) => item.id === params.questionId);
  if (!question) {
    const aiQuestion = getAIQuizCache().find((item) => item.id === params.questionId);
    if (aiQuestion) {
      question = {
        id: aiQuestion.id,
        question: aiQuestion.question,
        options: aiQuestion.options,
        correctIndex: aiQuestion.correctIndex,
        explanation: aiQuestion.explanation,
      };
    }
  }

  if (!question) {
    throw new Error(getQuestionErrorMessage());
  }

  const isCorrect = params.selectedIndex === question.correctIndex;
  let pointsEarned = 0;

  if (isCorrect) {
    pointsEarned = roundPoints(QUIZ_POINTS_PER_CORRECT);
    adjustWalletBalance({
      userId: params.userId,
      amount: pointsEarned,
      type: 'ADMIN_ADJUST',
      note: `每日问答：答对 +${pointsEarned}`,
    });
  }

  const quizLog: QuizLogRecord = {
    id: createId('quiz-log'),
    userId: params.userId,
    date: today,
    questionIds: [params.questionId],
    selectedIndex: params.selectedIndex,
    correctCount: isCorrect ? 1 : 0,
    pointsEarned,
    createdAt: new Date().toISOString(),
  };

  (db.quizLogs ||= []).push(quizLog);

  logger.info(`[QuizService] userId=${params.userId} correct=${isCorrect} points=${pointsEarned}`);

  return { isCorrect, pointsEarned, explanation: question.explanation };
}

export function getQuizStats() {
  const db = dbService.getData();
  const logs = db.quizLogs || [];
  const today = toBeijingDateKey();

  const todayLogs = logs.filter((log) => log.date === today);
  const todayCorrect = todayLogs.filter((log) => log.correctCount > 0).length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoKey = sevenDaysAgo.toISOString().slice(0, 10);
  const recentActiveUsers = new Set(
    logs.filter((log) => log.date >= sevenDaysAgoKey).map((log) => log.userId),
  ).size;

  return {
    todayParticipants: new Set(todayLogs.map((log) => log.userId)).size,
    todayCorrectRate: todayLogs.length > 0 ? Math.round((todayCorrect / todayLogs.length) * 100) : 0,
    recentActiveUsers7d: recentActiveUsers,
    totalQuizLogs: logs.length,
  };
}
