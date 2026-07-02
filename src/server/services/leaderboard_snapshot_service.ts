/**
 * 排行榜每日快照服务
 * 在北京时间自然日切换时（00:00 北京 = 16:00 UTC）捕获群组余额快照，
 * 用于排行榜 rankDelta 计算（昨日排名 vs 今日排名）。
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { dbService } from '../../db/db_service';
import { toBeijingDateKey } from '../helpers';
import logger from '../logger';
import type { LeaderboardSnapshot } from '../../db/system_state';

/**
 * 捕获指定群组的余额快照并写入 SystemState。
 * 多群组场景下按 groupId 分别存储。
 */
export function captureLeaderboardSnapshot(groupId?: string): LeaderboardSnapshot | null {
  const db = dbService.getData();
  const effectiveGroupId = groupId || dbService.getPrimaryRoomId();
  const users = db.users.filter((u) => u.groupId === effectiveGroupId && u.status !== 'DISABLED');
  const walletMap = new Map<string, number>();
  for (const w of db.wallets) {
    walletMap.set(w.userId, w.balance);
  }

  const entries = users
    .map((user) => ({
      userId: user.id,
      balance: walletMap.get(user.id) ?? 10000,
      rank: 0,
    }))
    .sort((a, b) => b.balance - a.balance)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const snapshot: LeaderboardSnapshot = {
    capturedAt: new Date().toISOString(),
    beijingDateKey: toBeijingDateKey(Date.now()),
    groupId: effectiveGroupId,
    entries,
  };

  if (!db.systemState) {
    db.systemState = {};
  }
  if (!db.systemState.leaderboardSnapshots) {
    db.systemState.leaderboardSnapshots = {};
  }
  db.systemState.leaderboardSnapshots[effectiveGroupId] = snapshot;
  dbService.saveAsync().catch((error) => {
    logger.error('[LeaderboardSnapshot] 快照异步落库失败', {
      groupId: effectiveGroupId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  logger.info('[LeaderboardSnapshot] 快照已捕获', {
    groupId: effectiveGroupId,
    beijingDateKey: snapshot.beijingDateKey,
    userCount: entries.length,
  });

  return snapshot;
}

/**
 * 获取指定群组的最近一次排行榜快照。
 * 若快照不存在或过期（超过 36 小时），返回 null。
 */
export function getLeaderboardSnapshot(groupId?: string): LeaderboardSnapshot | null {
  const db = dbService.getData();
  const effectiveGroupId = groupId || dbService.getPrimaryRoomId();
  const snapshot = db.systemState?.leaderboardSnapshots?.[effectiveGroupId];
  if (!snapshot) return null;

  // 超过 36 小时的快照视为过期
  const ageMs = Date.now() - new Date(snapshot.capturedAt).getTime();
  if (ageMs > 36 * 60 * 60 * 1000) return null;

  return snapshot;
}

/**
 * 定时任务入口：北京时间自然日切换时捕获快照。
 * cron: 0 16 * * *（UTC 16:00 = 北京时间次日 00:00）
 */
export async function runLeaderboardSnapshotTask(): Promise<void> {
  captureLeaderboardSnapshot();
}
