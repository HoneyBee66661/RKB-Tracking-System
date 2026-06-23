import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Material Tracker</h1>
          <p className="mt-2 text-gray-500">Track materials from PO to handover</p>
        </div>

        <div className="grid gap-4">
          <Link
            href="/dashboard"
            className="block w-full py-4 px-6 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition"
          >
            Admin Dashboard
          </Link>

          <Link
            href="/login"
            className="block w-full py-4 px-6 bg-gray-800 text-white rounded-xl text-lg font-semibold hover:bg-gray-900 transition"
          >
            Clerk Input App
          </Link>

          <Link
            href="/track"
            className="block w-full py-4 px-6 border-2 border-gray-300 rounded-xl text-lg font-semibold hover:border-gray-400 transition"
          >
            Track Your Order
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Warehouse Material Tracking System v1.0
        </p>
      </div>
    </main>
  );
}
