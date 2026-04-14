# Frontend Journal: J4 Healer B — Multi-League FantasyEvent + LeagueBadge

## Gestartet: 2026-04-14

### Verstaendnis
- Was: Type-Erweiterung (FantasyEvent + UserDpcHolding) mit Liga-Fields + LeagueBadge in Fantasy-UIs einbetten
- Scope: FIX-12 (Types) + FIX-13 (Services/Mapper) + FIX-14 (4 Render-Sites: EventDetailHeader, GwHeroSummary, PlayerPicker, EventCardView)
- Pattern: J3 Commit 10df6cf (TradingCardFrame + PlayerHero + TransferListSection)
- Risiken:
  1. FixturePlayerStat (fuer GwHeroSummary) kommt aus `getGameweekTopScorers` RPC → Audit ob Liga-Fields da rauskommen, sonst RPC-Change noetig → CEO-Approval-Trigger
  2. UserDpcHolding kommt aus `get_user_holdings_with_player_details` RPC → selbe Pruefung
  3. Fantasy-Services schlucken Errors by design — Error-Kontrakt nicht anruehren
  4. LeagueBadge import path: `@/components/ui/LeagueBadge` (NICHT `@/components/common/LeagueBadge` wie im Task-Package stand)

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | FIX-12: Optional Fields | Keine Breaking-Change, Fallback bei fehlender Liga OK |
| 2 | LeagueBadge Pfad: `@/components/ui/LeagueBadge` | Entspricht existing Usage in TradingCardFrame (J3) |

### Fortschritt
- [x] FIX-12a: FantasyEvent Type erweitert (leagueShort/leagueLogoUrl/leagueCountry optional)
- [x] FIX-12b: UserDpcHolding Type erweitert (same Fields)
- [x] FIX-13: Mappers propagieren (eventMapper + holdingMapper via getClub + getLeague)
- [x] FIX-14a: EventDetailHeader LeagueBadge in Badge-Reihe
- [x] FIX-14b: GwHeroSummary LeagueBadge via getClub(best.club_id) + getLeague
- [x] FIX-14c: FantasyPlayerRow LeagueBadge in Line 2 + Props-Propagation in 3 getRowProps (PlayerPicker, LineupBuilder, useLineupPanelState)
- [x] FIX-14d: EventCardView LeagueBadge in Row 3 Meta
- [x] tsc --noEmit clean
- [x] Fantasy service tests: 110 passed
- [x] Wallet service tests: 134 passed
- [x] Grep Verify: 23 leagueShort/LeagueBadge Occurrences in 10 Files

**Pre-existing failing suites (NICHT durch mich verursacht, via git stash baseline verifiziert):**
- EventDetailModal.test.tsx (AlertCircle mock fehlt in ToastProvider)
- MitmachenTab.test.tsx (Supabase env in testenv)
- PredictionsTab.test.tsx (Supabase env in testenv)
- FantasyContent.test.tsx (Supabase env via lib/clubs)
- AdminRevenueTab, ProfileView, MarketFilters, ClubProvider (unrelated)
- turkish-handling.test.ts TURK-03 (unrelated)


### Runden-Log

**Runde 1 (Implementation):**
- Types erweitert (FantasyEvent + UserDpcHolding): leagueShort/leagueLogoUrl/leagueCountry optional
- Mapper eventMapper.ts: getClub(club_id) + getLeague(name) — client-side caches, kein RPC-Change
- Mapper holdingMapper.ts: gleiches Pattern via h.player.club_id
- EventDetailHeader: LeagueBadge in Badge-Reihe nach EventTypeBadge
- GwHeroSummary: getClub(best.club_id) + LeagueBadge neben PositionBadge (flex-wrap)
- FantasyPlayerRow: leagueShort/leagueLogoUrl in Props + LeagueBadge in Line 2 (flex-wrap)
- PlayerPicker: Props-Propagation in getRowProps
- EventCardView: LeagueBadge in Row 3 Meta (flex-wrap)

Naechster Schritt: tsc + vitest

