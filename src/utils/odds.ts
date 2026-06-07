import { MatchOdds } from '../types';

export const COMMON_CORRECT_SCORE_KEYS = [
  '0-0',
  '1-0',
  '2-0',
  '2-1',
  '1-1',
  '0-1',
  '0-2',
  '1-2',
  '2-2',
  '3-1',
  '1-3',
] as const;

export const DEFAULT_CORRECT_SCORE_OPTIONS = [
  { score: '0-0', odds: 7.8 },
  { score: '1-0', odds: 6.2 },
  { score: '2-0', odds: 8.4 },
  { score: '2-1', odds: 8.1 },
  { score: '3-0', odds: 13.5 },
  { score: '3-1', odds: 11.8 },
  { score: '4-0', odds: 21.0 },
  { score: '4-1', odds: 23.0 },
  { score: '1-1', odds: 5.9 },
  { score: '2-2', odds: 12.0 },
  { score: '3-3', odds: 31.0 },
  { score: '0-1', odds: 7.2 },
  { score: '0-2', odds: 10.0 },
  { score: '1-2', odds: 9.4 },
  { score: '0-3', odds: 18.0 },
  { score: '1-3', odds: 15.5 },
  { score: '2-3', odds: 18.5 },
  { score: '4-2', odds: 27.0 },
  { score: '2-4', odds: 29.0 },
  { score: 'Other', odds: 14.5 },
] as const;

export function mergeCorrectScoreOdds(
  existing: Array<{ score: string; odds: number }> = [],
  fallback = DEFAULT_CORRECT_SCORE_OPTIONS,
) {
  const existingMap = new Map(existing.map((item) => [item.score, item]));
  const merged = fallback.map((item) => existingMap.get(item.score) || item);
  const remaining = existing.filter((item) => !fallback.some((preset) => preset.score === item.score));
  return [...merged, ...remaining];
}

export function generateDefaultOdds(matchId: string): MatchOdds {
  return {
    matchId,
    h2h: { homeWin: 2.2, draw: 3.2, awayWin: 3.1 },
    correctScore: mergeCorrectScoreOdds(),
    totalGoals: { over25: 1.9, under25: 1.9 },
    lastUpdated: new Date().toISOString(),
    source: 'MANUAL',
  };
}

export function parseScoreLabel(score: string) {
  if (!/^\d+-\d+$/.test(score)) {
    return null;
  }

  const [home, away] = score.split('-').map(Number);
  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    return null;
  }

  return { home, away };
}
