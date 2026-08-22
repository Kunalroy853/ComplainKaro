import { useEffect, useRef, useCallback } from 'react';
import { BASE_WS_URL } from '../api/client';

type WSHandler = (data: unknown) => void;

export interface UseWebSocketOptions {
  token: string | null;
  onMessage: WSHandler;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

/**
 * Manages a WebSocket connection with automatic reconnection.
 * Authenticates via JWT token in query string.
 */
export function useWebSocket({ token, onMessage, onConnected, onDisconnected }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!token || !mountedRef.current) return;

    const url = `${BASE_WS_URL}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[WS] Connected');
      onConnected?.();
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const parsed = JSON.parse(event.data);
        onMessage(parsed);
      } catch {
        console.warn('[WS] Non-JSON message:', event.data);
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      console.log('[WS] Disconnected — reconnecting in 3s');
      onDisconnected?.();
      // Auto-reconnect
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, [token, onMessage, onConnected, onDisconnected]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional unmount
        wsRef.current.close();
      }
    };
  }, [connect]);
}
