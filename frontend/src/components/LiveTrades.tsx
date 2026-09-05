import type { Trade } from '@/lib/api';

function fmtTime(ns: number): string {
  const ms = ns / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function LiveTrades({ trades }: { trades: Trade[] | null }) {
  if (!trades) {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col items-center justify-center h-full min-h-[400px]">
        <span className="text-gray-500 text-sm font-mono animate-pulse">Loading trades...</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">
          Recent Trades
        </h2>
      </div>

      <div className="grid grid-cols-4 px-4 py-1.5 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Side</span>
        <span className="text-right">Time</span>
      </div>

      <div className="overflow-y-auto flex-1">
        {trades.length === 0 ? (
          <div className="text-gray-500 text-xs italic p-4 text-center">No trades yet.</div>
        ) : (
          trades.map((t) => (
            <div
              key={t.trade_id}
              className="grid grid-cols-4 px-4 py-1.5 text-xs border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
            >
              <span
                className={`font-mono tabular-nums font-semibold ${
                  t.side === 'BUY' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {t.price.toFixed(2)}
              </span>
              <span className="text-right text-gray-300 tabular-nums">{t.quantity}</span>
              <span
                className={`text-right text-xs uppercase font-medium ${
                  t.side === 'BUY' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {t.side === 'BUY' ? '▲ Buy' : '▼ Sell'}
              </span>
              <span className="text-right text-gray-500 font-mono">{fmtTime(t.timestamp_ns)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
