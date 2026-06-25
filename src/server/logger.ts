import fs from 'node:fs';
import path from 'node:path';

export type LogLevel =
  | 'info'
  | 'warn'
  | 'error'
  | 'admin'
  | 'settlement'
  | 'ai'
  | 'backup'
  | 'sync';

type LogFileCategory = 'app' | 'admin' | 'settlement' | 'ai' | 'backup' | 'sync';

const LEVEL_PREFIX: Record<LogLevel, string> = {
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
  admin: '[ADMIN]',
  settlement: '[SETTLEMENT]',
  ai: '[AI]',
  backup: '[BACKUP]',
  sync: '[SYNC]',
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  admin: '\x1b[35m',
  settlement: '\x1b[32m',
  ai: '\x1b[34m',
  backup: '\x1b[90m',
  sync: '\x1b[96m',
};

const RESET = '\x1b[0m';
const LOG_DIR = path.resolve(process.env.APP_DATA_DIR || './runtime', 'logs');
const MAX_LOG_SIZE_BYTES = Math.max(1, Number(process.env.APP_LOG_MAX_SIZE_MB || 20)) * 1024 * 1024;
const MAX_ROTATED_FILES = Math.max(1, Number(process.env.APP_LOG_MAX_FILES || 5));
let ensured = false;

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' [unserializable meta]';
  }
}

function formatConsoleMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  return `${LEVEL_COLOR[level]}${LEVEL_PREFIX[level]} ${formatTimestamp()} ${message}${formatMeta(meta)}${RESET}`;
}

function formatFileMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  return `${LEVEL_PREFIX[level]} ${formatTimestamp()} ${message}${formatMeta(meta)}`;
}

function shouldUseStderr(level: LogLevel): boolean {
  return level === 'error' || level === 'warn';
}

function output(line: string, level: LogLevel) {
  if (shouldUseStderr(level)) {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

function ensureLogDir() {
  if (ensured) return;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  ensured = true;
}

function getCategory(level: LogLevel, message: string): LogFileCategory {
  if (level === 'admin' || message.includes('[Admin]')) return 'admin';
  if (level === 'settlement') return 'settlement';
  if (level === 'ai' || message.includes('[AI Prediction]')) return 'ai';
  if (level === 'backup') return 'backup';
  if (level === 'sync' || message.includes('[SyncScheduler]') || message.includes('[SyncLog]')) return 'sync';
  return 'app';
}

function getLogFilePath(category: LogFileCategory) {
  return path.join(LOG_DIR, `${category}.log`);
}

function cleanupRotatedFiles(category: LogFileCategory) {
  const prefix = `${category}.`;
  const suffix = '.log';
  const files = fs
    .readdirSync(LOG_DIR)
    .filter((name) => name.startsWith(prefix) && name.endsWith(suffix) && name !== `${category}.log`)
    .map((name) => {
      const filePath = path.join(LOG_DIR, name);
      return {
        name,
        filePath,
        mtimeMs: fs.statSync(filePath).mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const file of files.slice(MAX_ROTATED_FILES)) {
    try {
      fs.unlinkSync(file.filePath);
    } catch {
      // Ignore cleanup failures.
    }
  }
}

function rotateLogFileIfNeeded(category: LogFileCategory) {
  const filePath = getLogFilePath(category);
  if (!fs.existsSync(filePath)) return;

  const stat = fs.statSync(filePath);
  if (stat.size < MAX_LOG_SIZE_BYTES) return;

  const timestamp = formatTimestamp().replace(/[:.]/g, '-');
  const rotatedPath = path.join(LOG_DIR, `${category}.${timestamp}.log`);
  fs.renameSync(filePath, rotatedPath);
  cleanupRotatedFiles(category);
}

function writeFileLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  try {
    ensureLogDir();
    const category = getCategory(level, message);
    rotateLogFileIfNeeded(category);
    const filePath = getLogFilePath(category);
    fs.appendFileSync(filePath, `${formatFileMessage(level, message, meta)}\n`, 'utf8');
  } catch {
    // File logging should never crash the app.
  }
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  output(formatConsoleMessage(level, message, meta), level);
  writeFileLog(level, message, meta);
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    log('info', message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    log('warn', message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    log('error', message, meta);
  },
  admin(message: string, meta?: Record<string, unknown>) {
    log('admin', message, meta);
  },
  settlement(message: string, meta?: Record<string, unknown>) {
    log('settlement', message, meta);
  },
  ai(message: string, meta?: Record<string, unknown>) {
    log('ai', message, meta);
  },
  backup(message: string, meta?: Record<string, unknown>) {
    log('backup', message, meta);
  },
  sync(message: string, meta?: Record<string, unknown>) {
    log('sync', message, meta);
  },
};

export function getLogDirectory() {
  return LOG_DIR;
}

export function getLogRotationConfig() {
  return {
    directory: LOG_DIR,
    maxFileSizeBytes: MAX_LOG_SIZE_BYTES,
    maxRotatedFiles: MAX_ROTATED_FILES,
  };
}

export default logger;
