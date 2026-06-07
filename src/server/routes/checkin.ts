/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import {
  createId,
  getAuthenticatedUser,
  QUIZ_POINTS_PER_CORRECT,
  quizQuestionPool,
  getDailyQuizQuestions,
} from '../helpers';

const router = Router();

// ─── 签到 ───

router.get('/api/checkin/status', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });
  const today = new Date().toISOString().split('T')[0];
  const checkedInToday = dbService
    .getTransactions()
    .some((tx) => tx.userId === user.id && tx.createdAt.startsWith(today) && tx.note.includes('签到抽奖'));
  res.json({ checkedInToday });
});

router.post('/api/checkin', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '认证已失效，请重新登录。' });

  const db = dbService.getData();
  const wallet = db.wallets.find((item) => item.userId === user.id);
  if (!wallet) return res.status(500).json({ error: '钱包不存在。' });

  const today = new Date().toISOString().split('T')[0];
  const alreadyCheckedIn = db.transactions.some(
    (tx) => tx.userId === user.id && tx.createdAt.startsWith(today) && tx.note.includes('签到抽奖'),
  );
  if (alreadyCheckedIn) {
    return res.status(400).json({ error: '今天已经签过到了。' });
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
    createdAt: new Date().toISOString(),
  });

  dbService.save();
  res.json({ success: true, amount, prizeName, wallet });
});

// ─── 每日问答 ───

router.get('/api/quiz/status', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });
  const today = new Date().toISOString().split('T')[0];
  const completedToday = dbService
    .getTransactions()
    .some((tx) => tx.userId === user.id && tx.createdAt.startsWith(today) && tx.note.includes('每日问答'));
  res.json({ completedToday });
});

router.get('/api/quiz/daily', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });

  const today = new Date().toISOString().split('T')[0];
  const alreadyDone = dbService
    .getTransactions()
    .some((tx) => tx.userId === user.id && tx.createdAt.startsWith(today) && tx.note.includes('每日问答'));
  if (alreadyDone) {
    return res.status(400).json({ error: '今日问答已完成。' });
  }

  const questions = getDailyQuizQuestions();
  res.json({ questions });
});

router.post('/api/quiz/answer', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '认证已失效，请重新登录。' });

  const { questionId, selectedIndex } = req.body;
  if (!questionId || typeof selectedIndex !== 'number') {
    return res.status(400).json({ error: '参数缺失。' });
  }

  const today = new Date().toISOString().split('T')[0];
  const alreadyDone = dbService
    .getTransactions()
    .some((tx) => tx.userId === user.id && tx.createdAt.startsWith(today) && tx.note.includes('每日问答'));
  if (alreadyDone) {
    return res.status(400).json({ error: '今日问答已完成。' });
  }

  const question = quizQuestionPool.find((q) => q.id === questionId);
  if (!question) {
    return res.status(400).json({ error: '题目不存在。' });
  }

  const isCorrect = selectedIndex === question.correctIndex;
  let pointsEarned = 0;

  if (isCorrect) {
    pointsEarned = QUIZ_POINTS_PER_CORRECT;
    const db = dbService.getData();
    const wallet = db.wallets.find((w) => w.userId === user.id);
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

export default router;
