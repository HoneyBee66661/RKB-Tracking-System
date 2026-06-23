'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Clerk {
  id: string;
  name: string;
}

export default function ClerkLoginPage() {
  const [clerks, setClerks] = useState<Clerk[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/clerks')
      .then(r => r.json())
      .then(d => {
        if (d.success) setClerks(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async () => {
    if (!selectedId || !pin) { setError('Select your name and enter PIN'); return; }
    setError('');
    const res = await fetch('/api/clerk-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerk_id: selectedId, pin }),
    });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('clerk_session', JSON.stringify(data.data));
      router.push('/clerk/scan');
    } else {
      setError(data.error || 'Login failed');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">Clerk Login</h1>
        <p className="text-center text-sm text-gray-500 mb-6">Select your name and enter PIN</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Clerk</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full p-3 border rounded-xl text-lg"
            >
              <option value="">-- Select --</option>
              {clerks.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
              className="w-full p-3 border rounded-xl text-2xl text-center tracking-[0.5em]"
              placeholder="••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <button
            onClick={handleLogin}
            className="clerk-btn w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
