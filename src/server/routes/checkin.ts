/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import {
  QUIZ_POINTS_PER_CORRECT,
  createId,
  getAuthenticatedUser,
  getDailyQuizQuestions,
  quizQuestionPool,
  roundPoints,
  toBeijingDateKey,
} from '../helpers';

const router = Router();

function getTodayKey() {
  return toBeijingDateKey();
}

function hasCheckedIn(userId: string, date: string) {
  const db = dbService.getData();
  return (db.checkinLog || []).some((item) => item.userId === userId && item.date === date);
}

function hasCompletedQuiz(userId: string, date: string) {
  return dbService
    .getTransactions()
    .some((tx) => tx.userId === userId && toBeijingDateKey(tx.createdAt) === date && tx.note.includes('每日问答'));
}

router.get('/api/checkin/status', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  res.json({ checkedInToday: hasCheckedIn(user.id, getTodayKey()) });
});

router.post('/api/checkin', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '认证已失效，请重新登录。' });

  await dbService.withWriteLock(async () => {
    const db = dbService.getData();
    const wallet = db.wallets.find((item) => item.userId === user.id);
    if (!wallet) return res.status(500).json({ error: '钱包不存在。' });

    const today = getTodayKey();
    if ((db.checkinLog || []).some((item) => item.userId === user.id && item.date === today)) {
      return res.status(400).json({ error: '今天已经签到过了。' });
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
    const oldBalance = wallet.balance;
    wallet.balance += amount;

    db.transactions.push({
      id: createId('checkin'),
      userId: user.id,
      type: 'ADMIN_ADJUST',
      amount,
      balanceBefore: oldBalance,
      balanceAfter: wallet.balance,
      note: `签到抽奖：${prizeName} +${amount}`,
      createdAt: now,
    });

    (db.checkinLog ||= []).push({
      id: createId('checkin-log'),
      userId: user.id,
      date: today,
      createdAt: now,
    });

    dbService.save();
    res.json({ success: true, amount, prizeName, wallet });
  });
});

router.get('/api/quiz/status', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const today = getTodayKey();
  res.json({ completedToday: hasCompletedQuiz(user.id, today) });
});

router.get('/api/quiz/daily', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const today = getTodayKey();
  const alreadyDone = hasCompletedQuiz(user.id, today);
  if (alreadyDone) {
    return res.status(400).json({ error: '今日问答已完成。' });
  }

  res.json({ questions: getDailyQuizQuestions() });
});

router.post('/api/quiz/answer', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '认证已失效，请重新登录。' });

  const { questionId, selectedIndex } = req.body;
  if (!questionId || typeof selectedIndex !== 'number') {
    return res.status(400).json({ error: '参数缺失。' });
  }

  await dbService.withWriteLock(async () => {
    const today = getTodayKey();
    const alreadyDone = hasCompletedQuiz(user.id, today);
    if (alreadyDone) {
      return res.status(400).json({ error: '今日问答已完成。' });
    }

    const question = quizQuestionPool.find((item) => item.id === questionId);
    if (!question) {
      return res.status(400).json({ error: '题目不存在。' });
    }

    const isCorrect = selectedIndex === question.correctIndex;
    let pointsEarned = 0;

    if (isCorrect) {
      pointsEarned = roundPoints(QUIZ_POINTS_PER_CORRECT);
      const db = dbService.getData();
      const wallet = db.wallets.find((item) => item.userId === user.id);
      if (wallet) {
        const oldBalance = wallet.balance;
        wallet.balance += pointsEarned;
        db.transactions.push({
          id: createId('quiz'),
          userId: user.id,
          type: 'ADMIN_ADJUST',
          amount: pointsEarned,
          balanceBefore: oldBalance,
          balanceAfter: wallet.balance,
          note: `每日问答：答对 +${pointsEarned}`,
          createdAt: new Date().toISOString(),
        });
        dbService.save();
      }
    }

    res.json({ correct: isCorrect, pointsEarned, explanation: question.explanation });
  });
});

export default router;
