'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';

interface ImportLog {
  id: string;
  file_name: string | null;
  rows_imported: number;
  errors: any;
  created_at: string;
}

type Tab = 'mb51' | 'me2n';

export default function DataPage() {
  const [session, setSession] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('mb51');
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem('warehouseman_session');
    if (!raw) { router.push('/login'); return; }
    setSession(JSON.parse(raw));
  }, [router]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/import-logs?type=${tab}`);
      const d = await res.json();
      if (d.success) setLogs(d.data);
      else setError(d.error || 'Failed to load logs');
    } catch {
      setError('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (session) fetchLogs();
  }, [session, fetchLogs]);

  const doLogout = () => {
    sessionStorage.removeItem('warehouseman_session');
    router.push('/login');
  };

  // ── File import ──────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage('');
    setError('');
    setImporting(true);

    try {
      // Read Excel file client-side
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        setError('Excel file is empty');
        setImporting(false);
        return;
      }

      // Determine file name (auto-suffix if duplicate)
      let fileName = file.name;
      const existingNames = new Set(logs.map(l => l.file_name));
      if (existingNames.has(fileName)) {
        const now = new Date();
        const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        const dot = fileName.lastIndexOf('.');
        fileName = dot > 0 ? `${fileName.slice(0, dot)}_${ts}${fileName.slice(dot)}` : `${fileName}_${ts}`;
      }

      // Send to appropriate import API
      const apiUrl = tab === 'mb51' ? '/api/import/mb51' : '/api/import/me2n';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-file-name': fileName,
        },
        body: JSON.stringify({ rows }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage(`Imported ${result.data.rows_imported || result.data.gr_documents_created || '?'} rows`);
        if (result.data.errors?.length) {
          setError(`Partial errors: ${result.data.errors.slice(0, 3).join('; ')}`);
        }
        fetchLogs();
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // ── Edit mode ────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  const openEdit = async () => {
    setEditMode(true);
    setEditLoading(true);
    setError('');
    try {
      const table = tab === 'mb51' ? 'gr_documents' : 'po_lines';
      const res = await fetch(`/api/data/${table}`);
      const d = await res.json();
      if (d.success) setEditData(d.data);
      else setError(d.error || 'Failed to load data');
    } catch {
      setError('Failed to load data');
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => {
    setEditMode(false);
    setEditData([]);
  };

  const updateCell = (index: number, field: string, value: string) => {
    setEditData(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const saveEdits = async () => {
    setError('');
    setMessage('');
    try {
      const table = tab === 'mb51' ? 'gr_documents' : 'po_lines';
      const res = await fetch(`/api/data/${table}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: editData }),
      });
      const d = await res.json();
      if (d.success) {
        setMessage('Data updated');
        closeEdit();
      } else {
        setError(d.error || 'Save failed');
      }
    } catch {
      setError('Save failed');
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-gray-500 hover:text-gray-800 transition" title="Menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </Link>
          <h1 className="text-lg font-bold">Data Import</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session.warehouseman.name}</span>
          <button onClick={doLogout} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setTab('mb51'); setEditMode(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'mb51' ? 'bg-[#CE1126] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            MB51 (GR Documents)
          </button>
          <button
            onClick={() => { setTab('me2n'); setEditMode(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'me2n' ? 'bg-[#CE1126] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            ME2N (PO Lines)
          </button>
        </div>

        {/* Messages */}
        {message && <div className="bg-green-100 border border-green-300 rounded-xl p-3 text-green-700 text-sm mb-4">{message}</div>}
        {error && <div className="bg-red-100 border border-red-300 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>}

        {/* Edit mode */}
        {editMode ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Edit {tab === 'mb51' ? 'GR Documents' : 'PO Lines'}</h2>
              <div className="flex gap-2">
                <button onClick={saveEdits} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                  Save
                </button>
                <button onClick={closeEdit} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 transition">
                  Cancel
                </button>
              </div>
            </div>
            {editLoading ? (
              <div className="text-center py-12 text-gray-500">Loading data...</div>
            ) : editData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No data found.</div>
            ) : (
              <div className="bg-white rounded-xl border overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-100 border-b">
                      {Object.keys(editData[0]).filter(k => k !== 'id').map(k => (
                        <th key={k} className="text-left p-2 font-medium text-xs uppercase text-gray-600 whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {editData.map((row, i) => (
                      <tr key={row.id || i} className="hover:bg-gray-50">
                        {Object.entries(row).filter(([k]) => k !== 'id').map(([key, val]) => (
                          <td key={key} className="p-1">
                            <input
                              type="text"
                              value={String(val ?? '')}
                              onChange={e => updateCell(i, key, e.target.value)}
                              className="w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Upload section */}
            <div className="bg-white rounded-xl border p-4 mb-4">
              <label className="block text-sm font-medium mb-2">
                Upload {tab === 'mb51' ? 'MB51 (GR)' : 'ME2N (PO)'} Excel File
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFile}
                  disabled={importing}
                  className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {importing && <span className="text-sm text-blue-600">Importing...</span>}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                If the file name already exists, a timestamp suffix will be added automatically.
              </p>
            </div>

            {/* Import history */}
            <div className="bg-white rounded-xl border">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-semibold">Import History</h2>
                <button
                  onClick={openEdit}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Edit Data
                </button>
              </div>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No imports yet.</div>
              ) : (
                <div className="divide-y text-sm">
                  {logs.map(log => (
                    <div key={log.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <div className="font-medium">{log.file_name || 'Unnamed file'}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">{log.rows_imported} rows</span>
                        {log.errors && Array.isArray(log.errors) && log.errors.length > 0 && (
                          <span className="text-xs text-red-500" title={log.errors.join('; ')}>
                            {log.errors.length} error(s)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
