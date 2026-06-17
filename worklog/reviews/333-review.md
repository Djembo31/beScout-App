# Review — Slice 333 (Polls P1: Erstellung + Quellen-Identität + Treasury-REIN-Routing + Follower-Tor)

**Reviewer:** cold-context reviewer-Agent · **Datum:** 2026-06-18 · **time-spent:** ~14 min

## Verdict: PASS

## Findings (alle NIT — Defense-in-Depth, keine Bugs)

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | NIT | `cast_community_poll_vote` ELSE-Branch | source='club'-Umfrage mit club_id=NULL würde im ELSE still ins Creator-(Admin-)Wallet zahlen. Heute unerreichbar (create-RPC erzwingt club_id), aber latenter Foot-Gun. | **GEFIXT** — Guard `IF v_poll.source='club' THEN RAISE EXCEPTION 'club_poll_missing_club_id'` ergänzt. Re-applied + Re-Smoke `guard_fired=t`. |
| 2 | NIT | `CreatePollModal.tsx` cost-Parse | `parseFloat*100` rundet fraktionale Eingaben; RPC clamped 0..100000 ohnehin. | accepted (safe, kosmetisch) |
| 3 | NIT | Migration source-Col ADD | Column-DEFAULT-vor-CONSTRAINT-Ordnung korrekt (bestätigt). | accepted (kein Issue) |

## One-Line
Ja — Senior würde mergen: Geld-Routing keyt strikt auf `source`, Identitäts-Lock hart an `club_admins` gebunden, User-Pfad byte-identisch zum Live-Vorgänger, alle 4 CHECK/i18n/activity-Sync-Achsen abgedeckt.

## Verifizierte Money/Security-Achsen (Reviewer-Belege)
1. **Routing keyt auf `source`, NICHT club_id** (Pre-Mortem #2/#3): create-RPC bindet source='club' an `EXISTS(club_admins)` + club_id-Pflicht; vote-RPC `IF v_poll.source='club'` ist alleinige Achse. User-Poll mit club-Tag → ELSE (Wallet). Kein Geld-Leak in fremde Treasury. ✓
2. **User-Pfad byte-identisch** zum Live-Vorgänger (`20260417190000`): gleiche FOR UPDATE, gleiche 2-Row-transactions (`poll_vote_cost`+`poll_earn`), `(v_cost*70)/100`, platform_share impliziter Burn. ✓
3. **CHECK-Drift (Slice 330/332)**: `poll_revenue` im CHECK in §2 VOR dem ersten Write (§4). 4-Achsen-Sync: CHECK + KNOWN_LEDGER_TYPES + ledgerType.poll_revenue (de+tr) ✓. activity `poll_create` (de/tr-Label + FollowingFeedRail + home/helpers icon). ✓
4. **AR-44** REVOKE PUBLIC/anon + GRANT authenticated auf allen 3 CREATE-OR-REPLACE-RPCs. ✓
5. **auth.uid() NULL-safe** (service_role bypass) + cross-user-reject. ✓
6. **Frontend**: preventClose={creating}, i18n-Key-Leak gemapped via pollErrorKey(), Mobile text-base/44px/inputMode, Hooks vor early return. ✓
7. **Compliance**: kein gewinnen/Preis/Gewinner; neutrale CTAs; kein Invest/Asset-Framing; TR-Mirror sauber. ✓
8. **Discriminated-Union Service-Guard** (#168): `if (!success || !poll_id) throw`. ✓

## AC-Coverage (Reviewer): AC-01..AC-11 alle ✓ (AC-09 Mobile-Code + AC-10 i18n verifiziert; AC-09 visuell = PROVE-Stage Playwright post-Deploy).

## Positive
- Byte-identische ELSE-Branch-Erhaltung = exakt die Regression-Disziplin die AC-11 forderte (gegen echten Live-Vorgänger geprüft, nicht angenommen).
- 4-Achsen-Ledger/activity-Sync vollständig (Slice-330/332-Systemfalle), inkl. oft-vergessener FollowingFeedRail-Allowlist + home/helpers Icon-Map.
- Self-wired CreatePollButton mit Follower-Tor identisch über beide Einstiege wiederverwendet.
- i18n-Parität exakt (29=29), beide Locales, kein defaultMessage-Fallback.

## Heal-Notiz (Primary-Claude)
NIT #1 inline gefixt (Defense-in-Depth, §3 caution-over-speed). Migration-File aktualisiert + Funktion re-applied (CREATE OR REPLACE, idempotent) + Re-Smoke bestätigt guard_fired=t bei normal-grünen Pfaden. NIT #2/#3 accepted.
