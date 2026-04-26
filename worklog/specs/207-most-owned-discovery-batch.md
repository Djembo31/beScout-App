# Slice 207 — Most-Owned Discovery (K-02)

## Ziel
Auf `/clubs` Discovery-Page zeigt jede ClubCard das meist-besessene Spieler-Trust-Signal: "🔥 X% besitzen Y. Müller" als Mini-Hint unter den Stats. Batch-RPC fuer N Clubs in 1 Call (vermeidet N-RPC-Cascade beim Scroll).

## Betroffene Files

### Backend
- **NEW migration** `supabase/migrations/<ts>_slice_207_most_owned_per_club_batch.sql` — neue RPC `get_most_owned_players_per_club_batch(p_club_ids UUID[], p_limit INT DEFAULT 1)`
  - Returns `JSONB` als Array von Rows: `[{club_id, player_id, first_name, last_name, position, image_url, holders_count, holders_pct}]`
  - Pattern identisch zu existing `get_most_owned_players_per_club` (Slice 199), nur Multi-Club
  - SECURITY DEFINER + REVOKE FROM PUBLIC/anon + GRANT authenticated (AR-44)
  - Anonymized: kein user_id im Output
- **EDIT** `src/lib/services/club.ts` — neuer Wrapper `getMostOwnedPlayersPerClubBatch(clubIds, limit)`
  - Returns `Map<club_id, MostOwnedPlayerRow[]>` fuer einfache Konsumption
  - Reuse `MostOwnedPlayerRow` Type aus Slice 199
- **EDIT** `src/lib/queries/trades.ts` — neuer Hook `useMostOwnedPlayersPerClubBatch(clubIds, limit)`
  - staleTime 5min (Aggregate change selten)
  - enabled: clubIds.length > 0

### Frontend
- **EDIT** `src/app/(app)/clubs/page.tsx` — pro ClubCard: bei top-1 Most-Owned Player Display "🔥 X% besitzen <FirstInitial>. <LastName>" unter den Stats-Zeilen
  - Hook-Call mit `clubIds = leagueClubs.map(c => c.id)` PRO league-group
  - Threshold: nur anzeigen wenn `holders_pct >= 5` (Noise-Filter, identisch K-03 Threshold)
  - Lazy mit `useMemo` fuer clubIds-Array

### i18n
- **EDIT** `messages/de.json` + `messages/tr.json` — `clubs.mostOwned` namespace mit:
  - `label`: "🔥 {pct}% besitzen {name}"
  - `ariaLabel`: "{pct}% der Manager besitzen Spieler {name}"

## Acceptance Criteria
1. `/clubs` Discovery-Page zeigt pro ClubCard ein Most-Owned-Hint wenn ≥5% Holders
2. Hint sitzt zwischen Next-Fixture-Zeile und Action-Buttons
3. Batch-RPC: ALLE clubs einer Liga in 1 Call (nicht N parallele RPCs)
4. Mobile 393px: Hint kompakt, max 1 Zeile, mit truncate
5. Keine Daten / kein Threshold-Match → kein Hint, kein Layout-Shift
6. Color: amber-300 (matched K-03 PickRateBadge)
7. i18n DE+TR komplett
8. Backward-compat: bestehende `getMostOwnedPlayersPerClub`/`useMostOwnedPlayersPerClub` unangetastet (single-club call bleibt fuer Slice 201b TransferList etc.)

## Edge Cases
- 0 Clubs in Liga → Hook skipped, leere Map
- Clubs ohne Holders → row fehlt in Result-Map → kein Hint
- Sehr lange Spieler-Namen (z.B. "Aleksandar Stankovic") → truncate-overflow + ellipsis
- Spieler ohne first_name (legacy-data) → fallback auf last_name only
- holders_pct = 100 → "100%" (nicht "100.0%")
- p_limit > 10 → DB caps at 10 (Performance-Guard)
- p_club_ids = NULL/empty → empty result, no error
- p_club_ids > 100 IDs → kein Issue (1 Liga max ~24 Clubs Bundesliga)
- RPC-Error → Hint silent, kein Toast-Spam

## Proof-Plan
- Migration apply via `mcp__supabase__apply_migration`
- DB-Smoke: `SELECT * FROM get_most_owned_players_per_club_batch(ARRAY[<2-3 club_ids>]::UUID[], 1)`
- vitest: neue Test-Datei `src/lib/services/__tests__/club-most-owned-batch.test.ts` analog zu Slice 199
- `npx tsc --noEmit` clean
- `npx vitest run src/lib/services/__tests__/club-most-owned-batch.test.ts` — green
- Playwright/Visual nicht pflicht (post-deploy gegen bescout.net manuell durch User)

## Scope-Out
- KEIN Top-3 oder Top-N Display — nur Top-1 (Discovery-Card-Density)
- KEIN Click auf Hint → Player-Detail (wäre Layout-Sprung; CTA bleibt Follow-Button)
- KEIN MostOwnedSection-Refactor — bestehende Single-Club-Hook bleibt
- KEINE Cross-Liga-Aggregation
- KEINE Captain-Pick-Rate / nur Player-Holders (anderes Domain)

## Decision-Notes
- **D46 Anwendung:** Existing `get_most_owned_players_per_club` (Single-Club, Slice 199) wird NICHT erweitert/dupliziert — neuer separater Batch-RPC (`...batch`) parallel. Begruendung: Single-Club-RPC hat klare Caller (TransferList, MostOwnedSection), Batch hat anderen Performance-Profile (N-Club-Aggregat). Zwei RPCs sauberer als ein Multi-Mode-RPC. Service-Wrapper-Code aber wiederverwendet.
- **Anonymized-Aggregate-Series:** 4. RPC nach Slice 199/201b/201d. Stärkt Pattern #38 weiter.
- **Threshold 5%:** identisch K-03 Pattern (PickRateBadge). Bei 3. Aufkommen → Konstante extrahieren.
- **Ferrari-Quality:** Tests pflicht (Slice 199 hat dependency-Tests die kopiert/adapted werden), kein Krümel.
