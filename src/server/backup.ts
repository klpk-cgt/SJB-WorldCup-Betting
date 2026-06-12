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

export const BACKUP_PATHS = {
  DB_FILE_PATH,
  BACKUP_DIR,
  ARCHIVE_FILE,
};
