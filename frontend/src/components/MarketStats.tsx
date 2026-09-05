import type { Stats } from '@/lib/api';

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

export default function MarketStats({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-center">
        <span className="text-gray-500 text-sm font-mono animate-pulse">Loading stats...</span>
      </div>
    );
  }

  const s = stats;
  const fmt = (v: number | null) => (v === null ? '—' : v.toFixed(2));

  return (
    <div className="bg-gray-800 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-white font-mono text-2xl font-bold tabular-nums">
            {s.last_price.toFixed(2)}
          </span>
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
