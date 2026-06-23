# Warehouse Material Tracking System — MVP Plan

**Scope:** Track non-SAP-managed materials from PO raised → GR (SAP) → Handover, across 3 surfaces: Admin Dashboard, User Tracking Portal, and Clerk Mobile Input App.

**Core principle:** GR is decided in SAP, not in the app. Material physically never leaves the warehouse until SAP GR is posted, so the **MB51 export is the trustworthy signal** that material is ready — not a manual clerk confirmation. The clerk app's only data-entry action is **Handover**.

---

## 1. System Overview

| Surface | User | Core Job |
|---|---|---|
| **Admin Dashboard** | Warehouse supervisor (you) | Full detail, all-level status — PO outstanding + physical layer + delivery |
| **User Tracking Portal** | Requestor | General status only, DHL-style, by Order ID |
| **Clerk Input App** | Warehouse clerk | Scan to hand over, capture photo evidence, batch-print QR labels |

All three are web apps (PWA) — one codebase for desktop, Android, iPhone, and the Honeywell scanner.

---

## 2. Status Lifecycle

```
Ordered ────────► Ready at Warehouse ────────► Delivered
(ME2N import)      (MB51 import —              (clerk scans QR
                    auto, no manual              at handover +
                    confirm step)                 photo evidence)
```

- **Ordered**: PO line exists in ME2N export, not yet in MB51.
- **Ready at Warehouse**: PO line's GR Document Number appears in MB51 import. This flips automatically on import — **no clerk action, no GR Confirm screen**.
- **Delivered**: Clerk scans the QR during handover, photo evidence captured, status flips.

**PO completeness is a separate layer.** Whether an order's full quantity has arrived (partial vs. complete PO fulfillment) lives at the **Admin Dashboard / Order level**, calculated from ME2N vs. MB51 quantities. It does **not** gate or affect the warehouse physical status (Ready / Delivered) — the warehouse layer only cares "has this specific GR Document arrived, and has it gone out."

---

## 3. QR Code Design

**Key insight:** SAP generates one GR Document Number per goods receipt posting — and physically, that's one GR slip. That's the natural anchor for the QR, not the PO Number. One GR Document maps to exactly **one Order ID** (it may still cover multiple materials/line items under that order, but never spans multiple orders).

**Generation trigger:** Automatic, the moment a new GR Document Number appears in an MB51 import — no clerk action needed to create it.

**What's encoded in the QR itself** (kept lean — dense QR codes scan worse on worn warehouse labels):
- A short lookup key or URL: `https://yourapp/gr/{gr_doc_no}`

**What's printed as human-readable text alongside the QR on the label** (visible, not encoded):
- GR Document No
- GR Posting Date
- Order ID
- Supplier

**What's stored in the database**, pulled up on scan:
- GR Document No (primary key)
- GR posting date
- Order ID
- PO No(s) + line(s)
- Material description(s) + qty per line
- Supplier
- QR generated timestamp, print count
- Current status (Ready at Warehouse / Delivered)
- Handover record (when delivered): which clerk, when, photo evidence

---

## 4. Data Model (core tables)

```
po_lines
  id, po_no, line_no, user_order_no (SAP key), material_desc,
  qty_ordered, supplier, created_at

gr_documents
  id, gr_doc_no (unique, from MB51), user_order_no, gr_date,
  status (ready | delivered), qr_code_id, created_at

gr_document_lines  (join: one GR doc → many material lines, same order)
  id, gr_document_id, po_line_id, qty_received

qr_codes
  id, gr_document_id, code_value, generated_at, print_count

handover_records
  id, gr_document_id, delivered_to, delivered_by_clerk_id,
  delivered_at, photo_evidence_url

clerks
  id, name, pin_hash, active (bool), created_at

users
  id, name, role (admin | requestor), contact
```

---

## 4a. Clerk Identity & Login (Shared Device, Shift Changes)

Since multiple clerks share the same device/scanner throughout a shift, the input app needs lightweight identity switching — not a full email/password login each time.

**Front page flow:**
1. App opens to a **clerk selection screen**: dropdown listing active clerk names (managed by admin in the `clerks` table)
2. Clerk selects their name + enters a short **PIN** (4-digit, not a full password — fast enough to use dozens of times a day, but still ties every handover record to a specific person for accountability)
3. **Login** button → session active, app proceeds to scan/handover screens
4. **Logout** button always visible (e.g. top corner) → ends session immediately when handing the device to the next clerk, without restarting the device or app

**Why a PIN over open dropdown-only:** every handover writes `delivered_by_clerk_id` into the audit trail — if someone disputes a delivery later, you need more than "anyone could've picked the name from a list." A PIN is a low-friction middle ground between full auth and no accountability.

