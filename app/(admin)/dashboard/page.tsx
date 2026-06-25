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

interface Warehouseman {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [summary, setSummary] = useState({ total_orders: 0, ordered: 0, ready: 0, delivered: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Warehouseman state
  const [warehousemen, setWarehousemen] = useState<Warehouseman[]>([]);
  const [wmLoading, setWmLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [wmError, setWmError] = useState('');
  const [wmMsg, setWmMsg] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeTab === 'warehousemen') fetchWarehousemen();
  }, [activeTab]);

  const fetchWarehousemen = async () => {
    setWmLoading(true);
    try {
      const res = await fetch('/api/warehousemen');
      const d = await res.json();
      if (d.success) setWarehousemen(d.data);
    } catch { /* ignore */ }
    finally { setWmLoading(false); }
  };

  const addWarehouseman = async () => {
    if (!newName || !newPin) { setWmError('Name and PIN required'); return; }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setWmError('PIN must be 4 digits'); return; }
    setWmError('');
    setWmMsg('');
    setAdding(true);
    try {
      const res = await fetch('/api/warehousemen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, pin: newPin }),
      });
      const d = await res.json();
      if (d.success) {
        setWarehousemen(prev => [...prev, d.data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName('');
        setNewPin('');
        setWmMsg(`Added ${d.data.name}`);
      } else {
        setWmError(d.error || 'Failed to add');
      }
    } catch {
      setWmError('Network error');
    } finally {
      setAdding(false);
    }
  };

  const removeWarehouseman = async (wm: Warehouseman) => {
    if (!confirm(`Remove "${wm.name}" permanently? This cannot be undone.`)) return;
    setRemoving(wm.id);
    setWmError('');
    setWmMsg('');
    try {
      const res = await fetch(`/api/warehousemen/${wm.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        setWarehousemen(prev => prev.filter(w => w.id !== wm.id));
        setWmMsg(`Removed ${wm.name}`);
      } else {
        setWmError(d.error || 'Failed to remove');
      }
    } catch {
      setWmError('Network error');
    } finally {
      setRemoving(null);
    }
  };

  const toggleActive = async (wm: Warehouseman) => {
    try {
      const res = await fetch(`/api/warehousemen/${wm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !wm.active }),
      });
      const d = await res.json();
      if (d.success) {
        setWarehousemen(prev =>
          prev.map(w => w.id === wm.id ? { ...w, active: d.data.active } : w)
        );
      }
    } catch { /* ignore */ }
  };

  const filtered = activeTab === 'all'
    ? orders
    : orders.filter(o => o.status === activeTab);

  const isOrderTab = ['all', 'ordered', 'ready', 'delivered'].includes(activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">Warehouse Dashboard</h1>
          <div className="flex items-center gap-3">
            <Link href="/qr" className="text-gray-500 hover:text-gray-800 transition" title="QR Labels">
              <img src="/images/qr-icon.svg" alt="QR" width="20" height="20" />
            </Link>
            <Link href="/" className="text-gray-500 hover:text-gray-800 transition" title="Home">
              <img src="/images/home-icon.svg" alt="Home" width="20" height="20" />
            </Link>
          </div>
        </div>
      </header>

      {/* Summary cards — only for order tabs */}
      {isOrderTab && (
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
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mb-4 flex gap-2 flex-wrap">
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
                ? 'bg-[#CE1126] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1 self-stretch" />
        <button
          onClick={() => setActiveTab('warehousemen')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'warehousemen'
              ? 'bg-[#CE1126] text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Warehousemen
        </button>
      </div>

      {/* Order list */}
      {isOrderTab && (
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
      )}

      {/* Warehousemen management */}
      {activeTab === 'warehousemen' && (
        <div className="max-w-7xl mx-auto px-4 pb-8">
          {/* Add form */}
          <div className="bg-white rounded-xl border p-4 mb-4">
            <h2 className="font-semibold mb-3">Add Warehouseman</h2>
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className="block text-xs font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-40 p-2 border rounded-lg text-sm"
                  placeholder="Name"
                  onKeyDown={e => e.key === 'Enter' && addWarehouseman()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">4-Digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-24 p-2 border rounded-lg text-sm text-center tracking-[0.3em]"
                  placeholder="••••"
                  onKeyDown={e => e.key === 'Enter' && addWarehouseman()}
                />
              </div>
              <button
                onClick={addWarehouseman}
                disabled={adding}
                className="px-4 py-2 bg-[#CE1126] text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
            {wmError && <p className="text-red-600 text-xs mt-2">{wmError}</p>}
            {wmMsg && <p className="text-green-600 text-xs mt-2">{wmMsg}</p>}
          </div>

          {/* List */}
          {wmLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-50 border-b border-red-100">
                    <th className="text-left p-3 font-medium text-base">Name</th>
                    <th className="text-center p-3 font-medium text-base">Status</th>
                    <th className="text-left p-3 font-medium text-base">Created</th>
                    <th className="text-center p-3 font-medium text-base">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {warehousemen.map(wm => (
                    <tr key={wm.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{wm.name}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          wm.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {wm.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">
                        {new Date(wm.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-center flex gap-1 justify-center">
                        <button
                          onClick={() => toggleActive(wm)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                            wm.active
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {wm.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => removeWarehouseman(wm)}
                          disabled={removing === wm.id}
                          className="px-3 py-1 rounded-lg text-xs font-medium transition bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                        >
                          {removing === wm.id ? '...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {warehousemen.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-500">
                        No warehousemen found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
