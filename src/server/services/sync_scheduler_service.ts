/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 动态同步调度服务
 *
 * 根据比赛阶段生成 SyncPlan，替代固定频率同步。
 * 核心改进：没有比赛时低频同步，临近开赛/进行中时高频同步。
 */

import { dbService } from '../../db/db_service';
import { Match, MatchStatus } from '../../types';
import { getRuntimeConfig, hasProviderKey } from '../config';
import logger from '../logger';
import { broadcastScoreUpdate } from '../websocket';

// ─── 类型定义 ───

export type SyncPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'LIVE';

export interface SyncPlan {
  /** 需要同步赛程的日期列表 */
  fixturesDates: string[];
  /** 需要同步赔率的比赛 ID 列表 */
  oddsMatchIds: string[];
  /** 需要同步比分的比赛 ID 列表（进行中） */
  liveMatchIds: string[];
  /** 需要结算的比赛 ID 列表 */
  settlementMatchIds: string[];
  /** 当前优先级 */
  priority: SyncPriority;
  /** 优先级原因（日志用） */
  reason: string;
  /** 赛程同步最小间隔（毫秒） */
  fixturesIntervalMs: number;
  /** 赔率同步最小间隔（毫秒） */
  oddsIntervalMs: number;
  /** 比分同步最小间隔（毫秒） */
  liveScoreIntervalMs: number;
}

export interface SyncRuntimeState {
  lastFixturesSyncAt: number;
  lastOddsSyncAt: number;
  lastLiveScoreSyncAt: number;
  lastSettlementCheckAt: number;
  lastAiRefreshAt: number;
  currentPriority: SyncPriority;
  currentReason: string;
}

// ─── 常量 ───

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** 各优先级的同步间隔配置 */
const PRIORITY_INTERVALS: Record<SyncPriority, {
  fixturesMs: number;
  oddsMs: number;
  liveScoreMs: number;
}> = {
  LOW: {
    fixturesMs: 6 * MS_PER_HOUR,    // 6小时
    oddsMs: 6 * MS_PER_HOUR,        // 6小时
    liveScoreMs: 0,                  // 不执行
  },
  NORMAL: {
    fixturesMs: 1 * MS_PER_HOUR,    // 1小时
    oddsMs: 30 * MS_PER_MINUTE,     // 30分钟
    liveScoreMs: 0,                  // 不执行
  },
  HIGH: {
    fixturesMs: 15 * MS_PER_MINUTE, // 15分钟
    oddsMs: 5 * MS_PER_MINUTE,      // 5分钟
    liveScoreMs: 0,                  // 不执行
  },
  LIVE: {
    fixturesMs: 5 * MS_PER_MINUTE,  // 5分钟
    oddsMs: 0,                       // 进行中不需要赔率
    liveScoreMs: 30 * 1000,          // 30秒
  },
};

const LIVE_STATUSES = new Set<string>([MatchStatus.LIVE, MatchStatus.HT]);
const FINISHED_STATUSES = new Set<string>([MatchStatus.FT, MatchStatus.AET, MatchStatus.PEN]);

// ─── 内存运行状态 ───

let runtimeState: SyncRuntimeState = {
  lastFixturesSyncAt: 0,
  lastOddsSyncAt: 0,
  lastLiveScoreSyncAt: 0,
  lastSettlementCheckAt: 0,
  lastAiRefreshAt: 0,
  currentPriority: 'LOW',
  currentReason: '初始化',
};

// ─── 同步失败计数与健康状态 ───

let consecutiveFixturesFailures = 0;
let consecutiveOddsFailures = 0;
let consecutiveLiveScoreFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

function resetFixturesFailures() { consecutiveFixturesFailures = 0; }
function resetOddsFailures() { consecutiveOddsFailures = 0; }
function resetLiveScoreFailures() { consecutiveLiveScoreFailures = 0; }

