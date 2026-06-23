// Core TypeScript types for the Warehouse Material Tracking System

export type UserRole = 'admin' | 'requestor';

export type GrStatus = 'ready' | 'delivered';

export type ImportType = 'me2n' | 'mb51';

export interface Clerk {
  id: string;
  name: string;
  pin_hash: string;
  active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  contact: string | null;
  created_at: string;
}

export interface PoLine {
  id: string;
  po_no: string;
  line_no: number;
  user_order_no: string;
  material_desc: string | null;
  qty_ordered: number | null;
  supplier: string | null;
  created_at: string;
}

export interface GrDocument {
  id: string;
  gr_doc_no: string;
  user_order_no: string;
  gr_date: string | null;
  status: GrStatus;
  qr_code_id: string | null;
  created_at: string;
}

export interface GrDocumentLine {
  id: string;
  gr_document_id: string;
  po_line_id: string | null;
  qty_received: number | null;
}

export interface QrCode {
  id: string;
  gr_document_id: string;
  code_value: string;
  generated_at: string;
  print_count: number;
}

export interface HandoverRecord {
  id: string;
  gr_document_id: string;
  delivered_to: string | null;
  delivered_by_clerk_id: string | null;
  delivered_by_name: string | null;
  delivered_at: string;
  photo_evidence_url: string | null;
}

export interface ImportLog {
  id: string;
  import_type: ImportType;
  file_name: string | null;
  rows_imported: number;
  errors: any;
  created_at: string;
}

// Composite types for API responses
export interface GrDocumentWithDetails extends GrDocument {
  lines: (GrDocumentLine & { material_desc?: string })[];
  qr_code: QrCode | null;
  handover: HandoverRecord | null;
  received_vs_ordered: { received: number; ordered: number; pct: number };
}

export interface OutstandingOrder {
  user_order_no: string;
  po_lines_count: number;
  qty_ordered_total: number;
  qty_received_total: number;
  completeness_pct: number;
  status: 'ordered' | 'partial' | 'complete';
  last_gr_date: string | null;
  days_outstanding: number;
}

export interface ClerkSession {
  clerk: Clerk;
  token: string; // simple session token
  expires_at: string;
}

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// MB51 / ME2N import row types
export interface Me2nRow {
  'PO No.': string;
  'Line': number;
  'Order ID': string;
  'Material Description': string;
  'Qty Ordered': number;
  'Supplier': string;
}

export interface Mb51Row {
  'GR Document No': string;
  'Order ID': string;
  'Posting Date': string;
  'PO No.': string;
  'PO Line': number;
  'Qty Received': number;
}
