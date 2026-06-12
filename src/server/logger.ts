/**
 * 统一日志服务
 * 用于替代散落在各处的 console.log/error
 * 当前输出到控制台，后续可扩展到文件存储
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'admin' | 'settlement' | 'ai' | 'backup';

const LEVEL_PREFIX: Record<LogLevel, string> = {
  info: '[INFO]',
  warn: '[WARN]',
  error: '[ERROR]',
  admin: '[ADMIN]',
  settlement: '[SETTLEMENT]',
  ai: '[AI]',
  backup: '[BACKUP]',
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  admin: '\x1b[35m', // magenta
  settlement: '\x1b[32m', // green
  ai: '\x1b[34m', // blue
  backup: '\x1b[90m', // gray
};

const RESET = '\x1b[0m';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, any>): string {
  const timestamp = formatTimestamp();
  const prefix = LEVEL_PREFIX[level];
  const color = LEVEL_COLOR[level];

  let line = `${color}${prefix} ${timestamp} ${message}${RESET}`;

  if (meta && Object.keys(meta).length > 0) {
    try {
      line += ` ${JSON.stringify(meta)}`;
    } catch {
      line += ' [unserializable meta]';
    }
  }

  return line;
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

export const logger = {
  info(message: string, meta?: Record<string, any>) {
    output(formatMessage('info', message, meta), 'info');
  },
  warn(message: string, meta?: Record<string, any>) {
    output(formatMessage('warn', message, meta), 'warn');
  },
  error(message: string, meta?: Record<string, any>) {
    output(formatMessage('error', message, meta), 'error');
  },
  admin(message: string, meta?: Record<string, any>) {
    output(formatMessage('admin', message, meta), 'admin');
  },
  settlement(message: string, meta?: Record<string, any>) {
    output(formatMessage('settlement', message, meta), 'settlement');
  },
  ai(message: string, meta?: Record<string, any>) {
    output(formatMessage('ai', message, meta), 'ai');
  },
  backup(message: string, meta?: Record<string, any>) {
    output(formatMessage('backup', message, meta), 'backup');
  },
};

export default logger;
