/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 每日问答服务
 *
 * 核心改进：使用独立的 quizLog 记录问答完成状态，
 * 不再依赖 transaction.note 判断。
 *
 * 必须在 runBusinessTransaction 内部调用。
 */

import { dbService } from '../../db/db_service';
import { QuizLogRecord } from '../../types';
import { adjustWalletBalance } from './wallet_service';
import {
  QUIZ_POINTS_PER_CORRECT,
  createId,
  getDailyQuizQuestions,
  quizQuestionPool,
  roundPoints,
  toBeijingDateKey,
} from '../helpers';
import logger from '../logger';
import { getRuntimeConfig } from '../config';

// ─── AI 每日自动生成新题 ───

interface AIGeneratedQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

/**
 * 获取今日 AI 生成的题目（从 db.aiQuizCache 读取）
 */
export function getAIQuizCache(): AIGeneratedQuestion[] {
  const db = dbService.getData();
  return (db as any).aiQuizCache || [];
}

/**
 * 保存 AI 生成的题目到缓存
 */
function saveAIQuizCache(questions: AIGeneratedQuestion[]) {
  const db = dbService.getData();
  (db as any).aiQuizCache = questions;
}

/**
 * 调用 AI 生成 5 道世界杯相关问答题
 */
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
              { role: 'system', content: '你是一个世界杯足球知识专家。请严格按照JSON格式输出，不要输出其他内容。' },
              { role: 'user', content: `请生成5道关于世界杯足球的问答题，涵盖历史、球星、规则、趣闻等方面。每题4个选项，标明正确答案。
输出严格JSON数组格式，每项包含：question(题目), options(4个选项数组), correctIndex(正确答案索引0-3), explanation(解析说明)。
示例：[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]
要求：题目有趣、答案准确、解析简明。不要和以下已有题目重复：${quizQuestionPool.slice(0, 10).map(q => q.question).join('；')}` },
            ],
          }),
        });
        if (!resp.ok) throw new Error(`DeepSeek failed: ${resp.status}`);
        const data = await resp.json() as any;
        return data.choices?.[0]?.message?.content?.trim() || '';
      },
    });
  }

  if (config.geminiApiKey) {
    providers.push({
      name: 'Gemini',
      call: async () => {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `请生成5道关于世界杯足球的问答题，涵盖历史、球星、规则、趣闻等方面。每题4个选项，标明正确答案。
输出严格JSON数组格式，每项包含：question(题目), options(4个选项数组), correctIndex(正确答案索引0-3), explanation(解析说明)。
示例：[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]
要求：题目有趣、答案准确、解析简明。` }] }],
            generationConfig: { temperature: 0.8 },
          }),
        });
        if (!resp.ok) throw new Error(`Gemini failed: ${resp.status}`);
        const data = await resp.json() as any;
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      },
    });
  }

  for (const provider of providers) {
    try {
      const raw = await provider.call();
      // 提取 JSON 数组
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) continue;

      const questions: AIGeneratedQuestion[] = parsed.slice(0, 5).map((item: any, idx: number) => ({
        id: `ai-${toBeijingDateKey()}-${idx + 1}`,
        question: String(item.question || ''),
        options: Array.isArray(item.options) ? item.options.slice(0, 4).map(String) : ['', '', '', ''],
        correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
        explanation: String(item.explanation || ''),
      }));

      saveAIQuizCache(questions);
      logger.info(`[QuizService] AI 生成 ${questions.length} 道新题 (provider: ${provider.name})`);
      return { questions, provider: provider.name };
    } catch (e) {
      logger.warn(`[QuizService] ${provider.name} 生成题目失败`, { error: e instanceof Error ? e.message : String(e) });
    }
  }

  logger.warn('[QuizService] 所有 AI 提供商均失败，跳过 AI 题目生成');
  return { questions: [], provider: 'none' };
}

/**
 * 获取合并后的每日题目（静态题库 + AI 生成题）
 */
