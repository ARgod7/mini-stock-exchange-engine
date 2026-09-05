type Stats = {
  last_price: number;
  volume: number;
  best_bid: number | null;
  best_ask: number | null;
  spread: number | null;
};

const MOCK_STATS: Stats = {
  last_price: 102.75,
  volume: 360,
  best_bid: 102.50,
  best_ask: 103.00,
  spread: 0.50,
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-base font-bold tabular-nums ${accent ?? 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

export default function MarketStats() {
  const s = MOCK_STATS;
  const fmt = (v: number | null) => (v === null ? '—' : v.toFixed(2));

  return (
    <div className="bg-gray-800 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-white font-mono text-2xl font-bold tabular-nums">
            {s.last_price.toFixed(2)}
          </span>
          <span className="text-green-500 text-sm font-mono">+0.25 (+0.24%)</span>
        </div>

        <div className="flex gap-6 flex-wrap">
          <StatCard label="Best Bid" value={fmt(s.best_bid)} accent="text-green-400" />
          <StatCard label="Best Ask" value={fmt(s.best_ask)} accent="text-red-400" />
          <StatCard label="Spread" value={fmt(s.spread)} accent="text-yellow-400" />
          <StatCard label="Volume" value={s.volume.toLocaleString()} />
        </div>
      </div>
    </div>
  );
}
