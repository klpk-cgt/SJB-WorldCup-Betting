/**
 * 钱包服务核心测试
 * 覆盖 adjustWalletBalance 的正向/负向/边界场景
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

import { adjustWalletBalance } from './wallet_service';

describe('adjustWalletBalance', () => {
  beforeEach(() => {
    mockDb = {
      wallets: [
        { userId: 'user-1', balance: 1000, initialPoints: 10000 },
        { userId: 'user-2', balance: 500, initialPoints: 10000 },
      ],
      transactions: [],
    };
  });

  it('正向加积分：余额增加并生成流水', () => {
    const { wallet, transaction } = adjustWalletBalance({
      userId: 'user-1',
      amount: 500,
      type: 'ADMIN_ADJUST',
      note: '管理员加分',
    });
    expect(wallet.balance).toBe(1500);
    expect(transaction.amount).toBe(500);
    expect(transaction.balanceBefore).toBe(1000);
    expect(transaction.balanceAfter).toBe(1500);
    expect(transaction.type).toBe('ADMIN_ADJUST');
    expect(transaction.note).toBe('管理员加分');
    expect(mockDb.transactions).toHaveLength(1);
    expect(mockDb.wallets[0].balance).toBe(1500);
  });

  it('负向扣积分：余额减少并生成流水', () => {
    const { wallet, transaction } = adjustWalletBalance({
      userId: 'user-1',
      amount: -300,
      type: 'PREDICTION_STAKE',
      note: '下注',
    });
    expect(wallet.balance).toBe(700);
    expect(transaction.amount).toBe(-300);
    expect(transaction.balanceBefore).toBe(1000);
    expect(transaction.balanceAfter).toBe(700);
  });

  it('余额不足时抛错且不修改钱包/不生成流水', () => {
    expect(() =>
      adjustWalletBalance({
        userId: 'user-1',
        amount: -2000,
        type: 'PREDICTION_STAKE',
        note: '超额下注',
      }),
    ).toThrow('余额不足');
    expect(mockDb.wallets[0].balance).toBe(1000);
    expect(mockDb.transactions).toHaveLength(0);
  });

  it('钱包不存在时抛错', () => {
    expect(() =>
      adjustWalletBalance({
        userId: 'nonexistent',
        amount: 100,
        type: 'ADMIN_ADJUST',
        note: 'test',
      }),
    ).toThrow('钱包不存在');
  });

  it('扣到恰好 0 允许通过', () => {
    const { wallet } = adjustWalletBalance({
      userId: 'user-1',
      amount: -1000,
      type: 'PREDICTION_STAKE',
      note: '梭哈',
    });
    expect(wallet.balance).toBe(0);
  });

  it('流水携带关联字段', () => {
    const { transaction } = adjustWalletBalance({
      userId: 'user-1',
      amount: 100,
      type: 'PREDICTION_WIN',
      note: '中奖',
      relatedPredictionId: 'pred-1',
      relatedMatchId: 'match-1',
    });
    expect(transaction.relatedPredictionId).toBe('pred-1');
    expect(transaction.relatedMatchId).toBe('match-1');
  });

  it('连续多次操作余额和流水一致', () => {
    adjustWalletBalance({ userId: 'user-1', amount: 500, type: 'ADMIN_ADJUST', note: 'a' });
    adjustWalletBalance({ userId: 'user-1', amount: -200, type: 'PREDICTION_STAKE', note: 'b' });
    adjustWalletBalance({ userId: 'user-1', amount: 1000, type: 'PREDICTION_WIN', note: 'c' });
    expect(mockDb.wallets[0].balance).toBe(2300);
    expect(mockDb.transactions).toHaveLength(3);
    expect(mockDb.transactions[2].balanceBefore).toBe(1300);
    expect(mockDb.transactions[2].balanceAfter).toBe(2300);
  });
});
