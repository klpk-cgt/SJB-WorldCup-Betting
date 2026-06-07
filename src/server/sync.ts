import { DatabaseSchema } from '../db/db_service';
import { Match, MatchOdds, MatchStatus, SyncLog, SyncProvider, SyncStatus, SyncType, Team } from '../types';

// ── 默认赔率生成 ──
export function generateDefaultOdds(matchId: string, homeRank?: number, awayRank?: number): MatchOdds {
  // 基于FIFA排名的差异化赔率
  let hw = 2.20, d = 3.20, aw = 3.10;
  if (homeRank && awayRank) {
    const diff = awayRank - homeRank; // 正值=主队排名更高
    hw = Math.max(1.10, 2.20 - diff * 0.05);
    aw = Math.max(1.10, 3.10 + diff * 0.05);
    d = Math.max(2.50, 3.20 - Math.abs(diff) * 0.02);
  }
  return {
    matchId,
    h2h: { homeWin: Math.round(hw * 100) / 100, draw: Math.round(d * 100) / 100, awayWin: Math.round(aw * 100) / 100 },
    correctScore: [
      { score: '1-0', odds: 6.50 },
      { score: '2-0', odds: 8.00 },
      { score: '2-1', odds: 8.50 },
      { score: '0-0', odds: 8.00 },
      { score: '1-1', odds: 6.00 },
      { score: 'Other', odds: 12.0 },
    ],
    totalGoals: { over25: 1.90, under25: 1.90 },
    lastUpdated: new Date().toISOString(),
    source: 'MANUAL',
    syncStatus: 'MANUAL_FALLBACK',
    lastSyncedAt: new Date().toISOString(),
  };
}

/** 为所有缺少赔率的已确定比赛生成默认赔率 */
export function ensureDefaultOdds(db: DatabaseSchema): string[] {
  const filled: string[] = [];
  const teamMap = new Map(db.teams.map(t => [t.id, t]));
  for (const match of db.matches) {
    if (match.homeTeamId === 'TBD' || match.awayTeamId === 'TBD') continue;
    if (!db.matchOdds[match.id]) {
      const home = teamMap.get(match.homeTeamId);
      const away = teamMap.get(match.awayTeamId);
      db.matchOdds[match.id] = generateDefaultOdds(match.id, home?.fifaRank, away?.fifaRank);
      filled.push(match.id);
    }
  }
  return filled;
}

