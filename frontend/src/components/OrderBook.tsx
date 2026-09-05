import type { BookSnapshot } from '@/lib/api';

export default function OrderBook({ book }: { book: BookSnapshot | null }) {
  if (!book) {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden h-full flex items-center justify-center min-h-[400px]">
        <span className="text-gray-500 text-sm font-mono animate-pulse">Loading order book...</span>
      </div>
    );
  }

  const bids = book.bids || [];
  const asks = book.asks || [];

  const maxBidQty = Math.max(1, ...bids.map((b) => b.total_quantity));
  const maxAskQty = Math.max(1, ...asks.map((a) => a.total_quantity));

  const bestBid = bids.length > 0 ? bids[0].price : null;
  const bestAsk = asks.length > 0 ? asks[0].price : null;
  const spread = bestAsk !== null && bestBid !== null ? bestAsk - bestBid : null;
  const mid = bestAsk !== null && bestBid !== null ? (bestAsk + bestBid) / 2 : null;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">
          Order Book
        </h2>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-700 flex-1 overflow-hidden">
        {/* Bids */}
        <div className="flex flex-col">
          <div className="grid grid-cols-2 px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
            <span>Size</span>
            <span className="text-right">Bid</span>
          </div>
          <div className="overflow-y-auto flex-1">
            {bids.map((bid, i) => {
              const pct = (bid.total_quantity / maxBidQty) * 100;
              return (
                <div key={i} className="relative px-3 py-1.5 group">
                  {/* depth bar */}
                  <div
                    className="absolute inset-y-0 right-0 bg-green-900/30"
                    style={{ width: `${pct}%` }}
                  />
                  <div className={`relative grid grid-cols-2 text-xs ${i === 0 ? 'font-bold' : ''}`}>
                    <span className="text-gray-300 tabular-nums">{bid.total_quantity}</span>
                    <span
                      className={`text-right font-mono tabular-nums ${
                        i === 0 ? 'text-green-400' : 'text-green-600'
                      }`}
                    >
                      {bid.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Asks */}
        <div className="flex flex-col">
          <div className="grid grid-cols-2 px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
            <span>Ask</span>
            <span className="text-right">Size</span>
          </div>
          <div className="overflow-y-auto flex-1">
            {asks.map((ask, i) => {
              const pct = (ask.total_quantity / maxAskQty) * 100;
              return (
                <div key={i} className="relative px-3 py-1.5 group">
                  {/* depth bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-red-900/30"
                    style={{ width: `${pct}%` }}
                  />
                  <div className={`relative grid grid-cols-2 text-xs ${i === 0 ? 'font-bold' : ''}`}>
                    <span
                      className={`font-mono tabular-nums ${
                        i === 0 ? 'text-red-400' : 'text-red-600'
                      }`}
                    >
                      {ask.price.toFixed(2)}
                    </span>
                    <span className="text-right text-gray-300 tabular-nums">
                      {ask.total_quantity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spread row */}
      <div className="px-4 py-2 border-t border-gray-700 flex justify-center gap-3 text-xs text-gray-500 bg-gray-800">
        <span>
          Spread:{' '}
          <span className="text-gray-300 font-mono">
            {spread !== null ? spread.toFixed(2) : '—'}
          </span>
        </span>
        <span className="text-gray-600">|</span>
        <span>
          Mid:{' '}
          <span className="text-gray-300 font-mono">
            {mid !== null ? mid.toFixed(2) : '—'}
          </span>
        </span>
      </div>
    </div>
  );
}
