'use client';
import { useState, useEffect, useMemo, memo, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Data shape from API ───────────────────────────────────────────────────
interface Row {
  id: string;
  gr_date: string | null;
  po_no: string | null;
  line_no: number | null;
  description: string | null;
  qty: number | null;
  gr_doc_no: string | null;
  user_order_no: string | null;
  warehouseman: string | null;
  issue_date: string | null;
  received_by: string | null;
  status: string;
  photo_evidence_url: string | null;
}

const COLUMNS: { key: string; label: string; width: string }[] = [
  { key: 'gr_date',       label: 'GR Date',          width: 'w-28' },
  { key: 'po_no',         label: 'PO',               width: 'w-32' },
  { key: 'line_no',       label: 'Item Number',      width: 'w-20' },
  { key: 'description',   label: 'Description',      width: 'min-w-[180px]' },
  { key: 'qty',           label: 'Qty',              width: 'w-16 text-right' },
  { key: 'gr_doc_no',     label: 'GR Document',      width: 'w-32' },
  { key: 'user_order_no', label: 'Order ID/RKB Number', width: 'w-36' },
  { key: 'warehouseman',  label: 'Warehousemen',     width: 'w-28' },
  { key: 'issue_date',    label: 'Issue Date',       width: 'w-36' },
  { key: 'received_by',   label: 'Received by',      width: 'w-28' },
  { key: 'status',        label: 'Status',           width: 'w-20 text-center' },
  { key: 'evident',       label: '',                  width: 'w-16 text-center' },
];

// Fields not yet in the schema — shown as empty column placeholders
const PLACEHOLDER_COLS = [
  { key: 'material_no',  label: 'Material Number', width: 'w-28' },
  { key: 'asset_no',     label: 'Asset Number',    width: 'w-28' },
  { key: 'departement',  label: 'Departement',     width: 'w-28' },
  { key: 'pic',          label: 'PIC',             width: 'w-28' },
];

// Insert placeholder columns before Description
const ALL_COLS = [
  ...COLUMNS.slice(0, 3),  // GR Date, PO, Item Number
  ...PLACEHOLDER_COLS,     // Material Number, Asset Number, Departement, PIC
  ...COLUMNS.slice(3),     // Description onwards
];

// ─── Row component (memoised) ──────────────────────────────────────────────
const DataRow = memo(function DataRow({ row }: { row: Row }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="p-2 text-gray-600">{row.gr_date || '—'}</td>
      <td className="p-2 text-gray-600">{row.po_no || '—'}</td>
      <td className="p-2 text-gray-600">{row.line_no ?? '—'}</td>
      {/* Placeholder columns */}
      <td className="p-2 text-gray-300">—</td>
      <td className="p-2 text-gray-300">—</td>
      <td className="p-2 text-gray-300">—</td>
      <td className="p-2 text-gray-300">—</td>
      {/* Description */}
      <td className="p-2 text-gray-700 max-w-xs whitespace-normal">{row.description || '—'}</td>
      <td className="p-2 text-gray-600 text-right">{row.qty ?? '—'}</td>
      <td className="p-2 font-medium text-gray-800">{row.gr_doc_no || '—'}</td>
      <td className="p-2 text-gray-600">{row.user_order_no || '—'}</td>
      <td className="p-2 text-gray-600">{row.warehouseman || '—'}</td>
      <td className="p-2 text-gray-500 whitespace-nowrap">
        {row.issue_date
          ? new Date(row.issue_date).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })
          : '—'}
      </td>
      <td className="p-2 text-gray-600">{row.received_by || '—'}</td>
      <td className="p-2 text-center">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          row.status === 'delivered' ? 'bg-green-100 text-green-800' :
          row.status === 'ready' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {row.status}
        </span>
      </td>
      <td className="p-2 text-center">
        {row.photo_evidence_url ? (
          <a
            href={row.photo_evidence_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline"
            title="View evidence photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            View
          </a>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
});

// ─── Filter row component ──────────────────────────────────────────────────
function FiltersRow({
  filters,
  onChange,
}: {
  filters: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  // Get all filterable column keys (skip evident, material_no, asset_no, departement, pic)
  const filterKeys = [
    'gr_date', 'po_no', 'line_no',
    'description', 'qty',
    'gr_doc_no', 'user_order_no',
    'warehouseman', 'issue_date', 'received_by', 'status',
  ];

  // Map to the full column list indices for positioning
  const filterCols: { key: string; width: string }[] = [
    { key: 'gr_date', width: 'w-28' },
    { key: 'po_no', width: 'w-32' },
    { key: 'line_no', width: 'w-20' },
    // 4 placeholders — no filters
    { key: '', width: 'w-28' },
    { key: '', width: 'w-28' },
    { key: '', width: 'w-28' },
    { key: '', width: 'w-28' },
    { key: 'description', width: 'min-w-[180px]' },
    { key: 'qty', width: 'w-16' },
    { key: 'gr_doc_no', width: 'w-32' },
    { key: 'user_order_no', width: 'w-36' },
    { key: 'warehouseman', width: 'w-28' },
    { key: 'issue_date', width: 'w-36' },
    { key: 'received_by', width: 'w-28' },
    { key: 'status', width: 'w-20' },
    { key: '', width: 'w-16' },
  ];

  return (
    <tr className="bg-gray-50 border-b">
      {filterCols.map((col, i) => (
        <th key={i} className={`p-1 ${col.width}`}>
          {col.key ? (
            <input
              type="text"
              placeholder="Filter..."
              value={filters[col.key] || ''}
              onChange={e => onChange(col.key, e.target.value)}
              className="w-full px-1.5 py-1 border rounded text-[11px] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          ) : (
            <div className="w-full h-6" />
          )}
        </th>
      ))}
    </tr>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const [session, setSession] = useState<any>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const deferredFilters = useDeferredValue(filters);
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem('warehouseman_session');
    if (!raw) { router.push('/login'); return; }
    setSession(JSON.parse(raw));
  }, [router]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetch('/api/monitoring')
      .then(r => r.json())
      .then(d => {
        if (d.success) setRows(d.data);
        else setError(d.error || 'Failed to load');
      })
      .catch(() => setError('Failed to load records'))
      .finally(() => setLoading(false));
  }, [session]);

  const filtered = useMemo(() => {
    const f = deferredFilters;
    const hasFilter = Object.values(f).some(v => v);
    if (!hasFilter) return rows;

    return rows.filter(r => {
      for (const [key, val] of Object.entries(f)) {
        if (!val) continue;
        const cell = String((r as any)[key] ?? '').toLowerCase();
        if (!cell.includes(val.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, deferredFilters]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => setFilters({});

  const doLogout = () => {
    sessionStorage.removeItem('warehouseman_session');
    router.push('/login');
  };

  if (!session) return null;

  const hasFilters = Object.values(filters).some(v => v);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-gray-500 hover:text-gray-800 transition" title="Menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </Link>
          <h1 className="text-lg font-bold">Monitoring</h1>
          {!loading && (
            <span className="text-xs text-gray-400">
              {filtered.length} / {rows.length} records
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">
              Clear filters
            </button>
          )}
          <span className="text-sm text-gray-500">{session.warehouseman.name}</span>
          <button onClick={doLogout} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-red-100 border border-red-300 rounded-xl p-3 text-red-700 text-sm">{error}</div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 px-4 py-4 overflow-auto">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No delivery records found.</div>
        ) : (
          <div className="bg-white rounded-xl border inline-block min-w-full">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <FiltersRow filters={deferredFilters} onChange={updateFilter} />
                <tr className="bg-red-50 border-b border-red-100">
                  {ALL_COLS.map(col => (
                    <th
                      key={col.key}
                      className={`p-2 font-semibold text-gray-700 ${col.width} ${
                        col.label ? '' : ''
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(row => (
                  <DataRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-500">No records match the current filters.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