**Admin side:** clerk roster (add/deactivate clerks, reset PINs) managed from the Admin Dashboard — not by clerks themselves.

---

## 5. Feature Breakdown by Phase

### Phase 1 — Import Engine (Week 1–2)
- ME2N import → upserts `po_lines` (status: Ordered)
- MB51 import → upserts `gr_documents` + `gr_document_lines`, auto-flips matched PO lines to **Ready at Warehouse**, auto-generates QR record
- Import diff report (new GR docs / status flips / exceptions — no matching PO, qty mismatch)

### Phase 2 — Clerk Input App (Week 2–3)
- Mobile-first PWA, large tap targets, one-handed use
- **Scan input**: Honeywell keyboard-wedge mode (zero SDK work) + camera fallback (`html5-qrcode`) for phones
- **Handover screen** (the only data-entry action): scan QR → manifest pulls up (Order ID, material lines) → photo evidence capture (required) → save → status flips to Delivered. Delivery is logged against the **clerk currently logged in** (see Section 4a)
- **Batch QR Print**: list of GR docs with un-printed/pending QR → checklist select → generate print-ready label sheet (`jsPDF`, sized to your label stock)

### Phase 3 — Admin Dashboard (Week 3–4)
- **Outstanding List tab**: PO-level detail — PO No, Order ID, Material, Qty Ordered vs Received vs Delivered, completeness %, days outstanding, all-level status drill-down
- **Analytics tab**: GR-to-handover time, outstanding by age bucket, top requestors by volume, partial-receipt rate
- Export to Excel

### Phase 4 — User Tracking Portal (Week 4)
- Requestor looks up by Order ID (or direct link via WhatsApp)
- **General status only** (no PO partial-completeness detail): `Ordered → Ready for Pickup → Delivered`
- DHL-style vertical tracker, timestamped per step

### Phase 5 — Polish & Hardening (Week 4–5)
- Role-based access control
- Audit log (no silent overwrites)
- Offline-save-and-sync for clerk app (warehouse WiFi dead zones)

---

## 6. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend (all 3 apps) | **Next.js (React) + Tailwind + shadcn/ui** | One framework, modern UI, PWA-capable |
| Backend | **Next.js API routes** | No separate backend service needed at this scale |
| Database | **Supabase (Postgres)** | Already your stack — DB + Auth + Storage in one |
| Auth | **Supabase Auth** | Role-based: admin / clerk / requestor |
| File storage (photos) | **Supabase Storage** | Direct camera upload, signed URLs |
| QR generation | **`qrcode` (npm)** | Lightweight, triggered server-side on MB51 import |
| Camera scanning | **`html5-qrcode`** | Browser-based, no native app |
| Honeywell scanning | Keyboard-wedge mode (device config) | Scanner "types" into focused input — zero integration work |
| Batch label printing | **`jsPDF`** + print CSS | Precise label sizing |
| Hosting | **Vercel** | Native Next.js support |
| Excel import parsing | **SheetJS (`xlsx`)** | Reads ME2N/MB51 exports as-is |

---

## 7. Resource & Infra Configuration

| Resource | Tier | Est. Cost |
|---|---|---|
| Supabase | Pro (backups, no pausing) | ~$25/mo |
| Vercel | Pro (custom domain, reliability) | ~$20/mo |
| Storage (handover photos only now — lower volume than before) | Included | scales cheaply |
| Domain | Any registrar | ~$10–15/yr |
| **Total est.** | | **~$45–50/mo** |

No GPU/dedicated server needed — standard CRUD app with image upload and scheduled imports.

---

## 8. Roles & Permissions

| Role | Access |
|---|---|
| Admin | Full dashboard, analytics, all-level status, user/clerk management |
| Clerk | Input app only — handover + QR print, identified via name + PIN session (Section 4a). No analytics access |
| Requestor | Tracking portal only — general status, own orders |

---

## 9. Estimated MVP Timeline

**4–5 weeks** for one full-stack developer (shorter than the original GR-confirm-included flow, since removing that screen also removes a chunk of validation/UI logic).

---

## 10. Open Items to Confirm with Programmer

- Label printer model/size (affects `jsPDF` layout dimensions)
- Whether Honeywell devices need MDM/kiosk-mode lockdown to the input app
- WiFi reliability in warehouse zones (offline-first sync: Phase 2 vs Phase 5)
- Whether requestor portal needs login or open lookup-by-Order-ID is acceptable for your security posture
- MB51 export schedule/frequency (daily? twice daily?) — determines how "real-time" Ready at Warehouse status feels to requestors
- PIN reset flow for clerks (self-service forgot-PIN vs. admin-only reset)
