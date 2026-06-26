/**
 * 管理员调账测试
 * 覆盖单用户/批量调账走钱包服务、余额不足记失败列表
 *
 * 直接测试 admin.ts 调用的 adjustWalletBalance + 批量失败收集逻辑，
 * 验证调账统一走钱包服务、不静默截断。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockDb: any;

vi.mock('../../db/db_service', () => ({
  dbService: {
    getData: vi.fn(() => mockDb),
  },
}));

vi.mock('../logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), admin: vi.fn(), settlement: vi.fn() },
}));

vi.mock('../activity_service', () => ({
  emitPointsAdjusted: vi.fn(),
  emitPredictionPlaced: vi.fn(),
}));

import { adjustWalletBalance } from '../services/wallet_service';

// ─── 模拟批量调账逻辑（与 admin.ts bulk-adjust-points 路由一致）───

function simulateBulkAdjust(db: any, amount: number, reason: string) {
  let affectedCount = 0;
  const failed: Array<{ userId: string; reason: string }> = [];

  for (const walletEntry of db.wallets) {
    try {
      adjustWalletBalance({
        userId: walletEntry.userId,
        amount,
        type: 'ADMIN_ADJUST',
        note: reason,
      });
      affectedCount += 1;
    } catch (e) {
      const failReason = e instanceof Error ? e.message : String(e);
      failed.push({ userId: walletEntry.userId, reason: failReason });
    }
  }

  return { affectedCount, failed };
}

// ─── 测试用例 ───

describe('管理员调账（走钱包服务）', () => {
  beforeEach(() => {
    mockDb = {
      wallets: [
        { userId: 'rich-user', balance: 10000, initialPoints: 10000 },
        { userId: 'mid-user', balance: 500, initialPoints: 10000 },
        { userId: 'poor-user', balance: 50, initialPoints: 10000 },
      ],
      transactions: [],
      users: [
        { id: 'rich-user', displayName: '富用户', avatarUrl: '', groupId: 'room-1', status: 'ACTIVE' },
        { id: 'mid-user', displayName: '中户', avatarUrl: '', groupId: 'room-1', status: 'ACTIVE' },
        { id: 'poor-user', displayName: '穷户', avatarUrl: '', groupId: 'room-1', status: 'ACTIVE' },
      ],
    };
  });

  describe('单用户调账', () => {
    it('加分成功：余额增加并生成 ADMIN_ADJUST 流水', () => {
      const { wallet, transaction } = adjustWalletBalance({
        userId: 'rich-user',
        amount: 1000,
        type: 'ADMIN_ADJUST',
        note: '管理员奖励',
      });
      expect(wallet.balance).toBe(11000);
      expect(transaction.type).toBe('ADMIN_ADJUST');
      expect(transaction.amount).toBe(1000);
      expect(transaction.balanceBefore).toBe(10000);
      expect(transaction.balanceAfter).toBe(11000);
    });

    it('扣分成功：余额减少并生成流水', () => {
      const { wallet } = adjustWalletBalance({
        userId: 'rich-user',
        amount: -3000,
        type: 'ADMIN_ADJUST',
        note: '管理员扣除',
      });
      expect(wallet.balance).toBe(7000);
    });

    it('扣分超过余额时抛错（不静默截断到 0）', () => {
      expect(() =>
        adjustWalletBalance({
          userId: 'poor-user',
          amount: -100,
          type: 'ADMIN_ADJUST',
          note: '超额扣除',
        }),
      ).toThrow('余额不足');

      // 余额不变
      expect(mockDb.wallets.find((w: any) => w.userId === 'poor-user').balance).toBe(50);
      // 不生成流水
      expect(mockDb.transactions).toHaveLength(0);
    });

    it('扣到恰好 0 允许通过', () => {
      const { wallet } = adjustWalletBalance({
        userId: 'poor-user',
        amount: -50,
        type: 'ADMIN_ADJUST',
        note: '清零',
      });
      expect(wallet.balance).toBe(0);
    });
  });

  describe('批量调账', () => {
    it('全员加分：affectedCount 等于钱包数，failed 为空', () => {
      const result = simulateBulkAdjust(mockDb, 1000, '全员奖励');
      expect(result.affectedCount).toBe(3);
      expect(result.failed).toHaveLength(0);
      expect(mockDb.wallets[0].balance).toBe(11000);
      expect(mockDb.wallets[1].balance).toBe(1500);
      expect(mockDb.wallets[2].balance).toBe(1050);
      expect(mockDb.transactions).toHaveLength(3);
    });

    it('全员扣分：余额不足的用户进 failed 列表，不中断整体', () => {
      // 每人扣 100
      const result = simulateBulkAdjust(mockDb, -100, '全员扣除');

      // rich-user 和 mid-user 成功，poor-user 失败（50 < 100）
      expect(result.affectedCount).toBe(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].userId).toBe('poor-user');
      expect(result.failed[0].reason).toContain('余额不足');

      // poor-user 余额不变
      expect(mockDb.wallets.find((w: any) => w.userId === 'poor-user').balance).toBe(50);
      // rich/mid 余额减少
      expect(mockDb.wallets.find((w: any) => w.userId === 'rich-user').balance).toBe(9900);
      expect(mockDb.wallets.find((w: any) => w.userId === 'mid-user').balance).toBe(400);
    });

    it('返回值格式包含 affectedCount 和 failed 列表', () => {
      const result = simulateBulkAdjust(mockDb, -600, '测试格式');
      expect(result).toHaveProperty('affectedCount');
      expect(result).toHaveProperty('failed');
      expect(Array.isArray(result.failed)).toBe(true);
      // failed 数组每项有 userId 和 reason
      for (const item of result.failed) {
        expect(item).toHaveProperty('userId');
        expect(item).toHaveProperty('reason');
      }
    });

    it('大批量扣分：只扣得起的用户成功', () => {
      // 每人扣 600
      const result = simulateBulkAdjust(mockDb, -600, '大批量扣除');
      // 只有 rich-user (10000) 余额足够
      expect(result.affectedCount).toBe(1);
      expect(result.failed).toHaveLength(2);
      const failedIds = result.failed.map((f) => f.userId).sort();
      expect(failedIds).toEqual(['mid-user', 'poor-user']);
    });
  });
});
