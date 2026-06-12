/**
 * WebSocket 服务 - 基于 socket.io
 * 实现：实时比分推送、赔率变动推送、竞猜结果推送
 */
import { Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';
import logger from './logger';

// 事件类型定义
export type WSEvent =
  | 'match:score_update'      // 比分更新
  | 'match:settled'            // 比赛结算完成
  | 'prediction:result'        // 个人竞猜结果
  | 'odds:change'              // 赔率变动
  | 'system:notification';     // 系统通知

interface WSPayload {
  type: WSEvent;
  data: Record<string, unknown>;
  timestamp: string;
}

interface WSClient {
  socketId: string;
  userId?: string;
  subscribedMatches: Set<string>; // 关注的比赛
  connectedAt: Date;
}

let io: IOServer | null = null;
const clients = new Map<string, WSClient>();

/**
 * 初始化 WebSocket 服务
 */
export function initWebSocket(server: HttpServer) {
  io = new IOServer(server, {
    cors: {
      origin: process.env.APP_CORS_ORIGIN || true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    const client: WSClient = {
      socketId: socket.id,
      subscribedMatches: new Set(),
      connectedAt: new Date(),
    };
    clients.set(socket.id, client);

    logger.info(`[WS] Client connected: ${socket.id}`, { totalClients: clients.size });

    // 用户认证
    socket.on('auth', (userId: string) => {
      client.userId = userId;
      logger.info(`[WS] User authenticated: ${userId} -> ${socket.id}`);
    });

    // 订阅比赛
    socket.on('subscribe:match', (matchId: string) => {
      client.subscribedMatches.add(matchId);
      socket.join(`match:${matchId}`);
    });

    // 取消订阅
    socket.on('unsubscribe:match', (matchId: string) => {
      client.subscribedMatches.delete(matchId);
      socket.leave(`match:${matchId}`);
    });

    // 订阅所有比赛
    socket.on('subscribe:all', () => {
      socket.join('match:*');
    });

    // 断开连接
    socket.on('disconnect', () => {
      clients.delete(socket.id);
      logger.info(`[WS] Client disconnected: ${socket.id}`, { totalClients: clients.size });
    });
  });

  logger.info('[WS] WebSocket server initialized');
}

/**
 * 获取 IO 实例
 */
export function getIO(): IOServer | null {
  return io;
}

/**
 * 广播事件
 */
function broadcast(event: WSEvent, data: Record<string, unknown>, room?: string) {
  if (!io) return;

  const payload: WSPayload = {
    type: event,
    data,
    timestamp: new Date().toISOString(),
  };

  if (room) {
    io.to(room).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}

/**
 * 向指定用户推送
 */
export function sendToUser(userId: string, event: WSEvent, data: Record<string, unknown>) {
  if (!io) return;

  const payload: WSPayload = {
    type: event,
    data,
    timestamp: new Date().toISOString(),
  };

  // 查找该用户的所有连接
  for (const [socketId, client] of clients.entries()) {
    if (client.userId === userId) {
      io.to(socketId).emit(event, payload);
    }
  }
}

/**
 * 推送比分更新
 */
export function broadcastScoreUpdate(matchId: string, homeScore: number, awayScore: number, status: string) {
  broadcast('match:score_update', {
    matchId,
    homeScore,
    awayScore,
    status,
  }, `match:${matchId}`);

  broadcast('match:score_update', {
    matchId,
    homeScore,
    awayScore,
    status,
  }, 'match:*');
}

/**
 * 推送比赛结算结果
 */
export function broadcastMatchSettled(matchId: string, homeScore: number, awayScore: number, winnerTeamId?: string) {
  broadcast('match:settled', {
    matchId,
    homeScore,
    awayScore,
    winnerTeamId,
  }, `match:${matchId}`);

  broadcast('match:settled', {
    matchId,
    homeScore,
    awayScore,
    winnerTeamId,
  }, 'match:*');
}

/**
 * 推送竞猜结果给指定用户
 */
export function sendPredictionResult(userId: string, predictionId: string, matchId: string, status: string, settledReturn: number, settledProfit: number) {
  sendToUser(userId, 'prediction:result', {
    predictionId,
    matchId,
    status,
    settledReturn,
    settledProfit,
  });
}

/**
 * 推送赔率变动
 */
export function broadcastOddsChange(matchId: string, market: string, changes: Record<string, unknown>) {
  broadcast('odds:change', {
    matchId,
    market,
    changes,
  }, `match:${matchId}`);

  broadcast('odds:change', {
    matchId,
    market,
    changes,
  }, 'match:*');
}

/**
 * 推送系统通知
 */
export function broadcastNotification(message: string, level: 'info' | 'warn' | 'success' = 'info') {
  broadcast('system:notification', { message, level });
}

/**
 * 获取在线用户数
 */
export function getOnlineCount(): number {
  return clients.size;
}

/**
 * 获取在线用户列表
 */
export function getOnlineUsers(): { socketId: string; userId?: string; connectedAt: Date }[] {
  return Array.from(clients.values()).map(c => ({
    socketId: c.socketId,
    userId: c.userId,
    connectedAt: c.connectedAt,
  }));
}
