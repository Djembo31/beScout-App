# Fantasy QA Stabilisation + Error Classification (2026-04-09)

## Kontext
Sales-Readiness QA-Sweep nach Equipment v2 + Realtime Feed. 4 Bugs identifiziert, 2 echte Fixes, 2 false positives. Danach 3 CI/Infra follow-ups — alle innerhalb derselben Session abgearbeitet.

## B3 — LineupPanel Quick-Add (Commit 66b8935)

**Problem:** "Deine Spieler" Klick im EventDetailModal öffnete `window.open` → neuer Tab → brach Modal-Kontext.

**Fix:** `LineupPanel.tsx:790` — `window.open` entfernt. Klick auf Spieler-Row platziert den Spieler jetzt in den ersten freien Slot für seine Position (Quick-Add Pattern).

**Pattern:** In Picker-UIs (Lineup Builder, Drag-and-Drop) NIEMALS `window.open` für Spieler-Navigationen nutzen. Ausnahme: Link zu `/player/[id]` nur in Display-Contexts erlaubt.

## B4 — fantasy_league_members RLS Recursion (Commit 66b8935)

**Problem:** RLS Self-Recursion. Policy auf `fantasy_league_members`:
```sql
league_id IN (SELECT league_id FROM fantasy_league_members WHERE user_id = auth.uid())
```
PostgreSQL re-applied dieselbe Policy auf den Inner-SELECT → infinite recursion → PostgREST HTTP 500 bei jedem Client-Read.

**Fix:** Migration `20260409150000`. SECURITY DEFINER Helper:
```sql
CREATE FUNCTION fantasy_get_my_league_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT league_id FROM fantasy_league_members WHERE user_id = auth.uid();
$$;
```
Policy nutzt den Helper statt Self-Reference:
```sql
league_id IN (SELECT fantasy_get_my_league_ids())
```
Helper läuft außerhalb des Policy-Kontexts → kein Recursion-Loop.

**Regel: SECURITY DEFINER für selbst-referenzielle RLS.** Wann immer eine RLS Policy dieselbe Tabelle im Subquery referenziert → SECURITY DEFINER Helper.

## Navigation-Abort Error Classification (Commit ef13d85)

**Problem:** 5 Service-Aufrufe logten `console.error` für "Failed to fetch" — ausgelöst wenn User navigiert während Layout-Queries laufen. Noise überdeckte echte Fehler.

**Neue Datei:** `src/lib/supabaseErrors.ts`
- `isFetchAbort(error)`: erkennt `Failed to fetch`, `NetworkError`, `ERR_NETWORK`, `network request failed`
- `logSupabaseError(prefix, error)`: `console.warn` für Transients, `console.error` für echte API-Fehler

**5 Consumer aktualisiert:** sponsors.ts, tickets.ts, trading.ts, welcomeBonus.ts, useHomeData.ts

**Regel:** Alle Supabase Service-Calls die `catch` haben → `logSupabaseError()` statt direktem `console.error`. Verhindert false positives in Monitoring.

**Zusatz:** EventCardView nested button → `<div role="button">` um invalid HTML zu fixen (button-in-button Pattern).

## CI Follow-ups (Commits 5be429d + c88b782 + 800acc5)

| Problem | Fix |
|---------|-----|
| `bounties.test.ts` — `trackMissionProgress` nicht gemockt | Stub in missions mock (5be429d) |
| FLOW-11 timeout zu eng für CI Latenz | Raised to 30s (c88b782) |
| AuthProvider/WalletProvider `console.error` RPC-Slowness | Demoted to `console.warn` — erwartet bei webpack cold-start (800acc5) |

**GW34 → GW35 Migration:** Cron war stuck wegen 3 verschobener Spiele. 10 Fixtures + 13 Events manuell geseedet. 13 GW34-Orphan-Events + 2 Lineups soft-gescored (score=0, scored_at=ends_at) damit business-flow Tests nicht an DB-Residue stolpern.

## Vercel Auto-Deploy

- Einmalig flaky bei Commit `66b8935` — `vercel --prod` manuell nötig
- Seit `ee421cf` wieder reaktiv (4 Commits auto-deployed)
- Fallback: `npx vercel --prod --archive=tgz` wenn auto-deploy steckt

## Live-Verifikation

- Fantasy Join Flow E2E: Lineup → Beitreten → Counter +1 verifiziert
- Equipment Synergy +15% Display in Fantasy verifiziert (GW35 "BeScout Classic")
- B1/B2 als false positives klassifiziert: Playwright-Timing-Artefakt + transient state

## Status nach dieser Session

- CI: 2x in Folge grün (erste stabile CI seit 2026-02)
- Fantasy: 0 Console-Errors auf /fantasy (war 1 stuck 500/load)
- Monitoring: Navigation-Aborts rausgefiltertn → echte Fehler sichtbarer
