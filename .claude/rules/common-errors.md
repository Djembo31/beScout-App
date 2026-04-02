---
description: Haeufigste Fehler die bei JEDER Arbeit relevant sind
---

## DB Column Names (Top Fehlerquelle)
- `players`: `first_name`/`last_name` (NICHT `name`)
- `wallets`: PK=`user_id` (KEIN `id`, KEIN `currency`)
- `orders`: `side` (NICHT `type`), KEIN `updated_at`
- `post_votes.vote_type` = SMALLINT 1/-1 (NICHT boolean)
- `profiles.top_role` (NICHT `role`), Wert `'Admin'` mit grossem A
- `notifications.read` (NICHT `is_read`)
- `activity_log.action` (NICHT `action_type`)
- `user_follows.following_id` (NICHT `followed_id`)
- `trades.executed_at` (NICHT `created_at`)
- `offers.price` (NICHT `price_cents`)
- `research_posts`: hat KEINE upvotes/downvotes Spalten

## CHECK Constraints (DB wirft Error bei falschem Wert)
- `club_subscriptions.tier`: 'bronze'/'silber'/'gold' (silber, NICHT silver!)
- `user_stats.tier`: 'Rookie'/'Amateur'/'Profi'/'Elite'/'Legende'/'Ikone'
- `research_posts.call`: 'Bullish'/'Bearish'/'Neutral' (Capitalized)
- `lineups.captain_slot`: 'gk'/'def1' etc. (KEIN 'slot_' Prefix)

## React/TypeScript
- Hooks VOR early returns (React rules)
- `Array.from(new Set())` statt `[...new Set()]` (strict TS)
- `Array.from(map.keys())` statt `for (const k of map.keys())` (strict TS)
- `Modal` braucht IMMER `open={true/false}` prop
- `PlayerPhoto` Props: `first`/`last`/`pos` (nicht firstName/lastName)
- Barrel-Exports bereinigen wenn Dateien geloescht werden
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`
- Cancellation Token in useEffect: `let cancelled = false; return () => { cancelled = true; }`
- `floor_price ?? 0` — IMMER Null-Guard auf optionale Zahlen
- `entry.rank ?? 999` — Airdrop rank ist nullable

## CSS / Tailwind
- `::after`/`::before` mit `position: absolute` → Eltern MUSS `relative` haben
- `overflow: hidden` allein reicht NICHT als Containing Block
- `flex-1` auf Tabs → overflow auf iPhone → `flex-shrink-0` nutzen
- Dynamic Tailwind Classes NIEMALS: `border-[${var}]/40` → Tailwind JIT scannt nur statische Strings. Nutze `style={{ borderColor: hex }}` + statische Class (`border-2`)

## Turkish Unicode
- `I`.toLowerCase() = `i̇` (NICHT `i`) → NFD + strip diacritics + `ı→i`
- SQL: `translate(lower(name), 'şçğıöüİŞÇĞÖÜ', 'scgiouISCGOU')`

## API-Football
- Substitution: `time.elapsed` (NICHT `time.minute`!), `player`=OUT, `assist`=IN
- Null guards: `evt.player?.id` und `evt.assist?.id` koennen null sein
- `grid_position` kann kaputt sein: fehlende GK-Row, Duplikate, >11 Starters
- API-Football hat KEINE Market Values → nur Transfermarkt

## RLS Policy Trap (Session 255 — SC Blocking war komplett kaputt)
- Neue Tabelle mit RLS MUSS Policies fuer ALLE Client-Ops haben (SELECT + INSERT + DELETE)
- SELECT-only = Client kann lesen aber NICHT schreiben → silent failure
- IMMER nach Migration pruefen: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`
- NIEMALS `console.error` ohne `throw` bei kritischen DB-Writes → silent failure ist der schlimmste Bug

## RPC Anti-Patterns (Top 5 Bugs)
- `::TEXT` auf UUID beim INSERT (5x in Session 93)
- Record nicht initialisiert vor Zugriff in falscher Branch
- FK-Reihenfolge falsch (Child INSERT vor Parent)
- NOT NULL Spalte fehlt im INSERT
- Guards fehlen (Liquidation-Check in allen Trading-RPCs)

## Vercel / Deployment
- `NEXT_PUBLIC_*` Env-Vars NIEMALS als "Sensitive" auf Vercel → werden beim Build NICHT injected
- KEIN `createClient()` auf Module-Level → Lazy-Init (Proxy/Getter), sonst crasht Vercel Build
- CSP `img-src` Domains aus DB ableiten, nicht raten: `SELECT DISTINCT substring(image_url from '^https?://[^/]+')`
- Spielerbilder = `img.a.transfermarkt.technology` (NICHT api-sports.io)

## Shell / Hooks (Windows Git Bash)
- `grep -oP` mit `\K` scheitert SILENT auf Windows (Locale-Bug: "supports only unibyte and UTF-8 locales")
- Fix: `sed -n 's/.*"key"\s*:\s*"\([^"]*\)".*/\1/p'` statt `grep -oP`
- Worktree-Agents haben KEINEN Zugriff auf `.claude/skills/` — Fallback auf Main-Repo-Path oder Task gut verpacken

## UX Konsistenz
- Spieler-Anzeigen MUESSEN Link zu `/player/[id]` haben (Ausnahme: Picker-UIs)
- `<button>` NICHT in `<Link>` wrappen (invalid HTML) → stattdessen `href` Prop oder Wrapper-Komponente
