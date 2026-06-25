'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GrManifest {
  code_value: string;
  gr_document_id: string;
  gr_documents: {
    id: string;
    gr_doc_no: string;
    user_order_no: string;
    gr_date: string;
    status: string;
    handover_records: any[];
  };
  lines: {
    po_lines: {
      po_no: string;
      material_desc: string;
      qty_ordered: number;
    };
    qty_received: number;
  }[];
}

export default function WarehousemanScanPage() {
  const [session, setSession] = useState<any>(null);
  const [inputMode, setInputMode] = useState<'scan' | 'manual'>('scan');
  const [manualCode, setManualCode] = useState('');
  const [manifest, setManifest] = useState<GrManifest | null>(null);
  const [deliveredTo, setDeliveredTo] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem('warehouseman_session');
    if (!raw) { router.push('/login'); return; }
    setSession(JSON.parse(raw));
  }, [router]);

  const resolveCode = async (code: string) => {
    setError('');
    try {
      const res = await fetch(`/api/qr/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.success) {
        setManifest(data.data);
        setSuccess(false);
      } else {
        setError('Code not found');
      }
    } catch (e) {
      setError('Failed to resolve code');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const c = canvas.getContext('2d');
    if (!c) return;
    c.drawImage(video, 0, 0);
    setPhotoData(canvas.toDataURL('image/jpeg', 0.7));
    stopCamera();
  };

  let stream: MediaStream | null = null;

  const startCamera = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { setError('Camera not available'); }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  };

  const handleHandover = async () => {
    if (!manifest || !session) return;
    if (!deliveredTo) { setError('Enter recipient name'); return; }
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/handover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gr_document_id: manifest.gr_documents.id,
        delivered_to: deliveredTo,
        delivered_by_warehouseman_id: session.warehouseman.id,
        photo_data_url: photoData,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (data.success) {
      setSuccess(true);
      setPhotoData(null);
      setDeliveredTo('');
    } else {
      if (data.error === 'Already delivered') {
        setSuccess(true);
      } else {
        setError(data.error || 'Handover failed');
      }
    }
  };

  const resetForm = () => {
    setManifest(null);
    setSuccess(false);
    setPhotoData(null);
    setDeliveredTo('');
    setManualCode('');
    setInputMode('scan');
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  const doLogout = () => {
    sessionStorage.removeItem('warehouseman_session');
    router.push('/login');
  };

  // Switch operator state
  const [operatorList, setOperatorList] = useState<{ id: string; name: string; active: boolean }[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingWm, setPendingWm] = useState<{ id: string; name: string } | null>(null);
  const [switchPin, setSwitchPin] = useState('');
  const [switchError, setSwitchError] = useState('');
  const [switching, setSwitching] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Honeywell keyboard-wedge: auto-detect scanner input
  // Always keep cursor in the scan field unless popup is open
  useEffect(() => {
    if (inputMode !== 'scan' || manifest || pendingWm || dropdownOpen) return;
    const input = scanInputRef.current;
    if (!input) return;
    input.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const code = input.value.trim();
        if (code) resolveCode(code);
        input.value = '';
      }
    };
    const onBlur = () => {
      if (!pendingWm && !dropdownOpen && inputMode === 'scan' && !manifest) {
        setTimeout(() => input?.focus(), 50);
      }
    };

    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('blur', onBlur);
    return () => {
      input.removeEventListener('keydown', onKeyDown);
      input.removeEventListener('blur', onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputMode, manifest, pendingWm, dropdownOpen]);

  // Fetch operator list when dropdown opens
  const toggleDropdown = async () => {
    if (dropdownOpen) { setDropdownOpen(false); return; }
    setDropdownOpen(true);
    try {
      const res = await fetch('/api/warehousemen');
      const d = await res.json();
      if (d.success) setOperatorList(d.data);
    } catch { /* ignore */ }
  };

  // Show PIN popup for selected operator
  const selectOperator = (wm: { id: string; name: string }) => {
    if (wm.id === session?.warehouseman?.id) { setDropdownOpen(false); return; }
    setPendingWm(wm);
    setSwitchPin('');
    setSwitchError('');
    setDropdownOpen(false);
  };

  // Verify PIN and switch
  const confirmSwitch = async () => {
    if (!pendingWm || !switchPin) { setSwitchError('Enter PIN'); return; }
    setSwitching(true);
    setSwitchError('');
    try {
      const res = await fetch('/api/warehouseman-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseman_id: pendingWm.id, pin: switchPin }),
      });
      const d = await res.json();
      if (d.success) {
        sessionStorage.setItem('warehouseman_session', JSON.stringify(d.data));
        setSession(d.data);
        setPendingWm(null);
        setSwitchPin('');
      } else {
        setSwitchError(d.error || 'Invalid PIN');
      }
    } catch {
      setSwitchError('Network error');
    } finally {
      setSwitching(false);
    }
  };

  const cancelSwitch = () => {
    setPendingWm(null);
    setSwitchPin('');
    setSwitchError('');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Warehouse Scanner</h1>
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-gray-500 hover:text-gray-800 transition" title="Menu">
            <img src="/images/home-icon.svg" alt="Home" width="20" height="20" />
          </Link>
          {session && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition"
                title="Switch operator"
              >
                <span className="text-gray-600">{session.warehouseman.name}</span>
                <span className={`text-xs text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg z-20 min-w-[180px] py-1 overflow-hidden">
                  {operatorList.filter(w => w.active !== false).map(wm => (
                    <button
                      key={wm.id}
                      onClick={() => selectOperator(wm)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition ${
                        wm.id === session.warehouseman.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {wm.name}
                      {wm.id === session.warehouseman.id && <span className="text-xs ml-2 text-blue-400">(current)</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={doLogout} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Scan input (hidden, auto-focused for Honeywell keyboard-wedge) */}
        {inputMode === 'scan' && !manifest && (
          <div>
            <input
              ref={scanInputRef}
              type="text"
              className="w-full p-4 border-2 border-blue-500 rounded-xl text-center text-lg"
              placeholder="Scan QR code..."
              autoFocus
            />
            <p className="text-xs text-gray-500 text-center mt-2">
              Point scanner at QR label, or{' '}
              <button onClick={() => setInputMode('manual')} className="text-blue-600 underline">
                enter code manually
              </button>
            </p>
          </div>
        )}

        {/* Manual code entry */}
        {inputMode === 'manual' && !manifest && (
          <div>
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              className="w-full p-4 border rounded-xl text-center text-lg"
              placeholder="Enter GR code..."
              onKeyDown={e => e.key === 'Enter' && resolveCode(manualCode)}
            />
            <div className="flex gap-2 mt-2">
              <button onClick={() => resolveCode(manualCode)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">
                Look Up
              </button>
              <button onClick={() => setInputMode('scan')} className="flex-1 py-3 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300 transition">
                Scan
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !manifest && (
          <div className="bg-red-100 border border-red-300 rounded-xl p-4 text-red-700 text-center">{error}</div>
        )}

        {/* Manifest — handover form */}
        {manifest && !success && (
          <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-xl font-bold">{manifest.gr_documents.gr_doc_no}</h2>
            <p className="text-sm text-gray-500">Order: {manifest.gr_documents.user_order_no}</p>

            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold">Items</h3>
              {manifest.lines.map((line, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium">{line.po_lines?.material_desc || 'N/A'}</div>
                  <div className="text-sm text-gray-500">
                    Qty: {line.qty_received} · PO: {line.po_lines?.po_no || 'N/A'}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Delivered To</label>
              <input
                type="text"
                value={deliveredTo}
                onChange={e => setDeliveredTo(e.target.value)}
                className="w-full p-3 border rounded-xl"
                placeholder="Recipient name / department"
              />
            </div>

            {/* Camera / Photo evidence */}
            <div>
              <label className="block text-sm font-medium mb-1">Photo Evidence</label>
              {!photoData ? (
                <button onClick={startCamera} className="w-full py-3 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300 transition">
                  📷 Take Photo
                </button>
              ) : (
                <div className="relative">
                  <img src={photoData} alt="Evidence" className="w-full rounded-xl" />
                  <button onClick={() => setPhotoData(null)} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 text-xs">✕</button>
                </div>
              )}
              {photoData && <p className="text-xs text-green-600 mt-1">✓ Photo captured</p>}
            </div>

            <video ref={videoRef} className="hidden" playsInline />
            <canvas ref={canvasRef} className="hidden" />

            {error && <p className="text-red-600 text-sm text-center">{error}</p>}

            <button
              onClick={handleHandover}
              disabled={submitting}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {submitting ? 'Processing...' : '✅ Confirm Handover'}
            </button>
          </div>
        )}

        {/* Success screen */}
        {success && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">Handover Complete!</h2>
            <p className="text-gray-500 mb-6">GR document has been marked as delivered</p>
            <button onClick={resetForm} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">
              Scan Next
            </button>
          </div>
        )}
      </div>

      {/* Switch operator PIN popup */}
      {pendingWm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold mb-1">Switch Operator</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter PIN for <span className="font-semibold text-gray-800">{pendingWm.name}</span>
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={switchPin}
              onChange={e => setSwitchPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full p-3 border rounded-xl text-2xl text-center tracking-[0.5em] mb-4"
              placeholder="••••"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && !switching && confirmSwitch()}
            />
            {switchError && <p className="text-red-600 text-sm text-center mb-3">{switchError}</p>}
            <div className="flex gap-3">
              <button
                onClick={cancelSwitch}
                className="flex-1 py-3 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitch}
                disabled={switching}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {switching ? 'Verifying...' : 'Switch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
