import type { NextFunction, Request, Response } from 'express';
import logger from './logger';

const QUIET_PATH_PATTERNS = [
  /^\/api\/health(?:\/|$)/,
  /^\/socket\.io(?:\/|$)/,
  /^\/assets(?:\/|$)/,
];

function shouldSkipInfoLog(url: string) {
  return QUIET_PATH_PATTERNS.some((pattern) => pattern.test(url));
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const isProd = process.env.NODE_ENV === 'production';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const meta = { ip, userAgent: req.headers['user-agent']?.substring(0, 120) };

    if (status >= 500) {
      logger.error(`${method} ${url} ${status} ${duration}ms`, meta);
      return;
    }

    if (status >= 400 || duration > 1000) {
      logger.warn(`${method} ${url} ${status} ${duration}ms`, meta);
      return;
    }

    if (isProd || shouldSkipInfoLog(url)) {
      return;
    }

    logger.info(`${method} ${url} ${status} ${duration}ms`);
  });

  next();
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const status = res.statusCode !== 200 ? res.statusCode : 500;

  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack?.substring(0, 500),
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
  });

  const isProd = process.env.NODE_ENV === 'production';

  res.status(status).json({
    error: isProd ? '服务器内部错误' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl || req.url}`, { ip: req.ip });
  res.status(404).json({ error: '接口不存在' });
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}
