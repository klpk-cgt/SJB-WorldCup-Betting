/**
 * Elo Rating System for FIFA World Cup teams.
 * Based on: https://github.com/awei4004/world-cup-for-math
 *
 * Converts FIFA rankings to Elo ratings and calculates
 * expected goals (xG) and win/draw/loss probabilities.
 */
export interface EloResult {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  homeElo: number;
  awayElo: number;
  eloDiff: number;
}

export interface ExpectedGoals {
  homeXG: number;
  awayXG: number;
}

const K_FACTOR = 60;              // World Cup Elo K-factor
const HOME_ADVANTAGE = 100;       // Base home advantage in Elo points
const LEAGUE_AVG_GOALS = 1.35;   // Average goals per team in international football

// ─── FIFA Rank → Elo ───

export function fifaRankToElo(rank?: number): number {
  if (!rank || rank <= 0) return 1500;
  return Math.max(2150 - (rank - 1) * 10, 1200);
}

// ─── Home Advantage ───

export function getHomeBonus(
  isHost: boolean,
  hostCountry: string,
  matchCountry: string,
  confederation: string,
): number {
  if (isHost) {
    if (matchCountry.toUpperCase() === hostCountry.toUpperCase()) return 100; // L1
    if (['USA', 'CAN', 'MEX'].includes(matchCountry.toUpperCase())) return 50; // L2
    return 30; // L3 regional
  }
  if (confederation === 'CONCACAF') return 30;
  return 0;
}

// ─── Win Probability ───

export function expectedResult(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

export function winProbability(
  eloHome: number,
  eloAway: number,
  homeBonus: number = 0,
): EloResult {
  const adjustedHome = eloHome + HOME_ADVANTAGE + homeBonus;
  const diff = adjustedHome - eloAway;

  // Home win from Elo
  const pHome = expectedResult(adjustedHome, eloAway);

  // Draw probability peaks at 28% when teams are equal
  const drawPeak = 0.28;
  const drawSigma = 200;
  const pDraw = drawPeak * Math.exp(-(diff * diff) / (2 * drawSigma * drawSigma));

  const homeWinProb = pHome * (1 - pDraw);
  const awayWinProb = 1 - homeWinProb - pDraw;

  return {
    homeWinProb: Math.max(0, homeWinProb),
    drawProb: Math.max(0, pDraw),
    awayWinProb: Math.max(0, awayWinProb),
    homeElo: adjustedHome,
    awayElo: eloAway,
    eloDiff: diff,
  };
}

// ─── Expected Goals (xG) ───

export function expectedGoals(
  eloTeam: number,
  eloOpponent: number,
  homeBonus: number = 0,
): number {
  const effective = eloTeam + homeBonus;
  const diff = effective - eloOpponent;

  // Linear xG: every 100 Elo ≈ +0.25 xG
  let xg = LEAGUE_AVG_GOALS + diff / 400;

  // Diminishing returns above 2.5 xG
  if (xg > 2.5) xg = 2.5 + (xg - 2.5) * 0.3;
  if (xg > 3.5) xg = 3.5; // Hard cap

  return Math.max(xg, 0.15);
}

export function calculateExpectedGoals(
  homeRank: number | undefined,
  awayRank: number | undefined,
  isHomeHost: boolean = false,
  hostCountry: string = '',
  matchCountry: string = '',
  homeConfederation: string = '',
): ExpectedGoals {
  const homeElo = fifaRankToElo(homeRank);
  const awayElo = fifaRankToElo(awayRank);
  const homeBonus = getHomeBonus(isHomeHost, hostCountry, matchCountry, homeConfederation);

  return {
    homeXG: expectedGoals(homeElo, awayElo, homeBonus),
    awayXG: expectedGoals(awayElo, homeElo, 0),
  };
}

// ─── Post-match Elo update ───

export function updateElo(
  winnerElo: number,
  loserElo: number,
  goalDiff: number,
  isDraw: boolean = false,
): { newWinner: number; newLoser: number } {
  const expected = expectedResult(winnerElo, loserElo);

  if (isDraw) {
    const transfer = K_FACTOR * 0.5 * (0.5 - expected);
    return {
      newWinner: Math.round((winnerElo + transfer) * 10) / 10,
      newLoser: Math.round((loserElo - transfer) * 10) / 10,
    };
  }

  const margin = Math.sqrt(Math.min(Math.abs(goalDiff), 4));
  const transfer = K_FACTOR * margin * (1 - expected);

  return {
    newWinner: Math.round((winnerElo + transfer) * 10) / 10,
    newLoser: Math.round((loserElo - transfer * 0.85) * 10) / 10,
  };
}
