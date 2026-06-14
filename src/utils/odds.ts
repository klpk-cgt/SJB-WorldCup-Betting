import { MatchOdds } from '../types';
import { calculateExpectedGoals } from './elo';

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
  // 基于 Elo + xG 的差异化赔率（与 sync.ts 统一）
  let hw = 2.20, d = 3.20, aw = 3.10;
  if (homeRank && awayRank) {
    const diff = awayRank - homeRank;
    hw = Math.max(1.10, 2.20 - diff * 0.05);
    aw = Math.max(1.10, 3.10 + diff * 0.05);
    d = Math.max(2.50, 3.20 - Math.abs(diff) * 0.02);
  }
  const h2h = { homeWin: Math.round(hw * 100) / 100, draw: Math.round(d * 100) / 100, awayWin: Math.round(aw * 100) / 100 };

  // Poisson + Elo xG 生成比分赔率（兜底时无场地信息，用基础计算）
  const xg = calculateExpectedGoals(homeRank, awayRank);
  const correctScore = generateCorrectScoreOddsFromXG(xg.homeXG, xg.awayXG);
  const totalGoalsArr = generateDefaultTotalGoals(xg.homeXG, xg.awayXG);
  const halfFullTime = generateDefaultHalfFullTime(h2h);

  return {
    matchId,
    h2h,
    correctScore,
    totalGoals: totalGoalsArr,
    totalGoalsLegacy: { over25: 1.9, under25: 1.9 },
    halfFullTime,
    lastUpdated: new Date().toISOString(),
    source: 'MANUAL',
    syncStatus: 'MANUAL_FALLBACK',
    correctScoreSource: 'MANUAL',
    lastSyncedAt: new Date().toISOString(),
  } as MatchOdds;
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

// ─── Poisson Score Matrix ───
// Based on adapted model: https://github.com/awei4004/world-cup-for-math

const MAX_GOALS = 6; // Max goals per team for probability matrix
const BOOKMAKER_MARGIN = 0.08; // 8% margin

/** Single-term Poisson PMF: probability of exactly k goals */
function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * Generate 7×7 score probability matrix using independent Poisson
 * with Dixon-Coles low-score correction (rho=-0.13).
 */
export function poissonScoreMatrix(
  homeXG: number,
  awayXG: number,
): Map<string, number> {
  const rho = -0.13;
  const matrix = new Map<string, number>();

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      let prob = poissonPMF(h, homeXG) * poissonPMF(a, awayXG);

      // Dixon-Coles low-score correction
      if (h === 0 && a === 0) prob *= 1 + rho * homeXG * awayXG;
      else if (h === 0 && a === 1) prob *= 1 - rho * awayXG;
      else if (h === 1 && a === 0) prob *= 1 - rho * homeXG;
      else if (h === 1 && a === 1) prob *= 1 + rho;

      matrix.set(`${h}-${a}`, Math.max(prob, 0));
    }
  }

  // Normalize
  let total = 0;
  for (const p of matrix.values()) total += p;
  if (total > 0) {
    for (const [key, p] of matrix) matrix.set(key, p / total);
  }

  return matrix;
}

/** Aggregate score matrix into total goals distribution for over/under */
export function totalGoalsFromMatrix(
  matrix: Map<string, number>,
): { over25: number; under25: number } {
  let under = 0;
  let over = 0;
  for (const [score, prob] of matrix) {
    const [h, a] = score.split('-').map(Number);
    if (h + a > 2.5) over += prob;
    else under += prob;
  }
  if (!under && !over) return { over25: 1.9, under25: 1.9 };
  return {
    over25: round2(1 / over * (1 - BOOKMAKER_MARGIN)),
    under25: round2(1 / under * (1 - BOOKMAKER_MARGIN)),
  };
}

/**
 * Convert Poisson score matrix to odds for display.
 * Selected high-probability scores + OTHER catch-all per group.
 */