function recordFixturesFailure() {
  consecutiveFixturesFailures += 1;
  if (consecutiveFixturesFailures === MAX_CONSECUTIVE_FAILURES) {
    logger.error(`[SyncScheduler] ⚠️ 赛程同步连续失败 ${MAX_CONSECUTIVE_FAILURES} 次，请检查 API_FOOTBALL_KEY 配置和网络连接！`);
    try { const { broadcastNotification } = require('../websocket'); broadcastNotification('赛程同步连续失败，请管理员检查 API Key 配置', 'warn'); } catch {}
  }
}

function recordOddsFailure() {
  consecutiveOddsFailures += 1;
  if (consecutiveOddsFailures === MAX_CONSECUTIVE_FAILURES) {
    logger.error(`[SyncScheduler] ⚠️ 赔率同步连续失败 ${MAX_CONSECUTIVE_FAILURES} 次，请检查 THE_ODDS_API_KEY 配置！`);
    try { const { broadcastNotification } = require('../websocket'); broadcastNotification('赔率同步连续失败，请管理员检查 API Key 配置', 'warn'); } catch {}
  }
}

function recordLiveScoreFailure() {
  consecutiveLiveScoreFailures += 1;
  if (consecutiveLiveScoreFailures === MAX_CONSECUTIVE_FAILURES) {
    logger.error(`[SyncScheduler] ⚠️ 比分同步连续失败 ${MAX_CONSECUTIVE_FAILURES} 次！`);
  }
}

/**
 * 获取同步健康状态（供 API 端点使用）
 */
export function getSyncHealthStatus() {
  const config = getRuntimeConfig();
  return {
    fixtures: {
      hasApiKey: hasProviderKey(config.apiFootballKey),
      consecutiveFailures: consecutiveFixturesFailures,
      isHealthy: consecutiveFixturesFailures < MAX_CONSECUTIVE_FAILURES,
      lastSyncAt: runtimeState.lastFixturesSyncAt ? new Date(runtimeState.lastFixturesSyncAt).toISOString() : null,
    },
    odds: {
      hasApiKey: hasProviderKey(config.theOddsApiKey),
      consecutiveFailures: consecutiveOddsFailures,
      isHealthy: consecutiveOddsFailures < MAX_CONSECUTIVE_FAILURES,
      lastSyncAt: runtimeState.lastOddsSyncAt ? new Date(runtimeState.lastOddsSyncAt).toISOString() : null,
    },
    liveScore: {
      consecutiveFailures: consecutiveLiveScoreFailures,
      isHealthy: consecutiveLiveScoreFailures < MAX_CONSECUTIVE_FAILURES,
      lastSyncAt: runtimeState.lastLiveScoreSyncAt ? new Date(runtimeState.lastLiveScoreSyncAt).toISOString() : null,
    },
    currentPriority: runtimeState.currentPriority,
    currentReason: runtimeState.currentReason,
  };
}

// ─── 防重入锁 ───

const syncLocks = new Set<string>();
const LOCK_TIMEOUT_MS = 2 * MS_PER_MINUTE;
const lockTimestamps = new Map<string, number>();

function acquireLock(lockKey: string): boolean {
  // 检查超时锁
  const ts = lockTimestamps.get(lockKey);
  if (ts && Date.now() - ts > LOCK_TIMEOUT_MS) {
    logger.warn(`[SyncScheduler] Lock timeout, force releasing: ${lockKey}`);
    syncLocks.delete(lockKey);
    lockTimestamps.delete(lockKey);
  }

  if (syncLocks.has(lockKey)) return false;
  syncLocks.add(lockKey);
  lockTimestamps.set(lockKey, Date.now());
  return true;
}

function releaseLock(lockKey: string) {
  syncLocks.delete(lockKey);
  lockTimestamps.delete(lockKey);
}

// ─── 核心逻辑 ───

/**
 * 根据当前比赛状态生成同步计划
 */
