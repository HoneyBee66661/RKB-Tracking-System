'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Warehouseman {
  id: string;
  name: string;
}

export default function LoginPage() {
  const [tab, setTab] = useState<'warehouseman' | 'admin'>('warehouseman');
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-gray-500 hover:text-gray-800 transition" title="Back to Home">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Login</h1>
        <div className="w-5" />
      </header>
      <div className="flex items-center justify-center p-4 pt-12">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">Login</h1>
        <p className="text-center text-sm text-gray-500 mb-6">Select your role to continue</p>

        {/* Tab switcher */}
        <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setTab('warehouseman')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'warehouseman' ? 'bg-white shadow-sm' : 'text-gray-500'
            }`}
          >
            Warehouseman
          </button>
          <button
            onClick={() => setTab('admin')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'admin' ? 'bg-white shadow-sm' : 'text-gray-500'
            }`}
          >
            Admin
          </button>
        </div>

        {/* Flip animation drawer */}
        <div className="overflow-hidden relative" style={{ perspective: '1000px' }}>
          <div
            className="transition-transform duration-500 ease-in-out"
            style={{ transformStyle: 'preserve-3d', transform: tab === 'warehouseman' ? 'rotateY(0deg)' : 'rotateY(180deg)' }}
          >
            <div style={{ backfaceVisibility: 'hidden' }}>
              <WarehousemanForm />
            </div>
            <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <AdminForm />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function WarehousemanForm() {
  const [warehousemen, setWarehousemen] = useState<Warehouseman[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/warehousemen')
      .then(r => r.json())
      .then(d => {
        if (d.success) setWarehousemen(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async () => {
    if (!selectedId || !pin) { setError('Select your name and enter PIN'); return; }
    setError('');
    const res = await fetch('/api/warehouseman-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouseman_id: selectedId, pin }),
    });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('warehouseman_session', JSON.stringify(data.data));
      router.push('/home');
    } else {
      setError(data.error || 'Login failed');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Select Warehouseman</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="w-full p-3 border rounded-xl text-lg appearance-none bg-white"
        >
          <option value="">-- Select --</option>
          {warehousemen.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="w-full p-3 border rounded-xl text-lg"
          placeholder="••••"
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
      </div>

      {error && <p className="text-red-600 text-sm text-center">{error}</p>}

      <button
        onClick={handleLogin}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
      >
        Login
      </button>
    </div>
  );
}

function AdminForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) { setError('Enter username and password'); return; }
    setLoading(true);
    setError('');

    // Simple credential check — routes to dashboard
    // In production, replace with proper auth flow
    try {
      const res = await fetch('/api/admin-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Username</label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full p-3 border rounded-xl text-lg"
          placeholder="admin"
          onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-3 border rounded-xl text-lg"
          placeholder="••••••••"
          onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
        />
      </div>

      {error && <p className="text-red-600 text-sm text-center">{error}</p>}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-900 transition disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </div>
  );
}
