# Slice 363 Review — Polls-Fee REIN in Plattform-Topf (E3-2c)

**Reviewer:** reviewer-Agent (Cold-Context, READ-ONLY) · **Datum:** 2026-06-24 · **time-spent:** 11 min

## Verdict: PASS

Mergebar ohne Nacharbeit. Chirurgischer additiver Money-RPC-Patch, 1:1 zum etablierten 358/360-Inline-Muster.

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | Migration Kommentar | Decision-Tag D96/D98 vs. 358/360 D96/D97 im Nachbar-Kommentar. D98 (100 % Auffang) ist korrekt; D97 = Saldo-Variante-A. Kein Code-Effekt. | Optional, keine Aktion. |
| 2 | NIT | Proof Zeile pot0/1/2 | `pot0=0 pot1=200 pot2=400` ist kumulativ über beide Branches in 1 TX; `club_delta`/`user_delta` je 200 sind die belastbaren Deltas (eindeutig dokumentiert). | Keine Aktion. |

Keine CRITICAL/HIGH/MEDIUM.

## Spec-Coverage (AC-1…AC-8)

Alle 8 ACs ✅ verifiziert:
- **AC-3 [BEIDE BRANCHES]** Booking-Block sitzt NACH source-`END IF`, VOR `ELSE`-Reset, innerhalb `IF v_cost > 0` → erreicht club- UND user-Pfad. Smoke: je 1 `'poll'`-Ledger-Row.
- **AC-5 [NO-DRIFT]** Fee-Konstante `(v_cost * 80) / 100` verbatim, live `fee_constant_intact=true` (S356-Drift-Klasse abgesichert).
- **AC-7 [GATE INTAKT]** min_fan_rank_tier-Tor (S356), Stimmgewicht (S343), Self-Poll/Already-Voted/Status/club_id-Guards 1:1 zum Live-Body.
- **AR-44** anon=false, authenticated=true (live verifiziert).

## Money-kritische Verifikation (Reviewer-Fokus)

1. **Booking-Position** ✅ deckt beide Branches, innerhalb `IF v_cost > 0` (Pre-Mortem #2/#3 präzise adressiert).
2. **Fee-Konstante 80/20** ✅ unverändert.
3. **AR-44** ✅ korrekt, Signatur `(uuid,uuid,integer)` matcht.
4. **1:1 Live-Body** ✅ genau EIN Block neu, keine Logik-Drift.
5. **Doppelbuchung** ✅ kein Risiko (`v_already`-Guard + `FOR UPDATE` + `IF v_platform_share > 0` + interner `book_platform_treasury`-No-op = Triple-Defense).
6. **reference_id=p_poll_id** ✅ sinnvoll (kein trade vorhanden; konsistent mit `book_club_treasury`-Aufruf).
7. **Signatur-Match** ✅ `book_platform_treasury(p_direction,p_source,p_amount,p_ref,p_desc)` ↔ `('credit','poll',v_platform_share,p_poll_id,'Umfrage-Fee')`.

## Positive
- Pre-Mortem #2/#3 (gefährlichste Fehlerklasse: Booking nur in einem Branch) nachweislich vermieden.
- S356-Konstanten-Drift-Lehre als ILIKE-Assert im Proof angewandt.
- Force-Rollback-Smoke testet BEIDE source-Branches real mit echtem auth.uid()-Guard — höchster Money-Proof-Standard.

## Knowledge-Capture
Kein neues Pattern nötig — korrekte 3. Anwendung eines bereits kodifizierten Musters (errors-db.md PATCH-AUDIT/Konstanten-Audit S356). Slice ist selbst Positiv-Beleg der Money-RPC-Inline-Booking-Checkliste.
