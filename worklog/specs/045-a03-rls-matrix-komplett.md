# Slice 045 — A-03 RLS-Matrix komplett (INV-26 → INV-32 Erweiterung)

**Groesse:** M (1.5-2h erwartet)
**CEO-Scope:** JA (Security-Audit auf RLS)
**Variante-2-Position:** #2/10

## Ziel

Erweitere RLS-Policy-Audit von heute 8 sensiblen Tabellen (INV-26) auf die **komplette Matrix aller 114 public Tabellen**. Etabliere einen INV-32 Test der gegen eine explizite EXPECTED_PUBLIC Allowlist scannt — jede neue Tabelle mit qual=true Policy, die nicht in der Allowlist ist, triggert Test-Fail (Regression-Guard).

**Live-Count-Update (IMPACT-Query 2026-04-18):** 120 public Tabellen (urspruenglich 114 geschaetzt). 60 mit qual=true, 4 mit 0 Policies, 56 user-scoped.

## Hintergrund

Slice 014 + 019-021 fixten bekannte AUTH-08-Luecken (holdings, orders, sensitive-Whitelist). INV-26 scannt heute nur 8 Tabellen und deren qual=true Policies → kann aber NICHT detect drift auf nicht-gelisteten Tabellen. Wenn eine neue Tabelle hinzukommt die sensitive Daten enthaelt aber qual=true bekommt, bleibt's unentdeckt bis manueller Audit.

Heutige DB-State (via Live-Scan 2026-04-18):
- 114 public Tabellen total
- 60 haben mindestens eine qual=true Policy (alle SELECT)
- 54 haben keine qual=true Policies (user-scoped)
- 8 bekannte AUTH-08-Tables sind sauber (verifiziert INV-26)

Die 60 Tables mit qual=true fallen in legitimate Kategorien:
- **Reference-Daten** (definitions, config): ~15 Tables
- **Content** (posts, bounties, research, community-polls): ~11 Tables  
- **Sport-Daten** (clubs, players, fixtures): ~13 Tables
- **Leaderboard/Scores** (aggregated analytics): ~11 Tables
- **Social-Graph** (profiles, user_follows): ~2 Tables
- **Platform-Transparenz** (pbt_treasury, pbt_transactions): ~2 Tables
- **Orderbook** (ipos, trades): ~2 Tables
- **Internal-Logs** (cron_sync_log): 1 Table
- **Events-Meta** (events, arena_seasons, dpc_of_the_week, ...): ~3 Tables

## Betroffene Files

**NEU:**
- `supabase/migrations/NNN_slice_045_rls_matrix_audit.sql` — Neue Audit-RPC `public.get_rls_policy_matrix()` die alle public Tabellen mit allen qual=true/qual=null Policies listet
- `worklog/proofs/045-matrix-before.txt` — Live-DB-State mit Klassifikation
- `worklog/proofs/045-matrix-after.txt` — Gleiche Abfrage nach Migration + INV-32 Output
- `worklog/proofs/045-inv32-vitest.txt` — INV-32 Test-Output

**MODIFIZIERT:**
- `src/lib/__tests__/db-invariants.test.ts` — INV-32 hinzufuegen mit EXPECTED_PUBLIC Allowlist (gegen 60 Tables) + EXPECTED_SENSITIVE (gegen 8 Tables)

## Acceptance Criteria

1. **Audit-RPC deployed:** `public.get_rls_policy_matrix()` liefert JSONB-Array mit `{table_name, has_rls, policy_count, permissive_policies, classification}` pro public Table.
2. **INV-32 ausfuehrbar:** Scan aller 114 public Tabellen gegen EXPECTED_PUBLIC Allowlist (60 Eintraege mit Reason) + EXPECTED_SENSITIVE Blocklist (8 Eintraege). Test schlaegt fehl wenn:
   - Eine Tabelle in SENSITIVE Blocklist hat qual=true Policy
   - Eine Tabelle NICHT in EXPECTED_PUBLIC hat qual=true Policy
   - Eine bekannte Tabelle fehlt komplett (Table removed, Allowlist veraltet)
3. **Keine Regression:** Alle 29 existierenden INV-Tests bleiben gruen.
4. **Keine neuen unerwarteten qual=true Policies** nach Slice 045.
5. **Proof-Artefakte:** Before-Matrix + After-Matrix + Vitest-Output.

## Edge Cases

1. **RLS disabled auf Table** — nicht qual=true, aber effektiv selbes Problem. INV-32 muss das flaggen als `rls_disabled_risk`.
2. **FORCE ROW LEVEL SECURITY** — tablesowner-Bypass. Aktuell keine Table nutzt das. Dokumentieren.
3. **INSERT-only Policies mit NULL qual** — akzeptabel (USING fuer INSERT = row-being-inserted). Nicht als permissive flaggen (gleiches Pattern wie INV-26 Line 1192).
4. **Mehrere qual=true Policies auf derselben Table** — gewollt, nur eine Policy pro cmd-Typ.
5. **Roles='public' vs 'authenticated'** — public schliesst anon ein. INV-32 muss den Unterschied dokumentieren aber nicht blocken (public-read fuer Spielstand-Seiten ist intended).
6. **Table neu hinzugekommen** (z.B. via Migration) — wenn nicht in beiden Listen → Test-Fail mit konkreter Anweisung.
7. **Table entfernt** (dropped) — INV-32 muss noch gruen bleiben, Allowlist-Eintrag ist ok als "dead reference".

## Proof-Plan

1. `worklog/proofs/045-matrix-before.txt` — Full matrix listing vor Test-Einfuehrung
2. `worklog/proofs/045-matrix-after.txt` — Gleiche Query nach Migration + Klassifikation
3. `worklog/proofs/045-inv32-vitest.txt` — INV-32 gruen mit `[INV-32] checked 114 tables, 60 qual=true allowlisted, 8 sensitive protected, 0 violations`

## Scope-Out

- **Fixes an legacy-Policy-Names:** Naming-Konsistenz (z.B. "Anyone can read X" vs "x_select") — separater Polish-Slice, nicht Security-relevant.
- **qual=null auf NICHT-INSERT Policies:** wird in INV-32 als "rollback_to_insert_only" flaggt wenn nicht in Allowlist, aber nicht auto-fixed.
- **FORCE ROW LEVEL SECURITY Hardening:** Owner-bypass-Protection. Nicht Scope dieses Slice.
- **WITH CHECK clause Audit:** INSERT/UPDATE-Side. Separate Klasse, Slice 045b.
- **RLS auf non-public Schemas:** auth.*, supabase_* ignoriert.

## Design-Fragen

**Q1:** Format der Allowlist — inline im Test (EXPECTED_PUBLIC Object) oder separate JSON-Datei?
**Empfehlung:** Inline in Test. Aenderungen = PR-Review-friendly, kein Schema-Drift, Reason pro Table direkt im Code sichtbar.

**Q2:** Scope — nur SELECT oder alle cmd-Typen?
**Empfehlung:** Nur SELECT (cmd IN SELECT/ALL/UPDATE/DELETE). INSERT mit qual=NULL ist normales Pattern. FOR ALL mit qual=true ist aber kritisch und wird geprueft.

**Q3:** INV-26 subsumieren oder parallel behalten?
**Empfehlung:** Parallel. INV-26 ist konkrete AUTH-08-Wiederholungstest (8 Tables), INV-32 ist Matrix-Audit. Beide Layer = besser.

---

**Ready fuer CEO-Approval:** JA (Variante 2 bereits approved)
**Ready fuer IMPACT-Stage:** JA
