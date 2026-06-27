/**
 * ESPN API 数据同步模块
 * 免费、无需 API Key，支持 2026 世界杯
 * 提供赛程/比分/状态同步和积分榜同步
 */

import { DatabaseSchema } from '../db/db_service';
import { Match, MatchStatus, StandingTeamRow, SyncLog, SyncProvider, SyncStatus, SyncType, WorldCupStandings } from '../types';
import { broadcastScoreUpdate } from './websocket';
import { resolveTeamByExternalName } from './sync';
import { logger } from './logger';

const ESPN_API_TIMEOUT_MS = 15_000;
const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_STANDINGS_URL = 'https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';
// 2026 世界杯赛程日期范围（覆盖整个赛事周期）
const WC_DATE_RANGE = '20260611-20260721';

interface EspnCompetitor {
  homeAway: 'home' | 'away';
  team?: { displayName?: string; abbreviation?: string; id?: string };
  score?: string | number;
}

interface EspnEvent {
  id: string;
  name: string;
  date: string;
  status?: { type?: { state?: string; shortDetail?: string } };
  competitions?: Array<{
    id: string;
    competitors?: EspnCompetitor[];
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
 * 从 ESPN 小组名提取小组字母
 */
function extractGroupKey(groupName?: string): string {
  if (!groupName) return 'A';
  const match = groupName.match(/Group\s+([A-Z])/i);
  return match ? match[1].toUpperCase() : groupName;
}

/**
 * 同步赛程/比分/状态（替代 API-Football 的 syncFixturesForDateWindow + syncFixturesForDay）
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

      // 匹配本地比赛：优先 espnEventId → 队伍+日期
      const eventDate = event.date || '';
      const eventDateStr = eventDate.slice(0, 10);
      let localMatch =
        db.matches.find((m) => m.providerMeta?.espnEventId === event.id) ||
        db.matches.find(
          (m) =>
            m.homeTeamId === homeTeam.id &&
            m.awayTeamId === awayTeam.id &&
            m.startTimeUtc.slice(0, 10) === eventDateStr,
        ) ||
        db.matches.find(
          (m) => m.homeTeamId === homeTeam.id && m.awayTeamId === awayTeam.id,
        );

      if (!localMatch) {
        // ESPN 返回的比赛在本地不存在，跳过（不自动创建，保持本地种子数据为准）
        continue;
      }

      const newStatus = mapEspnStatus(event.status?.type?.state, event.status?.type?.shortDetail);
      const newHomeScore = parseScore(homeComp.score);
      const newAwayScore = parseScore(awayComp.score);

      const previousHomeScore = localMatch.homeScore;
      const previousAwayScore = localMatch.awayScore;
      const previousStatus = localMatch.status;

      // 更新 providerMeta
      localMatch.providerMeta = {
        ...(localMatch.providerMeta || {}),
        espnEventId: event.id,
        lastFixturesSyncAt: new Date().toISOString(),
      };

      localMatch.status = newStatus;
      if (newHomeScore !== undefined) localMatch.homeScore = newHomeScore;
      if (newAwayScore !== undefined) localMatch.awayScore = newAwayScore;

      // 清除 scoreUnknown 标记（ESPN 提供真实比分）
      if ((localMatch as any).scoreUnknown && typeof localMatch.homeScore === 'number' && typeof localMatch.awayScore === 'number') {
        delete (localMatch as any).scoreUnknown;
      }

      // 比分或状态变化时推送
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

    return {
      updatedMatches,
      log: buildLog({
        source: 'ESPN',
        action: '同步赛程/比分/状态',
        syncType: 'fixtures',
        status: updatedMatches.length > 0 ? 'SUCCESS' : 'PARTIAL',
        requestSummary: `GET scoreboard?dates=${WC_DATE_RANGE}`,
        responseSummary: `共获取${events.length}场赛事，更新${updatedMatches.length}场，未匹配队伍${unmatchedTeams}支`,
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
