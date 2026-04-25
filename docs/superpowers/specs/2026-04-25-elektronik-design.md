# Elektronik Service Tracking — Design Spec

**Date:** 2026-04-25  
**Status:** Approved

## Overview

Add an "Elektronik" category to ServisRutin so users can track routine maintenance schedules for electronics (AC, kulkas, TV, etc.) the same way they track vehicle services — but without odometer or tax concepts.

## Database Schema

Three new tables, completely separate from kendaraan tables (Option A).

```sql
elektronik (
  id          INTEGER PRIMARY KEY,
  short_id    TEXT UNIQUE,            -- auto-generated 4-byte hex, for non-sequential URLs
  user_id     INTEGER NOT NULL REFERENCES users(id),
  nama        TEXT NOT NULL,          -- e.g. "AC Samsung Kamar"
  tipe        TEXT,                   -- free text, e.g. "AC", "Kulkas", "TV"
  lokasi      TEXT,                   -- optional, e.g. "Kamar Utama"
  tahun_beli  INTEGER                 -- optional, year of purchase
)

elektronik_service_items (
  id              INTEGER PRIMARY KEY,
  elektronik_id   INTEGER NOT NULL REFERENCES elektronik(id),
  nama            TEXT NOT NULL,          -- e.g. "Cuci AC"
  interval_type   TEXT,                   -- "DAY" | "MONTH" | "YEAR" | "NONE" (no KM or WHICHEVER_FIRST)
  interval_value  INTEGER,                -- e.g. 3 (for 3 months)
  last_date       TEXT                    -- "YYYY-MM-DD"
)

elektronik_service_history (
  id               INTEGER PRIMARY KEY,
  elektronik_id    INTEGER NOT NULL REFERENCES elektronik(id),
  service_date     TEXT NOT NULL,         -- "YYYY-MM-DD"
  service_item_ids TEXT NOT NULL,         -- JSON array of service item IDs
  total_cost       INTEGER,               -- optional, in rupiah
  notes            TEXT,                  -- optional
  created_at       TEXT NOT NULL          -- ISO timestamp
)
```

**Key differences from kendaraan tables:**
- No `last_km`, no `odometer_km` — electronics are time-based only
- `interval_type` only supports `DAY`, `MONTH`, `YEAR`, `NONE` — no `KM` or `WHICHEVER_FIRST`
- No pajak fields
- No `current_km`

## Backend API Routes

All routes require session authentication. Pattern mirrors `/api/vehicles`.

```
GET    /api/elektronik                                  list user's elektronik
POST   /api/elektronik                                  create new
PUT    /api/elektronik/:id                              update (nama, tipe, lokasi, tahun_beli)
DELETE /api/elektronik/:id                              cascade delete items + history

GET    /api/elektronik-service-items?elektronikId=X     list service items
POST   /api/elektronik-service-items                    create service item
PUT    /api/elektronik-service-items/:id                update service item
DELETE /api/elektronik-service-items/:id                delete service item

POST   /api/elektronik-service-history                  log a service session (updates last_date per item)
GET    /api/elektronik-service-history?elektronikId=X   list history
```

`short_id` is auto-generated with the same retry-loop pattern as kendaraan (4-byte random hex, up to 5 attempts on UNIQUE conflict).

## Frontend

### Routing

New routes added to `App.tsx`:
```
/elektronik         → ElektronikPage
/elektronik/:id     → ElektronikDetailPage
```

### Sidebar

Add "Elektronik" nav item with `Monitor` icon (lucide-react) between "Kendaraan" and "Riwayat Servis".

### New Components

```
client/src/components/elektronik/
  ElektronikPage.tsx         list + add + delete elektronik items
  ElektronikForm.tsx         form: nama (required), tipe, lokasi, tahun_beli
  ElektronikDetailPage.tsx   detail header + Tabs: "Item Servis" | "Riwayat"

client/src/hooks/
  useElektronik.ts
  useElektronikServiceItems.ts
  useElektronikServiceHistory.ts
```

`ElektronikDetailPage` mirrors `VehicleDetailPage` but:
- No odometer section
- No pajak section
- ServiceItemForm variant: interval_type options are DAY/MONTH/YEAR/NONE only
- AddHistoryForm variant: no odometer input, no km update

New types added to `client/src/types/index.ts`:
- `Elektronik`, `ElektronikPayload`
- `ElektronikServiceItem`, `ElektronikServiceItemPayload`
- `ElektronikServiceHistory`, `ElektronikServiceHistoryPayload`
- `ElektronikServiceItemRow`, `ElektronikServiceHistoryRow`, `ElektronikRow`
- Transformer functions: `toElektronik`, `toElektronikServiceItem`, `toElektronikServiceHistory`

### Dashboard Changes

- **Stat cards:** Add "Elektronik" count card alongside "Kendaraan". "Item Servis" and "Total Pengeluaran" aggregate from both kendaraan and elektronik.
- **Servis Mendatang:** Overdue/due-soon items from elektronik appear in the same list as kendaraan items, attributed by the elektronik's `nama`.
- **Aktivitas Terbaru:** Remains kendaraan-only (no change).

## Migration

New migration file: `migrations/0010_add_elektronik.sql`  
Creates the three new tables. No changes to existing tables.

## Types & Validation

- `interval_type` for elektronik is validated server-side to only accept `DAY`, `MONTH`, `YEAR`, `NONE`.
- `short_id` generation reuses the same randomblob(4) pattern.
- All ownership checks: verify `elektronik.user_id = session user` before any read/write.
