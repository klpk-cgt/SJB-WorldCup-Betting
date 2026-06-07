/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { dbService } from './src/db/db_service';
import { getRuntimeConfig, summarizeProviderConfig } from './src/server/config';
import { loadAdminSessions, runScheduledMaintenance, ensureLifecycleForAllMatches } from './src/server/helpers';
import { ensureDefaultOdds } from './src/server/sync';

// ─── Route Modules ───
import authRoutes from './src/server/routes/auth';
import checkinRoutes from './src/server/routes/checkin';
import userRoutes from './src/server/routes/users';
import teamRoutes from './src/server/routes/teams';
import matchRoutes from './src/server/routes/matches';
import aiRoutes from './src/server/routes/ai';
import adminRoutes from './src/server/routes/admin';

const app = express();

// ─── Global Middleware ───

app.use(express.json());

// CORS 配置：允许前端跨域访问
app.use(cors({
  origin: true, // 开发环境允许所有来源，生产环境应改为具体域名
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
}));

// ─── Simple Rate Limiting (in-memory) ───

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

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

// AI 和竞猜接口限流：每分钟最多 20 次
app.use('/api/ai', rateLimit(20, 60 * 1000));
app.use('/api/predictions', rateLimit(20, 60 * 1000));
app.use('/api/tournament-bets', rateLimit(10, 60 * 1000));
app.use('/api/checkin', rateLimit(5, 60 * 1000));
app.use('/api/quiz', rateLimit(10, 60 * 1000));
// 管理员接口限流：每分钟最多 30 次
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

// ─── Start Server ───

async function startServer() {
  // 启动时确保所有已确定比赛有默认赔率
  const db = dbService.getData();
  const filled = ensureDefaultOdds(db);
  if (filled.length > 0) {
    console.log(`[Init] Generated default odds for ${filled.length} matches.`);
    dbService.save();
  }

  ensureLifecycleForAllMatches();

  const providerConfig = summarizeProviderConfig(config);
  for (const [provider, status] of Object.entries(providerConfig)) {
    if (!status.configured) {
      console.info(`[Config] ${provider} is not fully configured. Expected env: ${status.env}`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  setInterval(() => {
    runScheduledMaintenance().catch((error) => {
      console.error('Scheduled maintenance failed', error);
    });
  }, 60 * 1000);

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running successfully on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[启动失败] 端口 ${PORT} 已被占用，请先关闭占用该端口的进程，或修改 PORT 环境变量。`);
      process.exit(1);
    } else {
      throw error;
    }
  });
}

startServer();
