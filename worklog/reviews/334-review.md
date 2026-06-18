# Slice 334 — Cold-Context-Review

**Verdict: PASS** · time-spent: 14 min · reviewer-agent (cold context)

## Findings (alle NITPICK, kein Blocker)

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NITPICK | CommunityFeedTab.tsx | Verein-Anker, der nur über einen Club-Vote in den Feed kommt, verschwindet bei Typ-Wechsel (z.B. → research). Erwartetes Verhalten (Edge #7), kein Bug. | Keine Aktion |
| 2 | NITPICK | CommunityFeedTab.tsx availableAnchors | Poll mit player_id aber unaufgelöstem player_name (Edge #4) erzeugt keinen Chip + ist nicht such-findbar. Konsistent (kein Label → kein Chip), graceful. | Keine Aktion |
| 3 | NITPICK | players.ts:42 (pre-existing) | `getPlayerNames` ohne `.limit()`/`.range()` → PostgREST-1000-Cap-Kandidat. NICHT von 334 verursacht, aber Poll-Picker ist jetzt 2. Konsument. | Out-of-scope → Backlog (separat als `.range()`-Loop härten) |

## One-Line
Ja, ein Senior merged das: §254-Falle sauber vermieden, RPC folgt 333-Pattern inkl. AR-44 + invalid_player-Guard, Money-Path nicht angefasst, i18n-Keys im richtigen Namespace beide Locales.

## Geprüfte Achsen (alle grün)
1. §254 Catch-22 — availableAnchors dep `[searchedItems]`, unabhängig von `anchor`-State ✅
2. i18n — namespace-aware verifiziert beide Locales, business.md-Wording-konform (Polls=REIN, neutral) ✅
3. RPC — 9-arg sauber, alte 8-arg gedroppt, AR-44 REVOKE/GRANT, invalid_player vor FK-Crash ✅
4. Discovery — 5 Feed-Typen korrekt (Vote ohne player_id), getClub per UUID (kein Slice-276) ✅
5. Money-Path — kein Regress (cast_community_poll_vote unverändert, nur Schema+create berührt) ✅
6. Silent-Fails — getCommunityPolls player-resolve throw bei error, kein Chunk-Bug (max 50 ids) ✅

## Positive
- Pre-Mortem #4 (§254) im Code mit Kommentar verankert (nicht nur dokumentiert).
- A11y vorbildlich (aria-pressed/hidden/label, role=alert, 44px Targets).
- Mobile-First (overflow-x-auto Chips, max-h-48 Dropdown).

## Backlog aus Review
- getPlayerNames `.limit()`-Härtung (Nitpick #3) → eigener Slice, post-334.