export function getMergedDailyQuestions(): typeof quizQuestionPool {
  const staticQuestions = getDailyQuizQuestions();
  const aiQuestions = getAIQuizCache();

  // 将 AI 题目转换为兼容格式
  const aiFormatted = aiQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));

  // 混合：2 道静态 + 1 道 AI（如果有的话）
  if (aiFormatted.length > 0) {
    return [...staticQuestions.slice(0, 2), ...aiFormatted.slice(0, 1)];
  }
  return staticQuestions;
}

/**
 * 查询用户今日是否已完成问答（基于 quizLog）
 */
export function hasCompletedQuizToday(userId: string, date: string): boolean {
  const db = dbService.getData();
  return (db.quizLogs || []).some((log) => log.userId === userId && log.date === date);
}

/**
 * 获取今日问答题目
 * 如果已完成则抛出异常
 */
export function getTodayQuiz(userId: string) {
  const today = toBeijingDateKey();
  if (hasCompletedQuizToday(userId, today)) {
    throw new Error('今日问答已完成。');
  }
  return { questions: getMergedDailyQuestions(), date: today };
}

/**
 * 提交问答答案
 *
 * 内部负责：
 * 1. 校验今日未答题
 * 2. 校验题目存在
 * 3. 判断是否正确
 * 4. 正确则加积分（通过 wallet_service）
 * 5. 写 quizLog（答错也算完成）
 * 6. 返回结果
 */
export function submitQuizAnswer(params: {
  userId: string;
  questionId: string;
  selectedIndex: number;
}): { isCorrect: boolean; pointsEarned: number; explanation: string } {
  const db = dbService.getData();
  const today = toBeijingDateKey();

  // 1. 校验今日未答题
  if (hasCompletedQuizToday(params.userId, today)) {
    throw new Error('今日问答已完成。');
  }

  // 2. 校验题目存在（先查静态题库，再查 AI 缓存）
  let question = quizQuestionPool.find((item) => item.id === params.questionId);
  if (!question) {
    const aiQuestions = getAIQuizCache();
    const aiQ = aiQuestions.find((item) => item.id === params.questionId);
    if (aiQ) {
      question = {
        id: aiQ.id,
        question: aiQ.question,
        options: aiQ.options,
        correctIndex: aiQ.correctIndex,
        explanation: aiQ.explanation,
      };
    }
  }
  if (!question) {
    throw new Error('题目不存在。');
  }

  // 3. 判断是否正确
  const isCorrect = params.selectedIndex === question.correctIndex;
  let pointsEarned = 0;

  // 4. 正确则加积分
  if (isCorrect) {
    pointsEarned = roundPoints(QUIZ_POINTS_PER_CORRECT);
    adjustWalletBalance({
      userId: params.userId,
      amount: pointsEarned,
      type: 'ADMIN_ADJUST',
      note: `每日问答：答对 +${pointsEarned}`,
    });
  }

  // 5. 写 quizLog（答错也算完成）
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

/**
 * 获取问答统计（后台使用）
 */
export function getQuizStats() {
  const db = dbService.getData();
  const logs = db.quizLogs || [];
  const today = toBeijingDateKey();

  const todayLogs = logs.filter((log) => log.date === today);
  const todayCorrect = todayLogs.filter((log) => log.correctCount > 0).length;

  // 最近7天活跃答题人数
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoKey = sevenDaysAgo.toISOString().slice(0, 10);
  const recentActiveUsers = new Set(
    logs.filter((log) => log.date >= sevenDaysAgoKey).map((log) => log.userId),
  ).size;

  return {
    todayParticipants: todayLogs.length,
    todayCorrectRate: todayLogs.length > 0 ? Math.round((todayCorrect / todayLogs.length) * 100) : 0,
    recentActiveUsers7d: recentActiveUsers,
    totalQuizLogs: logs.length,
  };
}