export function getSyncPlan(): SyncPlan {
  const db = dbService.getData();
  const now = Date.now();
  const config = getRuntimeConfig();
  const matches = db.matches || [];

  const fixturesDates = new Set<string>();
  const oddsMatchIds: string[] = [];
  const liveMatchIds: string[] = [];
  const settlementMatchIds: string[] = [];

  let hasMatchWithin24h = false;
  let hasMatchWithin2h = false;
  let hasLiveMatch = false;
  let hasFinishedUnsettled = false;

  for (const match of matches) {
    const startTime = new Date(match.startTimeUtc).getTime();
    const timeUntilStart = startTime - now;
    const dateKey = match.startTimeUtc.slice(0, 10);
    fixturesDates.add(dateKey);

    // 进行中
    if (LIVE_STATUSES.has(match.status)) {
      hasLiveMatch = true;
      liveMatchIds.push(match.id);
      oddsMatchIds.push(match.id);
      continue;
    }

    // 已结束未结算
    if (FINISHED_STATUSES.has(match.status) && !match.isSettled) {
      hasFinishedUnsettled = true;
      settlementMatchIds.push(match.id);
      continue;
    }

    // 未开始的比赛
    if (match.status === MatchStatus.NS) {
      if (timeUntilStart <= 2 * MS_PER_HOUR && timeUntilStart > 0) {
        hasMatchWithin2h = true;
        oddsMatchIds.push(match.id);
      } else if (timeUntilStart <= 24 * MS_PER_HOUR && timeUntilStart > 0) {
        hasMatchWithin24h = true;
        oddsMatchIds.push(match.id);
      }
    }
  }

  // 确定优先级
  let priority: SyncPriority;
  let reason: string;

  if (hasLiveMatch) {
    priority = 'LIVE';
    reason = `有 ${liveMatchIds.length} 场比赛进行中`;
  } else if (hasMatchWithin2h) {
    priority = 'HIGH';
    reason = '有比赛2小时内开赛';
  } else if (hasMatchWithin24h) {
    priority = 'NORMAL';
    reason = '有比赛24小时内开赛';
  } else {
    priority = 'LOW';
    reason = '无近期比赛';
  }

  const intervals = PRIORITY_INTERVALS[priority];

  // 更新运行状态
  runtimeState.currentPriority = priority;
  runtimeState.currentReason = reason;

  return {
    fixturesDates: Array.from(fixturesDates),
    oddsMatchIds,
    liveMatchIds,
    settlementMatchIds,
    priority,
    reason,
    fixturesIntervalMs: intervals.fixturesMs,
    oddsIntervalMs: intervals.oddsMs,
    liveScoreIntervalMs: intervals.liveScoreMs,
  };
}

/**
 * 判断是否应该执行赛程同步
 */
export function shouldSyncFixtures(plan: SyncPlan): boolean {
  if (plan.fixturesDates.length === 0) return false;
  return Date.now() - runtimeState.lastFixturesSyncAt >= plan.fixturesIntervalMs;
}

/**
 * 判断是否应该执行赔率同步
 */
export function shouldSyncOdds(plan: SyncPlan): boolean {
  if (plan.oddsMatchIds.length === 0) return false;
  if (plan.oddsIntervalMs === 0) return false;
  return Date.now() - runtimeState.lastOddsSyncAt >= plan.oddsIntervalMs;
}

/**
 * 判断是否应该执行比分同步
 */
export function shouldSyncLiveScore(plan: SyncPlan): boolean {
  if (plan.liveMatchIds.length === 0) return false;
  if (plan.liveScoreIntervalMs === 0) return false;
  return Date.now() - runtimeState.lastLiveScoreSyncAt >= plan.liveScoreIntervalMs;
}

/**
 * 判断是否应该执行结算检查
 */
export function shouldCheckSettlement(): boolean {
  return Date.now() - runtimeState.lastSettlementCheckAt >= 10 * MS_PER_MINUTE;
}

/**
 * 记录同步完成时间
 */
export function markFixturesSynced() {
  runtimeState.lastFixturesSyncAt = Date.now();
}

export function markOddsSynced() {
  runtimeState.lastOddsSyncAt = Date.now();
}

