/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import {
  createId,
  getAuthenticatedUser,
  roundPoints,
  toBeijingDateKey,
} from '../helpers';
import { runBusinessTransaction } from '../services/transaction_guard';
import { adjustWalletBalance } from '../services/wallet_service';
import {
  hasCompletedQuizToday,
  getTodayQuiz,
  submitQuizAnswer,
} from '../services/quiz_service';

const router = Router();

function getTodayKey() {
  return toBeijingDateKey();
}

function hasCheckedIn(userId: string, date: string) {
  const db = dbService.getData();
  return (db.checkinLog || []).some((item) => item.userId === userId && item.date === date);
}

router.get('/api/checkin/status', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  res.json({ checkedInToday: hasCheckedIn(user.id, getTodayKey()) });
});

router.post('/api/checkin', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '认证已失效，请重新登录。' });

  try {
    const result = await runBusinessTransaction('checkin', () => {
      const db = dbService.getData();
      const today = getTodayKey();
      if ((db.checkinLog || []).some((item) => item.userId === user.id && item.date === today)) {
        throw new Error('今天已经签到过了。');
      }

      const roll = Math.random();
      let amount = 150;
      let prizeName = '幸运入袋';
      if (roll < 0.1) {
        amount = 505;
        prizeName = '独占鳌头';
      } else if (roll < 0.35) {
        amount = 300;
        prizeName = '凯歌高奏';
      } else if (roll < 0.65) {
        amount = 200;
        prizeName = '运转加成';
      }

      amount = roundPoints(amount);
      const now = new Date().toISOString();

      (db.checkinLog ||= []).push({
        id: createId('checkin-log'),
        userId: user.id,
        date: today,
        createdAt: now,
      });

      const { wallet } = adjustWalletBalance({
        userId: user.id,
        amount,
        type: 'ADMIN_ADJUST',
        note: `签到抽奖：${prizeName} +${amount}`,
      });

      return { amount, prizeName, wallet };
    });

    res.json({ success: true, amount: result.amount, prizeName: result.prizeName, wallet: result.wallet });
  } catch (error) {
    const message = error instanceof Error ? error.message : '签到失败';
    const status = message.includes('已经签到') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

router.get('/api/quiz/status', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const today = getTodayKey();
  res.json({ completedToday: hasCompletedQuizToday(user.id, today) });
});

router.get('/api/quiz/daily', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  try {
    const result = getTodayQuiz(user.id);
    res.json({ questions: result.questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取题目失败';
    const status = message.includes('已完成') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

router.post('/api/quiz/answer', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '认证已失效，请重新登录。' });

  const { questionId, selectedIndex } = req.body;
  if (!questionId || typeof selectedIndex !== 'number') {
    return res.status(400).json({ error: '参数缺失。' });
  }

  try {
    const result = await runBusinessTransaction('quizAnswer', () =>
      submitQuizAnswer({
        userId: user.id,
        questionId,
        selectedIndex,
      }),
    );

    res.json({ correct: result.isCorrect, pointsEarned: result.pointsEarned, explanation: result.explanation });
  } catch (error) {
    const message = error instanceof Error ? error.message : '答题失败';
    const status = message.includes('已完成') || message.includes('不存在') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
