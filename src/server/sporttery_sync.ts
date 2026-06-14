/**
 * 竞彩网 API 赔率同步模块
 * 数据优先级：竞彩网(主) > The Odds API(辅) > Elo 兜底
 * 同步频率：1小时自动 + 管理员手动触发
 */
import { DatabaseSchema } from '../db/db_service';
import { createId } from './helpers';
import { Match, MatchOdds, SyncLog, Team } from '../types';
import { getRuntimeConfig } from './config';
import { broadcastOddsChange } from './websocket';
import logger from './logger';
import { parseCrsToScoreOptions, parseTtgToGoals, parseHafuToHalfFullTime } from '../utils/odds';

const SPORTTERY_API_TIMEOUT_MS = 12_000;

interface SportteryMatchItem {
  matchId: number;
  matchDate: string;
  matchTime: string;
  matchNumStr: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeTeamAbbName: string;
  awayTeamAbbName: string;
  homeRank: string;
  awayRank: string;
  leagueAbbName: string;
  matchStatus: string;
  had?: { h: string; d: string; a: string; hf: string; df: string; af: string };
  hhad?: { goalLine: string; goalLineValue: string; h: string; d: string; a: string; hf: string; df: string; af: string };
  crs?: Record<string, string>;
  ttg?: Record<string, string>;
  hafu?: Record<string, string>;
}

interface SportteryResponse {
  value?: {
    matchInfoList?: Array<{
      subMatchList?: SportteryMatchItem[];
    }>;
  };
}

interface SyncResult {
  updatedMatchIds: string[];
  unsyncedMatchIds: string[];
  unsyncedReasons: Record<string, string>;
  log: Partial<SyncLog>;
}

function parseOdds(value: string | undefined, fallback = 9.5): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function parseGoalLine(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
}

/**
 * 标准化日期为 YYYY-MM-DD 格式（补齐零）
 * "2026/6/15" → "2026-06-15"
 */
