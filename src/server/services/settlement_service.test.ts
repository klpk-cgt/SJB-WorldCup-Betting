/**
 * 结算服务核心测试
 * 覆盖 CANCELLED 跳过、forceResettle 卡牌规则、各卡牌效果
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockDb: any;

// Mock dbService —— 结算服务的数据源
vi.mock('../../db/db_service', () => ({
  dbService: {
    getData: vi.fn(() => mockDb),
    save: vi.fn(),
    saveOrThrow: vi.fn(),
    getPrimaryRoomId: vi.fn(() => 'room-1'),
    refreshBracketState: vi.fn(),
  },
}));

// Mock 所有外部副作用模块，保留 wallet_service / prediction_card_service / helpers / operations 真实实现
vi.mock('../activity_service', () => ({
  emitBigWin: vi.fn(),
  emitPredictionLost: vi.fn(),
  emitPredictionWon: vi.fn(),
  emitStreakHit: vi.fn(),
  emitPredictionPlaced: vi.fn(),
  emitPointsAdjusted: vi.fn(),
}));
vi.mock('../badge_service', () => ({
  evaluateUserBadges: vi.fn(),
  syncUserTitle: vi.fn(),
  evaluateAllBadges: vi.fn(),
  syncAllTitles: vi.fn(),
}));
vi.mock('../backup', () => ({ createBackup: vi.fn(() => ({ ok: true })) }));
vi.mock('../ai', () => ({ invalidateAIContent: vi.fn() }));
vi.mock('../logger', () => ({
  default: {
    info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    admin: vi.fn(), settlement: vi.fn(),
  },
}));
vi.mock('./post_match_report_service', () => ({ generatePostMatchReport: vi.fn() }));
vi.mock('../websocket', () => ({
  broadcastMatchSettled: vi.fn(),
  sendPredictionResult: vi.fn(),
}));

import { settleMatchById } from './settlement_service';

// ─── 测试辅助 ───

function makeMatch(overrides: Partial<any> = {}) {
  return {
    id: 'match-1',
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    roundName: '决赛',
    stage: 'Final',
    venueName: '球场',
    venueCity: '城市',
    startTimeUtc: new Date('2026-07-13T10:00:00Z').toISOString(),
    startTimeBeijing: '2026-07-13 18:00',
    status: 'FT',
    homeScore: 2,
    awayScore: 1,
    isOddsFrozen: false,
    isPredictionLocked: true,
    isSettled: false,
    scoreUnknown: false,
    operationalStatus: 'WAITING_SETTLEMENT',
    settlementStatus: 'PENDING',
    ...overrides,
  };
}

function makePrediction(userId: string, overrides: Partial<any> = {}) {
  return {
    id: `pred-${userId}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    groupId: 'room-1',
    matchId: 'match-1',
    market: 'H2H',
    optionKey: 'home',
    optionLabel: '主队胜',
    stakePoints: 100,
    oddsDecimal: 2.0,
    potentialReturn: 200,
    status: 'PENDING',
    placedAt: new Date('2026-07-12T10:00:00Z').toISOString(),
    ...overrides,
  };
}

function makeWallet(userId: string, balance: number) {
  return { userId, balance, initialPoints: 10000 };
}

function setupDb(opts: {
  match?: Partial<any>;
  predictions?: any[];
  wallets?: any[];
  transactions?: any[];
} = {}) {
  const match = makeMatch(opts.match);
  const predictions = opts.predictions || [];
  const wallets = opts.wallets || predictions.map((p) => makeWallet(p.userId, 5000));
  mockDb = {
    matches: [match],
    predictions,
    wallets,
    transactions: opts.transactions || [],
    users: wallets.map((w) => ({
      id: w.userId,
      displayName: w.userId,
      avatarUrl: '',
      groupId: 'room-1',
      status: 'ACTIVE',
    })),
    teams: [
      { id: 'team-a', nameZh: '主队' },
      { id: 'team-b', nameZh: '客队' },
    ],
    matchOdds: {},
    aiContents: [],
    activities: [],
    userBadges: [],
    userTitles: [],
    cardInventories: [],
    checkinLog: [],
    quizLogs: [],
    syncLogs: [],
    adminOverrides: [],
    rooms: [{ id: 'room-1', name: '测试群' }],
    players: [],
    teamHistory: [],
    tournamentBets: [],
    shareCards: [],
    adminSessions: [],
    bracketState: { generatedAt: new Date().toISOString(), rounds: [] },
  };
  return { match, predictions, wallets };
}

// ─── 测试用例 ───

describe('settleMatchById', () => {
  beforeEach(() => {
    mockDb = undefined;
  });

  describe('CANCELLED 预测跳过', () => {
    it('CANCELLED 预测不被结算（余额不变、无流水）', async () => {
      setupDb({
        predictions: [
          makePrediction('user-1', { status: 'CANCELLED', usedCard: 'REGRET' }),
          makePrediction('user-2', { status: 'PENDING' }),
        ],
      });

      await settleMatchById({ matchId: 'match-1', source: 'ADMIN' });

      const user1Wallet = mockDb.wallets.find((w) => w.userId === 'user-1');
      const user2Wallet = mockDb.wallets.find((w) => w.userId === 'user-2');
      // user-1 余额不变（CANCELLED 跳过）
      expect(user1Wallet.balance).toBe(5000);
      // user-2 命中主队胜(2:1)，获得 200 积分
      expect(user2Wallet.balance).toBe(5200);
      // user-1 没有新增流水
      const user1Txs = mockDb.transactions.filter((t: any) => t.userId === 'user-1');
      expect(user1Txs).toHaveLength(0);
    });

    it('CANCELLED 预测在 forceResettle 时也不被处理', async () => {
      const pred = makePrediction('user-1', {
        status: 'CANCELLED',
        usedCard: 'REGRET',
        settledReturn: 0,
        settledProfit: 0,
      });
      setupDb({
        match: { isSettled: true },
        predictions: [pred],
        transactions: [],
      });

      await settleMatchById({ matchId: 'match-1', source: 'ADMIN', forceResettle: true });

      // 预测状态仍为 CANCELLED
      expect(mockDb.predictions[0].status).toBe('CANCELLED');
      // 余额不变
      expect(mockDb.wallets[0].balance).toBe(5000);
      // 无回滚流水
      const userTxs = mockDb.transactions.filter((t: any) => t.userId === 'user-1');
      expect(userTxs).toHaveLength(0);
    });
  });

  describe('WON / LOST / VOID 正常分支', () => {
    it('WON：发放中奖积分', async () => {
      setupDb({
        predictions: [
          makePrediction('user-1', { optionKey: 'home', oddsDecimal: 2.0, stakePoints: 100 }),
        ],
      });

      await settleMatchById({ matchId: 'match-1', source: 'ADMIN' });

      expect(mockDb.predictions[0].status).toBe('WON');
      expect(mockDb.predictions[0].settledReturn).toBe(200);
      expect(mockDb.predictions[0].settledProfit).toBe(100);
      expect(mockDb.wallets[0].balance).toBe(5200);
    });

    it('LOST：不发放积分', async () => {
      setupDb({
        predictions: [
          makePrediction('user-1', { optionKey: 'away', stakePoints: 100 }),
        ],
      });

      await settleMatchById({ matchId: 'match-1', source: 'ADMIN' });

      expect(mockDb.predictions[0].status).toBe('LOST');
      expect(mockDb.predictions[0].settledReturn).toBe(0);
      expect(mockDb.predictions[0].settledProfit).toBe(-100);
      expect(mockDb.wallets[0].balance).toBe(5000);
    });

    it('VOID（HAFU 无法判定）：返还本金', async () => {
      setupDb({
        predictions: [
          makePrediction('user-1', { market: 'HAFU', optionKey: 'hh', stakePoints: 100 }),
        ],
      });

      await settleMatchById({ matchId: 'match-1', source: 'ADMIN' });

      expect(mockDb.predictions[0].status).toBe('VOID');
      expect(mockDb.predictions[0].settledReturn).toBe(100);
      expect(mockDb.wallets[0].balance).toBe(5100);
    });
  });

  describe('forceResettle 卡牌规则', () => {
    it('forceResettle 清空 usedCard，不退卡，不二次生效', async () => {
      const pred = makePrediction('user-1', {
        status: 'WON',
        usedCard: 'DOUBLE',
        settledReturn: 400,
        settledProfit: 300,
        settledAt: '2026-07-13T12:00:00Z',
      });
      // 模拟首次结算产生的正向流水
      const winTx = {
        id: 'tx-win-1',
        userId: 'user-1',
        type: 'CARD_EFFECT',
        amount: 400,
        balanceBefore: 4900,
        balanceAfter: 5300,
        relatedPredictionId: pred.id,
        relatedMatchId: 'match-1',
        note: '双倍卡',
        createdAt: '2026-07-13T12:00:00Z',
      };
      setupDb({
        match: { isSettled: true },
        predictions: [pred],
        wallets: [{ userId: 'user-1', balance: 5300, initialPoints: 10000 }],
        transactions: [winTx],
      });

      await settleMatchById({ matchId: 'match-1', source: 'ADMIN', forceResettle: true });

      // usedCard 被清空
      expect(mockDb.predictions[0].usedCard).toBeUndefined();
      // 回滚扣回首次发放的 400
      const rollbackTx = mockDb.transactions.find(
        (t: any) => t.type === 'REFUND' && t.amount < 0,
      );
      expect(rollbackTx).toBeTruthy();
      // 重结算后主队胜 2:1，无卡 → 正常发 200
      expect(mockDb.predictions[0].status).toBe('WON');
      expect(mockDb.predictions[0].settledReturn).toBe(200);
    });
  });

  describe('各卡牌效果', () => {
    it('NO_LOSS 卡：未中返还全部本金', async () => {
      setupDb({
        predictions: [
          makePrediction('user-1', {
            optionKey: 'away',
            usedCard: 'NO_LOSS',
            stakePoints: 100,
          }),
        ],
      });

      await settleMatchById({ matchId: 'match-1', source: 'ADMIN' });

      expect(mockDb.predictions[0].status).toBe('WON');
      expect(mockDb.predictions[0].settledReturn).toBe(100);
      expect(mockDb.predictions[0].settledProfit).toBe(0);
      expect(mockDb.wallets[0].balance).toBe(5100);
    });

    it('DOUBLE 卡：命中收益翻倍', async () => {
      setupDb({
        predictions: [
          makePrediction('user-1', {
            optionKey: 'home',
            usedCard: 'DOUBLE',
            stakePoints: 100,
            oddsDecimal: 2.0,
          }),
        ],
      });

      await settleMatchById({ matchId: 'match-1', source: 'ADMIN' });

      expect(mockDb.predictions[0].status).toBe('WON');
      // 基础利润 100，翻倍后 200，返还 = 100 + 200 = 300
      expect(mockDb.predictions[0].settledReturn).toBe(300);
      expect(mockDb.predictions[0].settledProfit).toBe(200);
      expect(mockDb.wallets[0].balance).toBe(5300);
    });

    it('FLOOR 卡：未中返还 90% 本金', async () => {
      setupDb({
        predictions: [
          makePrediction('user-1', {
            optionKey: 'away',
            usedCard: 'FLOOR',
            stakePoints: 100,
          }),
        ],
      });

      await settleMatchById({ matchId: 'match-1', source: 'ADMIN' });

      expect(mockDb.predictions[0].status).toBe('WON');
      expect(mockDb.predictions[0].settledReturn).toBe(90);
      expect(mockDb.predictions[0].settledProfit).toBe(-10);
      expect(mockDb.wallets[0].balance).toBe(5090);
    });

    it('无卡正常命中：基础结算', async () => {
      setupDb({
        predictions: [
          makePrediction('user-1', {
            optionKey: 'home',
            stakePoints: 100,
            oddsDecimal: 1.5,
          }),
        ],
      });

      await settleMatchById({ matchId: 'match-1', source: 'ADMIN' });

      expect(mockDb.predictions[0].status).toBe('WON');
      expect(mockDb.predictions[0].settledReturn).toBe(150);
      expect(mockDb.predictions[0].settledProfit).toBe(50);
      expect(mockDb.wallets[0].balance).toBe(5150);
    });
  });

  describe('结算前置校验', () => {
    it('比赛不存在时抛错', async () => {
      setupDb({});
      await expect(
        settleMatchById({ matchId: 'nonexistent', source: 'ADMIN' }),
      ).rejects.toThrow('比赛不存在');
    });

    it('比赛未结束（非 FT/AET/PEN）时抛错', async () => {
      setupDb({ match: { status: 'LIVE', homeScore: 1, awayScore: 0 } });
      await expect(
        settleMatchById({ matchId: 'match-1', source: 'ADMIN' }),
      ).rejects.toThrow('比赛尚未正式结束');
    });

    it('比分不完整时抛错', async () => {
      setupDb({ match: { status: 'FT', homeScore: undefined, awayScore: 1 } });
      await expect(
        settleMatchById({ matchId: 'match-1', source: 'ADMIN' }),
      ).rejects.toThrow('比分还不完整');
    });

    it('已结算且未指定 forceResettle 时抛错', async () => {
      setupDb({ match: { isSettled: true } });
      await expect(
        settleMatchById({ matchId: 'match-1', source: 'ADMIN' }),
      ).rejects.toThrow('已完成正式结算');
    });
  });
});
