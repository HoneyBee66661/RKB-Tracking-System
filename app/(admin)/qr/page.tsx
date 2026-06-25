'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface QrCodeRecord {
  id: string;
  gr_document_id: string;
  code_value: string;
  print_count: number;
  generated_at: string;
  gr_documents: {
    gr_doc_no: string;
    user_order_no: string;
    status: string;
  } | null;
}

interface GrDocWithoutQr {
  id: string;
  gr_doc_no: string;
  user_order_no: string;
  status: string;
  gr_date: string;
}

export default function QrManagementPage() {
  const [tab, setTab] = useState<'print' | 'generate'>('print');
  const [qrCodes, setQrCodes] = useState<QrCodeRecord[]>([]);
  const [grDocs, setGrDocs] = useState<GrDocWithoutQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (tab === 'print') fetchQrCodes();
    else fetchGrDocsWithoutQr();
  }, [tab]);

  // Reset selection when data changes
  useEffect(() => { setSelected(new Set()); }, [qrCodes]);

  const fetchQrCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qr');
      const d = await res.json();
      if (d.success) setQrCodes(d.data);
    } catch { setError('Failed to load QR codes'); }
    finally { setLoading(false); }
  };

  const fetchGrDocsWithoutQr = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qr/generate/eligible');
      const d = await res.json();
      if (d.success) setGrDocs(d.data);
    } catch { setError('Failed to load GR documents'); }
    finally { setLoading(false); }
  };

  const generateQr = async (grDocId: string) => {
    setGenerating(grDocId);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gr_document_id: grDocId }),
      });
      const d = await res.json();
      if (d.success) {
        setMessage(`QR generated successfully`);
        fetchGrDocsWithoutQr();
      } else {
        setError(d.error || 'Generation failed');
      }
    } catch { setError('Failed to generate QR code'); }
    finally { setGenerating(null); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === qrCodes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(qrCodes.map(q => q.id)));
    }
  };

  const printSelected = async () => {
    const selectedQrs = qrCodes.filter(q => selected.has(q.id));
    if (selectedQrs.length === 0) return;

    setPrinting(true);
    setError('');

    try {
      const QRCode = (await import('qrcode')).default;
      const { default: jsPDF } = await import('jspdf');

      // Track prints server-side
      await Promise.all(
        selectedQrs.map(qr =>
          fetch('/api/qr/print', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_code_id: qr.id }),
          })
        )
      );

      // Build multi-page PDF (99 x 48 mm per label)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [99, 48],
      });

      for (let i = 0; i < selectedQrs.length; i++) {
        const qr = selectedQrs[i];
        if (i > 0) pdf.addPage([99, 48]);

        const qrDataUrl = await QRCode.toDataURL(qr.code_value, {
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        });

        // Title
        pdf.setFontSize(7);
        pdf.text('Warehouse Material Tracker', 49.5, 5, { align: 'center' });

        // QR code (left side)
        const qrSize = 30;
        pdf.addImage(qrDataUrl, 'PNG', 4, 8, qrSize, qrSize);

        // GR Doc number (large, right of QR)
        pdf.setFontSize(14);
        pdf.text(qr.gr_documents?.gr_doc_no || '', 40, 18);

        // Order ID
        pdf.setFontSize(8);
        pdf.text(`Order: ${qr.gr_documents?.user_order_no || ''}`, 40, 26);

        // Status
        pdf.setFontSize(7);
        pdf.text(`Status: ${qr.gr_documents?.status || 'unknown'}`, 40, 32);

        // Bottom: print count + QR value
        pdf.setFontSize(6);
        pdf.text(`Printed: ${qr.print_count + 1}x  |  ${qr.code_value}`, 49.5, 44, { align: 'center' });
      }

      // Refresh list to update print counts
      fetchQrCodes();

      // Open print dialog
      pdf.autoPrint();
      const blob = pdf.output('bloburl');
      window.open(blob as unknown as string, '_blank');
    } catch (e: any) {
      setError('Print failed: ' + (e.message || 'unknown error'));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold">QR Label Management</h1>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-800 transition" title="Dashboard">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </Link>
            <Link href="/" className="text-gray-500 hover:text-gray-800 transition" title="Home">
              <img src="/images/home-icon.svg" alt="Home" width="20" height="20" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('print')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'print' ? 'bg-[#CE1126] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Print / Reprint
          </button>
          <button
            onClick={() => setTab('generate')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'generate' ? 'bg-[#CE1126] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Generate New QR
          </button>
        </div>

        {/* Messages */}
        {message && <div className="bg-green-100 border border-green-300 rounded-xl p-3 text-green-700 text-sm mb-4">{message}</div>}
        {error && <div className="bg-red-100 border border-red-300 rounded-xl p-3 text-red-700 text-sm mb-4">{error}</div>}

        {/* Tab: Print / Reprint */}
        {tab === 'print' && (
          <>
            {/* Batch action bar */}
            {!loading && qrCodes.length > 0 && (
              <div className="bg-white rounded-xl border mb-4 p-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.size === qrCodes.length && qrCodes.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                    Select All ({qrCodes.length})
                  </label>
                  <span className="text-sm text-gray-500">
                    {selected.size} selected
                  </span>
                </div>
                <button
                  onClick={printSelected}
                  disabled={selected.size === 0 || printing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {printing ? 'Generating PDF...' : `Print Selected (${selected.size})`}
                </button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : qrCodes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No QR codes found. Go to Generate tab to create new ones.
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-red-50 border-b border-red-100">
                      <th className="w-10 p-3"></th>
                      <th className="text-left p-3 font-medium text-base">GR Document</th>
                      <th className="text-left p-3 font-medium text-base">Order ID</th>
                      <th className="text-left p-3 font-medium text-base">QR Code</th>
                      <th className="text-center p-3 font-medium text-base">Status</th>
                      <th className="text-center p-3 font-medium text-base">Printed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {qrCodes.map(qr => (
                      <tr
                        key={qr.id}
                        className={`hover:bg-gray-50 cursor-pointer transition ${
                          selected.has(qr.id) ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => toggleSelect(qr.id)}
                      >
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(qr.id)}
                            onChange={() => toggleSelect(qr.id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="p-3 font-medium">{qr.gr_documents?.gr_doc_no || 'N/A'}</td>
                        <td className="p-3 text-gray-600">{qr.gr_documents?.user_order_no || 'N/A'}</td>
                        <td className="p-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{qr.code_value}</code>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            qr.gr_documents?.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            qr.gr_documents?.status === 'ready' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {qr.gr_documents?.status || 'unknown'}
                          </span>
                        </td>
                        <td className="p-3 text-center text-gray-500">{qr.print_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Tab: Generate New */}
        {tab === 'generate' && (
          <>
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : grDocs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                All GR documents already have QR codes.
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-red-50 border-b border-red-100">
                      <th className="text-left p-3 font-medium text-base">GR Document</th>
                      <th className="text-left p-3 font-medium text-base">Order ID</th>
                      <th className="text-left p-3 font-medium text-base">Date</th>
                      <th className="text-center p-3 font-medium text-base">Status</th>
                      <th className="text-center p-3 font-medium text-base">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {grDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{doc.gr_doc_no}</td>
                        <td className="p-3 text-gray-600">{doc.user_order_no}</td>
                        <td className="p-3 text-gray-500">{doc.gr_date}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            doc.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => generateQr(doc.id)}
                            disabled={generating === doc.id}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"
                          >
                            {generating === doc.id ? 'Generating...' : 'Generate QR'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
