'use client';
import { useState } from 'react';
import Link from 'next/link';

interface TimelineEvent {
  status: string;
  date: string;
  detail: string;
}

interface TrackingData {
  order_id: string;
  status: string;
  items_count: number;
  total_ordered: number;
  timeline: TimelineEvent[];
}

export default function TrackingPage() {
  const [orderId, setOrderId] = useState('');
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const statusLabels: Record<string, string> = {
    ordered: 'Ordered',
    ready_for_pickup: 'Ready for Pickup',
    delivered: 'Delivered',
  };

  const handleSearch = async () => {
    if (!orderId.trim()) return;
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch(`/api/tracking?order_id=${encodeURIComponent(orderId.trim())}`);
      const d = await res.json();
      if (d.success) {
        setData(d.data);
      } else {
        setError(d.error || 'Order not found');
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
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Track Your Order</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">Home</Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Search */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium mb-2">Enter Order ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={orderId}
              onChange={e => setOrderId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. ORD-001"
              className="flex-1 p-3 border rounded-xl text-lg"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '...' : 'Track'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-xl p-4 text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Results — DHL-style tracker */}
        {data && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="mb-6">
              <div className="text-xs text-gray-500 mb-1">ORDER ID</div>
              <div className="text-2xl font-bold">{data.order_id}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  data.status === 'delivered' ? 'badge-delivered' :
                  data.status === 'ready_for_pickup' ? 'badge-ready' : 'badge-ordered'
                }`}>
                  {statusLabels[data.status] || data.status}
                </span>
                <span className="text-sm text-gray-500">{data.items_count} item(s)</span>
              </div>
            </div>

            <div className="border-t pt-6">
              {data.timeline.map((event, i) => (
                <div key={i} className={`tracker-line ${i < data.timeline.length - 1 ? '' : 'completed'}`}>
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
          </div>
        )}

        {/* Empty state */}
        {!data && !error && !loading && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">🔍</div>
            <div>Enter an Order ID to track your material delivery status</div>
          </div>
        )}
      </div>
    </div>
  );
}
