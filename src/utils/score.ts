/**
 * 比分显示统一工具
 *
 * 核心策略：homeScore/awayScore 是 90 分钟（含伤停补时）比分，用于竞彩结算。
 * AET（加时赛）/PEN（点球大战）比赛的加时后总比分和点球比分通过独立字段展示，
 * 让用户直观看到竞猜结算依据（90 分钟）与最终赛果（加时/点球）的区别。
 */

export interface ScoreDisplay {
  /** 主比分（90 分钟含伤停补时）— 始终展示 */
  main: string;
  /** 加时赛结束后总比分 — 仅 AET/PEN 展示 */
  sub?: string;
  /** 点球大战比分 — 仅 PEN 展示 */
  penalty?: string;
  /** 状态标签 AET/PEN */
  badge?: string;
  /** 是否进行中 */
  isLive: boolean;
}

interface ScoreSource {
  status: string;
  homeScore?: number;
  awayScore?: number;
  homeScoreAfterExtraTime?: number;
  awayScoreAfterExtraTime?: number;
  homePenaltyScore?: number;
  awayPenaltyScore?: number;
}

/**
 * 构造比分显示结构
 * - FT：main = "X:Y"
 * - AET：main = "X:Y"（90min）+ sub = "加时 A:B" + badge = "AET"
 * - PEN：main = "X:Y"（90min）+ sub = "加时 A:B" + penalty = "点球 C:D" + badge = "PEN"
 */
export function buildScoreDisplay(match: ScoreSource): ScoreDisplay {
  const {
    status,
    homeScore,
    awayScore,
    homeScoreAfterExtraTime,
    awayScoreAfterExtraTime,
    homePenaltyScore,
    awayPenaltyScore,
  } = match;

  const isLive = status === 'LIVE' || status === 'HT';
  const hasScore = typeof homeScore === 'number' && typeof awayScore === 'number';
  const main = hasScore ? `${homeScore} : ${awayScore}` : 'VS';

  if (status === 'AET') {
    const sub =
      typeof homeScoreAfterExtraTime === 'number' && typeof awayScoreAfterExtraTime === 'number'
        ? `加时 ${homeScoreAfterExtraTime} : ${awayScoreAfterExtraTime}`
        : undefined;
    return { main, sub, badge: 'AET', isLive: false };
  }

  if (status === 'PEN') {
    const sub =
      typeof homeScoreAfterExtraTime === 'number' && typeof awayScoreAfterExtraTime === 'number'
        ? `加时 ${homeScoreAfterExtraTime} : ${awayScoreAfterExtraTime}`
        : undefined;
    const penalty =
      typeof homePenaltyScore === 'number' && typeof awayPenaltyScore === 'number'
        ? `点球 ${homePenaltyScore} : ${awayPenaltyScore}`
        : undefined;
    return { main, sub, penalty, badge: 'PEN', isLive: false };
  }

  return { main, isLive };
}

/**
 * 判断比赛是否已结束（含 AET/PEN）
 */
export function isMatchFinished(status: string): boolean {
  return status === 'FT' || status === 'AET' || status === 'PEN';
}

/**
 * 判断比赛是否有可显示比分（非 NS 状态）
 */
export function hasDisplayableScore(status: string, homeScore?: number, awayScore?: number): boolean {
  if (status === 'NS') return false;
  return typeof homeScore === 'number' && typeof awayScore === 'number';
}
