/**
 * Unified logger for console output and runtime file logs.
 */

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
let ensured = false;

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMeta(meta?: Record<string, any>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return '';
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' [unserializable meta]';
  }
}

function formatConsoleMessage(level: LogLevel, message: string, meta?: Record<string, any>): string {
  return `${LEVEL_COLOR[level]}${LEVEL_PREFIX[level]} ${formatTimestamp()} ${message}${formatMeta(meta)}${RESET}`;
}

function formatFileMessage(level: LogLevel, message: string, meta?: Record<string, any>): string {
  return `${LEVEL_PREFIX[level]} ${formatTimestamp()} ${message}${formatMeta(meta)}`;
}

function shouldUseStderr(level: LogLevel): boolean {
  return level === 'error' || level === 'warn';
}

function output(line: string, level: LogLevel) {
  if (shouldUseStderr(level)) {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
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

function writeFileLog(level: LogLevel, message: string, meta?: Record<string, any>) {
  try {
    ensureLogDir();
    const filePath = path.join(LOG_DIR, `${getCategory(level, message)}.log`);
    fs.appendFileSync(filePath, `${formatFileMessage(level, message, meta)}\n`, 'utf8');
  } catch {
    // File logging should never crash the app.
  }
}

function log(level: LogLevel, message: string, meta?: Record<string, any>) {
  output(formatConsoleMessage(level, message, meta), level);
  writeFileLog(level, message, meta);
}

export const logger = {
  info(message: string, meta?: Record<string, any>) {
    log('info', message, meta);
  },
  warn(message: string, meta?: Record<string, any>) {
    log('warn', message, meta);
  },
  error(message: string, meta?: Record<string, any>) {
    log('error', message, meta);
  },
  admin(message: string, meta?: Record<string, any>) {
    log('admin', message, meta);
  },
  settlement(message: string, meta?: Record<string, any>) {
    log('settlement', message, meta);
  },
  ai(message: string, meta?: Record<string, any>) {
    log('ai', message, meta);
  },
  backup(message: string, meta?: Record<string, any>) {
    log('backup', message, meta);
  },
  sync(message: string, meta?: Record<string, any>) {
    log('sync', message, meta);
  },
};

export function getLogDirectory() {
  return LOG_DIR;
}

export default logger;
