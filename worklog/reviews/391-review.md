# Slice 391 Review — nationality-Normalisierung (generierte Spalte nationality_iso)

**Reviewer:** reviewer-Agent (Cold-Context, read-only) · **Datum:** 2026-06-26 · **time-spent:** ~9 min

## Verdict: PASS

## Findings (alle NIT, nicht merge-blockierend)
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | normalize_nationality ISO-2-Pass-through | SQL `upper()`-Liste vs TS exakt-2-stellig — praktisch identisch für die 13 Codes, nur theoretischer Edge. | Keine Aktion. |
| 2 | NIT | Migration-Kommentar | TS↔SQL-Mapping-Duplikat-Drift nur dokumentiert, nicht CI-enforced → bei Map-Änderung könnte nur eine Seite gepflegt werden (Display TS vs Regel SQL divergiert). | errors-db-Eintrag (erledigt im LOG) + ggf. Folge-Slice Parität-Check. |
| 3 | NIT | mauritius | TS hat nur DE-Block-Eintrag, SQL spiegelt 1:1 — keine Divergenz. | Keine Aktion. |

## One-Line
Ja — sauberer, nicht-destruktiver Schema-Slice mit verifizierter 100%-Coverage, korrektem IMMUTABLE/GENERATED-Konstrukt und AR-44-konformen Grants.

## Belege (Prüfaufträge a–g)
- **(a) Parität:** vollständiger Key-Set-Abgleich TS↔SQL — alle Keys vorhanden, alle ISO-Codes identisch (Türkei 3 Namen + DE-Block, GB-Subdivisionen, korea-Varianten, Diakritika-Paare).
- **(b) normalizeKey:** SQL `lower(regexp_replace(btrim,'\s+','','g'))` ≙ TS lower+Whitespace-raus; NFD-Edge nur theoretisch (Live-Coverage unmapped=0 entkräftet, fail-closed bei Miss).
- **(c) IMMUTABLE:** reine CASE/VALUES, kein Volatile → ALTER erfolgreich (AC-5).
- **(d) GENERATED:** read-derived, nationality voll schreibbar, Scraper unberührt.
- **(e) Escapes:** `''`-Apostrophe + Kommas korrekt, apply success, Côte=CI Live-Spot.
- **(f) AR-44:** REVOKE PUBLIC/anon + GRANT authenticated/service_role, kein anon.
- **(g) Drift:** dokumentiert (Finding #2 → errors-db).
- Schema: GENERATED erbt RLS (keine neue Policy), D39 strukturell statt Trigger, Partial-Index passend für 392.

## Knowledge-Capture (beim LOG — erledigt)
errors-db.md: (1) GENERATED-Spalte als zero-drift-Alternative zu Backfill+Trigger; (2) TS↔SQL-Mapping-Duplikat = Divergenz-Vektor.
