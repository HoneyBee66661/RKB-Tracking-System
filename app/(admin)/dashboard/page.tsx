'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderSummary {
  status: string;
  user_order_no: string;
  qty_ordered: number;
  po_lines: any[];
  gr_docs: any[];
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [summary, setSummary] = useState({ total_orders: 0, ordered: 0, ready: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetch('/api/dashboard/outstanding')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setOrders(d.data.orders);
          setSummary(d.data.summary);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === 'all'
    ? orders
    : orders.filter(o => o.status === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Warehouse Dashboard</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">Home</Link>
        </div>
      </header>

      {/* Summary cards */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: summary.total_orders, color: 'bg-gray-100' },
          { label: 'Ordered', value: summary.ordered, color: 'bg-yellow-100 text-yellow-800' },
          { label: 'Ready', value: summary.ready, color: 'bg-blue-100 text-blue-800' },
          { label: 'Delivered', value: summary.delivered, color: 'bg-green-100 text-green-800' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-sm text-gray-600">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mb-4 flex gap-2">
        {[
          { key: 'all', label: 'All', count: summary.total_orders },
          { key: 'ordered', label: 'Ordered', count: summary.ordered },
          { key: 'ready', label: 'Ready', count: summary.ready },
          { key: 'delivered', label: 'Delivered', count: summary.delivered },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Order list */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No orders found</div>
        ) : (
          <div className="bg-white rounded-xl border divide-y">
            {filtered.map(order => (
              <div key={order.user_order_no} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    order.status === 'delivered' ? 'badge-delivered' :
                    order.status === 'ready' ? 'badge-ready' : 'badge-ordered'
                  }`}>
                    {order.status}
                  </span>
                  <div>
                    <div className="font-medium">{order.user_order_no}</div>
                    <div className="text-sm text-gray-500">
                      {order.po_lines.length} item(s) · {order.qty_ordered} total qty
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {order.gr_docs.length} GR doc(s)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
