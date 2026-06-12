/**
 * 定时任务调度器
 * 使用 node-cron 替代请求触发的维护任务
 */
import cron from 'node-cron';
import logger from './logger';
import { dbService } from '../db/db_service';
import { autoSettleFinishedMatches, ensureLifecycleForAllMatches } from './helpers';

interface ScheduledTask {
  name: string;
  schedule: string;
  fn: () => Promise<void> | void;
}

// 任务注册表
const tasks: ScheduledTask[] = [];

/**
 * 注册定时任务
 */
export function registerTask(name: string, schedule: string, fn: () => Promise<void> | void) {
  tasks.push({ name, schedule, fn });
}

/**
 * 启动所有定时任务
 */
export function startAllTasks() {
  for (const task of tasks) {
    cron.schedule(task.schedule, async () => {
      logger.info(`[Cron] Running task: ${task.name}`);
      try {
        await task.fn();
        logger.info(`[Cron] Task completed: ${task.name}`);
      } catch (error) {
        logger.error(`[Cron] Task failed: ${task.name}`, { error: error instanceof Error ? error.message : String(error) });
      }
    });
    logger.info(`[Cron] Registered: ${task.name} (${task.schedule})`);
  }
}

/**
 * 初始化所有定时任务
 */
export function initScheduler() {
  // 每 5 分钟：同步外部 API 数据
  registerTask('sync-external-api', '* * * * *', async () => {
    const { runScheduledMaintenance } = await import('./helpers');
    await runScheduledMaintenance();
  });

  // 每 10 分钟：自动结算已结束比赛
  registerTask('auto-settle-matches', '*/10 * * * *', async () => {
    const db = dbService.getData();
    const settledCount = autoSettleFinishedMatches(db);
    if (settledCount > 0) {
      logger.settlement(`Auto-settled ${settledCount} matches`);
      dbService.save();
    }
  });

  // 每 30 分钟：确保比赛生命周期状态
  registerTask('ensure-lifecycle', '*/30 * * * *', () => {
    ensureLifecycleForAllMatches();
  });

  // 每天 02:00：清理过期数据
  registerTask('cleanup-expired', '0 2 * * *', async () => {
    const db = dbService.getData();

    // 清理 7 天前的过期 AI 内容
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const expiredAi = db.aiContents.filter((a: any) => a.expiresAt && a.expiresAt < sevenDaysAgo);
    if (expiredAi.length > 0) {
      db.aiContents = db.aiContents.filter((a: any) => !a.expiresAt || a.expiresAt >= sevenDaysAgo);
      logger.info(`[Cleanup] Removed ${expiredAi.length} expired AI contents`);
      dbService.save();
    }
  });

  // 每天 03:00：清理旧的 rate limit 缓存
  registerTask('cleanup-rate-limits', '0 3 * * *', () => {
    // 清除超过 24 小时的 rate limit 记录
    const now = Date.now();
    // 这个逻辑在 server.ts 的 rateLimitMap 中处理
    logger.info('[Cleanup] Rate limit cache cleanup scheduled');
  });

  // 启动所有任务
  startAllTasks();

  logger.info('[Scheduler] All tasks initialized');
}
