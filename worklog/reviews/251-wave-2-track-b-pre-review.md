# Pre-Review-Memo — Slice 251 Wave 2 Track B
## Liga-aware Service-Layer

**Agent:** backend (Sonnet 4.6)
**Worktree:** agent-a22bcd03e4e95e780
**Date:** 2026-04-28

---

## Self-Audit gegen Spec ACs

| AC | Status | Kommentar |
|----|--------|-----------|
| `getFixturesByGameweek(gw, leagueId?)` backward-compat | GRUEN | Optional param, wenn undefined/null → kein `.eq('league_id', ...)` |
| Conditional `.eq('league_id', leagueId)` nur wenn truthy | GRUEN | `if (leagueId) query = query.eq(...)` — null/undefined skip |
| `createNextGameweekEvents(clubId, currentGw, leagueId?)` backward-compat | GRUEN | Optional, passed to `getFixturesByGameweek` |
| `pickTopspiel` Signatur erweitert (leagueId?, sponsorClubId?) | GRUEN | Priority-chain: sponsor → club → highest-score → first |
| `SpieltagTab` Props: `leagueId?: string | null` | GRUEN | Prop added, destructured, passed to loadFixtures + pickTopspiel |
| FantasyContent `SpieltagTab` render: `leagueId={activeClub?.league_id ?? null}` | GRUEN | Analog zu Wave 1 Bridge (line 85) |
| `dashboardStats` useMemo: `events` → `filteredGwEvents` | GRUEN | Dependency-Array + filter-source beide geswapped |
| 5 neue Tests für leagueId-Param in fixtures.test.ts | GRUEN | In `getFixturesByGameweek with leagueId` describe-Block |
| events-v2.test.ts Mocks weiterhin funktional | GRUEN | `vi.fn()` akzeptiert neue optionale Args ohne Änderung |
| lib/services/__tests__/fixtures.test.ts weiterhin funktional | GRUEN | Backward-compat — bestehende calls ohne leagueId OK |

## Self-Verification-Commands gelaufen

```
npx tsc --noEmit    → 0 Errors (clean)
npx vitest run features/fantasy/services/__tests__/fixtures.test.ts
                     → 43/43 PASS (38 existing + 5 neue)
npx vitest run lib/services/__tests__/events-v2.test.ts lib/services/__tests__/fixtures.test.ts
                     → 104/104 PASS
git status -s (worktree)
                     → 6 Modified files + 1 settings.local.json (auto-hook)
```

## Edge-Cases geprüft

- `leagueId = undefined`: kein Filter appliziert — volle GW-Fixtures (wie bisher)
- `leagueId = null`: kein Filter appliziert — null ist falsy
- `leagueId = ''` (leerer String): kein Filter — leerer String ist falsy
- `leagueId = 'valid-uuid'`: `.eq('league_id', 'valid-uuid')` appliziert
- `sponsorClubId` ohne Fixture im Set: kein Sponsor-Match, weiter zu clubId
- `pickTopspiel` mit null fixtures: returns null (Guard linie 1)
- `loadFixtures` re-load nach Import/Finalize/Simulate: alle 3 intern-calls mit `leagueId` propagiert

## Open-Blocks / Risiken

1. **lib/services/fixtures.ts Bridge**: Ist ein `export * from '@/features/fantasy/services/fixtures'` re-export — keine separate Implementierung nötig. Neues leagueId-Param auto-inheritiert.
2. **dashboardStats scope**: Die Spec sagt `events` → `filteredGwEvents`. `filteredGwEvents` ist nur der aktuelle GW — `events` ist all-time. Spec ist klar darüber; Reviewer sollte bestätigen dass Liga-scope für dashboardStats korrekt ist (season stats vs. current-GW stats trade-off).
3. **SpieltagTab.selectedLeagueId state** (existing internal admin dropdown): Unklar ob dieser state nach Wave 3 Track C mit dem neuen `leagueId` prop synchronisiert werden soll. Track B ändert nur was nötig (prop-pass + service). Admin-Dropdown bleibt für jetzt unverändert — das ist Track E/F territory.
4. **`pickTopspiel` leagueId Param** wird in der Funktion deklariert aber nicht verwendet (nur für API-Konsistenz + zukünftige Sponsor-Validierung "sponsor must be in same league"). Aktuell schaut der Sponsor-Match nur in `fixtures` — da fixtures bereits league-gefiltert ankommen (vom Caller), ist das korrekt.

## Bekannte Spec-Abweichungen

Keine. Implementation folgt Spec exakt.
