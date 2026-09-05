// Types matching the Go backend's JSON shapes exactly

export type PriceLevel = {
  price: number;
  total_quantity: number;
};

export type BookSnapshot = {
  bids?: PriceLevel[];
  asks?: PriceLevel[];
  timestamp_ns?: number;
};

export type Trade = {
  trade_id: string;
  buy_order_id: string;
  sell_order_id: string;
  price: number;
  quantity: number;
  timestamp_ns: number;
  side: 'BUY' | 'SELL' | 'UNKNOWN';
};

export type Stats = {
  last_price: number;
  volume: number;
  best_bid: number | null;
  best_ask: number | null;
  spread: number | null;
};

export type WsMessage =
  | { type: 'book'; data: BookSnapshot }
  | { type: 'trade'; data: Trade };

// ─── API helpers ──────────────────────────────────────────────────────────────

// Use Next.js proxy for REST to bypass CORS
const BASE = '/api';

export async function fetchBook(): Promise<BookSnapshot> {
  const r = await fetch(`${BASE}/orderbook`);
  if (!r.ok) throw new Error(`GET /orderbook ${r.status}`);
  return r.json();
}

export async function fetchTrades(): Promise<Trade[]> {
  const r = await fetch(`${BASE}/trades`);
  if (!r.ok) throw new Error(`GET /trades ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchStats(): Promise<Stats> {
  const r = await fetch(`${BASE}/stats`);
  if (!r.ok) throw new Error(`GET /stats ${r.status}`);
  return r.json();
}

export async function postOrder(payload: {
  order_id: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
}): Promise<{ order_id: string; accepted: boolean; message: string }> {
  const r = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.message ?? `POST /orders ${r.status}`);
  return data;
}
