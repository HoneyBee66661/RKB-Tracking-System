'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TimelineEvent {
  status: string;
  date: string;
  detail: string;
}

interface OrderResult {
  order_id: string;
  status: string;
  items_count: number;
  total_ordered: number;
  materials: string;
  supplier: string;
  timeline: TimelineEvent[];
}

export default function TrackingPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OrderResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const statusLabels: Record<string, string> = {
    ordered: 'Ordered',
    ready_for_pickup: 'Ready for Pickup',
    delivered: 'Delivered',
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    setSearched(true);

    try {
      const res = await fetch(`/api/tracking?q=${encodeURIComponent(query.trim())}`);
      const d = await res.json();
      if (d.success) {
        setResults(d.data.orders || []);
      } else {
        setError(d.error || 'Search failed');
      }
    } catch {
      setError('Failed to look up order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Track Your Order</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">Home</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Search */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium mb-2">Search by Order ID or Material Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. ORD-001, hydraulic hose, safety helmet..."
              className="flex-1 p-3 border rounded-xl text-lg"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-xl p-4 text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Results */}
        {results.map(order => (
          <div key={order.order_id} className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">ORDER ID</div>
                  <div className="text-2xl font-bold">{order.order_id}</div>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  order.status === 'ready_for_pickup' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {statusLabels[order.status] || order.status}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                {order.items_count} item(s) · {order.materials}
              </div>
              {order.supplier && (
                <div className="text-xs text-gray-400 mt-1">Supplier: {order.supplier}</div>
              )}
            </div>

            {/* Timeline */}
            {order.timeline.length > 0 && (
              <div className="border-t pt-4">
                {order.timeline.map((event, i) => (
                  <div key={i} className={`tracker-line ${i < order.timeline.length - 1 ? '' : 'completed'}`}>
                    <div className="font-medium">{statusLabels[event.status] || event.status}</div>
                    <div className="text-sm text-gray-500">{event.detail}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(event.date).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {searched && !loading && results.length === 0 && !error && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">🔍</div>
            <div>No orders found for &quot;{query}&quot;</div>
          </div>
        )}

        {/* Initial state */}
        {!searched && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">🔍</div>
            <div>Enter an Order ID or material name to track your delivery status</div>
          </div>
        )}
      </div>
    </div>
  );
}
