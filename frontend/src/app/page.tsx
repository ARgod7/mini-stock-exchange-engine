import MarketStats from '@/components/MarketStats';
import OrderBook from '@/components/OrderBook';
import LiveTrades from '@/components/LiveTrades';
import OrderForm from '@/components/OrderForm';

export default function Home() {
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
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
            MOCK DATA
          </span>
          <span className="text-xs text-gray-600 font-mono">Phase 3a</span>
        </div>
      </header>

      {/* Stats bar */}
      <div className="border-b border-gray-700/80 px-6 py-3 bg-gray-900">
        <MarketStats />
      </div>

      {/* Main content */}
      <main className="flex-1 grid grid-cols-12 gap-4 p-4 lg:p-6 min-h-0">
        {/* Order Book */}
        <section className="col-span-12 lg:col-span-4 xl:col-span-4">
          <OrderBook />
        </section>

        {/* Live Trades */}
        <section className="col-span-12 lg:col-span-5 xl:col-span-5 flex flex-col" style={{ minHeight: '420px' }}>
          <LiveTrades />
        </section>

        {/* Order Form */}
        <section className="col-span-12 lg:col-span-3 xl:col-span-3">
          <OrderForm />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700/50 px-6 py-2 text-xs text-gray-600 font-mono flex justify-between">
        <span>mini-stock-exchange-engine © 2026</span>
        <span>Step 3b: live data coming soon</span>
      </footer>
    </div>
  );
}
