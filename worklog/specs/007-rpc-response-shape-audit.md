# 007 — RPC Response Shape Audit (A-07)

## Ziel

Systematischer Abgleich aller Client-gerufenen RPCs mit `jsonb_build_object`-Return gegen ihre Service-Cast-Shapes. **Invariante:** Jeder TypeScript-Cast auf ein RPC-Response-Feld matcht den tatsaechlichen Key, den die RPC erzeugt.

Drift-Klasse: `jsonb_build_object('rewardType', ...)` (camelCase in RPC) vs `as { reward_type: ... }` (snake_case im Service) → alle Felder silent `undefined`, TypeScript faengt das NICHT (`as` = unchecked assertion).

Regression-Guard: **INV-23** via Audit-Helper-RPC `get_rpc_jsonb_keys()`, das aus `pg_get_functiondef()` alle top-level `jsonb_build_object`-Keys extrahiert. Whitelist aller vom Client konsumierten RPCs (mit erwartetem Key-Set pro RPC) im Test.

## Klassifizierung

- **Slice-Groesse:** M-L (1 Migration, 1 Test-Invariante, 0-N Drift-Fixes je nach Befund)
- **Scope:** **CTO-autonom** (Audit + Regression-Guard)
- **Border-Escalation:** Wenn Drift in **Money/Trading-RPC** (z.B. trading.ts, wallet.ts, mysteryBox.ts) gefunden → CEO-Check vor Fix-Migration (CEO-Approval-Matrix Zeile "Trading-RPCs", "Wallet-Aenderungen").
- **Referenz:** 
  - Walkthrough 04-blocker-a.md A-07
  - common-errors.md "RPC Response camelCase/snake_case Mismatch" (AR-42 Mystery Box, 2026-04-11)
  - common-errors.md "RPC INSERT Column-Mismatch gegen Live-Schema" (AR-42b, 2026-04-14)

## Betroffene Files

| File | Rolle |
|------|-------|
| `supabase/migrations/20260417020000_audit_helper_rpc_jsonb_keys.sql` (NEW) | Helper-RPC `public.get_rpc_jsonb_keys(text[])` — SECURITY INVOKER, REVOKE anon/GRANT auth |
| `src/lib/__tests__/db-invariants.test.ts` (+ ~80 LOC) | INV-23 — Whitelist + Assertion |
| `worklog/proofs/007-rpc-shape-audit.txt` (NEW) | Full audit report: RPC, keys, service, drift-status |
| `worklog/proofs/007-inv23.txt` (NEW) | Test-Output |
| 0-N Service-Files (bei Cast-Drift) | Cast-Shape-Fix |
| 0-N Migrationen (bei RPC-Drift, CEO-Scope) | Key-Rename |

## Acceptance Criteria

1. Migration `20260417020000_audit_helper_rpc_jsonb_keys.sql` live: `SELECT * FROM public.get_rpc_jsonb_keys(ARRAY['open_mystery_box_v2'])` liefert valide Keys.
2. Vollstaendige Whitelist in INV-23: alle vom Client gerufenen RPCs, die `jsonb_build_object` im Return haben, mit ihrem erwarteten Top-Level-Key-Set (aus Service-Cast abgeleitet).
3. INV-23 **gruen** — d.h. jeder Whitelist-Entry liefert das erwartete Key-Set (Subset-Match, nicht exakt: RPCs duerfen MEHR liefern als Service castet, aber nicht WENIGER oder FALSCH).
4. 0 Drift-Treffer ODER dokumentierte Fix-Slices (ggf. CEO-approved).
5. `tsc --noEmit` clean.
6. Proofs: `007-rpc-shape-audit.txt` (Full Audit) + `007-inv23.txt` (Test).

## Edge Cases

1. **RPC hat `jsonb_build_object` aber wird nicht via .rpc() gecalled** (z.B. intern, Trigger) → Skip in Whitelist, kein Drift-Check.
2. **Service-Cast ist `any` oder fehlt** → Nicht als Drift werten, aber in Audit-Report als "untyped" flaggen.
3. **RPC returned `SETOF record` mit inline jsonb** (selten) → Parser muss top-level jsonb_build_object auch in SELECT-Statements erkennen, nicht nur RETURN.
4. **Dynamisches Key-Building** (`CASE WHEN ... THEN jsonb_build_object(...)` mit unterschiedlichen Keys) → Audit-Helper liefert Union aller Keys. INV-23 prueft Subset.
5. **Nested jsonb_build_object** (`{outer: jsonb_build_object('inner', ...)}`) → Nur top-level extrahieren. Inner ist Service-Problem, nicht drift-Problem.
6. **RPC wird ueber Wrapper aufgerufen** (z.B. `rpc_lock_event_entry` vs `lock_event_entry`) → Service-Cast matcht WRAPPER-Output, nicht inner RPC. Whitelist verweist auf Wrapper.
7. **RPC hat `jsonb_agg(jsonb_build_object(...))`** → Array-Return, top-level Keys sind inner-array-keys. Audit-Helper muss das erkennen.
8. **Deprecated RPCs in Migration-Folder aber nicht mehr in DB** → Audit-Helper nutzt Live-DB (pg_proc), nicht Files. Dead RPCs kommen nicht im Report.
9. **SECURITY DEFINER + REVOKE**: Audit-Helper selbst muss folgen (AR-44 Template).
10. **Whitelist-Drift:** Neuer Service/RPC → Whitelist nicht aktualisiert → INV-23 meldet bei CI-Run "unbekannter Consumer". Check-Lauf-Message soll developer-freundlich sein.

## Proof-Plan

1. **Audit-Report** (`007-rpc-shape-audit.txt`):
   - Alle public RPCs mit `jsonb_build_object` im Body (aus pg_get_functiondef)
   - Service-Consumer (aus grep `\.rpc\('rpc_name'`)
   - Top-level Keys (aus Audit-Helper)
   - Service-Cast-Keys (manuell extrahiert, im Audit-Skript)
   - Drift-Status: MATCH / MISSING (Cast erwartet Key der nicht existiert) / EXTRA (RPC liefert Key den Cast nicht erwartet, harmlos) / NO_CONSUMER
2. **INV-23 Test-Output** (`007-inv23.txt`): vitest run db-invariants.test.ts
3. **Bei Drift-Fix:** before/after Migration-Output als separater Proof.

## Scope-Out

- **INSERT/UPDATE Column-Mismatch-Audit** (AR-42b-Klasse) — separater Slice, kommt mit INV-24 spaeter. Hier nur Return-Shape.
- **Nested-Cast-Deep-Check** — nur Top-Level-Keys, kein Recursive-Match.
- **Service-Cast-Korrektur ohne DB-Aenderung** bleibt CTO-Scope. Aber: RPC-Return-Rename = Breaking-Change = CEO-Scope.
- **Null/undefined-Handling im Service** — separate Sorgfaltpflicht, hier nicht Audit-Thema.
- **Dokumentation eines "kanonischen Response-Types"-Generators** (TS-Type aus RPC ableiten) — Nice-to-Have, post-Beta Backlog.

## Stages

- SPEC — dieses File
- IMPACT — inline (Service-Konsumenten via grep)
- BUILD — (a) Audit-Helper Migration, (b) Audit durchlaufen, (c) INV-23 Whitelist, (d) Drift-Fixes (falls)
- PROVE — audit.txt + inv23.txt
- LOG — log.md + commit + common-errors.md Update (falls neue Drift gefunden)
