# Following Feed — B2 E2E (2026-04-08)

> Verdichtet aus Retros retro-20260408-172328..181031 + Session-Handoff. AutoDream Output.

## Was wurde gebaut

B2 Following Feed E2E — Discovery → Audit → Fix → Live-Test. 4 Commits.

| Commit | Inhalt |
|--------|--------|
| e61be4a | fix(db): activity_log RLS — allow reads of followed users' activity |
| 07cfbba | refactor(social): parametrize useFollowingFeed + move labels to i18n |
| 85474dd | feat(home): Scout Activity Feed Widget auf Home-Screen |
| 5511640 | chore(memory): session retros + morning briefing refresh |

## Key Files

```
src/components/social/FollowingFeedRail.tsx    ← Feed Widget (Home)
src/lib/queries/social.ts                      ← useFollowingFeed Hook
src/lib/queries/keys.ts                        ← qk.followingFeed
messages/de.json + messages/tr.json            ← FEED_ACTION_LABELS i18n
supabase/migrations/                           ← activity_log RLS policy fix
```

## Discovery-Findings (vorher kaputt)

1. **`getFollowingFeed` war dead code** — Hook in `social.ts` existierte, wurde nie aufgerufen.
2. **`FEED_ACTION_LABELS`** — war dead export in queries, nicht in i18n integriert.
3. **`useFollowingFeed` nicht parametrisierbar** — kein `limit`-Parameter, kein `enabled`-Flag.
4. **RLS auf `activity_log`** — Policy erlaubte nur `auth.uid() = user_id`, blockierte damit Cross-User-Reads fuer Feeds von gefolgten Personen.

## Architektur-Entscheidungen

### 1. RLS Feed Policy Pattern
Tabellen die Cross-User-Reads benoetigen (Feed, Follower-Ansichten) brauchen erweiterte RLS:
```sql
-- FALSCH (nur eigene Rows):
auth.uid() = user_id

-- RICHTIG (eigene + gefolgter User):
auth.uid() = user_id
OR user_id IN (
  SELECT following_id FROM user_follows WHERE follower_id = auth.uid()
)
```
Anwendbar auf: `activity_log`, kuenftige Feed-Tabellen, Community-Content von gefolgten Usern.

### 2. Dead Code Audit vor neuem Build
Pattern: Vor Implementierung eines Features — grep ob der Code schon existiert (Hook, Service, Component). `getFollowingFeed` war seit Monaten da. Discovery spart Doppelarbeit.

### 3. i18n-First fuer Action Labels
`FEED_ACTION_LABELS` (buy/sell/ipo etc. → lesbarer Text) waren hardcoded. Moved nach `messages/de.json` + `messages/tr.json`. Pattern: Alle User-sichtbaren Enumerations in i18n.

## Bugs gefunden + gefixt

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Feed leer fuer jarvis-qa (folgt anderen Usern) | activity_log RLS: `auth.uid() = user_id` blockiert Cross-User-Read | RLS Policy erweitert (e61be4a) |
| FEED_ACTION_LABELS nicht uebersetzt | Hardcoded EN strings | i18n in de.json + tr.json (07cfbba) |
| useFollowingFeed nicht konfigurierbar | Fehlende Hook-Parameter | limit + enabled Props (07cfbba) |

## Test-Status bei Abschluss

- tsc --noEmit: CLEAN
- vitest: bestehende 2347/2347 gruen (keine neuen Tests fuer Feed Widget — UI-only)
- Live QA: Feed Widget sichtbar auf Home mit echten Activity-Eintraegen von gefolgten Usern

## Verwandte Wissen

- RLS Policy Trap: `memory/errors.md` (activity_log Feed Policy Sektion)
- Dead Code Anti-Pattern: `memory/errors.md` (Dead Code / Dead Exports Sektion)
- Service Worker Cache: `memory/errors.md` (Dev Server / Service Worker Sektion)
- Social Services: `src/lib/services/social.ts`
