/**
 * 全局中间件
 * 包含：请求日志、错误处理、安全头
 */
import type { Request, Response, NextFunction } from 'express';
import logger from './logger';

/**
 * 请求日志中间件
 * 记录每个请求的方法、路径、IP、耗时、状态码
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // 只记录非200或慢请求（>1s）
    if (status >= 400 || duration > 1000) {
      logger.warn(`${method} ${url} ${status} ${duration}ms`, { ip, userAgent: req.headers['user-agent']?.substring(0, 100) });
    } else {
      logger.info(`${method} ${url} ${status} ${duration}ms`);
    }
  });

  next();
}

/**
 * 全局错误处理中间件
 * 捕获所有未处理的异常，返回标准错误格式
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const status = res.statusCode !== 200 ? res.statusCode : 500;

  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack?.substring(0, 500),
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
  });

  // 生产环境不暴露详细错误信息
  const isProd = process.env.NODE_ENV === 'production';

  res.status(status).json({
    error: isProd ? '服务器内部错误' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(req: Request, res: Response) {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl || req.url}`, { ip: req.ip });
  res.status(404).json({ error: '接口不存在' });
}

/**
 * 安全头中间件
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  // 防止 MIME 类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'DENY');
  // XSS 防护
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // 严格传输安全（HTTPS 环境下启用）
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}
