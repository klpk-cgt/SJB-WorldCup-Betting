import { DatabaseSchema } from '../db/db_service';
import { Match, MatchOdds, MatchStatus, SyncLog, SyncProvider, SyncStatus, SyncType, Team } from '../types';
import { generateDefaultOdds, mergeCorrectScoreOdds, DEFAULT_CORRECT_SCORE_OPTIONS, generateCorrectScoreOddsFromXG } from '../utils/odds';
import { calculateExpectedGoals } from '../utils/elo';
import { broadcastScoreUpdate, broadcastOddsChange } from './websocket';

// ── 默认赔率生成（委托给 utils/odds.ts 统一版本） ──
export { generateDefaultOdds };

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

async function fetchWithRetry(url: string, options: RequestInit, retries = 1, delayMs = 1000): Promise<Response> {
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

export function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

export const TEAM_NAME_ALIASES: Record<string, string[]> = {
  USA: ['united states', 'usa'],
  KOR: ['south korea', 'korea republic', 'republic of korea', 'korea'],
  CUR: ['curacao', 'curaçao'],
  CIV: ["cote d'ivoire", 'cote divoire', "côte d'ivoire", 'ivory coast'],
  BIH: ['bosnia and herzegovina', 'bosnia-herzegovina', 'bosnia'],
  CPV: ['cape verde', 'cabo verde'],
  COD: ['dr congo', 'democratic republic of congo', 'congo dr', 'congo-kinshasa'],
  CZE: ['czech republic', 'czechia'],
  RSA: ['south africa', 'south africa republic', 'bafana bafana'],
  MEX: ['mexico', 'el tri'],
};

export function buildTeamAliases(team: Team) {
  return [
    team.id,
    team.code,
    team.name,
    team.nameZh,
    ...(TEAM_NAME_ALIASES[team.id] || []),
  ]
    .map((value) => normalizeName(String(value || '')))
    .filter(Boolean);
}

export function resolveTeamByExternalName(db: DatabaseSchema, teamName: string) {
  const normalized = normalizeName(teamName);
  if (!normalized) return null;
  return db.teams.find((team) => buildTeamAliases(team).includes(normalized)) || null;
}

function matchByTeams(db: DatabaseSchema, homeName: string, awayName: string) {
  const homeTeam = resolveTeamByExternalName(db, homeName);
  const awayTeam = resolveTeamByExternalName(db, awayName);
  if (!homeTeam || !awayTeam) return null;

  return db.matches.find((match) => {
    return match.homeTeamId === homeTeam.id && match.awayTeamId === awayTeam.id;
  });
}

function buildFixtureMatchId(date: string, fixtureId: number, homeTeamId: string, awayTeamId: string) {
  return `fx-${date}-${homeTeamId}-${awayTeamId}-${fixtureId}`;
}

function formatBeijingTime(utcDate: string) {
  const date = new Date(new Date(utcDate).getTime() + 8 * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:00`;
}

function mapRoundToStage(round?: string): Match['stage'] {
  const normalized = String(round || '').toLowerCase();
  if (normalized.includes('round of 32')) return 'Round of 32';
  if (normalized.includes('round of 16')) return 'Round of 16';
  if (normalized.includes('quarter')) return 'Quarter-finals';
  if (normalized.includes('semi')) return 'Semi-finals';
  if (normalized.includes('third')) return 'Third-place play-off';
  if (normalized.includes('final')) return 'Final';
  return 'Group Stage';
}

function buildRoundName(round?: string) {
  return String(round || '').trim() || 'Group Stage';
}

function buildWindowDates(anchorDate = new Date(), pastDays = 1, futureDays = 10) {
  const dates: string[] = [];
  for (let offset = -pastDays; offset <= futureDays; offset += 1) {
    const date = new Date(anchorDate);
    date.setUTCDate(date.getUTCDate() + offset);
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
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
}): Promise<{ updatedMatches: Match[]; createdMatches: Match[]; log: SyncLog }> {
  const { apiKey, date, db } = params;
  const startedAt = new Date().toISOString();

  if (!apiKey) {
    return {
      updatedMatches: [],
      createdMatches: [],
      log: buildLog({
        source: 'API-Football',
        action: '按日期同步赛程',
        syncType: 'fixtures',
        status: 'FAILED',
        requestSummary: `GET /fixtures?date=${date}`,
        responseSummary: '未配置 API_FOOTBALL_KEY，无法同步。',
        targetDate: date,
        errorMessage: 'API_FOOTBALL_KEY 缺失',
        startedAt,
      }),
    };
  }

  try {
    // 优先带 league=1（世界杯）+ season 过滤，减少非世界杯赛事拉取，节省配额
    const urlWithLeague = `https://v3.football.api-sports.io/fixtures?date=${date}&league=1&season=2026`;
    const response = await fetchWithRetry(urlWithLeague, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });
    if (!response.ok) {
      throw new Error(`API-Football request failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      get?: string;
      parameters?: Record<string, unknown>;
      errors?: Array<{ message?: string }> | Record<string, string> | null;
      results?: number;
      paging?: { current?: number; total?: number };
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

    // 提取 API 错误信息（区分"请求成功但无赛事"和"API 返回错误"）
    const apiErrors = payload.errors;
    const hasApiError = apiErrors
      ? Array.isArray(apiErrors)
        ? apiErrors.length > 0
        : Object.keys(apiErrors).length > 0
      : false;
    const apiErrorDetail = hasApiError ? `API错误: ${JSON.stringify(apiErrors)}` : '';
    const apiResultsCount = payload.results ?? payload.response?.length ?? 0;

    // 若带 league 过滤返回 0 场且无 API 错误，fallback 一次不带 league 的请求做兜底
    let effectivePayload = payload;
    let usedFallback = false;
    if ((payload.response?.length || 0) === 0 && !hasApiError) {
      try {
        const fallbackUrl = `https://v3.football.api-sports.io/fixtures?date=${date}`;
        const fallbackResponse = await fetchWithRetry(fallbackUrl, {
          headers: { 'x-apisports-key': apiKey },
        });
        if (fallbackResponse.ok) {
          const fallbackPayload = await fallbackResponse.json();
          if ((fallbackPayload?.response?.length || 0) > 0) {
            effectivePayload = fallbackPayload;
            usedFallback = true;
          }
        }
      } catch {
        // fallback 失败不中断主流程，按 0 场处理
      }
    }

    const updatedMatches: Match[] = [];
    const createdMatches: Match[] = [];
    let unmatchedTeams = 0;
    for (const item of effectivePayload.response || []) {
      const homeName = item.teams?.home?.name || '';
      const awayName = item.teams?.away?.name || '';
      const homeTeam = resolveTeamByExternalName(db, homeName);
      const awayTeam = resolveTeamByExternalName(db, awayName);

      if (!homeTeam || !awayTeam) {
        unmatchedTeams += 1;
        continue;
      }

      const kickoff = item.fixture.date || new Date(`${date}T00:00:00.000Z`).toISOString();
      let localMatch =
        db.matches.find((match) => match.providerMeta?.apiFootballFixtureId === item.fixture.id) ||
        db.matches.find(
          (match) =>
            match.homeTeamId === homeTeam.id &&
            match.awayTeamId === awayTeam.id &&
            match.startTimeUtc.slice(0, 10) === kickoff.slice(0, 10),
        ) ||
        matchByTeams(db, homeName, awayName);

      if (!localMatch) {
        localMatch = {
          id: buildFixtureMatchId(date, item.fixture.id, homeTeam.id, awayTeam.id),
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          stage: mapRoundToStage(item.league?.round),
          roundName: buildRoundName(item.league?.round),
          venueName: item.fixture.venue?.name || '',
          venueCity: item.fixture.venue?.city || '',
          startTimeUtc: kickoff,
          startTimeBeijing: formatBeijingTime(kickoff),
          status: toMatchStatus(item.fixture.status?.short),
          homeScore: item.goals?.home ?? undefined,
          awayScore: item.goals?.away ?? undefined,
          homePenaltyScore: item.score?.penalty?.home ?? undefined,
          awayPenaltyScore: item.score?.penalty?.away ?? undefined,
          isOddsFrozen: false,
          isPredictionLocked: false,
          isSettled: false,
          autoLockAt: new Date(new Date(kickoff).getTime() - 5 * 60 * 1000).toISOString(),
          operationalStatus: 'BETTABLE',
          settlementStatus: 'PENDING',
          providerMeta: {
            apiFootballFixtureId: item.fixture.id,
            lastFixturesSyncAt: new Date().toISOString(),
          },
        };
        db.matches.push(localMatch);
        createdMatches.push(localMatch);
      }

      localMatch.providerMeta = {
        ...(localMatch.providerMeta || {}),
        apiFootballFixtureId: item.fixture.id,
        lastFixturesSyncAt: new Date().toISOString(),
      };
      const previousHomeScore = localMatch.homeScore;
      const previousAwayScore = localMatch.awayScore;
      const previousStatus = localMatch.status;
      localMatch.stage = mapRoundToStage(item.league?.round) || localMatch.stage;
      localMatch.roundName = buildRoundName(item.league?.round) || localMatch.roundName;
      localMatch.startTimeUtc = kickoff;
      localMatch.startTimeBeijing = formatBeijingTime(kickoff);
      localMatch.status = toMatchStatus(item.fixture.status?.short);
      localMatch.venueName = item.fixture.venue?.name || localMatch.venueName;
      localMatch.venueCity = item.fixture.venue?.city || localMatch.venueCity;
      localMatch.homeScore = item.goals?.home ?? localMatch.homeScore;
      localMatch.awayScore = item.goals?.away ?? localMatch.awayScore;
      localMatch.homePenaltyScore = item.score?.penalty?.home ?? localMatch.homePenaltyScore;
      localMatch.awayPenaltyScore = item.score?.penalty?.away ?? localMatch.awayPenaltyScore;
      if (
        (previousHomeScore !== localMatch.homeScore ||
          previousAwayScore !== localMatch.awayScore ||
          previousStatus !== localMatch.status) &&
        localMatch.status !== MatchStatus.NS &&
        typeof localMatch.homeScore === 'number' &&
        typeof localMatch.awayScore === 'number'
      ) {
        broadcastScoreUpdate(localMatch.id, localMatch.homeScore, localMatch.awayScore, localMatch.status);
      }
      updatedMatches.push(localMatch);
    }

    const fixtureCount = effectivePayload.response?.length || 0;
    const requestUrl = usedFallback
      ? `GET /fixtures?date=${date} (fallback: 无league过滤)`
      : `GET /fixtures?date=${date}&league=1&season=2026`;

    // 区分"确无赛事"和"API错误"
    if (fixtureCount === 0) {
      const status = hasApiError ? 'FAILED' : 'PARTIAL';
      const responseSummary = hasApiError
        ? `API报告${apiResultsCount}场，但返回错误。${apiErrorDetail}`
        : `该日期确无世界杯赛事（API报告${apiResultsCount}场）${usedFallback ? '，已尝试fallback仍为0' : ''}`;
      return {
        updatedMatches: [],
        createdMatches: [],
        log: buildLog({
          source: 'API-Football',
          action: '按日期同步赛程',
          syncType: 'fixtures',
          status,
          requestSummary: requestUrl,
          responseSummary,
          targetDate: date,
          errorMessage: hasApiError ? apiErrorDetail : undefined,
          startedAt,
        }),
      };
    }

    return {
      updatedMatches,
      createdMatches,
      log: buildLog({
        source: 'API-Football',
        action: '按日期同步赛程',
        syncType: 'fixtures',
        status: updatedMatches.length > 0 || createdMatches.length > 0 ? 'SUCCESS' : 'PARTIAL',
        requestSummary: requestUrl,
        responseSummary: `共获取${fixtureCount}场赛事（API报告${apiResultsCount}场${usedFallback ? '，fallback' : ''}），更新${updatedMatches.length}场，新建${createdMatches.length}场，未匹配队伍${unmatchedTeams}支`,
        targetDate: date,
        startedAt,
      }),
    };
  } catch (error) {
    return {
      updatedMatches: [],
      createdMatches: [],
      log: buildLog({
        source: 'API-Football',
        action: '按日期同步赛程',
        syncType: 'fixtures',
        status: 'FAILED',
        requestSummary: `GET /fixtures?date=${date}&league=1&season=2026`,
        responseSummary: '同步赛程失败。',
        targetDate: date,
        errorMessage: error instanceof Error ? error.message : '未知同步错误',
        startedAt,
      }),
    };
  }
}

