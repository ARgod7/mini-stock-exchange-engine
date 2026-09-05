'use client';

import { useState } from 'react';
import { postOrder } from '@/lib/api';

export default function OrderForm() {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLastSubmitted(null);

    const p = parseFloat(price);
    const q = parseInt(quantity, 10);

    if (!price || isNaN(p) || p <= 0) {
      setError('Price must be a positive number.');
      return;
    }
    if (!quantity || isNaN(q) || q <= 0) {
      setError('Quantity must be a positive whole number.');
      return;
    }

    setSubmitting(true);
    try {
      const orderId = `${side}-${Date.now()}`;
      const payload = {
        order_id: orderId,
        side,
        price: p,
        quantity: q,
      };
      
      const res = await postOrder(payload);
      setLastSubmitted({ id: orderId, ok: true, msg: res.message });
      setPrice('');
      setQuantity('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">
          Place Order
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1">
        {/* Side toggle */}
        <div className="grid grid-cols-2 rounded overflow-hidden border border-gray-600">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2.5 text-sm font-bold tracking-wider transition-colors ${
              side === 'BUY'
                ? 'bg-green-700 text-white'
                : 'bg-gray-700 text-gray-500 hover:bg-gray-600 hover:text-gray-300'
            }`}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2.5 text-sm font-bold tracking-wider transition-colors border-l border-gray-600 ${
              side === 'SELL'
                ? 'bg-red-700 text-white'
                : 'bg-gray-700 text-gray-500 hover:bg-gray-600 hover:text-gray-300'
            }`}
          >
            SELL
          </button>
        </div>

        {/* Price */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-500 uppercase tracking-wider" htmlFor="price">
            Limit Price
          </label>
          <div className="relative">
            <input
              id="price"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2.5 text-sm font-mono tabular-nums focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder-gray-600"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
              USD
            </span>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-500 uppercase tracking-wider" htmlFor="qty">
            Quantity
          </label>
          <div className="relative">
            <input
              id="qty"
              type="number"
              step="1"
              min="1"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2.5 text-sm font-mono tabular-nums focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 placeholder-gray-600"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">
              SHR
            </span>
          </div>
        </div>

        {/* Notional estimate */}
        {price && quantity && !isNaN(parseFloat(price)) && !isNaN(parseInt(quantity, 10)) && (
          <div className="text-xs text-gray-500 flex justify-between bg-gray-700/50 rounded px-3 py-2">
            <span>Estimated value</span>
            <span className="font-mono text-gray-300">
              ${(parseFloat(price) * parseInt(quantity, 10)).toFixed(2)}
            </span>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs bg-red-900/20 rounded px-3 py-2 border border-red-900/40">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 rounded font-bold text-white uppercase tracking-widest text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            side === 'BUY'
              ? 'bg-green-700 hover:bg-green-600 shadow-green-900/40 shadow-lg'
              : 'bg-red-700 hover:bg-red-600 shadow-red-900/40 shadow-lg'
          }`}
        >
          {submitting ? 'Submitting...' : side === 'BUY' ? '↑ Buy' : '↓ Sell'}
        </button>
      </form>

      {/* Last submitted preview */}
      {lastSubmitted && (
        <div className="border-t border-gray-700 px-4 py-3 bg-gray-700/30">
          <p className="text-xs text-green-400">
            ✓ Order {lastSubmitted.id} submitted
          </p>
        </div>
      )}
    </div>
  );
}
