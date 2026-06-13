# Slice 285 Proof — FM-06 Rankings-Liga-Header verschieben

**Datum:** 2026-06-13

## AC-4 — tsc grün (lokal)

```
$ pnpm exec tsc --noEmit
✅ (exit 0, keine Fehler)
```

## AC-1 — Header direkt über PlayerRankings (grep)

```
$ grep -B2 "<PlayerRankings" src/app/(app)/rankings/page.tsx
          <div className="space-y-3">
            <LeagueScopeHeader leagueBarSize="md" nonSticky />
            <PlayerRankings filterCountry={filterCountry} filterLeague={filterLeague} />
```

`LeagueScopeHeader`: 1 Import (Z.5) + 1 Verwendung (Z.53, rechte Spalte) — kein Page-Top mehr, kein Doppel-Render.

## AC-3 — Filter-Props unverändert

`filterCountry`/`filterLeague` aus `useLeagueScope`-Selektoren (Z.22-23) weiter an PlayerRankings durchgereicht. Leaderboards (Global/Monthly/Friends/Club/LastEvent) unverändert ohne Filter.

## AC-2 — Visuell (post-Deploy bescout.net /rankings)

> Wird nach Vercel-Deploy via Playwright ergänzt (mobil 393px + desktop).

<!-- POST-DEPLOY-SCREENSHOT-MARKER -->
