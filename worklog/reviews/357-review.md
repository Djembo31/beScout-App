# Review — Slice 357 (Plattform-Treasury Topf-Fundament, E3-1)

**Reviewer:** reviewer-Agent (Cold-Context) · **Datum:** 2026-06-24 · **time-spent:** 9 min
**Verdict:** **PASS**

## Findings

| # | Severity | Location | Issue | Entscheidung |
|---|----------|----------|-------|--------------|
| 1 | NIT | `book_platform_treasury` (Migration) | `p_direction` nicht explizit gegen `(credit\|debit)` validiert vor `v_after`-Berechnung; bei `'foo'` ELSE-Zweig (credit-Vorzeichen), aber INSERT-CHECK blockt fail-closed (23514, kein Müll persistiert). | **Accept (nicht gefixt)** — exakter Mirror von `book_club_treasury` (329 macht's identisch); Guard würde von der bewährten Vorlage divergieren. Nur interner Definer-Aufrufer (Slice 2 RPCs). Kein Datenrisiko. |
| 2 | NIT | Migration Index | Kein `source`-Index für Per-Source-Aggregate. | **Defer Slice 2** — Topf leer, kein Query-Pfad; bei Per-Source-Reporting nachrüsten. |

## One-Line
„Ja — ein Senior merged das: Money-Infra-Fundament als sauberer Mirror des battle-tested Club-Treasury, race-frei, fail-closed, Security wasserdicht (REVOKE/GRANT + Definer-Guard + RLS-0-Policies live verifiziert), DE+TR compliance-konform."

## Belege (alle GRÜN)
- **balance_after-Race:** S329b-Pattern korrekt — `PERFORM 1 FROM platform_treasury WHERE id=true FOR UPDATE` VOR `SUM(CASE direction)`. Smoke AC-4 Kette 1000/1500/1200.
- **AR-44:** alle 3 RPCs REVOKE/GRANT korrekt; `book_*` REVOKE-only (Definer-intern). Smoke: anon-Exec false.
- **SEC-DEFINER-Guard:** Read-RPCs doppelter Guard (auth.uid()+platform_admins). Smoke: noauth_blocked=t. J4-Exploit-Klasse geschlossen.
- **RLS:** 0 Policies + REVOKE = Definer-Only (S197d, bewusst). Smoke: anon/authenticated select false.
- **Silent-Cast:** `getPlatformTreasuryBalance` Pre-Cast-Guard `if(!result?.success) throw` (S168). Test deckt success-absent + success=false.
- **i18n+Compliance:** 16 Keys DE+TR parallel; IPO→Erstverkauf (AR-7); keine Investment/Profit-Begriffe; sourceLabel-Fallback gegen MISSING_MESSAGE.
- **Singleton:** `id boolean PK CHECK(id)` + ON CONFLICT DO NOTHING; fail-closed wenn fehlt. Smoke: count=1.
- **Append-only:** generischer 329-Trigger DRY wiederverwendet (tabellen-agnostisch). Smoke: append/delete blocked.

## Positive
- Defense-in-Depth 5-Layer (CHECK + Trigger + RLS + REVOKE/GRANT + Definer-Guard).
- UI `Promise.allSettled` isoliert (Edge 11).
- Migration-Header dokumentiert „NICHT entfernen/optimieren"-Lock-Warnung (schützt vor Perf-Refactor der Race öffnet).

## Knowledge-Capture
Kein neuer Bug → kein common-errors-Eintrag. Pattern „Single-Pot Treasury = Club-Treasury minus tenant-id + type→source, gleicher Lock/SUM/Trigger/RLS-Stack" → in `treasury.md` §10 Bau-Stand verankern (LOG-Schritt).
