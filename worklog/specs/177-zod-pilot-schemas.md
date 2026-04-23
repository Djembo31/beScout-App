# Slice 177 — Zod + Pilot-Schemas (Tier B1 Foundation)

**Typ:** S-Slice. Money-Path: Nein (nur Admin-Routes, keine Trading/Money-RPC).
**Impact:** skipped (neue Module + 4 Admin-Route-Upgrades, keine Consumer-Aenderung).

---

## Ziel

Zod als Runtime-Validation-Foundation etablieren. 4 Admin-Routes migrieren auf typed Schema-Parse statt handschriftlicher `if (!email || !clubId)`-Guards. Als Foundation fuer spaetere Service-Shape-Consolidation (Slice 180 Tier B2).

---

## Scope

**IN Scope:**
- `zod` als runtime-dependency installieren (aktuell: nicht installiert)
- Neuer Ordner `src/lib/schemas/` fuer Pilot-Schemas
- Neuer Helper `parseBody(req, schema)` in `src/lib/observability/apiLogger.ts` (oder separates `src/lib/validation/parseBody.ts`)
- 4 Pilot-Routes migriert:
  1. `admin/invite-club-admin` — `{ email, clubId, role: 'owner'|'admin'|'editor' }`
  2. `admin/backfill-ratings` — `{ gameweek: 1-38 }`
  3. `admin/backfill-positions` — `{ gameweek: 1-38 }`
  4. `admin/sync-contracts` — `{ dryRun?: boolean }`
- Tests fuer jedes Schema + parseBody-Helper
- Integration mit Slice 174 `ValidationError` — Zod-Fehler werden zu `ValidationError` normalisiert

**OUT Scope (spaetere Slices):**
- Alle anderen API-Routes (aktuell ~15 route.ts Files) — kommt in 177b oder spaeter
- Service-Layer-Validation (`src/lib/services/*`) — Tier B2 = Slice 180
- Client-seitige Form-Validation (RHF + Zod) — Tier C2 = Slice 182
- Zod-Schema-Registry oder Code-Gen von Postgres-Typen
- DB-schema → Zod-generator (ist bekannter Workflow, aber scope-out)

**Nicht zulaessig in 177:**
- Money/Trading/Fantasy-Routes migrieren (`rpc_buy_player`, `rpc_liquidate_player`, etc.) — CEO-Scope per `memory/ceo-approval-matrix.md`
- Auth-Routes die Session-Cookies parsen
- CSV-Import-Route (`admin/players-csv/import`) — zu komplex fuer Pilot, eigener Slice

---

## Acceptance Criteria

1. **A1** — `zod` als dep in `package.json` (regular, nicht devDependencies). pnpm install gruen, pnpm-lock.yaml updated.
2. **A2** — `src/lib/schemas/` Ordner existiert mit 4 Schema-Files (invite-club-admin, backfill-ratings, backfill-positions, sync-contracts).
3. **A3** — `parseBody(req, schema)` Helper:
   - returnt `{ data: T }` bei success
   - wirft `ValidationError` (aus Slice 174) bei parse-fail
   - normalisiert Zod-Issues in field-Path + message
4. **A4** — 4 Pilot-Routes nutzen `parseBody` statt `try { await req.json() } catch`.
5. **A5** — Bei Zod-Parse-Fail landet der Request in Slice-175 `withLogger` Error-Pfad → `captureError(ValidationError)` mit `tags.code='validation'` automatisch.
6. **A6** — Tests:
   - Pro Schema: 1 Happy + 1 Invalid (mind.)
   - `parseBody`: Happy + invalid-JSON + schema-mismatch + error-path (ValidationError geworfen)
7. **A7** — tsc clean + alle Tests gruen.

---

## Risiken

- **Zod-Version-Lock:** `zod@^3.x` stable, kein breaking-change erwartet. Aktuelle Major ist 3.22+. Via context7 latest-stable pruefen.
- **Bundle-Size:** Zod ~14kB gzipped, nur Server-bundle betroffen (Admin-Routes sind Server-only). Client-Bundle nicht beeintraechtigt.
- **Admin-Route-Regression:** 4 Pilot-Routes sind Admin-only, kein User-Impact. Bei regression nur Admin-UI betroffen (Platform-Admin-Tab).
- **Integration mit withLogger (Slice 175):** NICHT in Scope — Admin-Routes nutzen aktuell NICHT withLogger. parseBody-Error muss im Route-Handler selbst als NextResponse.json rendered werden (400 Bad Request mit error-code). `withLogger`-Migration ist Slice 175b.

---

## Proof-Plan

`worklog/proofs/177-zod.txt`:
- `pnpm ls zod` — version confirmation
- `npx vitest run src/lib/schemas/ src/lib/validation/` — test summary
- `npx tsc --noEmit` — clean
- `git diff --stat` — file-count
- Beispiel-Inputs/Outputs fuer Schema-Rejection (invalid role, gw=0, gw=39)

---

## Time-Estimate

~25-30 min (pnpm install + 4 Schemas + parseBody Helper + 4 Route-Migrations + Tests).
