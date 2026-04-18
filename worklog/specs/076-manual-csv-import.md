# Slice 076 — Manual CSV-Import für Market-Value + Contract-End

**Datum:** 2026-04-18
**Stage:** SPEC → BUILD
**Size:** M (2 API-Routes + 1 Tab-Component + Registration + i18n)
**CEO-Scope:** Admin-gated, kein User-Impact

## Ziel

Transfermarkt-Cloudflare-Block-Workaround: Admin exportiert aktuelle Players als CSV, füllt `market_value_eur` + `contract_end` manuell (aus Comunio/SofaScore-Abo), lädt hoch → bulk-UPDATE.

## Warum

Slice 075 ergab: Transfermarkt-Scraper blockiert auf Vercel-Datacenter-IPs. Keine Gold-Standard ohne alternative MV/Contract-Quelle. Manual-CSV = Zero-Dependency, Zero-Kosten, Full-Control.

## Files

1. **`src/app/api/admin/players-csv/export/route.ts`** (NEW)
   - GET. Admin-auth.
   - Returns CSV: `player_id,full_name,club,position,market_value_eur,contract_end`
   - Alle Players mit shirt_number IS NOT NULL (Stammkader)
   - Response-Header `Content-Type: text/csv; Content-Disposition: attachment; filename=players-YYYYMMDD.csv`

2. **`src/app/api/admin/players-csv/import/route.ts`** (NEW)
   - POST. Admin-auth. Accepts JSON `{ rows: Array<{player_id, market_value_eur, contract_end}> }`
   - Validates: player_id UUID exists, market_value_eur integer ≥ 0 or null, contract_end YYYY-MM-DD or null
   - Batch UPDATE via `.update().eq('id', row.player_id)` in chunks of 50 concurrent
   - Returns: `{updated, skipped, errored, errorSample[]}`

3. **`src/app/(app)/bescout-admin/AdminCSVImportTab.tsx`** (NEW)
   - "Export" button → fetch export-endpoint → trigger download
   - File-input `<input type="file" accept=".csv">`
   - Parse CSV client-side (minimal parser, strips quotes)
   - Preview (first 10 rows + errors)
   - "Apply Updates" button → POST import-endpoint
   - Result-display + ConfirmDialog für destructive action

4. **`src/app/(app)/bescout-admin/BescoutAdminContent.tsx`** (Tab-Registration)
   - Tab "csv_import" mit FileText-icon

5. **`messages/de.json` + `messages/tr.json`** (8 Keys)

## Acceptance Criteria

- **AC1** Export liefert CSV mit header + allen Stammkader-rows
- **AC2** Import parsed CSV, validated player_id + values
- **AC3** Invalid rows (unknown player_id, bad format) werden in `error_sample` gelistet, NICHT upgedated
- **AC4** Bulk-UPDATE in Chunks 50 (analog Slice 075)
- **AC5** Performance: Import für 4000 Rows <60s
- **AC6** Admin-UI zeigt Preview VOR Apply, ConfirmDialog
- **AC7** Empty cells (leeres mv_eur) werden als NULL behandelt (optional fields)
- **AC8** tsc + next build clean

## Edge Cases

- CSV mit BOM (Excel-Export) → strip BOM before parse
- CSV mit Semicolon separator (Deutsche Excel) → support `;` als alternative
- Contract_end leer → SET NULL (behalte existing? Nein, overwrite mit NULL)
- Market_value_eur = 0 → SET 0 (valid, "unbekannt" = 0)
- player_id UUID not in DB → skip + errorSample
- Malformed CSV-row → skip + errorSample
- User lädt Import CSV nicht aus Export (fehlende player_id-Column) → reject mit clear error
- Double-click auf Apply → disabled during pending

## Proof-Plan

1. Tab live auf bescout.net, Export-Button downloads CSV
2. Manual-Test: Upload dummy CSV mit 1 known player → preview zeigt match, apply updates
3. SQL-Verify: SELECT market_value_eur, contract_end FROM players WHERE id = X

## Scope-Out

- Frontend CSV parsing via papaparse (verwende native split)
- Auto-Detect Comunio/SofaScore Format (separate slice wenn needed)
- Historical import-log (v2)
- Background-Worker für sehr große CSVs (>10k rows → später)
