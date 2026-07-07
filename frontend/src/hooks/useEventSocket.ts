// hooks/useEventSocket.ts
import { useEffect, useRef, useState } from 'react';
import { ReconnectingWebSocket } from '@/lib/websocket';

export interface LiveEvent {
  event:     string;          // e.g. "cat.detected"
  payload:   Record<string, unknown>;
  timestamp: string;
}

export function useEventSocket(
  token: string | null,
  onEvent?: (e: LiveEvent) => void,
) {
  const [events, setEvents]       = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const cbRef = useRef(onEvent);

  useEffect(() => {
    cbRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!token) return;

    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')
                   .replace(/^http/, 'ws');
    const ws = new ReconnectingWebSocket(`${base}/api/v1/dashboard/ws?token=${token}`);

    ws.onOpen    = () => setConnected(true);
    ws.onClose   = () => setConnected(false);
    ws.onMessage = (e) => {
      try {
        const ev: LiveEvent = JSON.parse(e.data as string);
        setEvents((prev) => [ev, ...prev].slice(0, 100));
        cbRef.current?.(ev);
      } catch {}
    };

    return () => ws.close();
  }, [token]);

  return { events, connected };
}
