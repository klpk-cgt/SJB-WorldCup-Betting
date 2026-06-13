/**
 * 数据库备份服务
 * 提供 /workspace/h/世界杯娱乐项目/back/klpk-cgt-s-Org v2/db.json 的备份与归档
 */

import fs from 'fs';
import path from 'path';
import logger from './logger';

const DATA_DIR = process.env.APP_DATA_DIR
  ? path.resolve(process.cwd(), process.env.APP_DATA_DIR)
  : process.cwd();
const DB_FILE_PATH = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const ARCHIVE_FILE = path.join(DATA_DIR, 'db.activities.archive.json');

export interface BackupResult {
  ok: boolean;
  filePath?: string;
  size?: number;
  error?: string;
}

/**
 * 确保备份目录存在
 */
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * 生成备份文件名
 * 格式：db.backup.YYYY-MM-DD-HHMMSS.json
 */
function generateBackupFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `db.backup.${yyyy}-${mm}-${dd}-${hh}${mi}${ss}.json`;
}

/**
 * 创建 db.json 备份
 */
export function createBackup(reason = 'manual'): BackupResult {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      return { ok: false, error: 'db.json 不存在，无法备份。' };
    }

    ensureBackupDir();
    const fileName = generateBackupFileName();
    const target = path.join(BACKUP_DIR, fileName);
    fs.copyFileSync(DB_FILE_PATH, target);
    const size = fs.statSync(target).size;
    logger.backup(`Backup created: ${fileName}`, { size, reason });
    return { ok: true, filePath: target, size };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('Backup failed', { error: msg, reason });
    return { ok: false, error: msg };
  }
}

/**
 * 列出所有备份
 */
export function listBackups(): Array<{ name: string; size: number; createdAt: string }> {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('db.backup.'));
    return files
      .map((name) => {
        const full = path.join(BACKUP_DIR, name);
        const stat = fs.statSync(full);
        return { name, size: stat.size, createdAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

/**
 * 获取数据库文件大小
 */
export function getDbFileSize(): { exists: boolean; size: number } {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      return { exists: false, size: 0 };
    }
    const stat = fs.statSync(DB_FILE_PATH);
    return { exists: true, size: stat.size };
  } catch {
    return { exists: false, size: 0 };
  }
}

/**
 * 读取 db.json 内容（用于后台导出）
 */
export function readDbJson(): string | null {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) {
      return null;
    }
    return fs.readFileSync(DB_FILE_PATH, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 将溢出数据追加到归档文件
 * @param items 待归档的动态数组
 * @returns 归档数量
 */
export function archiveActivities<T>(items: T[]): number {
  if (!items || items.length === 0) {
    return 0;
  }
  try {
    let archive: T[] = [];
    if (fs.existsSync(ARCHIVE_FILE)) {
      try {
        const content = fs.readFileSync(ARCHIVE_FILE, 'utf-8');
        archive = JSON.parse(content);
        if (!Array.isArray(archive)) archive = [];
      } catch {
        archive = [];
      }
    }
    archive = archive.concat(items);
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2), 'utf-8');
    logger.info(`Archived ${items.length} items to ${path.basename(ARCHIVE_FILE)}`);
    return items.length;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('Archive activities failed', { error: msg });
    return 0;
  }
}

/**
 * 从备份文件中恢复数据
 * 支持全量恢复或精确恢复单个用户
 */
export interface RestoreOptions {
  /** 'full' = 完整恢复整个数据库; 'user' = 仅恢复指定用户 */
  mode: 'full' | 'user';
  /** mode='user' 时指定要恢复的用户 ID */
  targetUserId?: string;
}

export interface RestoreResult {
  ok: boolean;
  mode: string;
  /** 恢复的用户数量 */
  restoredUsers?: number;
  /** 恢复的钱包数量 */
  restoredWallets?: number;
  /** 恢复的预测记录数量 */
  restoredPredictions?: number;
  /** 恢复的交易记录数量 */
  restoredTransactions?: number;
  /** 恢复的用户详情 */
  restoredUserDetails?: Array<{
    id: string;
    displayName: string;
    loginCode: string;
    balance: number;
  }>;
  error?: string;
}

