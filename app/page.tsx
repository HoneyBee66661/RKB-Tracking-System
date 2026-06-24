import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md w-full text-center space-y-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Material Tracker</h1>
          <p className="mt-2 text-gray-500">Track materials from PO to handover</p>
        </div>

        <div className="grid gap-4">
          <Link
            href="/track"
            className="block w-full py-5 px-6 border-2 border-gray-300 rounded-xl text-lg font-semibold hover:border-blue-400 hover:bg-blue-50 transition text-left"
          >
            <div className="text-base font-bold">🔍 Track Order</div>
            <div className="text-sm text-gray-500 font-normal mt-0.5">Search by order ID or material name — no login needed</div>
          </Link>

          <Link
            href="/login"
            className="block w-full py-5 px-6 bg-gray-800 text-white rounded-xl text-lg font-semibold hover:bg-gray-900 transition text-left"
          >
            <div className="text-base font-bold">🏭 Warehouse Start</div>
            <div className="text-sm text-gray-400 font-normal mt-0.5">PIN login for warehousemen & admin</div>
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Warehouse Material Tracking System v1.0
        </p>
      </div>
    </main>
  );
}