export function generateCorrectScoreOddsFromXG(
  homeXG: number,
  awayXG: number,
): ScoreOption[] {
  const matrix = poissonScoreMatrix(homeXG, awayXG);

  // Sort scores by probability descending
  const sorted = [...matrix.entries()].sort((a, b) => b[1] - a[1]);

  const seen = new Set<string>();
  const result: ScoreOption[] = [];

  // Track group accumulators for OTHER catch-all
  let homeProbSum = 0;
  let drawProbSum = 0;
  let awayProbSum = 0;

  const scoredScores = new Set<string>();

  for (const [score, prob] of sorted) {
    const [h, a] = score.split('-').map(Number);
    let group: ScoreGroup;

    if (h > a) {
      group = 'HOME_WIN';
      homeProbSum += prob;
    } else if (h === a) {
      group = 'DRAW';
      drawProbSum += prob;
    } else {
      group = 'AWAY_WIN';
      awayProbSum += prob;
    }

    // Include top scores (limit total to ~18 entries + 3 OTHER)
    if (result.length < 18 && !seen.has(group + '_top')) {
      result.push({
        score,
        odds: round2(1 / Math.max(prob, 0.001) * (1 - BOOKMAKER_MARGIN)),
        group,
      });
      scoredScores.add(score);
    }
  }

  // Add OTHER fallback for groups that need coverage
  const homeOtherProb = homeProbSum - [...result.filter(r => r.group === 'HOME_WIN')]
    .reduce((s, r) => s + (1 / r.odds / (1 - BOOKMAKER_MARGIN)), 0);

  if (homeOtherProb > 0.005) {
    result.push({
      score: 'HOME_OTHER',
      odds: round2(Math.max(1.05, 1 / Math.max(homeOtherProb, 0.001) * (1 - BOOKMAKER_MARGIN))),
      group: 'HOME_WIN',
    });
  }

  // Sort by group
  result.sort((a, b) => {
    const order = { HOME_WIN: 0, DRAW: 1, AWAY_WIN: 2 };
    return (order[a.group] ?? 0) - (order[b.group] ?? 0);
  });

  return result;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── 竞彩网 API 赔率解析函数 ───

/**
 * 解析竞彩网 CRS 比分赔率
 * sXXsYY → "{XX}-{YY}" key 格式
 * s1sh → "HOME_OTHER", s1sd → "DRAW_OTHER", s1sa → "AWAY_OTHER"
 */
export function parseCrsToScoreOptions(crs: Record<string, string>): Array<{ score: string; odds: number }> {
  const options: Array<{ score: string; odds: number }> = [];
  const ignoredKeys = new Set(['goalLine', 'goalLineValue', 'updateDate', 'updateTime', 'id']);

  // 胜其他/平其他/负其他 映射
  const otherKeyMap: Record<string, string> = {
    s1sh: 'HOME_OTHER',
    s1sd: 'DRAW_OTHER',
    s1sa: 'AWAY_OTHER',
  };

  for (const [key, value] of Object.entries(crs)) {
    if (ignoredKeys.has(key)) continue;

    // sXXsYY 格式的精确比分
    const match = key.match(/^s(\d{2})s(\d{2})$/);
    if (match) {
      const home = parseInt(match[1], 10);
      const away = parseInt(match[2], 10);
      const odds = Number(value);
      if (Number.isFinite(odds) && odds > 0) {
        options.push({ score: `${home}-${away}`, odds });
      }
      continue;
    }

    // 胜/平/负其他
    if (otherKeyMap[key]) {
      const odds = Number(value);
      if (Number.isFinite(odds) && odds > 0) {
        options.push({ score: otherKeyMap[key], odds });
      }
    }
  }

  // 按主胜/平局/客胜分组排序
  return options.sort((a, b) => {
    const order = (s: string) => {
      if (s === 'HOME_OTHER') return -1;
      if (s === 'DRAW_OTHER') return 0;
      if (s === 'AWAY_OTHER') return 1;
      const [h, a] = s.split('-').map(Number);
      if (h > a) return -1;
      if (h === a) return 0;
      return 1;
    };
    return order(a.score) - order(b.score);
  });
}

/**
 * 解析竞彩网 TTG 总进球数赔率
 * s0~s7 → 0球~7+球
 */
export function parseTtgToGoals(ttg: Record<string, string>): Array<{ goals: string; odds: number }> {
  const ignoredKeys = new Set(['goalLine', 'goalLineValue', 'updateDate', 'updateTime']);
  const goalsMap: Record<string, string> = {
    s0: '0', s1: '1', s2: '2', s3: '3',
    s4: '4', s5: '5', s6: '6', s7: '7+',
  };

  const result: Array<{ goals: string; odds: number }> = [];

  for (const [key, value] of Object.entries(ttg)) {
    if (ignoredKeys.has(key) || !goalsMap[key]) continue;
    const odds = Number(value);
    if (Number.isFinite(odds) && odds > 0) {
      result.push({ goals: goalsMap[key], odds });
    }
  }

  // 按进球数升序排列
  result.sort((a, b) => {
    const aNum = a.goals === '7+' ? 7 : parseInt(a.goals, 10);
    const bNum = b.goals === '7+' ? 7 : parseInt(b.goals, 10);
    return aNum - bNum;
  });

  return result;
}

/**
 * 解析竞彩网 HAFU 半全场赔率
 * hh/hd/ha/dh/dd/da/ah/ad/aa → 9项半全场对象
 */
export function parseHafuToHalfFullTime(hafu: Record<string, string>): {
  hh: number; hd: number; ha: number;
  dh: number; dd: number; da: number;
  ah: number; ad: number; aa: number;
} {
  const ignoredKeys = new Set(['goalLine', 'goalLineValue', 'updateDate', 'updateTime', 'id']);
  const parseOddsOrFallback = (key: string, fallback = 3.0): number => {
    const v = hafu[key];
    if (!v) return fallback;
    const n = Number(v);
    return (Number.isFinite(n) && n > 0) ? n : fallback;
  };

  return {
    hh: parseOddsOrFallback('hh'), hd: parseOddsOrFallback('hd', 12.0), ha: parseOddsOrFallback('ha', 25.0),
    dh: parseOddsOrFallback('dh', 5.5), dd: parseOddsOrFallback('dd', 5.0), da: parseOddsOrFallback('da', 7.0),
    ah: parseOddsOrFallback('ah', 30.0), ad: parseOddsOrFallback('ad', 13.0), aa: parseOddsOrFallback('aa', 6.0),
  };
}

/**
 * Elo 降级：生成默认半全场赔率（基于 H2H 概率）
 */
export function generateDefaultHalfFullTime(h2h: { homeWin: number; draw: number; awayWin: number }) {
  const pH = 1 / h2h.homeWin;
  const pD = 1 / h2h.draw;
  const pA = 1 / h2h.awayWin;
  const total = pH + pD + pA;
  const pH2 = pH / total;
  const pD2 = pD / total;
  const pA2 = pA / total;

  const margin = 0.92;

  // 半场×全场概率 = 独立假设(简化)
  const calc = (p1: number, p2: number) => Math.max(1.1, round2(1 / Math.max(p1 * p2, 0.001) * margin));

  return {
    hh: calc(pH2, pH2), hd: calc(pH2, pD2), ha: calc(pH2, pA2),
    dh: calc(pD2, pH2), dd: calc(pD2, pD2), da: calc(pD2, pA2),
    ah: calc(pA2, pH2), ad: calc(pA2, pD2), aa: calc(pA2, pA2),
  };
}

/**
 * Elo 降级：生成默认精确总进球赔率
 */
export function generateDefaultTotalGoals(homeXG: number, awayXG: number): Array<{ goals: string; odds: number }> {
  const totalXG = homeXG + awayXG;
  const margin = 0.92;
  const result: Array<{ goals: string; odds: number }> = [];

  for (let g = 0; g <= 6; g++) {
    const prob = poissonPMF(g, totalXG);
    result.push({ goals: String(g), odds: round2(1 / Math.max(prob, 0.002) * margin) });
  }

  // 7+ = 1 - P(0..6)
  let p06 = 0;
  for (let g = 0; g <= 6; g++) p06 += poissonPMF(g, totalXG);
  result.push({ goals: '7+', odds: round2(1 / Math.max(1 - p06, 0.002) * margin) });

  return result;
}
