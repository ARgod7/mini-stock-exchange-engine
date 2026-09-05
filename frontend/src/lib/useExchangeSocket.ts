'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { WsMessage } from '@/lib/api';

export type WsStatus = 'connecting' | 'live' | 'reconnecting' | 'disconnected';

// Backoff delays in ms: 1s, 2s, 5s, then stay at 5s
const BACKOFF = [1000, 2000, 5000];
const MAX_RETRIES = 20; // give up after this many consecutive failures

export function useExchangeSocket(
  onMessage: (msg: WsMessage) => void,
  onStatus: (s: WsStatus) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadRef = useRef(false); // set true on unmount to stop reconnects

  const WS_URL =
    (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080') + '/ws';

  const connect = useCallback(() => {
    if (deadRef.current) return;

    onStatus(retryRef.current === 0 ? 'connecting' : 'reconnecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      onStatus('live');
    };

    ws.onmessage = (ev) => {
      try {
        const msg: WsMessage = JSON.parse(ev.data as string);
        onMessage(msg);
      } catch {
        // malformed message — ignore
      }
    };

    ws.onclose = () => {
      if (deadRef.current) return;
      retryRef.current += 1;
      if (retryRef.current > MAX_RETRIES) {
        onStatus('disconnected');
        return;
      }
      const delay = BACKOFF[Math.min(retryRef.current - 1, BACKOFF.length - 1)];
      onStatus('reconnecting');
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close(); // triggers onclose → retry
    };
  }, [WS_URL, onMessage, onStatus]);

  useEffect(() => {
    deadRef.current = false;
    connect();
    return () => {
      deadRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