export async function syncFixturesForDateWindow(params: {
  apiKey: string;
  db: DatabaseSchema;
  anchorDate?: string;
  pastDays?: number;
  futureDays?: number;
}): Promise<{ updatedMatches: Match[]; createdMatches: Match[]; dates: string[]; log: SyncLog }> {
  const { apiKey, db, anchorDate, pastDays = 5, futureDays = 5 } = params; // 过去5天+未来5天（覆盖小组赛周期）
  const startedAt = new Date().toISOString();
  const anchor = anchorDate ? new Date(`${anchorDate}T00:00:00.000Z`) : new Date();
  const dates = buildWindowDates(anchor, pastDays, futureDays);
  const updatedMatches: Match[] = [];
  const createdMatches: Match[] = [];
  const statuses: SyncStatus[] = [];
  const summaries: string[] = [];

  for (const date of dates) {
    const result = await syncFixturesForDay({ apiKey, date, db });
    statuses.push(result.log.status);
    summaries.push(`${date}: ${result.log.responseSummary}`);
    updatedMatches.push(...result.updatedMatches);
    createdMatches.push(...result.createdMatches);
  }

  const uniqueUpdated = Array.from(new Map(updatedMatches.map((match) => [match.id, match])).values());
  const uniqueCreated = Array.from(new Map(createdMatches.map((match) => [match.id, match])).values());
  const hasFailure = statuses.includes('FAILED');
  const hasSuccess = statuses.includes('SUCCESS');
  const status: SyncStatus = hasFailure ? (hasSuccess ? 'PARTIAL' : 'FAILED') : hasSuccess ? 'SUCCESS' : 'PARTIAL';

  return {
    updatedMatches: uniqueUpdated,
    createdMatches: uniqueCreated,
    dates,
    log: buildLog({
      source: 'API-Football',
      action: '按日期窗口同步赛程',
      syncType: 'fixtures',
      status,
      requestSummary: `GET /fixtures?date=<窗口 ${dates[0]}..${dates[dates.length - 1]}>`,
      responseSummary: `窗口共${dates.length}天，更新${uniqueUpdated.length}场，新建${uniqueCreated.length}场。${summaries.join(' | ')}`,
      targetDate: dates[0],
      startedAt,
      errorMessage: status === 'FAILED' ? '当前窗口内所有赛程同步均失败。' : undefined,
    }),
  };
}

