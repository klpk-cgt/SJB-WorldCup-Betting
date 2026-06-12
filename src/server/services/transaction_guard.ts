/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 统一业务事务包装器
 *
 * 所有涉及钱包、竞猜、卡牌等强一致性数据的操作，
 * 都应通过 runBusinessTransaction 执行，
 * 而不是在 route 中直接调用 dbService.withWriteLock + dbService.save。
 *
 * 职责：
 * 1. 内部调用 dbService.withWriteLock 保证原子性
 * 2. 成功后统一 dbService.save()
 * 3. 失败时记录日志并抛出异常
 * 4. 禁止 route 内部随意 dbService.save()
 */

import { dbService } from '../../db/db_service';
import logger from '../logger';

export async function runBusinessTransaction<T>(
  name: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  return dbService.withWriteLock(async () => {
    const snapshot = dbService.createSnapshot();
    try {
      const result = await fn();
      dbService.saveOrThrow();
      return result;
    } catch (error) {
      dbService.restoreSnapshot(snapshot);
      logger.error(`[BusinessTx] ${name} failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}
