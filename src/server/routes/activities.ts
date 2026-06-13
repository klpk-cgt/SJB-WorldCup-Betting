/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 群内动态 API
 *
 * 提供首页 / 个人主页的动态时间线查询接口。
 */

import { Router, Request, Response } from 'express';
import { getRecentActivities, getUserActivities, emitHistoryVisit } from '../activity_service';
import { getUserBadges, getUserTitle, evaluateUserBadges } from '../badge_service';
import { getBadgeDefinitions } from '../badge_service';
import { dbService } from '../../db/db_service';

const router = Router();

/**
 * 获取最近群内动态（公开接口，所有人可看）
 * Query: limit (默认 30, 最大 100), groupId (可选)
 */
router.get('/api/activities', (req: Request, res: Response) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const groupId = (req.query.groupId as string) || undefined;
  const activities = getRecentActivities(limit, groupId);
  res.json({ activities, total: activities.length });
});

/**
 * 获取指定用户的最近动态
 */
router.get('/api/activities/user/:userId', (req: Request, res: Response) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const activities = getUserActivities(req.params.userId, limit);
  res.json({ activities, total: activities.length });
});

/**
 * 获取用户徽章 + 称号聚合信息（一次性返回）
 */
router.get('/api/users/:id/badges', (req: Request, res: Response) => {
  const defs = getBadgeDefinitions();
  const userBadges = getUserBadges(req.params.id);
  const title = getUserTitle(req.params.id);
  const defMap = new Map(defs.map((d) => [d.id, d]));

  const payload = userBadges.map((b) => {
    const def = defMap.get(b.badgeId);
    return {
      id: b.badgeId,
      label: def?.label || b.badgeId,
      description: def?.description || '',
      icon: def?.icon || '🏅',
      tone: def?.tone || 'slate',
      unlocked: b.unlocked,
      progress: b.progress,
      target: b.target,
      unlockedAt: b.unlockedAt,
    };
  });

  // 包含已定义但用户未解锁的徽章
  const existing = new Set(userBadges.map((b) => b.badgeId));
  for (const def of defs) {
    if (!existing.has(def.id)) {
      payload.push({
        id: def.id,
        label: def.label,
        description: def.description,
        icon: def.icon,
        tone: def.tone,
        unlocked: false,
        progress: 0,
        target: def.evaluate(req.params.id).target,
        unlockedAt: undefined,
      });
    }
  }

  res.json({ title, badges: payload });
});

/**
 * 记录用户活动事件（如 HISTORY_VISIT）
 * Body: { type: string, userId: string }
 */
router.post('/api/activities/record', (req: Request, res: Response) => {
  const { type, userId } = req.body;
  if (!type || !userId) {
    res.status(400).json({ error: 'Missing type or userId' });
    return;
  }

  // 查找用户信息
  const db = dbService.getData();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (type === 'HISTORY_VISIT') {
    emitHistoryVisit({
      userId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    });
    // 评估徽章（可能解锁 history_scholar）
    const { newlyUnlocked } = evaluateUserBadges(userId, user.displayName, user.avatarUrl);
    res.json({ recorded: true, newlyUnlocked });
  } else {
    res.status(400).json({ error: `Unsupported activity type: ${type}` });
  }
});

export default router;
