type OrderLevel = {
  price: number;
  total_quantity: number;
};

const MOCK_BIDS: OrderLevel[] = [
  { price: 102.50, total_quantity: 10 },
  { price: 102.40, total_quantity: 25 },
  { price: 102.25, total_quantity: 80 },
  { price: 102.00, total_quantity: 150 },
  { price: 101.75, total_quantity: 200 },
  { price: 101.50, total_quantity: 300 },
  { price: 101.00, total_quantity: 500 },
];

const MOCK_ASKS: OrderLevel[] = [
  { price: 103.00, total_quantity: 15 },
  { price: 103.10, total_quantity: 30 },
  { price: 103.25, total_quantity: 60 },
  { price: 103.50, total_quantity: 100 },
  { price: 103.75, total_quantity: 180 },
  { price: 104.00, total_quantity: 250 },
  { price: 104.50, total_quantity: 400 },
];

const maxBidQty = Math.max(...MOCK_BIDS.map((b) => b.total_quantity));
const maxAskQty = Math.max(...MOCK_ASKS.map((a) => a.total_quantity));

export default function OrderBook() {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">
          Order Book
        </h2>
      </div>

      <div className="grid grid-cols-2 divide-x divide-gray-700">
        {/* Bids */}
        <div>
          <div className="grid grid-cols-2 px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
            <span>Size</span>
            <span className="text-right">Bid</span>
          </div>
          {MOCK_BIDS.map((bid, i) => {
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

        {/* Asks */}
        <div>
          <div className="grid grid-cols-2 px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
            <span>Ask</span>
            <span className="text-right">Size</span>
          </div>
          {MOCK_ASKS.map((ask, i) => {
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

      {/* Spread row */}
      <div className="px-4 py-2 border-t border-gray-700 flex justify-center gap-3 text-xs text-gray-500">
        <span>
          Spread:{' '}
          <span className="text-gray-300 font-mono">
            {(MOCK_ASKS[0].price - MOCK_BIDS[0].price).toFixed(2)}
          </span>
        </span>
        <span className="text-gray-600">|</span>
        <span>
          Mid:{' '}
          <span className="text-gray-300 font-mono">
            {((MOCK_ASKS[0].price + MOCK_BIDS[0].price) / 2).toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  );
}
