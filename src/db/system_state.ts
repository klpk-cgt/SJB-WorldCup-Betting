/**
 * 系统级状态：跨请求持久化的运行时状态
 * @license SPDX-License-Identifier: Apache-2.0
 */

export interface LeaderboardSnapshotEntry {
  userId: string;
  balance: number;
  rank: number;
}

export interface LeaderboardSnapshot {
  /** 快照捕获时间（ISO） */
  capturedAt: string;
  /** 快照对应的北京时间日期（YYYY-MM-DD） */
  beijingDateKey: string;
  /** 群组ID */
  groupId: string;
  entries: LeaderboardSnapshotEntry[];
}

export interface SystemState {
  /** 昨日排行榜快照（按 groupId 索引） */
  leaderboardSnapshots?: Record<string, LeaderboardSnapshot>;
}
