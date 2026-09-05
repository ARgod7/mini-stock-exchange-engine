'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import MarketStats from '@/components/MarketStats';
import OrderBook from '@/components/OrderBook';
import LiveTrades from '@/components/LiveTrades';
import OrderForm from '@/components/OrderForm';
import { fetchBook, fetchTrades, fetchStats, BookSnapshot, Trade, Stats, WsMessage } from '@/lib/api';
import { useExchangeSocket, WsStatus } from '@/lib/useExchangeSocket';

export default function Dashboard() {
  const [book, setBook] = useState<BookSnapshot | null>(null);
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');

  // Track processed trade IDs to prevent duplicate processing (e.g., from WS reconnects or fetch race conditions)
  const processedTrades = useRef<Set<string>>(new Set());

  // Initial fetch
  useEffect(() => {
    async function loadData() {
      try {
        const [b, t, s] = await Promise.all([
          fetchBook(),
          fetchTrades(),
          fetchStats(),
        ]);
        setBook(b);
        setTrades(t);
        setStats(s);
        
        // Add all fetched trades to the processed set
        if (t) {
          t.forEach(trade => processedTrades.current.add(trade.trade_id));
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    }
    loadData();
  }, []);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === 'book') {
      setBook(msg.data);
    } else if (msg.type === 'trade') {
      const tradeId = msg.data.trade_id;
      
      // Deduplicate: if we've already seen this trade, ignore it
      if (processedTrades.current.has(tradeId)) {
        return;
      }
      processedTrades.current.add(tradeId);

      setTrades((prev) => {
        if (!prev) return [msg.data];
        return [msg.data, ...prev].slice(0, 100); // keep last 100
      });
      
      // Update stats optimistically based on the new trade
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          last_price: msg.data.price,
          volume: prev.volume + msg.data.quantity,
        };
      });
    }
  }, []);

  useExchangeSocket(handleWsMessage, setWsStatus);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-700/80 px-6 py-3 flex items-center gap-4 bg-gray-900/95 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-black text-white tracking-widest">MSEX</span>
          <span className="text-gray-600 text-xs font-mono">|</span>
          <span className="text-gray-500 text-sm font-mono">Mini Stock Exchange Engine</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded">
            {wsStatus === 'live' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                <span className="text-green-500 font-bold tracking-wider">LIVE</span>
              </>
            )}
            {wsStatus === 'connecting' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
                <span className="text-blue-500 font-bold tracking-wider">CONNECTING</span>
              </>
            )}
            {wsStatus === 'reconnecting' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block animate-pulse" />
                <span className="text-yellow-500 font-bold tracking-wider">RECONNECTING</span>
              </>
            )}
            {wsStatus === 'disconnected' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                <span className="text-red-500 font-bold tracking-wider">DISCONNECTED</span>
              </>
            )}
          </span>
        </div>
      </header>

      {/* Stats bar */}
      <div className="border-b border-gray-700/80 px-6 py-3 bg-gray-900">
        <MarketStats stats={stats} />
      </div>

      {/* Main content */}
      <main className="flex-1 grid grid-cols-12 gap-4 p-4 lg:p-6 min-h-0">
        {/* Order Book */}
        <section className="col-span-12 lg:col-span-4 xl:col-span-4">
          <OrderBook book={book} />
        </section>

        {/* Live Trades */}
        <section className="col-span-12 lg:col-span-5 xl:col-span-5 flex flex-col" style={{ minHeight: '420px' }}>
          <LiveTrades trades={trades} />
        </section>

        {/* Order Form */}
        <section className="col-span-12 lg:col-span-3 xl:col-span-3">
          <OrderForm />
        </section>
      </main>
    </div>
  );
}
