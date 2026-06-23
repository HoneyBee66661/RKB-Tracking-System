# Warehouse Material Tracking System — MVP

Track non-SAP-managed materials from PO raised → GR (SAP) → Handover, across 3 surfaces.

## Status Lifecycle

```
Ordered ────────► Ready at Warehouse ────────► Delivered
(ME2N import)      (MB51 import —              (clerk scans QR
                    auto, no manual              at handover +
                    confirm step)                 photo evidence)
```

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 + React + Tailwind v4 |
| Backend | Next.js API routes |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth + Clerk PIN-based login |
| Storage | Supabase Storage (handover photos) |
| QR Gen | `qrcode` (npm) |
| QR Scan | `html5-qrcode` + Honeywell keyboard-wedge |
| Excel Import | SheetJS (`xlsx`) |
| Label Print | `jsPDF` |

## Setup

```bash
cd wt-mvp
cp .env.example .env.local
# Fill in your Supabase URL + keys in .env.local
npm run dev
```

## Project Structure

```
wt-mvp/
├── app/
│   ├── (admin)/dashboard/    # Admin dashboard — full detail, analytics
│   ├── (clerk)/
│   │   ├── login/            # Clerk selection + PIN screen
│   │   └── scan/             # QR scan + handover with photo
│   ├── (requestor)/track/    # DHL-style order tracking
│   └── api/
│       ├── import/           # ME2N (PO) & MB51 (GR) Excel import
│       ├── gr-documents/     # GR doc listing with filters
│       ├── handover/         # Record handover (scan + photo)
│       ├── clerks/           # Clerk roster CRUD
│       ├── clerk-session/    # PIN-based login
│       ├── qr/               # QR code generation & resolution
│       ├── tracking/         # Public order tracking lookup
│       └── dashboard/        # Outstanding orders summary
├── lib/
│   ├── supabase.ts           # Lazy Supabase client
│   └── types.ts              # Full TypeScript types
├── database/
│   ├── schema.sql            # 8 tables: po_lines, gr_documents, gr_document_lines, qr_codes, handover_records, clerks, users, import_logs
│   └── seed.sql              # Sample data for dev
└── docs/SPEC.md              # Full spec
```
