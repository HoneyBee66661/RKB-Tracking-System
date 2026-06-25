'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function WarehousemanHomePage() {
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem('warehouseman_session');
    if (!raw) { router.push('/login'); return; }
    setSession(JSON.parse(raw));
  }, [router]);

  const doLogout = () => {
    sessionStorage.removeItem('warehouseman_session');
    router.push('/login');
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Warehouse Menu</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session.warehouseman.name}</span>
          <button onClick={doLogout} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-12 space-y-4">
        <Link
          href="/scan"
          className="block w-full py-8 px-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition text-left"
        >
          <div className="flex items-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
              <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
              <rect x="7" y="7" width="10" height="10" rx="1"/>
            </svg>
            <div>
              <div className="text-lg font-bold">Scan</div>
              <div className="text-sm text-gray-500">Scan QR labels and process handovers</div>
            </div>
          </div>
        </Link>

        <Link
          href="/monitoring"
          className="block w-full py-8 px-6 bg-white border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition text-left"
        >
          <div className="flex items-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <div>
              <div className="text-lg font-bold">Monitoring</div>
              <div className="text-sm text-gray-500">View delivery records and handover history</div>
            </div>
          </div>
        </Link>

        <Link
          href="/data"
          className="block w-full py-8 px-6 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition text-left"
        >
          <div className="flex items-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            <div>
              <div className="text-lg font-bold">Data</div>
              <div className="text-sm text-gray-500">Import MB51 / ME2N Excel files and manage data</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
