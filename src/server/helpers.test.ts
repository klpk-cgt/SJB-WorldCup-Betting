/**
 * 核心工具函数测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbService } from '../db/db_service';

// Mock helpers that are called internally
vi.mock('../db/db_service', () => ({
  dbService: {
    getData: vi.fn(() => ({ quizLogs: [], aiQuizCache: undefined })),
  },
}));

const { getDailyQuizQuestions, resolveOddsSnapshot } = await import('./helpers');

describe('getDailyQuizQuestions (Fisher-Yates shuffle)', () => {
  it('should return 3 questions', () => {
    const result = getDailyQuizQuestions();
    expect(result).toHaveLength(3);
  });

  it('should return valid question objects', () => {
    const result = getDailyQuizQuestions();
    for (const q of result) {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('question');
      expect(q).toHaveProperty('options');
      expect(q).toHaveProperty('correctIndex');
      expect(q).toHaveProperty('explanation');
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('should produce different results on different days', () => {
    // Temporarily override Date to simulate different days
    vi.setSystemTime(new Date('2026-06-13T00:00:00+08:00'));
    const day1 = getDailyQuizQuestions().map(q => q.id).join(',');

    vi.setSystemTime(new Date('2026-06-14T00:00:00+08:00'));
    const day2 = getDailyQuizQuestions().map(q => q.id).join(',');

    vi.setSystemTime(new Date('2026-06-15T00:00:00+08:00'));
    const day3 = getDailyQuizQuestions().map(q => q.id).join(',');

    // On consecutive days, at least 2 out of 3 sets should differ
    const allSame = day1 === day2 && day2 === day3;
    expect(allSame).toBe(false);
  });

  it('should not produce duplicate questions in a single day', () => {
    const result = getDailyQuizQuestions();
    const ids = result.map(q => q.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('should handle seed determinism correctly', () => {
    vi.setSystemTime(new Date('2026-06-14T00:00:00+08:00'));
    const first = getDailyQuizQuestions().map(q => q.id);

    vi.setSystemTime(new Date('2026-06-14T00:00:00+08:00'));
    const second = getDailyQuizQuestions().map(q => q.id);

    // Same date should produce the same order (deterministic)
    expect(first).toEqual(second);
  });
});

describe('resolveOddsSnapshot (赔率下注守卫)', () => {
  const matchId = 'm-1';
  const baseOdds = {
    matchId,
    h2h: { homeWin: 2.1, draw: 3.3, awayWin: 4.2 },
    correctScore: [{ score: '2-1', odds: 9.5 }],
    totalGoals: [{ goals: '3', odds: 4.0 }],
    lastUpdated: '2026-06-26T00:00:00Z',
  };

  beforeEach(() => {
    vi.useRealTimers();
  });

  it('UNSYNCED 状态返回 null（不允许下注）', () => {
    vi.mocked(dbService.getData).mockReturnValueOnce({
      matchOdds: { [matchId]: { ...baseOdds, syncStatus: 'UNSYNCED' } },
    } as any);
    const snap = resolveOddsSnapshot(matchId, 'H2H', 'home');
    expect(snap).toBeNull();
  });

  it('找不到对应 optionKey 的赔率值时返回 null（不再使用兜底默认值）', () => {
    vi.mocked(dbService.getData).mockReturnValueOnce({
      matchOdds: { [matchId]: { ...baseOdds, syncStatus: 'SYNCED' } },
    } as any);
    // CORRECT_SCORE 市场查找不存在的比分 5-5，旧逻辑返回 9.5，新逻辑返回 null
    const snap = resolveOddsSnapshot(matchId, 'CORRECT_SCORE', 'correctScore_5_5');
    expect(snap).toBeNull();
  });

  it('TOTAL_GOALS 找不到对应进球数时返回 null（旧逻辑返回 4.0）', () => {
    vi.mocked(dbService.getData).mockReturnValueOnce({
      matchOdds: { [matchId]: { ...baseOdds, syncStatus: 'SYNCED' } },
    } as any);
    const snap = resolveOddsSnapshot(matchId, 'TOTAL_GOALS', 'totalGoals_7+');
    expect(snap).toBeNull();
  });

  it('QUALIFY 找不到 qualify 字段时返回 null（旧逻辑返回 1.8）', () => {
    vi.mocked(dbService.getData).mockReturnValueOnce({
      matchOdds: { [matchId]: { ...baseOdds, syncStatus: 'SYNCED' } },
    } as any);
    const snap = resolveOddsSnapshot(matchId, 'QUALIFY', 'homeQualify');
    expect(snap).toBeNull();
  });

  it('HAFU 无 halfFullTime 字段时返回 null（旧逻辑返回 3.0）', () => {
    vi.mocked(dbService.getData).mockReturnValueOnce({
      matchOdds: { [matchId]: { ...baseOdds, syncStatus: 'SYNCED' } },
    } as any);
    const snap = resolveOddsSnapshot(matchId, 'HAFU', 'hh');
    expect(snap).toBeNull();
  });

  it('SYNCED 且赔率有效时正常返回快照', () => {
    vi.mocked(dbService.getData).mockReturnValueOnce({
      matchOdds: { [matchId]: { ...baseOdds, syncStatus: 'SYNCED', source: 'The Odds API' } },
    } as any);
    const snap = resolveOddsSnapshot(matchId, 'H2H', 'home');
    expect(snap).not.toBeNull();
    expect(snap!.oddsDecimal).toBe(2.1);
    expect(snap!.source).toBe('The Odds API');
  });

  it('MANUAL_FALLBACK 状态存在有效赔率时允许下注并透传 source', () => {
    vi.mocked(dbService.getData).mockReturnValueOnce({
      matchOdds: { [matchId]: { ...baseOdds, syncStatus: 'MANUAL_FALLBACK', source: 'MANUAL' } },
    } as any);
    const snap = resolveOddsSnapshot(matchId, 'H2H', 'draw');
    expect(snap).not.toBeNull();
    expect(snap!.oddsDecimal).toBe(3.3);
    expect(snap!.source).toBe('MANUAL');
  });

  it('odds 不存在时返回 null', () => {
    vi.mocked(dbService.getData).mockReturnValueOnce({
      matchOdds: {},
    } as any);
    const snap = resolveOddsSnapshot(matchId, 'H2H', 'home');
    expect(snap).toBeNull();
  });
});
