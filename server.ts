/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'http';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { dbService } from './src/db/db_service';
import { getRuntimeConfig, summarizeProviderConfig } from './src/server/config';
import { loadAdminSessions, ensureLifecycleForAllMatches, requireAdmin } from './src/server/helpers';
import { ensureDefaultOdds } from './src/server/sync';
import logger from './src/server/logger';
import { createBackup, getDbFileSize, listBackups, readDbJson } from './src/server/backup';
import { validateEnv } from './src/server/env_validator';
import { initScheduler } from './src/server/scheduler';
import { requestLogger, errorHandler, notFoundHandler, securityHeaders } from './src/server/middleware';
import { initWebSocket, getOnlineCount } from './src/server/websocket';

// ─── Route Modules ───
import authRoutes from './src/server/routes/auth';
import checkinRoutes from './src/server/routes/checkin';
import userRoutes from './src/server/routes/users';
import teamRoutes from './src/server/routes/teams';
import matchRoutes from './src/server/routes/matches';
import aiRoutes from './src/server/routes/ai';
import adminRoutes from './src/server/routes/admin';
import activityRoutes from './src/server/routes/activities';
import cardRoutes from './src/server/routes/cards';
import adminDashboardRoutes from './src/server/routes/admin_dashboard';
import homeRoutes from './src/server/routes/home';

const app = express();

// ─── 启动校验 ───
validateEnv();

// ─── Global Middleware ───
app.use(express.json());
app.use(securityHeaders);
app.use(requestLogger);

// CORS 配置
const isProd = process.env.NODE_ENV === 'production';
const corsOrigin = process.env.APP_CORS_ORIGIN || true;

app.use(cors({
  origin: isProd ? corsOrigin : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
}));

// ─── Simple Rate Limiting (in-memory) ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// 定期清理过期的 rate limit 记录（每小时）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 60 * 1000);

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      return res.status(429).json({ error: '请求过于频繁，请稍后再试。' });
    }

    next();
  };
}

// AI 和竞猜接口限流
app.use('/api/ai', rateLimit(20, 60 * 1000));
app.use('/api/predictions', rateLimit(20, 60 * 1000));
app.use('/api/tournament-bets', rateLimit(10, 60 * 1000));
app.use('/api/checkin', rateLimit(5, 60 * 1000));
app.use('/api/quiz', rateLimit(10, 60 * 1000));
app.use('/api/admin', rateLimit(30, 60 * 1000));

// ─── Initialize ───
const PORT = Number(process.env.PORT || 3000);
const config = getRuntimeConfig();

loadAdminSessions();
dbService.getData();

// ─── Register Routes ───
app.use(authRoutes);
app.use(checkinRoutes);
app.use(userRoutes);
app.use(teamRoutes);
app.use(matchRoutes);
app.use(aiRoutes);
app.use(adminRoutes);
app.use(activityRoutes);
app.use(cardRoutes);
app.use(adminDashboardRoutes);
app.use(homeRoutes);

// ─── Health Check ───
app.get('/api/health', (_req, res) => {
  const db = dbService.getData();
  const size = getDbFileSize();
  const memUsage = process.memoryUsage();

  res.json({
    ok: true,
    time: new Date().toISOString(),
    version: '1.0.0',
    db: dbService.getStorageInfo().mode,
    uptime: Math.floor(process.uptime()),
    stats: {
      users: db.users.length,
      matches: db.matches.length,
      predictions: db.predictions.length,
      dbFileSize: size.size,
    },
    // 增强的监控指标
    metrics: {
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(1)}MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      },
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development',
      rateLimitCacheSize: rateLimitMap.size,
      wsOnlineUsers: getOnlineCount(),
    },
  });
});

// ─── Admin: 数据备份与导出 ───
const ADMIN_TOKEN_HEADER = 'x-admin-token';

function checkAdminToken(req: express.Request, res: express.Response): boolean {
  const token = (req.headers[ADMIN_TOKEN_HEADER] as string) || '';
  if (!token) {
    res.status(401).json({ error: '缺少管理员令牌。' });
    return false;
  }
  if (!requireAdmin(req, res)) {
    return false;
  }
  return true;
}

app.post('/api/admin/backup/create', (req, res) => {
  if (!checkAdminToken(req, res)) return;
  const reason = String(req.body?.reason || 'manual');
  const result = createBackup(reason);
  if (!result.ok) {
    return res.status(500).json({ error: result.error || '备份失败。' });
  }
  res.json({ success: true, ...result, reason });
});

app.get('/api/admin/backup/list', (req, res) => {
  if (!checkAdminToken(req, res)) return;
  res.json({ success: true, backups: listBackups() });
});

app.get('/api/admin/backup/status', (req, res) => {
  if (!checkAdminToken(req, res)) return;
  res.json({ success: true, ...getDbFileSize(), backups: listBackups().slice(0, 5) });
});

app.get('/api/admin/backup/export', (req, res) => {
  if (!checkAdminToken(req, res)) return;
  const content = readDbJson();
  if (!content) {
    return res.status(404).json({ error: 'db.json 不存在。' });
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="db.export.${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(content);
});

// ─── 404 Handler (API only - must be before SPA fallback) ───
app.use('/api', notFoundHandler);

// ─── Global Error Handler ───
app.use(errorHandler);

// ─── Start Server ───
async function startServer() {
  // 启动时确保所有已确定比赛有默认赔率
  const db = dbService.getData();
  const filled = ensureDefaultOdds(db);
  if (filled.length > 0) {
    logger.info(`[Init] Generated default odds for ${filled.length} matches.`);
    dbService.save();
  }

  ensureLifecycleForAllMatches();

  const providerConfig = summarizeProviderConfig(config);
  for (const [provider, status] of Object.entries(providerConfig)) {
    if (!status.configured) {
      logger.info(`[Config] ${provider} is not fully configured. Expected env: ${status.env}`);
    }
  }

  // 初始化定时任务调度器
  initScheduler();

  // ─── Static Files & SPA (must be after API routes, before catch-all 404) ───
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '7d',
      etag: true,
      setHeaders: (res, filePath) => {
        // 图片/字体等静态资源缓存 1 年
        if (/\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // JS/CSS 缓存 1 年（Vite 构建带 hash）
        if (/\.(js|css)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // HTML 不缓存
        if (/\.html$/.test(filePath)) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));
    // SPA fallback: 所有非 /api 路由返回 index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = createHttpServer(app);

  // 初始化 WebSocket 服务
  initWebSocket(server);

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server started on http://0.0.0.0:${PORT}`, {
      env: process.env.NODE_ENV || 'development',
      db: dbService.getStorageInfo().mode,
      pid: process.pid,
    });
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`[Startup Failed] Port ${PORT} is already in use. Close the process or change PORT env.`);
      process.exit(1);
    } else {
      throw error;
    }
  });

  // 优雅关闭
  const gracefulShutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      dbService.save();
      logger.info('Server closed. Saved database.');
      process.exit(0);
    });
    // 强制退出超时
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((error) => {
  logger.error('Failed to start server', { error: error.message, stack: error.stack });
  process.exit(1);
});

// 进程级未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - attempting graceful shutdown', { error: error.message, stack: error.stack });
  try { dbService.save(); } catch { /* best effort */ }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: reason instanceof Error ? reason.message : String(reason) });
  // 不退出进程，仅记录日志，避免单次异步错误导致整个服务崩溃
});
