import { useEffect, useRef, useState, useCallback } from "react";

import { WS_BASE_URL, STORAGE_KEYS } from "../constants/config";
import { getItem, getItemSync } from "../utils/storage";

export interface UseWebSocketOptions {
  path: string; // e.g. `/ws/orders/${orderId}/tracking/`
  enabled?: boolean;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: (event: WebSocketCloseEvent) => void;
  onError?: (event: Event) => void;
  autoReconnect?: boolean;
  heartbeatIntervalMs?: number;
}

export function useWebSocket({
  path,
  enabled = true,
  onMessage,
  onOpen,
  onClose,
  onError,
  autoReconnect = true,
  heartbeatIntervalMs = 25000,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Keep latest callbacks in refs to avoid reconnection cycles
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const clearHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const clearReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const connect = useCallback(async () => {
    if (!enabled || !path) return;

    // Close any existing socket cleanly
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {}
      socketRef.current = null;
    }

    clearReconnect();
    clearHeartbeat();

    try {
      const token =
        (await getItem(STORAGE_KEYS.TOKEN)) || getItemSync(STORAGE_KEYS.TOKEN);
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      const separator = cleanPath.includes("?") ? "&" : "?";
      const url = token
        ? `${WS_BASE_URL}${cleanPath}${separator}token=${encodeURIComponent(token)}`
        : `${WS_BASE_URL}${cleanPath}`;

      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onOpenRef.current?.();

        // Start heartbeat keep-alive
        if (heartbeatIntervalMs > 0) {
          clearHeartbeat();
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "PING" }));
              } catch {}
            }
          }, heartbeatIntervalMs);
        }
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.type === "PONG") return; // Ignore heartbeat response
          setLastMessage(parsed);
          onMessageRef.current?.(parsed);
        } catch {
          setLastMessage(event.data);
          onMessageRef.current?.(event.data);
        }
      };

      ws.onerror = (err) => {
        if (!isMountedRef.current) return;
        onErrorRef.current?.(err);
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        clearHeartbeat();
        onCloseRef.current?.(event);

        // Schedule reconnection with exponential backoff (1s, 2s, 4s, max 16s)
        if (autoReconnect && enabled && isMountedRef.current) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            16000,
          );
          reconnectAttemptsRef.current += 1;
          clearReconnect();
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && enabled) {
              connect();
            }
          }, delay);
        }
      };
    } catch (e) {
      console.warn("[useWebSocket] Connection attempt error:", e);
    }
  }, [path, enabled, autoReconnect, heartbeatIntervalMs]);

  const sendMessage = useCallback((data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = typeof data === "string" ? data : JSON.stringify(data);
      socketRef.current.send(payload);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      clearReconnect();
      clearHeartbeat();
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {}
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnect: connect,
  };
}