export function restoreFromBackup(backupFileName: string, options: RestoreOptions): RestoreResult {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    if (!fs.existsSync(backupPath)) {
      return { ok: false, mode: options.mode, error: `备份文件不存在: ${backupFileName}` };
    }

    // 读取备份数据
    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    const backupData = JSON.parse(backupContent);

    if (options.mode === 'full') {
      // 全量恢复：直接写入 db.json
      fs.writeFileSync(DB_FILE_PATH, backupContent, 'utf-8');
      logger.backup(`Full restore from ${backupFileName}`);
      return {
        ok: true,
        mode: 'full',
        restoredUsers: backupData.users?.length || 0,
        restoredWallets: backupData.wallets?.length || 0,
        restoredPredictions: backupData.predictions?.length || 0,
        restoredTransactions: backupData.transactions?.length || 0,
      };
    }

    if (options.mode === 'user' && options.targetUserId) {
      // 精确恢复单个用户
      const { dbService } = require('../db/db_service');
      const db = dbService.getData();

      // 从备份中查找目标用户
      const backupUser = backupData.users?.find((u: any) => u.id === options.targetUserId);
      if (!backupUser) {
        return { ok: false, mode: 'user', error: `备份中未找到用户 ${options.targetUserId}` };
      }

      // 检查当前数据库是否已存在该用户
      const existingIndex = db.users.findIndex((u: any) => u.id === options.targetUserId);

      if (existingIndex >= 0) {
        // 用户已存在，更新用户信息
        db.users[existingIndex] = { ...db.users[existingIndex], ...backupUser };
        logger.backup(`Updated existing user ${backupUser.displayName} (${options.targetUserId})`);
      } else {
        // 用户不存在，添加回来
        db.users.push(backupUser);
        logger.backup(`Restored missing user ${backupUser.displayName} (${options.targetUserId})`);
      }

      // 恢复钱包
      const backupWallet = backupData.wallets?.find((w: any) => w.userId === options.targetUserId);
      if (backupWallet) {
        const walletIndex = db.wallets.findIndex((w: any) => w.userId === options.targetUserId);
        if (walletIndex >= 0) {
          db.wallets[walletIndex] = backupWallet;
        } else {
          db.wallets.push(backupWallet);
        }
      }

      // 恢复交易记录（追加缺失的，不覆盖已有的）
      const backupTransactions = (backupData.transactions || []).filter((t: any) => t.userId === options.targetUserId);
      const existingTxIds = new Set(db.transactions.map((t: any) => t.id));
      const newTransactions = backupTransactions.filter((t: any) => !existingTxIds.has(t.id));
      db.transactions.push(...newTransactions);

      // 恢复预测记录（追加缺失的，不覆盖已有的）
      const backupPredictions = (backupData.predictions || []).filter((p: any) => p.userId === options.targetUserId);
      const existingPredIds = new Set(db.predictions.map((p: any) => p.id));
      const newPredictions = backupPredictions.filter((p: any) => !existingPredIds.has(p.id));
      db.predictions.push(...newPredictions);

      // 恢复卡牌库存
      const backupCardInv = (backupData.cardInventories || []).find((i: any) => i.userId === options.targetUserId);
      if (backupCardInv) {
        const cardInvIndex = (db.cardInventories || []).findIndex((i: any) => i.userId === options.targetUserId);
        if (cardInvIndex >= 0) {
          (db.cardInventories as any)[cardInvIndex] = backupCardInv;
        } else {
          if (!db.cardInventories) (db as any).cardInventories = [];
          (db.cardInventories as any).push(backupCardInv);
        }
      }

      // 恢复徽章和称号
      const backupBadges = (backupData.userBadges || []).filter((b: any) => b.userId === options.targetUserId);
      const existingBadgeIds = new Set((db.userBadges || []).map((b: any) => b.id));
      for (const badge of backupBadges) {
        if (!existingBadgeIds.has(badge.id)) {
          if (!db.userBadges) (db as any).userBadges = [];
          (db.userBadges as any).push(badge);
        }
      }

      const backupTitles = (backupData.userTitles || []).filter((t: any) => t.userId === options.targetUserId);
      const existingTitleIds = new Set((db.userTitles || []).map((t: any) => t.id));
      for (const title of backupTitles) {
        if (!existingTitleIds.has(title.id)) {
          if (!db.userTitles) (db as any).userTitles = [];
          (db.userTitles as any).push(title);
        }
      }

      dbService.save();
      logger.backup(`User restore completed: ${backupUser.displayName} (${options.targetUserId})`);

      return {
        ok: true,
        mode: 'user',
        restoredUsers: 1,
        restoredWallets: backupWallet ? 1 : 0,
        restoredPredictions: newPredictions.length,
        restoredTransactions: newTransactions.length,
        restoredUserDetails: [{
          id: backupUser.id,
          displayName: backupUser.displayName,
          loginCode: backupUser.loginCode,
          balance: backupWallet?.balance ?? 0,
        }],
      };
    }

    return { ok: false, mode: options.mode, error: '不支持的恢复模式' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('Restore failed', { error: msg, backupFileName, options });
    return { ok: false, mode: options.mode, error: msg };
  }
}

export const BACKUP_PATHS = {
  DB_FILE_PATH,
  BACKUP_DIR,
  ARCHIVE_FILE,
};
