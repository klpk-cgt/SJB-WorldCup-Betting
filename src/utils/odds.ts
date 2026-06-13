import { MatchOdds } from '../types';

// ─── 比分分组定义 ───

export type ScoreGroup = 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';

export interface ScoreOption {
  score: string;
  odds: number;
  group: ScoreGroup;
}

export const SCORE_GROUP_META: Record<ScoreGroup, { label: string; color: string; bgColor: string; borderColor: string }> = {
  HOME_WIN: { label: '主胜', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  DRAW: { label: '平局', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  AWAY_WIN: { label: '客胜', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
};

export const DEFAULT_CORRECT_SCORE_OPTIONS: ScoreOption[] = [
  // ─── 主胜 ───
  { score: '1-0', odds: 6.2, group: 'HOME_WIN' },
  { score: '2-0', odds: 8.4, group: 'HOME_WIN' },
  { score: '2-1', odds: 8.1, group: 'HOME_WIN' },
  { score: '3-0', odds: 13.5, group: 'HOME_WIN' },
  { score: '3-1', odds: 11.8, group: 'HOME_WIN' },
  { score: '3-2', odds: 18.5, group: 'HOME_WIN' },
  { score: '4-0', odds: 21.0, group: 'HOME_WIN' },
  { score: '4-1', odds: 23.0, group: 'HOME_WIN' },
  { score: '4-2', odds: 27.0, group: 'HOME_WIN' },
  { score: '5-0', odds: 41.0, group: 'HOME_WIN' },
  { score: '5-1', odds: 36.0, group: 'HOME_WIN' },
  { score: '5-2', odds: 41.0, group: 'HOME_WIN' },
  { score: 'HOME_OTHER', odds: 34.0, group: 'HOME_WIN' },
  // ─── 平局 ───
  { score: '0-0', odds: 7.8, group: 'DRAW' },
  { score: '1-1', odds: 5.9, group: 'DRAW' },
  { score: '2-2', odds: 12.0, group: 'DRAW' },
  { score: '3-3', odds: 31.0, group: 'DRAW' },
  { score: '4-4', odds: 67.0, group: 'DRAW' },
  { score: 'DRAW_OTHER', odds: 41.0, group: 'DRAW' },
  // ─── 客胜 ───
  { score: '0-1', odds: 7.2, group: 'AWAY_WIN' },
  { score: '0-2', odds: 10.0, group: 'AWAY_WIN' },
  { score: '1-2', odds: 9.4, group: 'AWAY_WIN' },
  { score: '0-3', odds: 18.0, group: 'AWAY_WIN' },
  { score: '1-3', odds: 15.5, group: 'AWAY_WIN' },
  { score: '2-3', odds: 18.5, group: 'AWAY_WIN' },
  { score: '0-4', odds: 29.0, group: 'AWAY_WIN' },
  { score: '1-4', odds: 27.0, group: 'AWAY_WIN' },
  { score: '2-4', odds: 29.0, group: 'AWAY_WIN' },
  { score: '0-5', odds: 51.0, group: 'AWAY_WIN' },
  { score: '1-5', odds: 46.0, group: 'AWAY_WIN' },
  { score: '2-5', odds: 51.0, group: 'AWAY_WIN' },
  { score: 'AWAY_OTHER', odds: 34.0, group: 'AWAY_WIN' },
];

// 兼容旧代码
export const COMMON_CORRECT_SCORE_KEYS = DEFAULT_CORRECT_SCORE_OPTIONS
  .filter((o) => !o.score.endsWith('_OTHER'))
  .map((o) => o.score);

// "其他"选项的 key 列表
export const OTHER_SCORE_KEYS = ['HOME_OTHER', 'DRAW_OTHER', 'AWAY_OTHER'] as const;

export function isOtherScoreKey(score: string): boolean {
  return OTHER_SCORE_KEYS.includes(score as any);
}

export function getScoreGroup(score: string): ScoreGroup {
  if (score === 'HOME_OTHER') return 'HOME_WIN';
  if (score === 'DRAW_OTHER') return 'DRAW';
  if (score === 'AWAY_OTHER') return 'AWAY_WIN';
  const parsed = parseScoreLabel(score);
  if (!parsed) return 'HOME_WIN'; // fallback
  if (parsed.home > parsed.away) return 'HOME_WIN';
  if (parsed.home === parsed.away) return 'DRAW';
  return 'AWAY_WIN';
}

export function getScoreDisplayLabel(score: string): string {
  if (score === 'HOME_OTHER') return '主胜其他';
  if (score === 'DRAW_OTHER') return '平局其他';
  if (score === 'AWAY_OTHER') return '客胜其他';
  return score;
}

export function mergeCorrectScoreOdds(
  existing: Array<{ score: string; odds: number }> = [],
  fallback = DEFAULT_CORRECT_SCORE_OPTIONS,
) {
  // 过滤掉旧的 "Other" 选项，已被 HOME_OTHER/DRAW_OTHER/AWAY_OTHER 替代
  const filtered = existing.filter((item) => item.score !== 'Other');
  const existingMap = new Map(filtered.map((item) => [item.score, item]));
  const merged = fallback.map((item) => {
    const ex = existingMap.get(item.score);
    return ex ? { score: item.score, odds: ex.odds, group: item.group } : item;
  });
  const remaining = filtered.filter((item) => !fallback.some((preset) => preset.score === item.score));
  return [...merged, ...remaining.map((r) => ({ ...r, group: getScoreGroup(r.score) }))];
}

export function generateDefaultOdds(matchId: string, homeRank?: number, awayRank?: number): MatchOdds {
  // 基于 FIFA 排名的差异化赔率（与 sync.ts 统一）
  let hw = 2.20, d = 3.20, aw = 3.10;
  if (homeRank && awayRank) {
    const diff = awayRank - homeRank; // 正值=主队排名更高
    hw = Math.max(1.10, 2.20 - diff * 0.05);
    aw = Math.max(1.10, 3.10 + diff * 0.05);
    d = Math.max(2.50, 3.20 - Math.abs(diff) * 0.02);
  }
  const h2h = { homeWin: Math.round(hw * 100) / 100, draw: Math.round(d * 100) / 100, awayWin: Math.round(aw * 100) / 100 };

  return {
    matchId,
    h2h,
    correctScore: scaleCorrectScoreOdds(DEFAULT_CORRECT_SCORE_OPTIONS, h2h).map(({ score, odds }) => ({ score, odds })),
    totalGoals: { over25: 1.9, under25: 1.9 },
    lastUpdated: new Date().toISOString(),
    source: 'MANUAL',
    syncStatus: 'MANUAL_FALLBACK',
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * 根据 h2h 隐含概率缩放 correctScore 模板赔率
 * 核心思路：强队主胜比分赔率降低，弱队客胜比分赔率升高
 */
export function scaleCorrectScoreOdds(
  template: ScoreOption[],
  h2h: { homeWin: number; draw: number; awayWin: number },
): ScoreOption[] {
  // 基准隐含概率（模板 h2h: 2.20/3.20/3.10）
  const BASE_IMPLIED = {
    HOME_WIN: 1 / 2.20,   // 0.4545
    DRAW: 1 / 3.20,       // 0.3125
    AWAY_WIN: 1 / 3.10,   // 0.3226
  };

  // 实际隐含概率
  const actualImplied = {
    HOME_WIN: 1 / h2h.homeWin,
    DRAW: 1 / h2h.draw,
    AWAY_WIN: 1 / h2h.awayWin,
  };

  return template.map((option) => {
    const groupKey = option.group;
    const baseProb = BASE_IMPLIED[groupKey];
    const actualProb = actualImplied[groupKey];

    if (!baseProb || !actualProb) return option;

    // 缩放因子：实际概率/基准概率
    const scaleFactor = actualProb / baseProb;

    // 赔率调整：odds_new = odds_base / scaleFactor（概率越高赔率越低）
    const adjustedOdds = Math.max(1.05, option.odds / scaleFactor);

    return {
      ...option,
      odds: Math.round(adjustedOdds * 100) / 100,
    };
  });
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
