type Trade = {
  id: string;
  buy_order_id: string;
  sell_order_id: string;
  price: number;
  quantity: number;
  timestamp_ns: number;
  side: 'BUY' | 'SELL';
};

// Realistic session with alternating up/down prints
const MOCK_TRADES: Trade[] = [
  { id: '14', buy_order_id: 'B-014', sell_order_id: 'S-099', price: 102.75, quantity: 5, timestamp_ns: 1788593600_000_000_000, side: 'BUY' },
  { id: '13', buy_order_id: 'B-013', sell_order_id: 'S-098', price: 102.75, quantity: 12, timestamp_ns: 1788593590_000_000_000, side: 'BUY' },
  { id: '12', buy_order_id: 'B-012', sell_order_id: 'S-097', price: 102.60, quantity: 50, timestamp_ns: 1788593570_000_000_000, side: 'SELL' },
  { id: '11', buy_order_id: 'B-011', sell_order_id: 'S-096', price: 102.60, quantity: 10, timestamp_ns: 1788593555_000_000_000, side: 'SELL' },
  { id: '10', buy_order_id: 'B-010', sell_order_id: 'S-095', price: 102.80, quantity: 30, timestamp_ns: 1788593540_000_000_000, side: 'BUY' },
  { id: '9',  buy_order_id: 'B-009', sell_order_id: 'S-094', price: 102.50, quantity: 20, timestamp_ns: 1788593510_000_000_000, side: 'SELL' },
  { id: '8',  buy_order_id: 'B-008', sell_order_id: 'S-093', price: 102.55, quantity: 8, timestamp_ns: 1788593490_000_000_000, side: 'BUY' },
  { id: '7',  buy_order_id: 'B-007', sell_order_id: 'S-092', price: 102.40, quantity: 100, timestamp_ns: 1788593460_000_000_000, side: 'SELL' },
  { id: '6',  buy_order_id: 'B-006', sell_order_id: 'S-091', price: 102.45, quantity: 15, timestamp_ns: 1788593440_000_000_000, side: 'BUY' },
  { id: '5',  buy_order_id: 'B-005', sell_order_id: 'S-090', price: 102.30, quantity: 25, timestamp_ns: 1788593400_000_000_000, side: 'SELL' },
  { id: '4',  buy_order_id: 'B-004', sell_order_id: 'S-089', price: 102.50, quantity: 40, timestamp_ns: 1788593360_000_000_000, side: 'BUY' },
  { id: '3',  buy_order_id: 'B-003', sell_order_id: 'S-088', price: 101.50, quantity: 20, timestamp_ns: 1788589354_000_000_000, side: 'SELL' },
  { id: '2',  buy_order_id: 'O3', sell_order_id: 'O4', price: 101.50, quantity: 20, timestamp_ns: 1788593300_177_247_558, side: 'BUY' },
  { id: '1',  buy_order_id: 'O1', sell_order_id: 'O2', price: 100.50, quantity: 5, timestamp_ns: 1788589354_731_533_615, side: 'SELL' },
];

function fmtTime(ns: number): string {
  const ms = ns / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function LiveTrades() {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col">
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
        {MOCK_TRADES.map((t) => (
          <div
            key={t.id}
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
        ))}
      </div>
    </div>
  );
}