export async function syncOddsForMatches(params: {
  apiKey: string;
  db: DatabaseSchema;
  targetMatchId?: string;
}): Promise<{
  updatedMatchIds: string[];
  unsyncedMatchIds: string[];
  unsyncedReasons: Record<string, string>;
  oddsMap: Record<string, MatchOdds>;
  log: SyncLog;
}> {
  const { apiKey, db, targetMatchId } = params;
  const startedAt = new Date().toISOString();

  if (!apiKey) {
    return {
      updatedMatchIds: [],
      unsyncedMatchIds: [],
      unsyncedReasons: {},
      oddsMap: db.matchOdds,
      log: buildLog({
        source: 'The Odds API',
        action: targetMatchId ? '同步单场赔率' : '同步世界杯赔率',
        syncType: 'odds',
        status: 'FAILED',
        requestSummary: 'GET /v4/sports/soccer_fifa_world_cup/odds',
        responseSummary: '未配置 THE_ODDS_API_KEY，无法同步。',
        targetMatchId,
        errorMessage: 'THE_ODDS_API_KEY 缺失',
        startedAt,
      }),
    };
  }

  try {
    const response = await fetchWithRetry(
      'https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?regions=eu&markets=h2h,totals&oddsFormat=decimal&apiKey=' +
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
    const unsyncedMatchIds: string[] = [];
    const unsyncedReasons: Record<string, string> = {};
    let unmatchedEvents = 0;
    let incompleteMarkets = 0;
    const candidateMatches = db.matches.filter((match) => {
      if (targetMatchId && match.id !== targetMatchId) return false;
      return match.homeTeamId !== 'TBD' && match.awayTeamId !== 'TBD';
    });

    const markMatchUnsynced = (matchId: string, reason: string) => {
      if (!unsyncedReasons[matchId]) {
        unsyncedReasons[matchId] = reason;
        unsyncedMatchIds.push(matchId);
      }

      const existing = db.matchOdds[matchId];
      if (!existing) return;

      existing.syncStatus = 'UNSYNCED';
      existing.lastSyncedAt = new Date().toISOString();
      existing.correctScoreSource =
        existing.correctScoreSource ||
        (existing.source === 'The Odds API' ? 'INFERRED_FROM_H2H' : 'MANUAL');
    };

    for (const item of payload || []) {
      const match = matchByTeams(db, item.home_team, item.away_team);
      if (!match) {
        unmatchedEvents += 1;
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
        incompleteMarkets += 1;
        continue;
      }

      // 记录旧赔率用于 WebSocket 推送对比
      const oldOdds = db.matchOdds[match.id];
      const newH2h = { homeWin, draw, awayWin };

      // 基于 Poisson + Elo xG 生成比分赔率（API 不支持 correct_score）
      const homeTeam = db.teams.find(t => t.id === match.homeTeamId);
      const awayTeam = db.teams.find(t => t.id === match.awayTeamId);
      const xg = calculateExpectedGoals(
        homeTeam?.fifaRank, awayTeam?.fifaRank,
        homeTeam?.confederation === 'CONCACAF',
        homeTeam?.code || '', match.venueCity || '',
        homeTeam?.confederation || '',
      );
      const poissonCorrectScore = generateCorrectScoreOddsFromXG(xg.homeXG, xg.awayXG);

      const existingOdds = db.matchOdds[match.id];
      // The Odds API 只提供 over/under 2.5，作为辅助数据源不覆盖竞彩网精细数据
      const theOddsTotalGoalsLegacy = {
        over25: over25 || existingOdds?.totalGoalsLegacy?.over25 || 1.9,
        under25: under25 || existingOdds?.totalGoalsLegacy?.under25 || 1.9,
      };

      // 如果竞彩网已提供精确总进球赔率，保留之
      const hasSportteryTotalGoals = Array.isArray(existingOdds?.totalGoals) && existingOdds!.totalGoals.length >= 2;
      const preservedTotalGoals = hasSportteryTotalGoals
        ? existingOdds!.totalGoals
        : existingOdds?.totalGoals || [
            { goals: '3-', odds: theOddsTotalGoalsLegacy.under25 },
            { goals: '3+', odds: theOddsTotalGoalsLegacy.over25 },
          ];

      db.matchOdds[match.id] = {
        matchId: match.id,
        h2h: newH2h,
        totalGoals: preservedTotalGoals,
        totalGoalsLegacy: theOddsTotalGoalsLegacy,
        correctScore: mergeCorrectScoreOdds(
          poissonCorrectScore,
          DEFAULT_CORRECT_SCORE_OPTIONS,
        ).map(({ score, odds }) => ({ score, odds })),
        qualify: existingOdds?.qualify,
        handicap: existingOdds?.handicap,
        halfFullTime: existingOdds?.halfFullTime,
        lastUpdated: new Date().toISOString(),
        source: 'The Odds API',
        syncStatus: buildOddsSyncStatus(Boolean(scoreMarket?.outcomes?.length), Boolean(over25 && under25)),
        lastSyncedAt: new Date().toISOString(),
        correctScoreSource: 'INFERRED_FROM_H2H',
      };
      match.providerMeta = {
        ...(match.providerMeta || {}),
        oddsEventId: item.id,
        lastOddsSyncAt: new Date().toISOString(),
      };
      updatedMatchIds.push(match.id);

      // 赔率变动推送：仅在实际赔率变化超过阈值时推送
      if (oldOdds?.h2h) {
        const h2hChanges: Record<string, unknown> = {};
        const threshold = 0.05;
        if (Math.abs(homeWin - oldOdds.h2h.homeWin) >= threshold) h2hChanges.homeWin = homeWin;
        if (Math.abs(draw - oldOdds.h2h.draw) >= threshold) h2hChanges.draw = draw;
        if (Math.abs(awayWin - oldOdds.h2h.awayWin) >= threshold) h2hChanges.awayWin = awayWin;
        if (Object.keys(h2hChanges).length > 0) {
          broadcastOddsChange(match.id, 'h2h', h2hChanges);
        }
      }
    }

    for (const match of candidateMatches) {
      if (updatedMatchIds.includes(match.id)) continue;
      const reason = db.matchOdds[match.id]
        ? 'The Odds API 未找到此比赛的完整盘口数据。'
        : '本地无赔率快照，且 The Odds API 未匹配到此比赛。';
      markMatchUnsynced(match.id, reason);
    }

    return {
      updatedMatchIds,
      unsyncedMatchIds,
      unsyncedReasons,
      oddsMap: db.matchOdds,
      log: buildLog({
        source: 'The Odds API',
        action: targetMatchId ? '同步单场赔率' : '同步世界杯赔率',
        syncType: 'odds',
        status: updatedMatchIds.length > 0 ? 'SUCCESS' : 'PARTIAL',
        requestSummary: 'GET /v4/sports/soccer_fifa_world_cup/odds',
        responseSummary: `赔率数据共${payload.length}条，更新${updatedMatchIds.length}场，未匹配${unmatchedEvents}，盘口不完整${incompleteMarkets}，未同步本地${unsyncedMatchIds.length}场`,
        targetMatchId,
        startedAt,
      }),
    };
  } catch (error) {
    return {
      updatedMatchIds: [],
      unsyncedMatchIds: [],
      unsyncedReasons: {},
      oddsMap: db.matchOdds,
      log: buildLog({
        source: 'The Odds API',
        action: targetMatchId ? '同步单场赔率' : '同步世界杯赔率',
        syncType: 'odds',
        status: 'FAILED',
        requestSummary: 'GET /v4/sports/soccer_fifa_world_cup/odds',
        responseSummary: '同步赔率失败。',
        targetMatchId,
        errorMessage: error instanceof Error ? error.message : '未知同步错误',
        startedAt,
      }),
    };
  }
}