function normalizeDate(d: string): string {
  const cleaned = d.trim().replace(/\//g, '-');
  const parts = cleaned.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return cleaned;
}

/**
 * 通过队伍代码 + 日期匹配本地比赛
 * 如果代码匹配失败，降级为中文队名匹配
 */
function matchByTeamCodes(
  db: DatabaseSchema,
  homeCode: string,
  awayCode: string,
  matchDate: string,
  homeAbbName: string,
  awayAbbName: string,
): Match | null {
  // 先按队伍代码匹配
  let homeTeam = db.teams.find((t) => t.code?.toUpperCase() === homeCode.toUpperCase());
  let awayTeam = db.teams.find((t) => t.code?.toUpperCase() === awayCode.toUpperCase());

  // 降级：按中文队名缩写匹配（竞彩网返回的 abbName 是中文简称）
  if (!homeTeam) homeTeam = db.teams.find((t) => t.nameZh === homeAbbName || t.nameZh?.includes(homeAbbName) || homeAbbName?.includes(t.nameZh || ''));
  if (!awayTeam) awayTeam = db.teams.find((t) => t.nameZh === awayAbbName || t.nameZh?.includes(awayAbbName) || awayAbbName?.includes(t.nameZh || ''));

  if (!homeTeam || !awayTeam) return null;

  // 按日期匹配（兼容多种日期格式：2026-06-15 / 2026/6/15 / 2026/06/15）
  const normalizedApiDate = normalizeDate(matchDate);
  return db.matches.find((m) => {
    if (m.homeTeamId !== homeTeam.id || m.awayTeamId !== awayTeam.id) return false;
    const utcDate = normalizeDate(m.startTimeUtc?.slice(0, 10) || '');
    const beijingDate = normalizeDate(m.startTimeBeijing?.slice(0, 10) || '');
    return utcDate === normalizedApiDate || beijingDate === normalizedApiDate;
  }) || null;
}

function buildLog(override: Partial<SyncLog>): Partial<SyncLog> {
  return {
    id: createId('sync'),
    source: '竞彩网 Sporttery',
    requestSummary: 'GET 竞彩网赔率API',
    responseSummary: null,
    createdAt: new Date().toISOString(),
    ...override,
  };
}

export async function syncSportteryOdds(db: DatabaseSchema): Promise<SyncResult> {
  const config = getRuntimeConfig();
  const baseUrl = config.sportteryApiBaseUrl;
  const url = `${baseUrl}/uniform/football/getMatchCalculatorV1.qry?channel=c&poolCode=hhad,had,crs,ttg,hafu`;

  const now = new Date().toISOString();
  const result: SyncResult = {
    updatedMatchIds: [],
    unsyncedMatchIds: [],
    unsyncedReasons: {},
    log: buildLog({
      action: '同步竞彩网赔率',
      status: 'SUCCESS',
      syncType: 'odds',
      startedAt: now,
    }),
  };

  let payload: SportteryResponse;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SPORTTERY_API_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'klpk/2.3' } });
    clearTimeout(timer);

    if (!res.ok) {
      result.log = buildLog({ action: '同步竞彩网赔率', status: 'FAILED', errorMessage: `HTTP ${res.status}` });
      return result;
    }
    payload = await res.json();
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    result.log = buildLog({ action: '同步竞彩网赔率', status: 'FAILED', errorMessage: errMsg });
    logger.admin('[Sporttery] API fetch failed', { error: errMsg });
    return result;
  }

  const allMatches: SportteryMatchItem[] = [];
  for (const day of payload?.value?.matchInfoList || []) {
    if (day.subMatchList) allMatches.push(...day.subMatchList);
  }

  if (allMatches.length === 0) {
    result.log = buildLog({ action: '同步竞彩网赔率', status: 'SUCCESS', detail: '无比赛数据' });
    logger.admin('[Sporttery] No matches found in API response');
    return result;
  }

  let matched = 0;
  let unmatched = 0;
  const allMatchIds = db.matches.map((m) => m.id);
  const unsyncedSet = new Set(allMatchIds);

  for (const item of allMatches) {
    const match = matchByTeamCodes(db, item.homeTeamCode, item.awayTeamCode, item.matchDate, item.homeTeamAbbName, item.awayTeamAbbName);
    if (!match) {
      unmatched++;
      logger.admin('[Sporttery] Unmatched match', {
        home: item.homeTeamCode,
        away: item.awayTeamCode,
        date: item.matchDate,
        label: `${item.homeTeamAbbName} vs ${item.awayTeamAbbName}`,
      });
      continue;
    }

    unsyncedSet.delete(match.id);
    const oldOdds = db.matchOdds[match.id];

    // ─── 构建赔率数据 ───
    const newOdds: MatchOdds = {
      matchId: match.id,
      lastUpdated: new Date().toISOString(),
      source: 'Sporttery' as MatchOdds['source'],
      syncStatus: 'SYNCED',
      lastSyncedAt: new Date().toISOString(),
      correctScoreSource: 'SPORTTERY',
      correctScore: [],
      totalGoals: [],
    };

    // ─── HAD (胜平负) ───
    if (item.had && item.had.h && item.had.d && item.had.a) {
      newOdds.h2h = {
        homeWin: parseOdds(item.had.h),
        draw: parseOdds(item.had.d),
        awayWin: parseOdds(item.had.a),
      };
    } else {
      // 保持旧 H2H 赔率（可能来自之前的同步）
      newOdds.h2h = oldOdds?.h2h || { homeWin: 1.9, draw: 3.3, awayWin: 3.8 };
    }

    // ─── HHAD (让球胜平负) ───
    if (item.hhad && item.hhad.h && item.hhad.d && item.hhad.a) {
      newOdds.handicap = {
        goalLine: parseGoalLine(item.hhad.goalLine || item.hhad.goalLineValue),
        homeWin: parseOdds(item.hhad.h),
        draw: parseOdds(item.hhad.d),
        awayWin: parseOdds(item.hhad.a),
      };
    }

    // ─── CRS (比分) ───
    if (item.crs && Object.keys(item.crs).length > 0) {
      newOdds.correctScore = parseCrsToScoreOptions(item.crs);
    } else {
      // 保留旧比分赔率
      newOdds.correctScore = oldOdds?.correctScore || [];
    }

    // ─── TTG (总进球数) ───
    if (item.ttg && Object.keys(item.ttg).length > 0) {
      newOdds.totalGoals = parseTtgToGoals(item.ttg);
    } else {
      // 从旧格式迁移
      if (oldOdds?.totalGoals && Array.isArray(oldOdds.totalGoals)) {
        newOdds.totalGoals = oldOdds.totalGoals;
      } else if (oldOdds?.totalGoalsLegacy) {
        newOdds.totalGoals = [
          { goals: '3-', odds: oldOdds.totalGoalsLegacy.under25 },
          { goals: '3+', odds: oldOdds.totalGoalsLegacy.over25 },
        ];
      } else {
        newOdds.totalGoals = [
          { goals: '0', odds: 15.0 }, { goals: '1', odds: 6.5 },
          { goals: '2', odds: 3.8 }, { goals: '3', odds: 3.6 },
          { goals: '4', odds: 5.5 }, { goals: '5', odds: 9.0 },
          { goals: '6', odds: 17.0 }, { goals: '7+', odds: 21.0 },
        ];
      }
    }

    // ─── HAFU (半全场) ───
    if (item.hafu && Object.keys(item.hafu).length > 0) {
      newOdds.halfFullTime = parseHafuToHalfFullTime(item.hafu);
    } else if (oldOdds?.halfFullTime) {
      newOdds.halfFullTime = oldOdds.halfFullTime;
    }

    // ─── 保留 qualify ───
    if (oldOdds?.qualify) {
      newOdds.qualify = oldOdds.qualify;
    }

    // ─── 赔率变化推送 ───
    if (oldOdds) {
      const h2hChanged =
        Math.abs((oldOdds.h2h?.homeWin || 0) - (newOdds.h2h?.homeWin || 0)) > 0.05 ||
        Math.abs((oldOdds.h2h?.draw || 0) - (newOdds.h2h?.draw || 0)) > 0.05 ||
        Math.abs((oldOdds.h2h?.awayWin || 0) - (newOdds.h2h?.awayWin || 0)) > 0.05;

      if (h2hChanged) {
        try {
          broadcastOddsChange(match.id, 'h2h', { homeWin: newOdds.h2h.homeWin, draw: newOdds.h2h.draw, awayWin: newOdds.h2h.awayWin });
        } catch { /* ignore */ }
      }
    }

    db.matchOdds[match.id] = newOdds;
    result.updatedMatchIds.push(match.id);
    matched++;
  }

  // 记录未能匹配的比赛
  for (const matchId of unsyncedSet) {
    const existing = db.matchOdds[matchId];
    if (!existing) continue;
    result.unsyncedMatchIds.push(matchId);
    result.unsyncedReasons[matchId] = '竞彩网 API 未找到此比赛的赔率数据。';
  }

  // 对已匹配但缺少竞彩网赔率的比赛，标记 PARTIAL
  for (const matchId of result.updatedMatchIds) {
    const odds = db.matchOdds[matchId];
    if (!odds) continue;
    const hasFull =
      odds.h2h && odds.correctScore && odds.correctScore.length > 0
      && odds.totalGoals && odds.totalGoals.length > 0;

    if (!hasFull && odds.syncStatus === 'SYNCED') {
      odds.syncStatus = 'PARTIAL';
    }
  }

  result.log = buildLog({
    action: '同步竞彩网赔率',
    status: 'SUCCESS',
    syncType: 'odds',
    detail: `匹配 ${matched} 场，${unmatched} 场未匹配到本地比赛`,
    targetMatchId: `${matched}场匹配,${unmatched}场未匹配`,
  });

  logger.admin('[Sporttery] Sync completed', { matched, unmatched, updated: result.updatedMatchIds.length });

  return result;
}