// ── 带超时和重试的 fetch ──
const EXTERNAL_API_TIMEOUT_MS = 15_000; // 外部 API 请求超时 15 秒

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, delayMs = 1000): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT_MS);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.status === 429) {
        // Rate limited — wait longer
        const retryAfter = Number(res.headers.get('Retry-After')) || 5;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildTeamAliases(team: Team) {
  return [team.id, team.code, team.name, team.nameZh].map((value) => normalizeName(String(value || '')));
}

function matchByTeams(db: DatabaseSchema, homeName: string, awayName: string) {
  const homeNormalized = normalizeName(homeName);
  const awayNormalized = normalizeName(awayName);

  return db.matches.find((match) => {
    const homeTeam = db.teams.find((team) => team.id === match.homeTeamId);
    const awayTeam = db.teams.find((team) => team.id === match.awayTeamId);
    if (!homeTeam || !awayTeam) return false;

    const homeAliases = buildTeamAliases(homeTeam);
    const awayAliases = buildTeamAliases(awayTeam);
    return homeAliases.includes(homeNormalized) && awayAliases.includes(awayNormalized);
  });
}

function toMatchStatus(shortStatus?: string): MatchStatus {
  if (!shortStatus) return MatchStatus.NS;
  if (['1H', '2H', 'ET', 'BT', 'LIVE'].includes(shortStatus)) return MatchStatus.LIVE;
  if (shortStatus === 'HT') return MatchStatus.HT;
  if (['FT', 'AET', 'PEN'].includes(shortStatus)) return shortStatus as MatchStatus;
  if (['PST', 'CANC', 'ABD'].includes(shortStatus)) return MatchStatus.CANCELLED;
  return MatchStatus.NS;
}

function buildLog(params: {
  source: SyncProvider;
  action: string;
  syncType: SyncType;
  status: SyncStatus;
  requestSummary: string;
  responseSummary: string;
  targetMatchId?: string;
  targetDate?: string;
  errorMessage?: string;
  startedAt: string;
}) {
  return {
    id: `sync-${Math.random().toString(36).slice(2, 10)}`,
    source: params.source,
    action: params.action,
    syncType: params.syncType,
    status: params.status,
    requestSummary: params.requestSummary,
    responseSummary: params.responseSummary,
    targetMatchId: params.targetMatchId,
    targetDate: params.targetDate,
    errorMessage: params.errorMessage,
    startedAt: params.startedAt,
    finishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  } satisfies SyncLog;
}

function buildOddsSyncStatus(hasCorrectScore: boolean, hasTotals: boolean) {
  if (hasCorrectScore && hasTotals) {
    return 'SYNCED' as const;
  }
  return 'PARTIAL' as const;
}

export async function syncFixturesForDay(params: {
  apiKey: string;
  date: string;
  db: DatabaseSchema;
}): Promise<{ updatedMatches: Match[]; log: SyncLog }> {
  const { apiKey, date, db } = params;
  const startedAt = new Date().toISOString();

  if (!apiKey) {
    return {
      updatedMatches: [],
      log: buildLog({
        source: 'API-Football',
        action: 'Sync fixtures by date',
        syncType: 'fixtures',
        status: 'FAILED',
        requestSummary: `GET /fixtures?date=${date}`,
        responseSummary: 'No API_FOOTBALL_KEY configured.',
        targetDate: date,
        errorMessage: 'API_FOOTBALL_KEY missing',
        startedAt,
      }),
    };
  }

  try {
    const response = await fetchWithRetry(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`API-Football request failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      response?: Array<{
        fixture: {
          id: number;
          date: string;
          status?: { short?: string };
          venue?: { name?: string; city?: string };
        };
        league?: { round?: string };
        teams?: {
          home?: { name?: string };
          away?: { name?: string };
        };
        goals?: {
          home?: number | null;
          away?: number | null;
        };
        score?: {
          penalty?: { home?: number | null; away?: number | null };
        };
      }>;
    };

    const updatedMatches: Match[] = [];
    for (const item of payload.response || []) {
      const localMatch = matchByTeams(db, item.teams?.home?.name || '', item.teams?.away?.name || '');
      if (!localMatch) {
        continue;
      }

      localMatch.providerMeta = {
        ...(localMatch.providerMeta || {}),
        apiFootballFixtureId: item.fixture.id,
        lastFixturesSyncAt: new Date().toISOString(),
      };
      localMatch.startTimeUtc = item.fixture.date || localMatch.startTimeUtc;
      localMatch.status = toMatchStatus(item.fixture.status?.short);
      localMatch.venueName = item.fixture.venue?.name || localMatch.venueName;
      localMatch.venueCity = item.fixture.venue?.city || localMatch.venueCity;
      localMatch.homeScore = item.goals?.home ?? localMatch.homeScore;
      localMatch.awayScore = item.goals?.away ?? localMatch.awayScore;
      localMatch.homePenaltyScore = item.score?.penalty?.home ?? localMatch.homePenaltyScore;
      localMatch.awayPenaltyScore = item.score?.penalty?.away ?? localMatch.awayPenaltyScore;
      updatedMatches.push(localMatch);
    }

    return {
      updatedMatches,
      log: buildLog({
        source: 'API-Football',
        action: 'Sync fixtures by date',
        syncType: 'fixtures',
        status: updatedMatches.length > 0 ? 'SUCCESS' : 'PARTIAL',
        requestSummary: `GET /fixtures?date=${date}`,
        responseSummary: `Matched and updated ${updatedMatches.length} local matches for ${date}.`,
        targetDate: date,
        startedAt,
      }),
    };
  } catch (error) {
    return {
      updatedMatches: [],
      log: buildLog({
        source: 'API-Football',
        action: 'Sync fixtures by date',
        syncType: 'fixtures',
        status: 'FAILED',
        requestSummary: `GET /fixtures?date=${date}`,
        responseSummary: 'Failed to sync fixtures.',
        targetDate: date,
        errorMessage: error instanceof Error ? error.message : 'Unknown sync error',
        startedAt,
      }),
    };
  }
}

export async function syncOddsForMatches(params: {
  apiKey: string;
  db: DatabaseSchema;
  targetMatchId?: string;
}): Promise<{ updatedMatchIds: string[]; oddsMap: Record<string, MatchOdds>; log: SyncLog }> {
  const { apiKey, db, targetMatchId } = params;
  const startedAt = new Date().toISOString();

  if (!apiKey) {
    return {
      updatedMatchIds: [],
      oddsMap: db.matchOdds,
      log: buildLog({
        source: 'The Odds API',
        action: targetMatchId ? 'Sync odds for match' : 'Sync world cup odds',
        syncType: 'odds',
        status: 'FAILED',
        requestSummary: 'GET /v4/sports/soccer_fifa_world_cup/odds',
        responseSummary: 'No THE_ODDS_API_KEY configured.',
        targetMatchId,
        errorMessage: 'THE_ODDS_API_KEY missing',
        startedAt,
      }),
    };
  }

  try {
    const response = await fetchWithRetry(
      'https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?regions=eu&markets=h2h,totals,correct_score&oddsFormat=decimal&apiKey=' +
        encodeURIComponent(apiKey),
      {},
    );
    if (!response.ok) {
      throw new Error(`The Odds API request failed (${response.status})`);
    }

    const payload = (await response.json()) as Array<{
      id: string;
      home_team: string;
      away_team: string;
      bookmakers?: Array<{
        markets?: Array<{
          key: string;
          outcomes?: Array<{ name: string; price: number; point?: number; description?: string }>;
        }>;
      }>;
    }>;

    const updatedMatchIds: string[] = [];
    for (const item of payload || []) {
      const match = matchByTeams(db, item.home_team, item.away_team);
      if (!match) {
        continue;
      }
      if (targetMatchId && match.id !== targetMatchId) {
        continue;
      }

      const bookmaker = item.bookmakers?.[0];
      const h2hMarket = bookmaker?.markets?.find((market) => market.key === 'h2h');
      const totalsMarket = bookmaker?.markets?.find((market) => market.key === 'totals');
      const scoreMarket = bookmaker?.markets?.find((market) => market.key === 'correct_score');

      const homeWin = h2hMarket?.outcomes?.find((outcome) => normalizeName(outcome.name) === normalizeName(item.home_team))?.price;
      const draw = h2hMarket?.outcomes?.find((outcome) => normalizeName(outcome.name) === 'draw')?.price;
      const awayWin = h2hMarket?.outcomes?.find((outcome) => normalizeName(outcome.name) === normalizeName(item.away_team))?.price;
      const over25 = totalsMarket?.outcomes?.find((outcome) => outcome.name.toLowerCase().includes('over'))?.price;
      const under25 = totalsMarket?.outcomes?.find((outcome) => outcome.name.toLowerCase().includes('under'))?.price;

      if (!homeWin || !draw || !awayWin) {
        continue;
      }

      db.matchOdds[match.id] = {
        matchId: match.id,
        h2h: { homeWin, draw, awayWin },
        totalGoals: {
          over25: over25 || db.matchOdds[match.id]?.totalGoals.over25 || 1.9,
          under25: under25 || db.matchOdds[match.id]?.totalGoals.under25 || 1.9,
        },
        correctScore:
          scoreMarket?.outcomes
            .map((outcome) => ({
              score: outcome.name,
              odds: outcome.price,
            })) || db.matchOdds[match.id]?.correctScore || [],
        qualify: db.matchOdds[match.id]?.qualify,
        lastUpdated: new Date().toISOString(),
        source: 'The Odds API',
        syncStatus: buildOddsSyncStatus(Boolean(scoreMarket?.outcomes?.length), Boolean(over25 && under25)),
        lastSyncedAt: new Date().toISOString(),
      };
      match.providerMeta = {
        ...(match.providerMeta || {}),
        oddsEventId: item.id,
        lastOddsSyncAt: new Date().toISOString(),
      };
      updatedMatchIds.push(match.id);
    }

    return {
      updatedMatchIds,
      oddsMap: db.matchOdds,
      log: buildLog({
        source: 'The Odds API',
        action: targetMatchId ? 'Sync odds for match' : 'Sync world cup odds',
        syncType: 'odds',
        status: updatedMatchIds.length > 0 ? 'SUCCESS' : 'PARTIAL',
        requestSummary: 'GET /v4/sports/soccer_fifa_world_cup/odds',
        responseSummary: `Updated odds for ${updatedMatchIds.length} matches.`,
        targetMatchId,
        startedAt,
      }),
    };
  } catch (error) {
    return {
      updatedMatchIds: [],
      oddsMap: db.matchOdds,
      log: buildLog({
        source: 'The Odds API',
        action: targetMatchId ? 'Sync odds for match' : 'Sync world cup odds',
        syncType: 'odds',
        status: 'FAILED',
        requestSummary: 'GET /v4/sports/soccer_fifa_world_cup/odds',
        responseSummary: 'Failed to sync odds.',
        targetMatchId,
        errorMessage: error instanceof Error ? error.message : 'Unknown sync error',
        startedAt,
      }),
    };
  }
}
