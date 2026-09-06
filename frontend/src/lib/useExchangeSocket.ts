'use client';

import { useEffect, useRef } from 'react';
import type { WsMessage } from '@/lib/api';

export type WsStatus = 'connecting' | 'live' | 'reconnecting' | 'disconnected';

const BACKOFF = [1000, 2000, 5000];
const MAX_RETRIES = 20;

export function useExchangeSocket(
  onMessage: (msg: WsMessage) => void,
  onStatus: (s: WsStatus) => void,
) {
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Use refs for callbacks so we don't need to include them in dependency arrays
  const onMessageRef = useRef(onMessage);
  const onStatusRef = useRef(onStatus);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onStatusRef.current = onStatus;
  }, [onMessage, onStatus]);

  useEffect(() => {
    let isDead = false;
    let ws: WebSocket | null = null;
    
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss://' : 'ws://') + (typeof window !== 'undefined' ? window.location.host : 'localhost:3000') + '/api/ws';

    function connect() {
      if (isDead) return;

      onStatusRef.current(retryRef.current === 0 ? 'connecting' : 'reconnecting');

      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (isDead) {
          ws?.close();
          return;
        }
        retryRef.current = 0;
        onStatusRef.current('live');
      };

      ws.onmessage = (ev) => {
        if (isDead) return;
        try {
          const msg: WsMessage = JSON.parse(ev.data as string);
          onMessageRef.current(msg);
        } catch {
          // malformed message
        }
      };

      ws.onclose = () => {
        if (isDead) return;
        
        retryRef.current += 1;
        if (retryRef.current > MAX_RETRIES) {
          onStatusRef.current('disconnected');
          return;
        }
        const delay = BACKOFF[Math.min(retryRef.current - 1, BACKOFF.length - 1)];
        onStatusRef.current('reconnecting');
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // Will trigger onclose
        ws?.close();
      };
    }

    connect();

    return () => {
      isDead = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (ws) {
        ws.onclose = null; // Prevent onclose from firing and triggering reconnect
        ws.close();
      }
    };
  }, []); // Empty dependency array ensures this runs exactly once per mount
}