/**
 * 对单场比赛同步竞彩网赔率（用于手动触发）
 */
export async function syncSportteryForMatch(
  db: DatabaseSchema,
  matchId: string,
): Promise<{ success: boolean; error?: string }> {
  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return { success: false, error: '比赛未找到' };

  const homeTeam = db.teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = db.teams.find((t) => t.id === match.awayTeamId);
  if (!homeTeam?.code || !awayTeam?.code) {
    return { success: false, error: '队伍代码缺失' };
  }

  const config = getRuntimeConfig();
  const url = `${config.sportteryApiBaseUrl}/uniform/football/getMatchCalculatorV1.qry?channel=c&poolCode=hhad,had,crs,ttg,hafu`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'klpk/2.3' } });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const payload: SportteryResponse = await res.json();

    for (const day of payload?.value?.matchInfoList || []) {
      for (const item of day?.subMatchList || []) {
        if (
          item.homeTeamCode.toUpperCase() === homeTeam.code.toUpperCase() &&
          item.awayTeamCode.toUpperCase() === awayTeam.code.toUpperCase() &&
          match.startTimeUtc.slice(0, 10) === item.matchDate
        ) {
          // 让主同步函数处理
          const fullSync = await syncSportteryOdds(db);
          return { success: fullSync.updatedMatchIds.includes(matchId), error: undefined };
        }
      }
    }
    return { success: false, error: '竞彩网 API 未匹配到此比赛' };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ═══════════════════════════════════════════════════════════
