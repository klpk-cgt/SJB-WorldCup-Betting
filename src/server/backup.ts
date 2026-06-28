import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import logger from './logger';

const DATA_DIR = process.env.APP_DATA_DIR
  ? path.resolve(process.cwd(), process.env.APP_DATA_DIR)
  : process.cwd();
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const ARCHIVE_FILE = path.join(DATA_DIR, 'db.activities.archive.json');
const STORAGE_SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'db-storage.mjs');
const STORAGE_SCRIPT_MAX_BUFFER = 64 * 1024 * 1024;

export interface BackupResult {
  ok: boolean;
  filePath?: string;
  size?: number;
  error?: string;
}

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function generateBackupFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `mysql.backup.${yyyy}-${mm}-${dd}-${hh}${mi}${ss}.json`;
}

function loadStructuredSnapshot(): string {
  if (!fs.existsSync(STORAGE_SCRIPT_PATH)) {
    throw new Error(`Storage script not found: ${STORAGE_SCRIPT_PATH}`);
  }

  return execFileSync(process.execPath, [STORAGE_SCRIPT_PATH, 'load'], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: STORAGE_SCRIPT_MAX_BUFFER,
  });
}

function saveStructuredSnapshot(filePath: string) {
  if (!fs.existsSync(STORAGE_SCRIPT_PATH)) {
    throw new Error(`Storage script not found: ${STORAGE_SCRIPT_PATH}`);
  }

  execFileSync(process.execPath, [STORAGE_SCRIPT_PATH, 'save', filePath], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: STORAGE_SCRIPT_MAX_BUFFER,
  });
}

export function createBackup(reason = 'manual'): BackupResult {
  try {
    ensureBackupDir();
    const fileName = generateBackupFileName();
    const target = path.join(BACKUP_DIR, fileName);
    fs.writeFileSync(target, loadStructuredSnapshot(), 'utf-8');
    const size = fs.statSync(target).size;
    logger.backup(`MySQL structured backup created: ${fileName}`, { size, reason });
    return { ok: true, filePath: target, size };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('Backup failed', { error: msg, reason });
    return { ok: false, error: msg };
  }
}

export function listBackups(): Array<{ name: string; size: number; createdAt: string }> {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
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

export function getDbFileSize(): { exists: boolean; size: number } {
  try {
    const snapshot = loadStructuredSnapshot();
    return { exists: true, size: Buffer.byteLength(snapshot, 'utf-8') };
  } catch {
    return { exists: false, size: 0 };
  }
}

export function readDbJson(): string | null {
  try {
    return loadStructuredSnapshot();
  } catch {
    return null;
  }
}

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

export interface RestoreOptions {
  mode: 'full' | 'user';
  targetUserId?: string;
}

export interface RestoreResult {
  ok: boolean;
  mode: string;
  restoredUsers?: number;
  restoredWallets?: number;
  restoredPredictions?: number;
  restoredTransactions?: number;
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
      return { ok: false, mode: options.mode, error: `Backup file not found: ${backupFileName}` };
    }

    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    const backupData = JSON.parse(backupContent);

    if (options.mode === 'full') {
      const tempFile = path.join(os.tmpdir(), `worldcup-restore-${Date.now()}.json`);
      fs.writeFileSync(tempFile, backupContent, 'utf-8');
      try {
        saveStructuredSnapshot(tempFile);
      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }

      logger.backup(`Full MySQL restore from ${backupFileName}`);
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
      const { dbService } = require('../db/db_service');
      const db = dbService.getData();

      const backupUser = backupData.users?.find((u: any) => u.id === options.targetUserId);
      if (!backupUser) {
        return { ok: false, mode: 'user', error: `User ${options.targetUserId} not found in backup` };
      }

      const existingIndex = db.users.findIndex((u: any) => u.id === options.targetUserId);
      if (existingIndex >= 0) {
        db.users[existingIndex] = { ...db.users[existingIndex], ...backupUser };
      } else {
        db.users.push(backupUser);
      }

      const backupWallet = backupData.wallets?.find((w: any) => w.userId === options.targetUserId);
      if (backupWallet) {
        const walletIndex = db.wallets.findIndex((w: any) => w.userId === options.targetUserId);
        if (walletIndex >= 0) {
          db.wallets[walletIndex] = backupWallet;
        } else {
          db.wallets.push(backupWallet);
        }
      }

      const backupTransactions = (backupData.transactions || []).filter((t: any) => t.userId === options.targetUserId);
      const existingTxIds = new Set(db.transactions.map((t: any) => t.id));
      const newTransactions = backupTransactions.filter((t: any) => !existingTxIds.has(t.id));
      db.transactions.push(...newTransactions);

      const backupPredictions = (backupData.predictions || []).filter((p: any) => p.userId === options.targetUserId);
      const existingPredIds = new Set(db.predictions.map((p: any) => p.id));
      const newPredictions = backupPredictions.filter((p: any) => !existingPredIds.has(p.id));
      db.predictions.push(...newPredictions);

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

      dbService.save();
      logger.backup(`User restore completed: ${backupUser.displayName} (${options.targetUserId})`);

      return {
        ok: true,
        mode: 'user',
        restoredUsers: 1,
        restoredWallets: backupWallet ? 1 : 0,
        restoredPredictions: newPredictions.length,
        restoredTransactions: newTransactions.length,
        restoredUserDetails: [
          {
            id: backupUser.id,
            displayName: backupUser.displayName,
            loginCode: backupUser.loginCode,
            balance: backupWallet?.balance ?? 0,
          },
        ],
      };
    }

    return { ok: false, mode: options.mode, error: 'Unsupported restore mode' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('Restore failed', { error: msg, backupFileName, options });
    return { ok: false, mode: options.mode, error: msg };
  }
}

export const BACKUP_PATHS = {
  BACKUP_DIR,
  ARCHIVE_FILE,
};
