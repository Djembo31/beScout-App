# Slice 137 — Clubs-Discovery: Stale-GW-Filter + Opponent-Logo

**Datum:** 2026-04-22
**Slice-Größe:** S (2 Files, 1h)
**CEO-Scope:** Nein (kein Money/Security, reiner UX-Fix + Feature-Addition)

## Ziel (1 Satz)

Auf `/clubs` zeigen alle Süper-Lig-Vereine dieselbe nächste Gameweek (aktuell GW 31) und jedes Next-Fixture hat das Gegner-Wappen vor dem Kürzel.

## Betroffene Files

1. `src/features/fantasy/services/fixtures.ts`
   - `NextFixtureInfo` Type: neue Field `opponentLogoUrl: string | null`
   - Select-Clause: `logo_url` aus Clubs-Join mitlesen
   - Post-Filter: Fixtures mit `played_at < now() - 6h` UND `status='scheduled'` als stale ignorieren

2. `src/app/(app)/clubs/page.tsx`
   - Render: Opponent-Logo (12px, `<Image>`) vor `opponentShort` in der Next-Fixture-Zeile

## Acceptance Criteria

1. Service-Filter ignoriert `scheduled` Fixtures deren `played_at` älter als 6h ist → stale-gesyncte Fixtures gelten als nicht-next
2. Alle 18 Süper-Lig-Clubs zeigen GW 31 (nicht mehr GW 30) in der Next-Fixture-Zeile
3. `NextFixtureInfo.opponentLogoUrl` enthält `logo_url` des Gegners oder `null`
4. UI zeigt `<Image>` des Opponent-Logos (12-14px, object-contain, flex-shrink-0) vor `vs {short}`
5. Wenn `opponentLogoUrl === null` → graceful (nur `vs {short}` wie vorher)
6. Bestehende 5 Consumer (manager-kader, manager-intel) brechen nicht — `opponentLogoUrl` ist additive-optional

## Edge Cases

1. **null-Logo:** Club ohne `logo_url` → kein Image, nur Text
2. **Alle Fixtures stale:** Club-Spiel ist 6h+ alt aber nicht synced UND keine spätere scheduled Fixture existiert → Map-Entry fehlt komplett (UI zeigt keine Next-Fixture-Zeile — OK, bestehender Graceful-Fallback via `{nextFixtures.get(club.id) && ...}`)
3. **Zukünftige GW-30-Spiele (Nachholspiele):** Wenn ein echtes Nachholspiel in Zukunft liegt, `played_at >= now() - 6h` → durchgelassen, GW 30 wird gezeigt (gewollt)
4. **played_at NULL:** Fixture ohne Datum → durchgelassen (nicht als stale)
5. **Mehrere stale vor next clean:** Service nimmt die erste saubere (nach gameweek ASC sortiert)
6. **Mobile 393px:** 12px-Logo + Gap-1 darf die GW-Badge-Zeile nicht brechen
7. **Dark-Mode:** Logo-Image mit transparentem BG soll auf `#0a0a0a` sichtbar bleiben (Standard)

## Proof-Plan

1. `npx tsc --noEmit` clean
2. `npx vitest run src/lib/services/__tests__/fixtures.test.ts` — bestehende Tests grün, neuer Test für Stale-Filter
3. Live-Check bescout.net nach Deploy: alle 18 Süper-Lig-Clubs zeigen GW 31 (Screenshot)
4. Visual: Opponent-Logo sichtbar vor Kürzel (Screenshot)

## Scope-Out

- **sync-fixtures Root-Cause** (warum wurden 4 Fixtures von GW 30 nicht auf `finished` gesetzt) — separater Slice, vermutlich API-Football-Lag oder Cron-Fehler. Dieser Slice macht die UI resilient, nicht den Sync.
- **Stale-Fix als DB-Update** — kein `UPDATE fixtures SET status='finished' WHERE ...`. Symptombehandlung, plus kann `played_at` in Zukunft auch legitim in Vergangenheit stehen (postponed re-scheduled).
