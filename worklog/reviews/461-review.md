# Review — Slice 461 (D-12 Dead-RPC GC: DROP get_club_dashboard_stats(text) v1)

**Reviewer:** Cold-Context-Agent · **Datum:** 2026-06-29 · **Scope:** Security/Dead-GC DROP §3 (CEO-approved Anil „mach D-12") · **time-spent:** ~9 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW (scoped-out) | Problem-Statement / Framing | Security-Framing überzeichnet: `get_club_dashboard_stats_v2` (LIVE, **anon_exec=TRUE**) liefert laut RPC-Shape-Audit (`proofs/007:132-133`) die **identische** Spalten-Menge inkl. `user_id` + `holdings_count`. Der Per-User-PII-zu-anon-Leak besteht via `club_id` auf v2 fort — der DROP schließt nur den **by-name-Enumerations**-Vektor + das Duplikat + senkt anon-SECDEF-Count, NICHT die Kern-Exposure. | Korrekt scoped-out (Spec §11 + disease-register:74 + MASTERPLAN W0). **Commit/LOG NICHT „anon-PII-Leak geschlossen" — präzise: „redundanten v1-Pfad + Name-Enumeration entfernt; v2-anon-Grant = offenes W0-Item".** → **ERLEDIGT (Wording korrigiert)** |
| 2 | NIT | Spec Edge-Case #4 | Es gibt **keine** CREATE-Migration für v1 (noch v2) — beide leben nur live (Registry-Drift, S156-„lebt nur live"). Greenfield-Replay legt v1 nie an → DROP IF EXISTS = harmloser No-op. v2-Greenfield-Gap pre-existing, nicht Scope. | Doku-Ungenauigkeit, harmlos. v2-Greenfield-Gap getrackt als Note. |
| 3 | NIT (LOG-Stage) | disease-register:105 / MASTERPLAN:53 | D-12 noch „🔴 offen"; §0 verlangt Tracking-Update im selben Slice. | → **ERLEDIGT** (D-12 geheilt + v2-Folgeitem + MASTERPLAN reconcile) |

## One-Line
Ja — ein Senior merged das: lehrbuchhafter minimaler, idempotenter, signatur-präziser DROP einer verifiziert-toten anon-PII-RPC; die breitere v2-Exposure ist bewusst deferred und getrackt.

## Belege zu den kritischen Fragen
1. **v1 wirklich tot?** JA — unabhängiger repo-Grep: einziger Code-Caller = `get_club_dashboard_stats_v2` (`club.ts:503`, Tests); plain `(text)` nur in Docs+Migration. Keine dynamischen RPC-Namen-Strings, **0 Edge-Functions** (`supabase/functions/**`=0), keine RLS-Policy/View/Trigger (repo-Grep + `pg_proc.prosrc` leer + 0 pg_cron + Vorab-Audit 2026-06-14). 3-Wege-Enum vollständig.
2. **DROP sicher?** JA — pg_depend=0, kein CASCADE (dessen Abwesenheit korrekt). `IF EXISTS` da. (Plus: plain DROP ging live durch = Postgres bestätigt 0 Dependent.)
3. **Nur v1 (text), nicht v2 (uuid)?** JA — v2 = distinkter Name `_v2`, kein Overload; `(text)` kann v2 nie treffen. AC-02 + force-rollback (v1 1→0, v2_survivor=1).
4. **Migration-Hygiene?** JA — Timestamp `20260629220000` ok, apply_migration (kein db push), idempotent. AR-44 N/A (reiner DROP).
5. **§0-Schnitt-Regel?** JA für Code (kein i18n/Service/Type-Residual auf v1); nur Register-Tracking stand aus (Finding #3 → erledigt).

## Positive
- Echte Subtraktion (§0) — ein toter Pfad weniger, anon-SECDEF-Surface −1.
- Vorbildliche DROP-Beweisführung: Triage + force-rollback (DROP-im-Tx + v2-Survivor + RAISE-Rollback) + 5 ACs inkl. ehrlicher Buchung der 3 pre-existing INV-Failures.
- DROP > REVOKE für 0-Caller-Funktion korrekt begründet (Exposure-Teilschluss + Duplikat in einem Schnitt), CEO-approved.

## Learning (Knowledge-Kandidat)
Bei „Dead-RPC v1 DROP, v2 = Live-Pfad": IMMER prüfen ob v2 dieselbe Shape/Exposure trägt — sonst suggeriert die Security-Story mehr Closure als faktisch erreicht. RPC-Shape-Audit (`proofs/007`) war hier der entscheidende Beleg. → errors-db S461.
