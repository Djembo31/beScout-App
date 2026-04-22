# 149 — Impact: Club-Page Deep-Dive

## Scope der Änderungen

1. **Neuer Service:** `getClubStanding(clubId)` in `src/lib/services/club.ts`
2. **Neuer Query-Hook:** `useClubStanding(clubId)` in `src/lib/queries/misc.ts`
3. **Neue Component:** `ClubStandingCard.tsx`
4. **i18n:** 4 Keys geändert (club.scouts, club.volume24h, club.buyable, club.dpcFloat)
5. **Layout-Fix:** `ClubStatsBar.tsx` Mobile-Row
6. **ClubContent.tsx:** Standings-Card-Integration
7. **Debug (lesend):** Scouts-Count + Photo-Rendering (kein Code-Change falls nur Browser-Cache)

## Consumer-Map

### i18n-Keys (Grep verifiziert)
- `t('scouts')` — 2 Stellen: `ClubHero.tsx:178`, `ClubStatsBar.tsx:60`
- `t('volume24h')` — 2 Stellen: `ClubHero.tsx:185`, `ClubStatsBar.tsx:69`
- `t('buyable')` — 1 Stelle: `ClubHero.tsx:199`
- `t('dpcFloat')` — 2 Stellen: `ClubHero.tsx:265`, `ClubStatsBar.tsx:48`
- Plus PublicClubView — muss gecheckt werden

### `league_standings` Tabelle (Slice 074)
- RLS: `authenticated SELECT USING (true)` ✓ — public qual=true, keine Guards nötig
- Index: `idx_league_standings_table (league_id, season, rank)` + `idx_league_standings_unique (league_id, club_id, season)`
- Query: `WHERE club_id = $1 ORDER BY season DESC LIMIT 1` → aktuelle Saison
- Form-Column: TEXT, NULL-able → Frontend muss NULL handhaben

### ClubStatsBar Mobile-Row
- Consumer: ClubContent.tsx:232-243 (einziger Call)
- Kein anderer Consumer → Layout-Change isoliert

## Side-Effects

- **Query-Keys:** Neuer Key `qk.clubs.standing(clubId)` — muss in `src/lib/queries/keys.ts` hinzugefügt werden
- **Caching:** `staleTime: 5min` (Standings updaten täglich via sync-standings cron)
- **Invalidation:** Nicht nötig (read-only, kein User-Write auf league_standings)
- **No RLS change** — existierende Policy reicht

## Migration-Plan

- **Kein Schema-Change.** `league_standings` existiert bereits.
- **Keine Data-Migration.** Daten sind gescraped.

## Backward-Compatibility

- Label-Changes sind pure display — keine DB-Changes
- Alte Cache-Keys (vor Slice 149) bleiben valid — neue Labels rendern sobald Session neu lädt
- `qk.clubs.standing` ist neuer Key, kein Konflikt

## Testing

- `src/lib/services/__tests__/club.test.ts` erweitern um `getClubStanding`
- Playwright: `/club/galatasaray` 393px + 1280px + TR-locale screenshots

## Risiko-Assessment

| Risiko | Mitigation |
|--------|-----------|
| Photo-Debug findet nichts (User-Cache) | Screenshot gegen bescout.net bestätigt Live-Rendering |
| Scouts-Count-Mismatch (Auth-Layer vs DB) | Query followerCount manuell + compared to DB |
| Standings NULL fuer neuen Club | `ClubStandingCard` rendert nur wenn data, graceful hide |
| PublicClubView-Drift | Gegenseitiger Grep auf 4 i18n-Keys — PublicClubView aktualisieren |

## Parallelisierung

**Gruppe A (i18n)** — de.json + tr.json — einfach, parallel machbar
**Gruppe B (Layout)** — ClubStatsBar.tsx — isoliert
**Gruppe C (Standings)** — service + hook + component + integration — sequential innerhalb, aber parallel zu A+B

Claude macht alles selbst — 8 Files, kein Agent-Dispatch nötig (jedes File <50 Zeilen Change).
