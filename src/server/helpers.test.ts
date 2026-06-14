/**
 * 核心工具函数测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock helpers that are called internally
vi.mock('../db/db_service', () => ({
  dbService: {
    getData: vi.fn(() => ({ quizLogs: [], aiQuizCache: undefined })),
  },
}));

const { getDailyQuizQuestions } = await import('./helpers');

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
