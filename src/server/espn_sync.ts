/**
 * ESPN API 数据同步模块
 * 免费、无需 API Key，支持 2026 世界杯
 * 提供赛程/比分/状态同步和积分榜同步
 */

import { DatabaseSchema } from '../db/db_service';
import { Match, MatchEvent, MatchLineupSide, MatchStatistics, MatchStatus, StandingTeamRow, SyncLog, SyncProvider, SyncStatus, SyncType, WorldCupStandings } from '../types';
import { broadcastScoreUpdate } from './websocket';
import { resolveTeamByExternalName } from './sync';
import { logger } from './logger';

const ESPN_API_TIMEOUT_MS = 15_000;
const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_STANDINGS_URL = 'https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';
const ESPN_SUMMARY_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary';
const ESPN_BRACKET_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/tournament/bracket';
// 2026 世界杯赛程日期范围（覆盖整个赛事周期）
const WC_DATE_RANGE = '20260611-20260721';

interface EspnCompetitor {
  homeAway: 'home' | 'away';
  team?: { displayName?: string; abbreviation?: string; id?: string };
  score?: string | number;
  // 点球大战比分（仅 PEN 比赛填充）
  shootoutScore?: string | number;
  // ESPN 标识的获胜方（AET/PEN 时填充）
  winner?: boolean;
}

interface EspnEventDetail {
  scoringPlay?: boolean;
  // true 表示点球大战进球，必须排除
  shootout?: boolean;
  clock?: { displayValue?: string };
  team?: { id?: string };
}

interface EspnEvent {
  id: string;
  name: string;
  date: string;
  status?: { type?: { state?: string; shortDetail?: string } };
  competitions?: Array<{
    id: string;
    competitors?: EspnCompetitor[];
    // 进球事件列表（用于分离 90 分钟/加时赛比分）
    details?: EspnEventDetail[];
  }>;
}

interface EspnScoreboardPayload {
  events?: EspnEvent[];
}

interface EspnStandingStat {
  name: string;
  value: number;
}

interface EspnStandingEntry {
  team?: { displayName?: string; abbreviation?: string; id?: string };
  stats?: EspnStandingStat[];
}

interface EspnStandingsGroup {
  name?: string;
  standings?: {
    entries?: EspnStandingEntry[];
  };
}

interface EspnStandingsPayload {
  children?: EspnStandingsGroup[];
}

interface EspnStatistic {
  name: string;
  displayValue: string;
  label?: string;
}

interface EspnBoxscoreTeam {
  team?: { id?: string; displayName?: string; abbreviation?: string };
  statistics?: EspnStatistic[];
}

interface EspnSummaryPayload {
  boxscore?: {
    teams?: EspnBoxscoreTeam[];
  };
  rosters?: Array<{
    team?: { id?: string; displayName?: string; abbreviation?: string };
    formation?: string;
    coach?: { displayName?: string };
    lineup?: Array<{
      athlete?: { id?: string; displayName?: string; jersey?: string };
      position?: { displayName?: string; abbreviation?: string };
      formationPlace?: number;
    }>;
    reserve?: Array<{
      athlete?: { id?: string; displayName?: string; jersey?: string };
      position?: { displayName?: string; abbreviation?: string };
    }>;
  }>;
  keyEvents?: Array<{
    id?: string;
    type?: { text?: string };
    clock?: { displayValue?: string };
    team?: { id?: string; abbreviation?: string };
    athletesInvolved?: Array<{ id?: string; displayName?: string; jersey?: string }>;
    text?: string;
  }>;
}

interface EspnBracketMatchup {
  id?: string;
  name?: string;
  date?: string;
  homeTeam?: { id?: string; abbreviation?: string; displayName?: string; seed?: number };
  awayTeam?: { id?: string; abbreviation?: string; displayName?: string; seed?: number };
  homeScore?: number | null;
  awayScore?: number | null;
  winner?: { id?: string; abbreviation?: string } | null;
  homeWinnerTo?: { round?: number; matchupId?: string; slot?: string } | null;
  awayWinnerTo?: { round?: number; matchupId?: string; slot?: string } | null;
}

interface EspnBracketRound {
  round?: number;
  label?: string;
  matchups?: EspnBracketMatchup[];
}

interface EspnBracketPayload {
  content?: {
    bracket?: {
      rounds?: EspnBracketRound[];
    };
  };
}