//  竞彩网积分榜同步 (getTablesV2)
// ═══════════════════════════════════════════════════════════

interface SportteryTableRow {
  teamName: string;
  teamId: string;
  rank: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  groupName?: string;
}

export async function syncWorldCupStandings(db: DatabaseSchema): Promise<{
  synced: boolean;
  groupCount: number;
  source: string;
  error?: string;
}> {
  const config = getRuntimeConfig();
  const url = `${config.sportteryApiBaseUrl}/uniform/football/league/getTablesV2.qry?seasonId=11817&uniformLeagueId=72`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SPORTTERY_API_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'klpk/2.4' },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { synced: false, groupCount: 0, source: 'Sporttery', error: `HTTP ${res.status}` };
    }

    const payload = await res.json();
    // 数据结构：value.totalTables[].groups[].tables[]
    const totalTables = payload?.value?.totalTables || payload?.value?.tableList || [];
    if (!Array.isArray(totalTables) || totalTables.length === 0) {
      return { synced: false, groupCount: 0, source: 'Sporttery', error: '无积分榜数据' };
    }

    const allRows: Array<{
      abbCnName: string; ranking: string; drawMatchCnt: number;
      goalCnt: number; lossGoalCnt: number; lossGoalMatchCnt: number;
      netGoal: number; points: string; totalMatchCnt: number;
      wonMatchCnt: number; groupName?: string;
    }> = [];

    // 遍历 totalTables → groups → tables 展平
    for (const tableGrp of totalTables) {
      for (const grp of tableGrp?.groups || []) {
        const groupName = grp.groupName || '';
        for (const row of grp?.tables || []) {
          allRows.push({ ...row, groupName });
        }
      }
    }

    if (allRows.length === 0) {
      return { synced: false, groupCount: 0, source: 'Sporttery', error: '无积分榜数据' };
    }

    // 匹配本地队伍
    const teamByName = new Map(db.teams.map((t) => [t.nameZh, t]));
    const groups: Record<string, import('../types').StandingTeamRow[]> = {};

    for (const row of allRows) {
      const groupName = row.groupName || 'A';
      if (!groups[groupName]) groups[groupName] = [];

      const localTeam = teamByName.get(row.abbCnName)
        || db.teams.find((t) =>
          t.nameZh === row.abbCnName
          || t.nameZh?.includes(row.abbCnName)
          || row.abbCnName?.includes(t.nameZh || '')
        );

      groups[groupName].push({
        teamId: localTeam?.id || '',
        teamName: row.abbCnName,
        teamCode: localTeam?.code || '',
        rank: Number(row.ranking) || 0,
        played: row.totalMatchCnt || (row.wonMatchCnt + row.drawMatchCnt + row.lossGoalMatchCnt),
        won: row.wonMatchCnt || 0,
        drawn: row.drawMatchCnt || 0,
        lost: row.lossGoalMatchCnt || 0,
        gf: row.goalCnt || 0,
        ga: row.lossGoalCnt || 0,
        gd: row.netGoal || 0,
        points: Number(row.points) || 0,
      });
    }

    // 按 rank 排序
    for (const g of Object.keys(groups)) {
      groups[g].sort((a, b) => a.rank - b.rank);
    }

    db.worldCupStandings = {
      groups,
      source: 'Sporttery',
      lastUpdated: new Date().toISOString(),
    };

    logger.admin('[Sporttery] Standings synced', {
      groups: Object.keys(groups).length,
      teams: Object.values(groups).reduce((s, g) => s + g.length, 0),
    });

    return {
      synced: true,
      groupCount: Object.keys(groups).length,
      source: 'Sporttery',
    };
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    logger.admin('[Sporttery] Standings sync failed', { error: errMsg });
    return { synced: false, groupCount: 0, source: 'Sporttery', error: errMsg };
  }
}

// ═══════════════════════════════════════════════════════════
//  竞彩网赛程赛果 API 不可用（EdgeOne 403/567 拦截），已移除。
//  赛程比分来源：API-Football(主) → 种子数据(兜底)
// ═══════════════════════════════════════════════════════════
