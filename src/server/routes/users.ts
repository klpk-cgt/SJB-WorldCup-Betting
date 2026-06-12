/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import { buildUserProfileSummary } from '../../utils/achievements';
import { getAuthenticatedUser, serializeUserForClient } from '../helpers';
import { getUserTitle } from '../badge_service';

const router = Router();

// ─── 房间 ───

router.get('/api/rooms', (_req: Request, res: Response) => {
  res.json(dbService.getRooms().filter((room) => room.isActive));
});

// ─── 用户信息 ───

router.get('/api/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: '未登录或登录已失效。' });
  }
  const wallet = dbService.getWallets().find((item) => item.userId === user.id);
  const profileSummary = buildUserProfileSummary({
    userId: user.id,
    predictions: dbService.getPredictions().filter((item) => item.userId === user.id),
    tournamentBets: dbService.getTournamentBets().filter((item) => item.userId === user.id),
    transactions: dbService.getTransactions().filter((item) => item.userId === user.id),
    wallet: wallet || { userId: user.id, balance: 0, initialPoints: 10000 },
    persistedTitle: getUserTitle(user.id),
  });
  res.json({
    user: serializeUserForClient(user),
    wallet: wallet || { userId: user.id, balance: 0, initialPoints: 10000 },
    profileSummary,
  });
});

router.get('/api/me/profile-summary', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: '请先登录。' });
  }
  const wallet = dbService.getWallets().find((item) => item.userId === user.id);
  res.json(
    buildUserProfileSummary({
      userId: user.id,
      predictions: dbService.getPredictions().filter((item) => item.userId === user.id),
      tournamentBets: dbService.getTournamentBets().filter((item) => item.userId === user.id),
      transactions: dbService.getTransactions().filter((item) => item.userId === user.id),
      wallet: wallet || { userId: user.id, balance: 0, initialPoints: 10000 },
      persistedTitle: getUserTitle(user.id),
    }),
  );
});

router.get('/api/me/transactions', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: '请先登录。' });
  const payload = dbService
    .getTransactions()
    .filter((item) => item.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(payload);
});

router.get('/api/users/:userId/trend', (req: Request, res: Response) => {
  const db = dbService.getData();
  const user = db.users.find((item) => item.id === req.params.userId);
  if (!user) return res.status(404).json({ error: '用户不存在。' });

  const wallet = db.wallets.find((item) => item.userId === user.id) || { balance: 10000 };
  const transactions = db.transactions
    .filter((item) => item.userId === user.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const trend = [];
  const today = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const endOfDay = `${dateStr}T23:59:59.999Z`;
    const txBefore = transactions.filter((item) => item.createdAt <= endOfDay);
    const balance = txBefore.length > 0 ? txBefore[txBefore.length - 1].balanceAfter : 10000;
    trend.push({
      dateStr,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      balance,
    });
  }

  res.json({
    userId: user.id,
    displayName: user.displayName,
    balance: wallet.balance,
    trend,
  });
});

export default router;
