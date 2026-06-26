/**
 * 下注服务核心测试
 * 覆盖下注扣款、余额不足、保底规则、卡牌校验
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockDb: any;

vi.mock('../../db/db_service', () => ({
  dbService: {
    getData: vi.fn(() => mockDb),
  },
}));

vi.mock('../config', () => ({
  getRuntimeConfig: vi.fn(() => ({ predictionLockMinutes: 5 })),
  hasProviderKey: vi.fn(() => false),
}));

vi.mock('../activity_service', () => ({
  emitPredictionPlaced: vi.fn(),
  emitPointsAdjusted: vi.fn(),
}));

vi.mock('../logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), admin: vi.fn(), settlement: vi.fn() },
}));

// 用受控 mock 替换 helpers 中下注服务依赖的几个纯函数
vi.mock('../helpers', () => ({
  createId: vi.fn((prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`),
  roundPoints: vi.fn((v: number) => Math.round(v)),
  normalizePredictionMarket: vi.fn((m: string) => m),
  deriveOperationalStatus: vi.fn(() => 'BETTABLE'),
  resolveOddsSnapshot: vi.fn(() => ({
    oddsDecimal: 2.0,
    source: 'MANUAL',
    capturedAt: '2026-07-12T10:00:00Z',
  })),
}));

vi.mock('../prediction_card_service', () => ({
  consumeCard: vi.fn(() => true),
  userHasCard: vi.fn(() => true),
}));

import { placePrediction } from './prediction_service';
import { adjustWalletBalance } from './wallet_service';

// ─── 测试辅助 ───

function setupDb(opts: {
  userBalance?: number;
  matchStatus?: string;
} = {}) {
  const balance = opts.userBalance ?? 5000;
  mockDb = {
    users: [{ id: 'user-1', displayName: '测试用户', avatarUrl: '', groupId: 'room-1', status: 'ACTIVE' }],
    matches: [{
      id: 'match-1',
      homeTeamId: 'team-a',
      awayTeamId: 'team-b',
      status: opts.matchStatus || 'NS',
      startTimeUtc: new Date('2026-07-15T10:00:00Z').toISOString(),
      isPredictionLocked: false,
      isOddsFrozen: false,
    }],
    wallets: [{ userId: 'user-1', balance, initialPoints: 10000 }],
    predictions: [],
    transactions: [],
    matchOdds: {},
  };
  return mockDb;
}

// ─── 测试用例 ───

describe('placePrediction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDb();
  });

  it('下注成功：余额减少并生成流水', () => {
    const result = placePrediction({
      userId: 'user-1',
      groupId: 'room-1',
      matchId: 'match-1',
      market: 'H2H',
      optionKey: 'home',
      optionLabel: '主队胜',
      stakePoints: 500,
    });

    expect(result.prediction).toBeTruthy();
    expect(result.prediction.status).toBe('PENDING');
    expect(result.prediction.stakePoints).toBe(500);
    expect(result.prediction.oddsDecimal).toBe(2.0);
    expect(result.prediction.potentialReturn).toBe(1000);
    // 余额从 5000 减到 4500
    expect(mockDb.wallets[0].balance).toBe(4500);
    // 流水记录扣款
    const stakeTx = mockDb.transactions.find((t: any) => t.type === 'PREDICTION_STAKE');
    expect(stakeTx).toBeTruthy();
    expect(stakeTx.amount).toBe(-500);
    expect(stakeTx.balanceBefore).toBe(5000);
    expect(stakeTx.balanceAfter).toBe(4500);
  });

  it('余额不足时不生成预测', () => {
    setupDb({ userBalance: 200 });

    expect(() =>
      placePrediction({
        userId: 'user-1',
        groupId: 'room-1',
        matchId: 'match-1',
        market: 'H2H',
        optionKey: 'home',
        optionLabel: '主队胜',
        stakePoints: 500,
      }),
    ).toThrow('积分不足');

    expect(mockDb.predictions).toHaveLength(0);
    expect(mockDb.transactions).toHaveLength(0);
    expect(mockDb.wallets[0].balance).toBe(200);
  });

  it('下注后至少保留 100 积分', () => {
    setupDb({ userBalance: 600 });

    // 500 下注后剩 100，刚好满足
    expect(() =>
      placePrediction({
        userId: 'user-1',
        groupId: 'room-1',
        matchId: 'match-1',
        market: 'H2H',
        optionKey: 'home',
        optionLabel: '主队胜',
        stakePoints: 500,
      }),
    ).not.toThrow();
    expect(mockDb.wallets[0].balance).toBe(100);

    // 重置后试 501 → 剩 99，不满足
    setupDb({ userBalance: 600 });
    expect(() =>
      placePrediction({
        userId: 'user-1',
        groupId: 'room-1',
        matchId: 'match-1',
        market: 'H2H',
        optionKey: 'home',
        optionLabel: '主队胜',
        stakePoints: 501,
      }),
    ).toThrow('至少保留 100 积分');
  });

  it('REGRET 卡不能在下注时附带', () => {
    expect(() =>
      placePrediction({
        userId: 'user-1',
        groupId: 'room-1',
        matchId: 'match-1',
        market: 'H2H',
        optionKey: 'home',
        optionLabel: '主队胜',
        stakePoints: 500,
        usedCard: 'REGRET',
      }),
    ).toThrow('反悔卡需要在开赛前手动使用');
  });

  it('比赛不存在时抛错', () => {
    expect(() =>
      placePrediction({
        userId: 'user-1',
        groupId: 'room-1',
        matchId: 'nonexistent',
        market: 'H2H',
        optionKey: 'home',
        optionLabel: '主队胜',
        stakePoints: 500,
      }),
    ).toThrow('比赛不存在');
  });

  it('下注金额不合法时抛错', () => {
    expect(() =>
      placePrediction({
        userId: 'user-1',
        groupId: 'room-1',
        matchId: 'match-1',
        market: 'H2H',
        optionKey: 'home',
        optionLabel: '主队胜',
        stakePoints: 0,
      }),
    ).toThrow('积分数量不合法');

    expect(() =>
      placePrediction({
        userId: 'user-1',
        groupId: 'room-1',
        matchId: 'match-1',
        market: 'H2H',
        optionKey: 'home',
        optionLabel: '主队胜',
        stakePoints: -100,
      }),
    ).toThrow('积分数量不合法');
  });

  it('使用 NO_LOSS 卡下注：消耗卡牌并记录效果', () => {
    const result = placePrediction({
      userId: 'user-1',
      groupId: 'room-1',
      matchId: 'match-1',
      market: 'H2H',
      optionKey: 'home',
      optionLabel: '主队胜',
      stakePoints: 500,
      usedCard: 'NO_LOSS',
    });

    expect(result.prediction.usedCard).toBe('NO_LOSS');
    expect(result.prediction.cardEffectNotes).toContain('免亏卡');
  });
});
