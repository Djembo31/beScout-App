# Operation Beta Ready — Phase 0 + Phase 1 (2026-04-14)

> Verdichtetes Wissen aus den Sessions vom 2026-04-14. Single Source: `memory/operation-beta-ready.md`.

## Phase 0 — Inventory (DONE 2026-04-14)

Zwei Explore-Agents liefen parallel und erzeugten zwei SSOTs:

- `memory/feature-map.md` (221 Zeilen) — Frontend-Inventar: alle Pages, Features, Components, Hooks, Stores. 12 User Journeys. Stack: Next.js 14 App Router + TS strict + Tailwind + TanStack Query v5 + Zustand v5.
- `memory/service-map.md` (266 Zeilen) — Backend-Inventar: 63 Service-Files, 341 exportierte Funktionen, alle RPCs, Domain-Map.

Diese Files sind SSOT — werden nicht geaendert, nur referenced.

## Phase 1.1 — Phantom SCs geloescht (DONE)

10 casual-Accounts (casual01–casual06 + 4 weitere) hatten Phantom-SCs aus Fan-Seeds. Cascade-Delete via Admin RPC. Supply-Invariant-Test war gruen nach Cleanup.

## Phase 1.3 A — RPC Description Sanitize (DONE, Migration 20260414150000)

14 RPCs hatten "DPC" in RAISE/description-Strings (nicht in Funktionsnamen). Gesammelte Migration mit `CREATE OR REPLACE FUNCTION` + `regex_replace`.

**Pattern: Bulk-Sanitize via regex_replace + pg_get_functiondef**
- `pg_get_functiondef(oid)` liest kompletten Body
- `regex_replace(body, '\yDPC\y', 'SC', 'g')` — `\y` = Word-Boundary (schuetzt lowercase Identifier wie `dpc_amount`)
- `DPCs` vor `DPC` replacen wegen Greedy-Matching (laengeres Pattern zuerst)
- Verify: `SELECT prosrc FROM pg_proc WHERE proname IN (...) AND prosrc LIKE '%DPC%'` → 0 rows

## Phase 1.3 B — RPC-Renames via Alias-Pattern (DONE, Migration 20260414151000)

2 Funktionen umbenannt (Null-Downtime, Alias-Wrapper):
- `buy_player_dpc` → `buy_player_sc`
- `calculate_dpc_of_week` → `calculate_sc_of_week`

**Pattern: RPC-Rename via Alias-Pattern**
1. CREATE neue Funktion mit neuem Namen (identischer Body, DPC→SC in Strings)
2. Alte Funktion = dunner Alias-Wrapper: `RETURN buy_player_sc(...)` — delegiert, kein eigener Body
3. Identische GRANTs auf beide Funktionen
4. Code-Deploy: Caller migrieren auf neuen Namen (Service + Tests)
5. Nach 1-2 Sessions Verify: alte Funktion DROP (separate Migration)

**Vorteile:** Reversibel (old function weiterhin lauffaehig), Null-Downtime zwischen Migration-Apply und Code-Deploy, besonders sicher fuer Cron-kritische Funktionen (`calculate_dpc_of_week` haengt an Gameweek-Scoring-Pipeline).

**Impact Phase 1.3 B (Caller):**
- `buy_player_sc`: 1 Production-Call (trading.ts:88), 9 Test-Calls (edge-cases, rls-checks, trading.test), 1 Mock-Kommentar
- `calculate_sc_of_week`: 1 Cron-Call (gameweek-sync/route.ts:1091)

## Phase 1.3 C — Noch offen (ausstehend)

Alias-DROP-Migrations (Phase 3 des Alias-Patterns) ausstehend — nach 1-2 Sessions Verify:
- `DROP FUNCTION buy_player_dpc`
- `DROP FUNCTION calculate_dpc_of_week`

## CEO Open Questions (aus Spec-Session, alle 6 beantwortet)

Alle 6 Open Questions aus `memory/operation-beta-ready.md` wurden in der CEO-Spec-Session beantwortet (Commit 9471b2d). Antworten in `memory/operation-beta-ready.md` dokumentiert.

## Naechste Phasen

Phase 1.4 (Migration-Drift Doku), Phase 1.5 (Live-DB Tests), Phase 2 (User Journey Testing) — siehe `memory/operation-beta-ready.md` fuer aktuelle Checkliste.
