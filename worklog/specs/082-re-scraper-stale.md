# Slice 082 — Re-Scraper Welle 1 (DE-Ligen, stale-only)

**Status:** SPEC
**CEO-Scope:** JA (Money-Critical — market_value_eur wird ueberschrieben)
**Stage-Chain:** SPEC → IMPACT (skipped — lokales Script, kein Prod-Cron) → BUILD → PROVE → LOG

## Ziel

Neues lokales Playwright-Script `scripts/tm-rescrape-stale.ts` das gezielt `mv_source='transfermarkt_stale'`-Spieler re-scraped und bei Success auf `transfermarkt_verified` setzt. Unterstuetzt `--league` Filter fuer Wellen-Rollout.

**Welle 1 heute:** Bundesliga + 2. Bundesliga (~350 Spieler laut DB).
**Welle 2 danach:** Süper Lig + TFF 1. Lig.
**Welle 3:** Premier League + La Liga + Serie A.

## Kontext

`tm-profile-local.ts` filtert auf `market_value_eur IS NULL OR 0` — fuer unsere Stale-Flags nicht geeignet, weil 933 Spieler noch die poisoned Default-MV haben (26M, 500K, etc.). Wir brauchen einen anderen Selector.

Der bestehende Script hat `--force=true` aber ueberschreibt dann ALLE Mappings, nicht zielgerichtet. Neuer Script: `--mode=stale` Pattern + `mv_source`-update bei Success.

## Betroffene Files

- `scripts/tm-rescrape-stale.ts` (NEW — ~250 LOC, kopiert+adaptiert aus tm-profile-local.ts)
- `worklog/proofs/082-welle1-bundesliga.txt` (nach Lokalem Run: vor/nach Coverage + Sample)
- Keine Migration noetig (mv_source-Werte sind bereits in Schema).

## Acceptance

1. Script kompiliert (`npx tsx scripts/tm-rescrape-stale.ts --help`).
2. Dry-Run Mode: `--dry-run=true` loggt was geupdated WUERDE ohne DB-Write.
3. Echter Run loggt pro Spieler: Alt-MV → Neu-MV + Alt-Contract → Neu-Contract.
4. Nach Success: `mv_source='transfermarkt_verified'`, `updated_at=now()`.
5. Nach Parse-Failure: `mv_source` bleibt `transfermarkt_stale` (Retry beim naechsten Run).
6. CLI-Flags: `--league=<name>`, `--limit=<n>`, `--rate=<ms>`, `--dry-run=true`.
7. Safety: vor jedem Spieler aktuelle mv_source aus DB checken (konkurrierender Admin-CSV-Import-Schutz). Wenn nicht mehr stale, skippen.
8. Target-Performance: 300-500 Spieler in 20-30 Minuten (bei 2500ms Rate-Limit).

## Edge Cases

1. **Cloudflare Rate-Limit**: 429-Response → Backoff 10s + retry once. Dann fail, weiter zum naechsten.
2. **Parse-Erfolg mit aelterem Contract**: Wenn neu-gescrapete `contract_end` < alter Wert — trotzdem uebernehmen (TM ist authoritative fuer aktuellen Stand).
3. **Parse-Erfolg mit MV=0**: Nicht uebernehmen (0 ist nie ein echter MV). `mv_source` bleibt stale.
4. **Keine TM-Mapping**: Spieler mit mv_source=stale aber ohne player_external_ids-Entry (z.B. nur Duplicate-Row) werden SKIPPED mit Warning.
5. **Duplicate-Rows** (Mio Backhaus × 2 etc.): Beide werden mit demselben TM-Profile-Scrape aktualisiert → beide bekommen gleichen Wert. Erwartet. Real-Dedup ist Slice 081d.

## Proof-Plan

1. Script-Sanity: `npx tsx scripts/tm-rescrape-stale.ts --help`
2. Dry-Run mit Bundesliga + limit=10 → Log zeigt 10 geplante Updates
3. Real-Run mit Bundesliga + limit=50 → ~40-45 mv_source='transfermarkt_verified' in DB
4. Full Welle 1 Bundesliga + 2.BL (~350) → Coverage-Report per Liga vor/nach
5. Arda Yilmaz-Stichprobe (nach Süper Lig Welle 2): mv_source sollte `transfermarkt_verified` sein + realistischer MV

## Scope-Out

- Club-/League-Subset via clever filter: hier raw per `--league=Bundesliga`.
- Nach allen Wellen: Slice 083 (Frontend-Filter) aktiv schalten.
- Cloudflare-Bypass-Hardening (Proxy-Pool etc.): Phase B, nicht jetzt.
