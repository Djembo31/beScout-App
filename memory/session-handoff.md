# Session Handoff
## Letzte Session: 2026-04-19 — TM Local Scraper + All-Leagues Sweep

## Was wurde gemacht

### Slice 077 — TM Local Scraper (Cloudflare-Workaround)
Zwei Playwright-tsx-Scripts in `scripts/` gebaut die lokal Transfermarkt scrapen
(umgeht Cloudflare-Block der Vercel-Datacenter-IPs trifft):

- `scripts/tm-search-local.ts` — Schnellsuche → `player_external_ids` INSERT
- `scripts/tm-profile-local.ts` — Profile-Scrape → `players.market_value_eur` + `contract_end` UPDATE

**Kritischer Bugfix gefunden:** Der Vercel-Cron nutzt `${last_name} ${first_name}` als Query.
Tuerkische Diacritics + diese Reihenfolge ergibt 0 Matches bei TM-Search.
Scripts nutzen `${first_name} ${last_name}` → Matches finden.

### Slice 077b — All-Leagues Sweep
Alle 7 Ligen sequenziell durch search + profile gelaufen (~2h total):

```
Liga             | Mapping   | Contract  | MV
2. Bundesliga    | +444      | +14       | 0
Bundesliga       | +479      | +17       | 0
La Liga          | +431      | +90       | 0
Premier League   | +485      | +52       | 2
Serie A          | +463      | +110      | 0
Süper Lig        | +447      | +20+41    | 0
TFF 1. Lig       | +124      | +56       | 0
```

### Session-Totals
- **~2873 neue TM-Mappings** (alle 7 Ligen >=98.9% api_mapping)
- **359 Contract-Updates**
- **2 MV-Updates** (praktisch alle MVs waren bereits in `players`)

## Commits
- e110e794 — feat(scripts): Slice 077 — TM Local Scraper
- 17e1c9b0 — feat(scripts): Slice 077b — All-Leagues TM Sweep + Loader-Fix

## Build Status
- tsc: CLEAN (unverändert — nur Script-Additions in scripts/)
- 2 neue Slice-Proofs: 077-tm-local-scraper-results.txt + 077b-all-leagues-sweep.txt

## Gold-Tier Progress (2026-04-19 Ende)
Alle 7 Ligen naeher dran aber 0 im Gold. api_mapping ist solid.
Bottleneck bleibt `market_value_eur` — die meisten Luecken sind Players
mit TM-`mv=0` oder komplett unmapped.

| Liga | api_map | contract | MV | Gold? |
|---|---|---|---|---|
| 2. Bundesliga | 99.8% | 94.8% | 91.3% | nein (MV-Luecke 3.7pp) |
| Bundesliga | 99.3% | 92.9% | 89.9% | nein (MV-Luecke 5.1pp) |
| Süper Lig | 99.7% | 86.0% | 77.9% | nein |
| Premier League | 98.9% | 85.6% | 77.9% | nein |
| TFF 1. Lig | 99.7% | 77.6% | 70.2% | nein |
| La Liga | 99.4% | 84.9% | 72.0% | nein |
| Serie A | 99.8% | 85.6% | 69.0% | nein |

## Schnellster Gold-Win morgen
- 2. Bundesliga: **20 Players** CSV → Gold
- Bundesliga:    **31 Players** CSV → Gold
- Beide zusammen: 51 Players (1-2h Kicker/Comunio → CSV-Upload)

## Common-Errors dokumentiert heute
- Keine neuen. Scripts-Bugs (query-order, PostgREST 1000-limit) in Proof-Files.

## Noch offen
- CSV-Workflow fuer Gold-Tier
- Retry notFound-Cases mit lower threshold (1055 Players potentiell)
- Cron-Query-Order-Bug fixen (auf Vercel ohnehin CF-blocked)

## Blocker
- Keine
