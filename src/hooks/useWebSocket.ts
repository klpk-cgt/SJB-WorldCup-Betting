/**
 * WebSocket 客户端 Hook
 * 提供实时比分、竞猜结果、赔率变动推送
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type WSEventType =
  | 'match:score_update'
  | 'match:settled'
  | 'prediction:result'
  | 'odds:change'
  | 'system:notification';

interface WSPayload {
  type: WSEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

interface UseWebSocketOptions {
  userId?: string;
  enabled?: boolean;
  onScoreUpdate?: (data: WSPayload['data']) => void;
  onMatchSettled?: (data: WSPayload['data']) => void;
  onPredictionResult?: (data: WSPayload['data']) => void;
  onOddsChange?: (data: WSPayload['data']) => void;
  onNotification?: (data: WSPayload['data']) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    userId,
    enabled = true,
    onScoreUpdate,
    onMatchSettled,
    onPredictionResult,
    onOddsChange,
    onNotification,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // 用 ref 存储回调，避免 useCallback 依赖变化导致无限重连
  const callbacksRef = useRef({
    onScoreUpdate,
    onMatchSettled,
    onPredictionResult,
    onOddsChange,
    onNotification,
  });
  callbacksRef.current = {
    onScoreUpdate,
    onMatchSettled,
    onPredictionResult,
    onOddsChange,
    onNotification,
  };

  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // 只在 enabled 变化时连接/断开
  useEffect(() => {
    if (!enabled) return;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 20,
      timeout: 10000,
    });

    socket.on('connect', () => {
      setConnected(true);
      if (userIdRef.current) {
        socket.emit('auth', userIdRef.current);
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('match:score_update', (payload: WSPayload) => {
      callbacksRef.current.onScoreUpdate?.(payload.data);
    });

    socket.on('match:settled', (payload: WSPayload) => {
      callbacksRef.current.onMatchSettled?.(payload.data);
    });

    socket.on('prediction:result', (payload: WSPayload) => {
      callbacksRef.current.onPredictionResult?.(payload.data);
    });

    socket.on('odds:change', (payload: WSPayload) => {
      callbacksRef.current.onOddsChange?.(payload.data);
    });

    socket.on('system:notification', (payload: WSPayload) => {
      callbacksRef.current.onNotification?.(payload.data);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  // userId 变化时重新认证
  useEffect(() => {
    if (userId && socketRef.current?.connected) {
      socketRef.current.emit('auth', userId);
    }
  }, [userId]);

  const subscribeMatch = useCallback((matchId: string) => {
    socketRef.current?.emit('subscribe:match', matchId);
  }, []);

  const unsubscribeMatch = useCallback((matchId: string) => {
    socketRef.current?.emit('unsubscribe:match', matchId);
  }, []);

  return {
    connected,
    subscribeMatch,
    unsubscribeMatch,
    socket: socketRef.current,
  };
}
