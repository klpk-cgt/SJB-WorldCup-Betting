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
  return { questions: getDailyQuizQuestions(), date: today };
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

  // 2. 校验题目存在
  const question = quizQuestionPool.find((item) => item.id === params.questionId);
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
