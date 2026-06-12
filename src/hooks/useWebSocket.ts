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
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      setConnected(true);
      // 发送用户认证
      if (userId) {
        socket.emit('auth', userId);
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // 监听各种事件
    socket.on('match:score_update', (payload: WSPayload) => {
      onScoreUpdate?.(payload.data);
    });

    socket.on('match:settled', (payload: WSPayload) => {
      onMatchSettled?.(payload.data);
    });

    socket.on('prediction:result', (payload: WSPayload) => {
      onPredictionResult?.(payload.data);
    });

    socket.on('odds:change', (payload: WSPayload) => {
      onOddsChange?.(payload.data);
    });

    socket.on('system:notification', (payload: WSPayload) => {
      onNotification?.(payload.data);
    });

    socketRef.current = socket;
  }, [userId, onScoreUpdate, onMatchSettled, onPredictionResult, onOddsChange, onNotification]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setConnected(false);
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const subscribeMatch = useCallback((matchId: string) => {
    socketRef.current?.emit('subscribe:match', matchId);
  }, []);

  const unsubscribeMatch = useCallback((matchId: string) => {
    socketRef.current?.emit('unsubscribe:match', matchId);
  }, []);

  // 自动连接/断开
  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connected,
    subscribeMatch,
    unsubscribeMatch,
    socket: socketRef.current,
  };
}
