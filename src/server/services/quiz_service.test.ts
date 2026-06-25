import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockQuizLogs: any[] = [];

vi.mock('../db/db_service', () => ({
  dbService: {
    getData: vi.fn(() => ({ quizLogs: mockQuizLogs, aiQuizCache: undefined })),
    save: vi.fn(),
  },
}));

vi.mock('./wallet_service', () => ({
  adjustWalletBalance: vi.fn(),
}));

import { getTodayQuiz, hasCompletedQuizToday, submitQuizAnswer } from './quiz_service';
import { getDailyQuizQuestions } from '../helpers';

describe('quiz_service', () => {
  beforeEach(() => {
    mockQuizLogs = [];
    vi.setSystemTime(new Date('2026-06-14T04:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const getDailyQuestions = () => getDailyQuizQuestions();
  const getDailyIds = () => getDailyQuestions().map((q) => q.id);

  describe('hasCompletedQuizToday', () => {
    it('should return false when no quiz logs exist', () => {
      expect(hasCompletedQuizToday('user-1', '2026-06-14')).toBe(false);
    });

    it('should return false when only 1 question answered', () => {
      mockQuizLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          date: '2026-06-14',
          questionIds: [getDailyIds()[0]],
          selectedIndex: 0,
          correctCount: 1,
          pointsEarned: 100,
          createdAt: '2026-06-14T04:00:00Z',
        },
      ];
      expect(hasCompletedQuizToday('user-1', '2026-06-14')).toBe(false);
    });

    it('should return false when 2 questions answered', () => {
      mockQuizLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          date: '2026-06-14',
          questionIds: [getDailyIds()[0]],
          selectedIndex: 0,
          correctCount: 1,
          pointsEarned: 100,
          createdAt: '2026-06-14T04:00:00Z',
        },
        {
          id: 'log-2',
          userId: 'user-1',
          date: '2026-06-14',
          questionIds: [getDailyIds()[1]],
          selectedIndex: 0,
          correctCount: 0,
          pointsEarned: 0,
          createdAt: '2026-06-14T04:00:00Z',
        },
      ];
      expect(hasCompletedQuizToday('user-1', '2026-06-14')).toBe(false);
    });

    it('should return true when all daily questions answered', () => {
      for (const question of getDailyQuestions()) {
        submitQuizAnswer({ userId: 'user-1', questionId: question.id, selectedIndex: 0 });
      }
      expect(hasCompletedQuizToday('user-1', '2026-06-14')).toBe(true);
    });
  });

  describe('submitQuizAnswer', () => {
    it('should accept a correct answer', () => {
      const result = submitQuizAnswer({ userId: 'user-a', questionId: 'q1', selectedIndex: 0 });
      expect(result.isCorrect).toBe(true);
    });

    it('should accept an incorrect answer', () => {
      const result = submitQuizAnswer({ userId: 'user-b', questionId: 'q1', selectedIndex: 1 });
      expect(result.isCorrect).toBe(false);
    });

    it('should reject duplicate answer', () => {
      submitQuizAnswer({ userId: 'user-c', questionId: 'q1', selectedIndex: 0 });
      expect(() => {
        submitQuizAnswer({ userId: 'user-c', questionId: 'q1', selectedIndex: 1 });
      }).toThrow('该题已作答');
    });

    it('should throw when daily quiz already completed', () => {
      for (const q of getDailyQuestions()) {
        submitQuizAnswer({ userId: 'user-d', questionId: q.id, selectedIndex: 0 });
      }
      expect(() => {
        submitQuizAnswer({ userId: 'user-d', questionId: 'custom-after-complete', selectedIndex: 0 });
      }).toThrow('今日问答已完成。');
    });

    it('should reject non-existent question', () => {
      expect(() => {
        submitQuizAnswer({ userId: 'user-e', questionId: 'nonexistent', selectedIndex: 0 });
      }).toThrow('题目不存在。');
    });
  });

  describe('getTodayQuiz', () => {
    it('should return questions when not completed', () => {
      const result = getTodayQuiz('user-f');
      expect(result.questions.length).toBe(3);
    });

    it('should throw when already completed', () => {
      for (const q of getDailyQuestions()) {
        submitQuizAnswer({ userId: 'user-g', questionId: q.id, selectedIndex: 0 });
      }
      expect(() => getTodayQuiz('user-g')).toThrow('今日问答已完成。');
    });
  });
});