async function fetchEspn(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ESPN_API_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildLog(params: {
  source: SyncProvider;
  action: string;
  syncType: SyncType;
  status: SyncStatus;
  requestSummary: string;
  responseSummary: string;
  errorMessage?: string;
  startedAt: string;
}): SyncLog {
  return {
    id: `sync-${Math.random().toString(36).slice(2, 10)}`,
    source: params.source,
    action: params.action,
    syncType: params.syncType,
    status: params.status,
    requestSummary: params.requestSummary,
    responseSummary: params.responseSummary,
    errorMessage: params.errorMessage,
    startedAt: params.startedAt,
    finishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * 将 ESPN 状态映射到本地 MatchStatus
 */
function mapEspnStatus(state?: string, shortDetail?: string): MatchStatus {
  if (!state) return MatchStatus.NS;
  if (state === 'pre') return MatchStatus.NS;
  if (state === 'in') {
    if (shortDetail?.toLowerCase().includes('halftime')) return MatchStatus.HT;
    return MatchStatus.LIVE;
  }
  if (state === 'post') {
    if (shortDetail === 'AET') return MatchStatus.AET;
    if (shortDetail === 'Pen') return MatchStatus.PEN;
    return MatchStatus.FT;
  }
  return MatchStatus.NS;
}

/**
 * 解析 ESPN score 字符串为数字
 */
function parseScore(score: string | number | undefined): number | undefined {
  if (score == null) return undefined;
  if (typeof score === 'number') return score;
  const num = parseInt(score, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * 从 ESPN details 数组计算 90 分钟（含伤停补时）比分
 *
 * 规则：
 * - scoringPlay === true 才计入
 * - shootout === true 是点球大战进球，显式排除
 * - clock.displayValue 解析分钟数：< 100 为常规时间（含 90+补时），>= 100 为加时赛
 * - team.id 归属得分方（ESPN 在乌龙球时 team 已是得分方）
 *
 * @returns 90 分钟比分；details 缺失或为空时返回 null（调用方需降级处理）
 */
function calculateRegulationScore(
  details: EspnEventDetail[] | undefined,
  homeTeamId: string,
  awayTeamId: string,
): { home: number; away: number } | null {
  if (!details || details.length === 0) return null;
  let home = 0;
  let away = 0;
  for (const d of details) {
    if (!d.scoringPlay) continue;
    if (d.shootout) continue;
    const dv = d.clock?.displayValue || '';
    const m = dv.match(/^(\d+)/);
    const minute = m ? parseInt(m[1], 10) : 0;
    if (minute >= 100) continue; // 加时赛进球
    if (d.team?.id === homeTeamId) home += 1;
    else if (d.team?.id === awayTeamId) away += 1;
  }
  return { home, away };
}

/**
 * 从 ESPN competitor.winner 字段确定最终获胜方 ID
 * AET/PEN 比赛 ESPN 会标记 winner=true
 */
function pickWinnerTeamId(
  competitors: EspnCompetitor[] | undefined,
  homeTeamId: string,
  awayTeamId: string,
): string | undefined {
  if (!competitors) return undefined;
  const winner = competitors.find((c) => c.winner === true);
  if (!winner) return undefined;
  return winner.homeAway === 'home' ? homeTeamId : awayTeamId;
}

/**
 * 从 ESPN 小组名提取小组字母
 */
function extractGroupKey(groupName?: string): string {
  if (!groupName) return 'A';
  const match = groupName.match(/Group\s+([A-Z])/i);
  return match ? match[1].toUpperCase() : groupName;
}

/**
 * 根据日期推断淘汰赛阶段
 */
function inferKnockoutStage(date: string): Match['stage'] {
  const d = new Date(date + 'T00:00:00Z');
  if (d < new Date('2026-06-29T00:00:00Z')) return 'Round of 32';
  if (d < new Date('2026-07-05T00:00:00Z')) return 'Round of 32';
  if (d < new Date('2026-07-10T00:00:00Z')) return 'Round of 16';
  if (d < new Date('2026-07-15T00:00:00Z')) return 'Quarter-finals';
  if (d < new Date('2026-07-19T00:00:00Z')) return 'Semi-finals';
  if (d < new Date('2026-07-20T00:00:00Z')) return 'Third-place play-off';
  return 'Final';
}

/**
 * 尝试用 ESPN 数据替换 TBD 淘汰赛种子比赛或创建新比赛
 * 逻辑与 sporttery_sync.ts 的 tryCreateOrUpdateKnockoutMatch 保持一致
 */
function tryReplaceOrCreateKnockoutFromEspn(
  db: DatabaseSchema,
  event: EspnEvent,
  homeTeamId: string,
  awayTeamId: string,
): Match | null {
  const eventDateStr = (event.date || '').slice(0, 10);
  if (!eventDateStr) return null;

  // 小时级匹配：避免同一天的多场 TBD 种子被错误替换
  // event.date 格式: '2026-07-03T22:00Z'，startTimeUtc 格式: '2026-07-03T22:00:00.000Z'
  // slice(0, 13) 提取 'YYYY-MM-DDTHH'，允许分钟差异但要求小时匹配
  const eventHour = (event.date || '').slice(0, 13);
  const dateMatches = (m: Match): boolean => {
    const utcHour = (m.startTimeUtc || '').slice(0, 13);
    return utcHour === eventHour;
  };

  // 0. 已存在相同队伍+日期的比赛则跳过（避免重复）
  const existing = db.matches.find(
    (m) =>
      m.homeTeamId === homeTeamId &&
      m.awayTeamId === awayTeamId &&
      dateMatches(m),
  );
  if (existing) return existing;

  // 1. 查找同日期的未替换 TBD 淘汰赛种子比赛
  const tbdSeed = db.matches.find(
    (m) =>
      m.homeTeamId === 'TBD' &&
      m.awayTeamId === 'TBD' &&
      m.stage !== 'Group Stage' &&
      dateMatches(m),
  );

  if (tbdSeed) {
    tbdSeed.homeTeamId = homeTeamId;
    tbdSeed.awayTeamId = awayTeamId;
    tbdSeed.operationalStatus = 'UNSYNCED';
    logger.info('[ESPN] Replaced TBD seed match', {
      matchId: tbdSeed.id,
      stage: tbdSeed.stage,
    });
    return tbdSeed;
  }

  // 2. 创建新比赛记录
  const stage = inferKnockoutStage(eventDateStr);
  const roundNameMap: Record<string, string> = {
    'Round of 32': '1/32决赛',
    'Round of 16': '1/16决赛',
    'Quarter-finals': '1/4决赛',
    'Semi-finals': '半决赛',
    'Third-place play-off': '季军赛',
    'Final': '决赛',
  };

  const newMatch: Match = {
    id: `fx-espn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    homeTeamId,
    awayTeamId,
    stage,
    roundName: roundNameMap[stage] || stage,
    venueName: '',
    venueCity: '',
    startTimeUtc: event.date ? new Date(event.date).toISOString() : `${eventDateStr}T00:00:00.000Z`,
    startTimeBeijing: `${eventDateStr}T08:00:00+08:00`,
    status: 'NS' as Match['status'],
    isOddsFrozen: false,
    isPredictionLocked: false,
    isSettled: false,
    autoLockAt: `${eventDateStr}T00:00:00.000Z`,
    operationalStatus: 'UNSYNCED',
    settlementStatus: 'PENDING',
  };

  db.matches.push(newMatch);
  logger.info('[ESPN] Created knockout match', {
    matchId: newMatch.id,
    stage,
  });
  return newMatch;
}

/**
 * 同步赛程/比分/状态（ESPN scoreboard 端点）
 */
export async function syncEspnScoreboard(db: DatabaseSchema): Promise<{
  updatedMatches: Match[];
  log: SyncLog;
}> {
  const startedAt = new Date().toISOString();
  const url = `${ESPN_SCOREBOARD_URL}?dates=${WC_DATE_RANGE}&limit=400`;

  try {
    const response = await fetchEspn(url);
    if (!response.ok) {
      throw new Error(`ESPN scoreboard API failed (${response.status})`);
    }

    const payload = (await response.json()) as EspnScoreboardPayload;
    const events = payload.events || [];

    if (events.length === 0) {
      return {
        updatedMatches: [],
        log: buildLog({
          source: 'ESPN',
          action: '同步赛程/比分/状态',
          syncType: 'fixtures',
          status: 'PARTIAL',
          requestSummary: `GET scoreboard?dates=${WC_DATE_RANGE}`,
          responseSummary: 'ESPN 返回 0 场赛事',
          startedAt,
        }),
      };
    }

    const updatedMatches: Match[] = [];
    let unmatchedTeams = 0;
    let createdKnockout = 0;

    for (const event of events) {
      const competition = event.competitions?.[0];
      if (!competition?.competitors) continue;

      const homeComp = competition.competitors.find((c) => c.homeAway === 'home');
      const awayComp = competition.competitors.find((c) => c.homeAway === 'away');
      if (!homeComp?.team || !awayComp?.team) continue;

      // 优先用 abbreviation（与本地 team.code 一致），降级用 displayName
      const homeTeam = resolveTeamByExternalName(db, homeComp.team.abbreviation || homeComp.team.displayName || '');
      const awayTeam = resolveTeamByExternalName(db, awayComp.team.abbreviation || awayComp.team.displayName || '');

      if (!homeTeam || !awayTeam) {
        unmatchedTeams += 1;
        continue;
      }

      // 匹配本地比赛：优先 espnEventId（即使日期不一致也接受，并同步更新 startTimeUtc）→ 队伍+日期 → TBD种子替换 → 仅队伍降级
      const eventDate = event.date || '';
      const eventDateStr = eventDate.slice(0, 10);
      let localMatch =
        db.matches.find(
          (m) => m.providerMeta?.espnEventId === event.id,
        ) ||
        db.matches.find(
          (m) =>
            m.homeTeamId === homeTeam.id &&
            m.awayTeamId === awayTeam.id &&
            m.startTimeUtc.slice(0, 10) === eventDateStr,
        );

      // 如果没有精确匹配，先尝试替换 TBD 种子（避免 TBD 种子遗留）
      if (!localMatch) {
        localMatch = tryReplaceOrCreateKnockoutFromEspn(db, event, homeTeam.id, awayTeam.id);
        if (localMatch) {
          createdKnockout++;
        }
      }

      // 最后降级到仅队伍匹配（可能日期被ESPN更新过）
      if (!localMatch) {
        localMatch = db.matches.find(
          (m) => m.homeTeamId === homeTeam.id && m.awayTeamId === awayTeam.id,
        );
      }

      if (!localMatch) continue;

      const newStatus = mapEspnStatus(event.status?.type?.state, event.status?.type?.shortDetail);
      const espnHomeScore = parseScore(homeComp.score);
      const espnAwayScore = parseScore(awayComp.score);

      const previousHomeScore = localMatch.homeScore;
      const previousAwayScore = localMatch.awayScore;
      const previousStatus = localMatch.status;

      // 分离 90 分钟/加时后/点球比分
      // 核心策略：homeScore/awayScore 固化为 90 分钟（含伤停补时）比分，用于结算与积分榜
      let finalHomeScore: number | undefined;
      let finalAwayScore: number | undefined;
      let homeScoreAfterExtraTime: number | undefined;
      let awayScoreAfterExtraTime: number | undefined;
      let homePenaltyScore: number | undefined;
      let awayPenaltyScore: number | undefined;
      let winnerTeamId: string | undefined;

      if (newStatus === MatchStatus.AET || newStatus === MatchStatus.PEN) {
        // AET/PEN：ESPN score 字段是加时赛结束后的总比分（不含点球）
        homeScoreAfterExtraTime = espnHomeScore;
        awayScoreAfterExtraTime = espnAwayScore;

        // 从 details 数组计算 90 分钟比分
        const details = competition.details;
        const regulation = calculateRegulationScore(details, homeTeam.id, awayTeam.id);
        if (regulation) {
          finalHomeScore = regulation.home;
          finalAwayScore = regulation.away;
        } else {
          // details 缺失降级：无法分离 90 分钟比分，用 ESPN score 并标记待人工复核
          finalHomeScore = espnHomeScore;
          finalAwayScore = espnAwayScore;
          localMatch.scoreUnknown = true;
          logger.warn('[ESPN] AET/PEN details missing, falling back to ESPN score as 90min', {
            matchId: localMatch.id,
            eventId: event.id,
            status: newStatus,
          });
        }

        // PEN：读取点球大战比分
        if (newStatus === MatchStatus.PEN) {
          homePenaltyScore = parseScore(homeComp.shootoutScore);
          awayPenaltyScore = parseScore(awayComp.shootoutScore);
        }

        // 设置最终获胜方（基于 ESPN competitor.winner）
        winnerTeamId = pickWinnerTeamId(competition.competitors, homeTeam.id, awayTeam.id);
      } else {
        // FT/LIVE/HT/NS：ESPN score 即为 90 分钟比分
        finalHomeScore = espnHomeScore;
        finalAwayScore = espnAwayScore;
      }

      // 更新 providerMeta
      localMatch.providerMeta = {
        ...(localMatch.providerMeta || {}),
        espnEventId: event.id,
        lastFixturesSyncAt: new Date().toISOString(),
      };

      // 同步 startTimeUtc：如果本地日期与 ESPN 不一致（可能之前同步错误导致），用 ESPN 的时间修正
      if (eventDate && localMatch.startTimeUtc.slice(0, 10) !== eventDateStr) {
        logger.info('[ESPN] Correcting startTimeUtc mismatch', {
          matchId: localMatch.id,
          oldTime: localMatch.startTimeUtc,
          newTime: eventDate,
        });
        localMatch.startTimeUtc = new Date(eventDate).toISOString();
      }

      localMatch.status = newStatus;
      if (finalHomeScore !== undefined) localMatch.homeScore = finalHomeScore;
      if (finalAwayScore !== undefined) localMatch.awayScore = finalAwayScore;
      // AET/PEN 比赛才填充加时/点球字段，FT 比赛保持 undefined
      if (homeScoreAfterExtraTime !== undefined) localMatch.homeScoreAfterExtraTime = homeScoreAfterExtraTime;
      if (awayScoreAfterExtraTime !== undefined) localMatch.awayScoreAfterExtraTime = awayScoreAfterExtraTime;
      if (homePenaltyScore !== undefined) localMatch.homePenaltyScore = homePenaltyScore;
      if (awayPenaltyScore !== undefined) localMatch.awayPenaltyScore = awayPenaltyScore;
      if (winnerTeamId !== undefined) localMatch.winnerTeamId = winnerTeamId;

      // 清除 scoreUnknown 标记（仅当 details 计算成功时；降级路径已主动设置 scoreUnknown=true）
      if (
        (localMatch as any).scoreUnknown &&
        typeof localMatch.homeScore === 'number' &&
        typeof localMatch.awayScore === 'number' &&
        newStatus !== MatchStatus.AET &&
        newStatus !== MatchStatus.PEN
      ) {
        delete (localMatch as any).scoreUnknown;
      }

      // 比分或状态变化时推送（携带 AET/PEN 分层比分）
      if (
        (previousHomeScore !== localMatch.homeScore ||
          previousAwayScore !== localMatch.awayScore ||
          previousStatus !== localMatch.status) &&
        localMatch.status !== MatchStatus.NS &&
        typeof localMatch.homeScore === 'number' &&
        typeof localMatch.awayScore === 'number'
      ) {
        broadcastScoreUpdate(
          localMatch.id,
          localMatch.homeScore,
          localMatch.awayScore,
          localMatch.status,
          localMatch.homeScoreAfterExtraTime,
          localMatch.awayScoreAfterExtraTime,
          localMatch.homePenaltyScore,
          localMatch.awayPenaltyScore,
          localMatch.winnerTeamId,
        );
      }

      updatedMatches.push(localMatch);
    }

    return {
      updatedMatches,
      log: buildLog({
        source: 'ESPN',
        action: '同步赛程/比分/状态',
        syncType: 'fixtures',
        status: updatedMatches.length > 0 ? 'SUCCESS' : 'PARTIAL',
        requestSummary: `GET scoreboard?dates=${WC_DATE_RANGE}`,
        responseSummary: `共获取${events.length}场赛事，更新${updatedMatches.length}场，新建淘汰赛${createdKnockout}场，未匹配队伍${unmatchedTeams}支`,
        startedAt,
      }),
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('[ESPN] Scoreboard sync failed', { error: errMsg });
    return {
      updatedMatches: [],
      log: buildLog({
        source: 'ESPN',
        action: '同步赛程/比分/状态',
        syncType: 'fixtures',
        status: 'FAILED',
        requestSummary: `GET scoreboard?dates=${WC_DATE_RANGE}`,
        responseSummary: '请求失败',
        errorMessage: errMsg,
        startedAt,
      }),
    };
  }
}

/**
 * 同步积分榜（替代竞彩网 syncWorldCupStandings）
 */
export async function syncEspnStandings(db: DatabaseSchema): Promise<{
  synced: boolean;
  groupCount: number;
  source: string;
  error?: string;
}> {
  const url = `${ESPN_STANDINGS_URL}?season=2026`;

  try {
    const response = await fetchEspn(url);
    if (!response.ok) {
      return { synced: false, groupCount: 0, source: 'ESPN', error: `HTTP ${response.status}` };
    }

    const payload = (await response.json()) as EspnStandingsPayload;
    const groups = payload.children || [];

    if (groups.length === 0) {
      return { synced: false, groupCount: 0, source: 'ESPN', error: '无积分榜数据' };
    }

    const standingsGroups: Record<string, StandingTeamRow[]> = {};

    for (const group of groups) {
      const groupKey = extractGroupKey(group.name);
      const entries = group.standings?.entries || [];
      if (entries.length === 0) continue;

      if (!standingsGroups[groupKey]) standingsGroups[groupKey] = [];

      for (const entry of entries) {
        const teamName = entry.team?.displayName || '';
        const teamAbbrev = entry.team?.abbreviation || '';

        // 优先用 abbreviation 匹配（与本地 team.code 一致）
        const localTeam = resolveTeamByExternalName(db, teamAbbrev || teamName);

        // 从 stats 数组提取数据
        const statsMap = new Map<string, number>();
        for (const stat of entry.stats || []) {
          statsMap.set(stat.name, stat.value);
        }

        standingsGroups[groupKey].push({
          teamId: localTeam?.id || '',
          teamName: localTeam?.nameZh || teamName,
          teamCode: localTeam?.code || teamAbbrev,
          rank: statsMap.get('rank') || 0,
          played: statsMap.get('gamesPlayed') || 0,
          won: statsMap.get('wins') || 0,
          drawn: statsMap.get('ties') || 0,
          lost: statsMap.get('losses') || 0,
          gf: statsMap.get('pointsFor') || 0,
          ga: statsMap.get('pointsAgainst') || 0,
          gd: statsMap.get('pointDifferential') || 0,
          points: statsMap.get('points') || 0,
        });
      }

      // 按 rank 排序
      standingsGroups[groupKey].sort((a, b) => a.rank - b.rank);
    }

    const groupCount = Object.keys(standingsGroups).length;
    if (groupCount === 0) {
      return { synced: false, groupCount: 0, source: 'ESPN', error: '无有效积分数据' };
    }

    db.worldCupStandings = {
      groups: standingsGroups,
      source: 'ESPN',
      lastUpdated: new Date().toISOString(),
    } satisfies WorldCupStandings;

    logger.admin('[ESPN] Standings synced', {
      groups: groupCount,
      teams: Object.values(standingsGroups).reduce((s, g) => s + g.length, 0),
    });

    return { synced: true, groupCount, source: 'ESPN' };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.admin('[ESPN] Standings sync failed', { error: errMsg });
    return { synced: false, groupCount: 0, source: 'ESPN', error: errMsg };
  }
}

/**
 * 从 statistics 数组中按 name 查找 displayValue
 */
function getStatValue(stats: EspnStatistic[] | undefined, name: string): string | undefined {
  return stats?.find((s) => s.name === name)?.displayValue;
}

/**
 * 将 displayValue 解析为数字（容错）
 */
function parseStatNumber(value: string | undefined): number {
  if (!value) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * 将 ESPN keyEvents 类型文本映射到本地 MatchEvent 类型
 */
function mapEventType(text?: string): MatchEvent['type'] | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('goal')) return 'GOAL';
  if (lower.includes('yellow')) return 'YELLOW_CARD';
  if (lower.includes('red')) return 'RED_CARD';
  if (lower.includes('substitution') || lower.includes('sub')) return 'SUBSTITUTION';
  if (lower.includes('penalty')) return 'PENALTY';
  return null;
}

/**
 * 从 clock.displayValue（如 "23'"）解析分钟数
 */
function parseMinute(displayValue?: string): number {
  if (!displayValue) return 0;
  const match = displayValue.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * 同步比赛摘要（statistics / lineups / events）
 * 对已结束比赛一次性拉取 summary 端点
 */
export async function syncEspnSummary(
  db: DatabaseSchema,
  matchId: string,
): Promise<{ updated: boolean; log: SyncLog }> {
  const startedAt = new Date().toISOString();
  const match = db.matches.find((m) => m.id === matchId);

  if (!match) {
    return {
      updated: false,
      log: buildLog({
        source: 'ESPN',
        action: '同步比赛摘要',
        syncType: 'fixtures',
        status: 'FAILED',
        requestSummary: `summary matchId=${matchId}`,
        responseSummary: '比赛未找到',
        errorMessage: 'Match not found',
        startedAt,
      }),
    };
  }

  const espnEventId = match.providerMeta?.espnEventId;
  if (!espnEventId) {
    return {
      updated: false,
      log: buildLog({
        source: 'ESPN',
        action: '同步比赛摘要',
        syncType: 'fixtures',
        status: 'PARTIAL',
        requestSummary: `summary matchId=${matchId}`,
        responseSummary: '无 espnEventId，无法拉取 summary',
        startedAt,
      }),
    };
  }

  const url = `${ESPN_SUMMARY_URL}?event=${espnEventId}`;

  try {
    const response = await fetchEspn(url);
    if (!response.ok) {
      return {
        updated: false,
        log: buildLog({
          source: 'ESPN',
          action: '同步比赛摘要',
          syncType: 'fixtures',
          status: 'FAILED',
          requestSummary: `GET summary?event=${espnEventId}`,
          responseSummary: `HTTP ${response.status}`,
          errorMessage: `ESPN summary API failed (${response.status})`,
          startedAt,
        }),
      };
    }

    const payload = (await response.json()) as EspnSummaryPayload;
    const teams = payload.boxscore?.teams || [];

    // 用 abbreviation 匹配本地队伍（与 scoreboard 逻辑一致）
    const homeTeam = db.teams.find((t) => t.id === match.homeTeamId);
    const awayTeam = db.teams.find((t) => t.id === match.awayTeamId);

    const homeStats = teams.find(
      (t) => t.team?.abbreviation === homeTeam?.code || t.team?.abbreviation === match.homeTeamId,
    );
    const awayStats = teams.find(
      (t) => t.team?.abbreviation === awayTeam?.code || t.team?.abbreviation === match.awayTeamId,
    );

    let updatedFields: string[] = [];

    // 1. 填充 statistics
    if (homeStats?.statistics || awayStats?.statistics) {
      const possessionHome = getStatValue(homeStats?.statistics, 'possessionPct');
      const possessionAway = getStatValue(awayStats?.statistics, 'possessionPct');

      match.statistics = {
        ballPossession: {
          home: possessionHome ? `${possessionHome}%` : '-',
          away: possessionAway ? `${possessionAway}%` : '-',
        },
        shotsOnGoal: {
          home: parseStatNumber(getStatValue(homeStats?.statistics, 'shotsOnTarget')),
          away: parseStatNumber(getStatValue(awayStats?.statistics, 'shotsOnTarget')),
        },
        fouls: {
          home: parseStatNumber(getStatValue(homeStats?.statistics, 'foulsCommitted')),
          away: parseStatNumber(getStatValue(awayStats?.statistics, 'foulsCommitted')),
        },
        cornerKicks: {
          home: parseStatNumber(getStatValue(homeStats?.statistics, 'wonCorners')),
          away: parseStatNumber(getStatValue(awayStats?.statistics, 'wonCorners')),
        },
      } satisfies MatchStatistics;
      updatedFields.push('statistics');
    }

    // 2. 填充 lineups（若 summary 返回 rosters）
    if (payload.rosters && payload.rosters.length >= 2) {
      const buildLineupSide = (roster: (typeof payload.rosters)[number]): MatchLineupSide => ({
        formation: roster.formation || '',
        coach: roster.coach?.displayName || '',
        starting: (roster.lineup || []).map((p) => ({
          number: parseInt(p.athlete?.jersey || '0', 10),
          name: p.athlete?.displayName || '',
          position: p.position?.displayName || p.position?.abbreviation || '',
        })),
        substitutes: (roster.reserve || []).map((p) => ({
          number: parseInt(p.athlete?.jersey || '0', 10),
          name: p.athlete?.displayName || '',
          position: p.position?.displayName || p.position?.abbreviation || '',
        })),
      });

      const homeRoster = payload.rosters.find(
        (r) => r.team?.abbreviation === homeTeam?.code || r.team?.abbreviation === match.homeTeamId,
      ) || payload.rosters[0];
      const awayRoster = payload.rosters.find(
        (r) => r.team?.abbreviation === awayTeam?.code || r.team?.abbreviation === match.awayTeamId,
      ) || payload.rosters[1];

      if (homeRoster && awayRoster) {
        match.lineups = {
          home: buildLineupSide(homeRoster),
          away: buildLineupSide(awayRoster),
        };
        updatedFields.push('lineups');
      }
    }

    // 3. 填充 events（若 summary 返回 keyEvents）
    if (payload.keyEvents && payload.keyEvents.length > 0) {
      const events: MatchEvent[] = [];
      for (const ke of payload.keyEvents) {
        const type = mapEventType(ke.type?.text);
        if (!type) continue;

        const teamAbbrev = ke.team?.abbreviation;
        const team = db.teams.find((t) => t.code === teamAbbrev);
        const teamId = team?.id || teamAbbrev || '';

        const athlete = ke.athletesInvolved?.[0];
        events.push({
          type,
          minute: parseMinute(ke.clock?.displayValue),
          teamId,
          playerName: athlete?.displayName || '',
          detail: ke.text,
        });
      }

      if (events.length > 0) {
        match.events = events;
        updatedFields.push('events');
      }
    }

    logger.info('[ESPN] Summary synced', {
      matchId,
      fields: updatedFields.join(','),
    });

    return {
      updated: true,
      log: buildLog({
        source: 'ESPN',
        action: '同步比赛摘要',
        syncType: 'fixtures',
        status: 'SUCCESS',
        requestSummary: `GET summary?event=${espnEventId}`,
        responseSummary: `更新字段: ${updatedFields.join(', ') || '无'}`,
        startedAt,
      }),
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('[ESPN] Summary sync failed', { error: errMsg, matchId });
    return {
      updated: false,
      log: buildLog({
        source: 'ESPN',
        action: '同步比赛摘要',
        syncType: 'fixtures',
        status: 'FAILED',
        requestSummary: `GET summary?event=${espnEventId}`,
        responseSummary: '请求失败',
        errorMessage: errMsg,
        startedAt,
      }),
    };
  }
}

/**
 * 同步淘汰赛对阵图（bracket 端点）
 * 小组赛阶段返回 404，淘汰赛开始后自动生效
 * 用于双校验本地 buildBracketState 和填充 nextMatchId 晋级链接
 */
export async function syncEspnBracket(
  db: DatabaseSchema,
): Promise<{ synced: boolean; error?: string; log: SyncLog }> {
  const startedAt = new Date().toISOString();

  try {
    const response = await fetchEspn(ESPN_BRACKET_URL);

    // 小组赛阶段返回 404，属正常情况
    if (response.status === 404) {
      return {
        synced: false,
        error: 'bracket 端点暂未开放（淘汰赛未开始）',
        log: buildLog({
          source: 'ESPN',
          action: '同步淘汰赛对阵图',
          syncType: 'fixtures',
          status: 'PARTIAL',
          requestSummary: 'GET tournament/bracket',
          responseSummary: '淘汰赛未开始，bracket 端点返回 404',
          startedAt,
        }),
      };
    }

    if (!response.ok) {
      return {
        synced: false,
        error: `HTTP ${response.status}`,
        log: buildLog({
          source: 'ESPN',
          action: '同步淘汰赛对阵图',
          syncType: 'fixtures',
          status: 'FAILED',
          requestSummary: 'GET tournament/bracket',
          responseSummary: `HTTP ${response.status}`,
          errorMessage: `ESPN bracket API failed (${response.status})`,
          startedAt,
        }),
      };
    }

    const payload = (await response.json()) as EspnBracketPayload;
    const rounds = payload.content?.bracket?.rounds || [];

    if (rounds.length === 0) {
      return {
        synced: false,
        error: 'bracket 数据为空',
        log: buildLog({
          source: 'ESPN',
          action: '同步淘汰赛对阵图',
          syncType: 'fixtures',
          status: 'PARTIAL',
          requestSummary: 'GET tournament/bracket',
          responseSummary: 'bracket rounds 为空',
          startedAt,
        }),
      };
    }

    let doubleChecked = 0;
    let tbdReplaced = 0;

    // 遍历 rounds[].matchups[]，双校验本地比赛
    for (const round of rounds) {
      for (const matchup of round.matchups || []) {
        const homeAbbrev = matchup.homeTeam?.abbreviation;
        const awayAbbrev = matchup.awayTeam?.abbreviation;

        if (!homeAbbrev || !awayAbbrev) continue;

        // 用 abbreviation 匹配本地队伍
        const homeTeam = resolveTeamByExternalName(db, homeAbbrev);
        const awayTeam = resolveTeamByExternalName(db, awayAbbrev);

        if (!homeTeam || !awayTeam) continue;

        // 查找本地比赛（按队伍+日期）
        const matchupDate = matchup.date ? matchup.date.slice(0, 10) : '';
        const localMatch = db.matches.find(
          (m) =>
            m.homeTeamId === homeTeam.id &&
            m.awayTeamId === awayTeam.id &&
            (!matchupDate || m.startTimeUtc.slice(0, 10) === matchupDate),
        );

        if (localMatch) {
          // 双校验：更新比分和状态
          if (matchup.homeScore != null && matchup.awayScore != null) {
            if (localMatch.homeScore !== matchup.homeScore) {
              localMatch.homeScore = matchup.homeScore;
              doubleChecked++;
            }
            if (localMatch.awayScore !== matchup.awayScore) {
              localMatch.awayScore = matchup.awayScore;
              doubleChecked++;
            }
          }
        } else {
          // 本地不存在，尝试替换 TBD 种子
          const tbdSeed = db.matches.find(
            (m) =>
              m.homeTeamId === 'TBD' &&
              m.awayTeamId === 'TBD' &&
              m.stage !== 'Group Stage' &&
              (!matchupDate ||
                m.startTimeUtc.slice(0, 10) === matchupDate ||
                (m.startTimeBeijing || '').slice(0, 10) === matchupDate),
          );

          if (tbdSeed) {
            tbdSeed.homeTeamId = homeTeam.id;
            tbdSeed.awayTeamId = awayTeam.id;
            tbdSeed.operationalStatus = 'UNSYNCED';
            tbdReplaced++;
            logger.info('[ESPN Bracket] Replaced TBD seed', {
              matchId: tbdSeed.id,
              stage: tbdSeed.stage,
              home: homeTeam.code,
              away: awayTeam.code,
            });
          }
        }
      }
    }

    logger.admin('[ESPN] Bracket synced', {
      rounds: rounds.length,
      doubleChecked,
      tbdReplaced,
    });

    return {
      synced: true,
      log: buildLog({
        source: 'ESPN',
        action: '同步淘汰赛对阵图',
        syncType: 'fixtures',
        status: 'SUCCESS',
        requestSummary: 'GET tournament/bracket',
        responseSummary: `共${rounds.length}轮，双校验${doubleChecked}场，替换TBD${tbdReplaced}场`,
        startedAt,
      }),
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('[ESPN] Bracket sync failed', { error: errMsg });
    return {
      synced: false,
      error: errMsg,
      log: buildLog({
        source: 'ESPN',
        action: '同步淘汰赛对阵图',
        syncType: 'fixtures',
        status: 'FAILED',
        requestSummary: 'GET tournament/bracket',
        responseSummary: '请求失败',
        errorMessage: errMsg,
        startedAt,
      }),
    };
  }
}