export function markLiveScoreSynced() {
  runtimeState.lastLiveScoreSyncAt = Date.now();
}

export function markSettlementChecked() {
  runtimeState.lastSettlementCheckAt = Date.now();
}

export function markAiRefreshed() {
  runtimeState.lastAiRefreshAt = Date.now();
}

/**
 * 获取当前运行状态（后台展示用）
 */
export function getSyncRuntimeState(): SyncRuntimeState {
  return { ...runtimeState };
}

/**
 * 执行一次动态同步 tick
 * 每分钟由 scheduler 调用，内部根据 SyncPlan 判断是否真正调用 API
 */
export async function runDynamicSyncTick() {
  const plan = getSyncPlan();

  logger.info(`[SyncScheduler] tick: priority=${plan.priority} reason=${plan.reason}`);

  // 1. 结算检查（不依赖外部 API，可独立执行）
  if (plan.settlementMatchIds.length > 0 && shouldCheckSettlement()) {
    if (acquireLock('settlement')) {
      try {
        const { autoSettleFinishedMatches } = await import('../helpers');
        const db = dbService.getData();
        const settledCount = await autoSettleFinishedMatches(db);
        if (settledCount > 0) {
          dbService.save();
          logger.info(`[SyncScheduler] Auto-settled ${settledCount} matches`);
        }
        markSettlementChecked();
      } catch (error) {
        logger.error('[SyncScheduler] Settlement check failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        releaseLock('settlement');
      }
    }
  }

  // 2. 赛程同步
  if (shouldSyncFixtures(plan)) {
    if (acquireLock('fixtures')) {
      try {
        const { syncFixturesForDateWindow } = await import('../sync');
        const { appendSyncLog } = await import('../helpers');
        const db = dbService.getData();
        const config = getRuntimeConfig();

        const result = await syncFixturesForDateWindow({
          apiKey: config.apiFootballKey,
          db,
        });
        appendSyncLog(result.log);
        markFixturesSynced();
        resetFixturesFailures();
        dbService.save();
        logger.info(`[SyncScheduler] Fixtures synced: ${result.log.responseSummary}`);
      } catch (error) {
        recordFixturesFailure();
        logger.error('[SyncScheduler] Fixtures sync failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        releaseLock('fixtures');
      }
    }
  }

  // 3. 赔率同步
  if (shouldSyncOdds(plan)) {
    if (acquireLock('odds')) {
      try {
        const { syncOddsForMatches } = await import('../sync');
        const { appendSyncLog } = await import('../helpers');
        const db = dbService.getData();
        const config = getRuntimeConfig();

        const result = await syncOddsForMatches({
          apiKey: config.theOddsApiKey,
          db,
        });
        appendSyncLog(result.log);
        markOddsSynced();
        resetOddsFailures();
        dbService.save();
        logger.info(`[SyncScheduler] Odds synced: ${result.log.responseSummary}`);
      } catch (error) {
        recordOddsFailure();
        logger.error('[SyncScheduler] Odds sync failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        releaseLock('odds');
      }
    }
  }

  // 4. 比分同步（进行中的比赛）
  if (shouldSyncLiveScore(plan)) {
    if (acquireLock('liveScore')) {
      try {
        const { syncFixturesForDay } = await import('../sync');
        const { appendSyncLog } = await import('../helpers');
        const db = dbService.getData();
        const config = getRuntimeConfig();

        // 获取进行中比赛的日期
        const liveDates = Array.from(
          new Set(
            db.matches
              .filter((m: Match) => LIVE_STATUSES.has(m.status))
              .map((m: Match) => m.startTimeUtc.slice(0, 10)),
          ),
        );

        let changed = false;
        for (const date of liveDates) {
          const result = await syncFixturesForDay({
            apiKey: config.apiFootballKey,
            date,
            db,
          });
          appendSyncLog({
            ...result.log,
            action: 'Sync live fixtures by date',
            requestSummary: `${result.log.requestSummary} [live-dynamic]`,
          });
          if (result.updatedMatches.length > 0 || result.createdMatches.length > 0) {
            changed = true;
          }
        }

        markLiveScoreSynced();
        resetLiveScoreFailures();
        if (changed) {
          dbService.refreshBracketState();
          dbService.save();
        }
        logger.info(`[SyncScheduler] Live score synced for ${liveDates.length} dates`);
      } catch (error) {
        recordLiveScoreFailure();
        logger.error('[SyncScheduler] Live score sync failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        releaseLock('liveScore');
      }
    }
  }

  // 5. 降级方案：无外部 API key 时，基于时间自动推断比赛状态
  const config = getRuntimeConfig();
  if (!hasProviderKey(config.apiFootballKey)) {
    if (acquireLock('fallback-status')) {
      try {
        const db = dbService.getData();
        const now = Date.now();
        let changed = false;

        for (const match of db.matches) {
          // 已结算的比赛不碰
          if (match.isSettled || match.settlementStatus === 'SETTLED') continue;

          const startTime = new Date(match.startTimeUtc).getTime();
          const elapsed = now - startTime;

          if (match.status === MatchStatus.NS) {
            // NS → LIVE：开赛 0~2h
            if (elapsed >= 0 && elapsed < 2 * MS_PER_HOUR) {
              match.status = MatchStatus.LIVE;
              match.operationalStatus = 'LOCKED';
              changed = true;
              logger.info(`[SyncScheduler] Fallback: ${match.id} → LIVE (started ${Math.round(elapsed / MS_PER_MINUTE)}min ago, score unknown)`);
              // 降级模式下不广播虚假比分，只在有真实比分时广播
              if (match.homeScore !== undefined && match.awayScore !== undefined) {
                broadcastScoreUpdate(match.id, match.homeScore, match.awayScore, MatchStatus.LIVE);
              }
            }
            // NS → FT：开赛超过 2h（无真实比分时标记为 scoreUnknown）
            else if (elapsed >= 2 * MS_PER_HOUR) {
              match.status = MatchStatus.FT;
              match.operationalStatus = 'WAITING_SETTLEMENT';
              // 标记比分未知，防止自动结算以 0:0 结算
              if (match.homeScore === undefined || match.awayScore === undefined) {
                (match as any).scoreUnknown = true;
              }
              changed = true;
              logger.info(`[SyncScheduler] Fallback: ${match.id} → FT (started ${Math.round(elapsed / MS_PER_HOUR)}h ago, score ${match.homeScore !== undefined ? 'known' : 'UNKNOWN'})`);
              // 降级模式下不广播虚假比分
              if (match.homeScore !== undefined && match.awayScore !== undefined) {
                broadcastScoreUpdate(match.id, match.homeScore, match.awayScore, MatchStatus.FT);
              }
            }
          } else if ((match.status === MatchStatus.LIVE || match.status === MatchStatus.FT) && elapsed < 0) {
            // 回退修正：比赛还没开始但被标记为 LIVE/FT → 回退为 NS
            const prevStatus = match.status;
            match.status = MatchStatus.NS;
            match.operationalStatus = 'BETTABLE';
            match.homeScore = undefined;
            match.awayScore = undefined;
            (match as any).scoreUnknown = undefined;
            match.isPredictionLocked = false;
            match.predictionLockedAt = undefined;
            match.isOddsFrozen = false;
            match.oddsFrozenAt = undefined;
            changed = true;
            logger.warn(`[SyncScheduler] Fallback CORRECTION: ${match.id} → NS (starts in ${Math.round(-elapsed / MS_PER_MINUTE)}min, was ${prevStatus})`);
            broadcastScoreUpdate(match.id, 0, 0, MatchStatus.NS);
          }
        }

        if (changed) {
          dbService.save();
          logger.info('[SyncScheduler] Fallback status inference applied');
        }
      } catch (error) {
        logger.error('[SyncScheduler] Fallback status inference failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        releaseLock('fallback-status');
      }
    }
  }
}
