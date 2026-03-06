---
description: Haeufigste Fehler die bei JEDER Arbeit relevant sind
---

## DB/Types
- `players` hat `first_name`/`last_name`, NICHT `name`
- `wallets` PK=user_id (kein `id`, kein `currency`)
- `orders.side` (nicht type), `post_votes.vote_type` = SMALLINT (1/-1)

## React/TypeScript
- Hooks VOR early returns (React rules)
- `Array.from(new Set())` statt spread (strict TS)
- `Modal` braucht IMMER `open={true/false}` prop
- `PlayerPhoto` Props: `first`/`last`/`pos` (nicht firstName/lastName)
- Barrel-Exports bereinigen wenn Dateien geloescht werden
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`

## CSS
- `::after`/`::before` mit `position: absolute` → Eltern MUSS `relative` haben
- `overflow: hidden` allein reicht NICHT als Containing Block

## Turkish Unicode
- `I`.toLowerCase() = `i̇` (NICHT `i`) → NFD + strip diacritics + `ı→i`

## API-Football
- Substitution: `time.elapsed` (NICHT `time.minute`!), `player`=OUT, `assist`=IN
- Null guards: `evt.player?.id` und `evt.assist?.id` koennen null sein
- `grid_position` kann kaputt sein: fehlende GK-Row, Duplikate, >11 Starters
- API-Football hat KEINE Market Values → nur Transfermarkt
