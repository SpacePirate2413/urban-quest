import { useEffect, useRef } from 'react';
import { useWriterStore } from '../store/useWriterStore';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api')
  .replace(/^http/, 'ws');

export function useNotifications(onEvent) {
  const socketRef = useRef(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const { isAuthenticated } = useWriterStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    let reconnectTimer = null;

    // Stored on a ref so onclose can reference the same function without
    // ESLint flagging a self-reference TDZ.
    const connectRef = { current: null };
    connectRef.current = () => {
      if (cancelled) return;
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onEventRef.current?.(data);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = (e) => {
        socketRef.current = null;
        // Reconnect after 3s unless the close was intentional (4001 = auth).
        if (e.code !== 4001 && !cancelled) {
          reconnectTimer = setTimeout(() => connectRef.current?.(), 3000);
        }
      };

      ws.onerror = () => ws.close();

      socketRef.current = ws;
    };

    connectRef.current();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [isAuthenticated]);
}
