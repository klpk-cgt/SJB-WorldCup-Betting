/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { dbService } from '../../db/db_service';
import { User, Wallet } from '../../types';
import {
  createId,
  getAuthenticatedUser,
  serializeUserForClient,
} from '../helpers';

const router = Router();

router.post('/api/auth/login', (req: Request, res: Response) => {
  const { loginCode, pin } = req.body;
  if (!loginCode) {
    return res.status(400).json({ error: '请输入身份码。' });
  }

  const user = dbService
    .getUsers()
    .find((candidate) => candidate.loginCode === String(loginCode).trim().toUpperCase());
  if (!user) return res.status(401).json({ error: '未找到对应身份码。' });
  if (user.status === 'LOCKED' || user.status === 'DISABLED') {
    return res.status(403).json({ error: '该账号已被锁定或停用。' });
  }

  // 如果用户设置了 PIN，则验证 PIN；如果 PIN 为空（管理员创建的账号），则直接登录
  if (user.pinHash) {
    if (!pin) {
      return res.status(400).json({ error: '该账号需要输入 PIN 码。' });
    }
    if (user.pinHash !== String(pin).trim()) {
      return res.status(401).json({ error: 'PIN 错误。' });
    }
  }

  user.lastLoginAt = new Date().toISOString();
  dbService.save();

  const wallet = dbService.getWallets().find((item) => item.userId === user.id);
  res.json({
    success: true,
    user: serializeUserForClient(user),
    wallet: wallet || { userId: user.id, balance: 10000, initialPoints: 10000 },
  });
});

router.post('/api/auth/claim', (req: Request, res: Response) => {
  const { slug, inviteCode, name, pin } = req.body;
  if (!slug || !inviteCode || !name || !pin) {
    return res.status(400).json({ error: '请完整填写房间、邀请码、昵称和 PIN。' });
  }

  const room = dbService.getRooms().find((item) => item.slug === String(slug).trim() && item.isActive);
  if (!room) return res.status(404).json({ error: '房间不存在。' });
  if (room.inviteCode !== String(inviteCode).trim()) {
    return res.status(400).json({ error: '邀请码不正确。' });
  }

  const db = dbService.getData();
  if (db.users.some((item) => item.groupId === room.id && item.displayName === String(name).trim())) {
    return res.status(400).json({ error: '这个昵称已经有人用了。' });
  }

  const suffix = Math.floor(1000 + Math.random() * 9000);
  const userId = createId('user');
  const loginCode = `WC${suffix}`;
  const user: User = {
    id: userId,
    groupId: room.id,
    displayName: String(name).trim(),
    avatarUrl: ['⚽', '🏆', '🥅', '🔥', '🎯', '🎉'][Math.floor(Math.random() * 6)],
    loginCode,
    pinHash: String(pin).trim(),
    status: 'CLAIMED',
    claimedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const wallet: Wallet = {
    userId,
    balance: 10000,
    initialPoints: 10000,
  };
  db.users.push(user);
  db.wallets.push(wallet);
  db.transactions.push({
    id: createId('init'),
    userId,
    type: 'INITIAL_GRANT',
    amount: 10000,
    balanceBefore: 0,
    balanceAfter: 10000,
    note: '注册认领，初始赠送 10,000 娱乐积分',
    createdAt: new Date().toISOString(),
  });
  dbService.save();

  res.json({ success: true, user: serializeUserForClient(user), wallet });
});

export default router;
