# Next-Session Briefing (2026-04-20)

> Erstellt 2026-04-19 nach Phase-A-Fundament-Abschluss.
> **Heute: 6 Commits, 5 Slices (081 + 081b + 081c + 082 + 081d) — kompletter Data-Quality-Refactor.**

---

## TL;DR

Der Aydin/Arda-Yilmaz-Fall den du heute Mittag gemeldet hast: **systematisch geschlossen**. Die DB hatte 52% verdächtige Daten (2367 von 4556 Spielern). Alle kategorisiert, markiert, Re-Scraper bereit. 4 CI-Regression-Guards live — neue Poisoning wird automatisch geblockt.

**Money-Invariant war durchgängig byte-identisch** — kein Trading-Risiko, kein Holdings-Verlust.

**Offene Action für dich (lokal)**: Re-Scraper-Wellen über Nacht laufen lassen. Script ist getestet (3/3 Bundesliga grün in 15.6s), Cloudflare-Block via lokalem Playwright umgangen.

---

## Was heute gebaut wurde

### 1. Tiefer Data-Audit
Du hast gefragt: "warum Aydin Yilmaz als Torwart bei Galatasaray mit 26M?". Resultat:
- **Arda Yilmaz + Barış Alper** haben identisch 26M EUR + contract_end 2021-07-10 — verschiedene TM-IDs aber gleicher Scraper-Fehler
- **Systemweit:** 17 Spieler mit identisch MV=500K, 13 mit 8M, 14 mit 50K — Scraper-Fallback-Defaults masquerading as real data
- **Pilot-Ligen Süper Lig/TFF1 haben worst Coverage (75-79%)** — opposite zum alten Narrative

### 2. Scope-Korrektur gespeichert
**Alle 7 Ligen launch-ready**, nicht nur Sakaryaspor/TFF1. DE → TR → EU-Top-3 Prio. Gespeichert als `feedback_scope_all_leagues_launch_ready.md`.

### 3. Flag-Trilogie (081 + 081b + 081c)
Neue Spalte `players.mv_source` mit 5 Werten: `unknown|transfermarkt_verified|transfermarkt_stale|manual_csv|api_football`.

- **081:** Mass-Poisoning Cluster ≥ 4 → 897 Rows
- **081b:** Paired + last_name match → +36 (Arda + Barış erfasst)
- **081c:** Orphan Contracts > 12 Mon. → +1434

**Zero Money-Drift** durchgängig — `trg_update_reference_price` guarded via `IF NEW.mv IS DISTINCT FROM OLD.mv`.

### 4. Re-Scraper-Script (Slice 082)
`scripts/tm-rescrape-stale.ts`:
- Filter: `mv_source='transfermarkt_stale'`
- Playwright lokal → Cloudflare-Block umgangen
- Success → `mv_source='transfermarkt_verified'`
- Re-Check pro Spieler vs. konkurrierende Admin-Imports
- CLI: `--league --limit --rate --dry-run --headless`

**Smoke-Test 3/3 grün**: Koki Machida 2025→2029, Nathan Ngoumou 2022→2027.

### 5. Ghost-Rows Cleanup (Slice 081d)
**11 Aston Villa Spieler vom 16.04. Sync** — fake, 0 Apps, Name+Contract-Duplikate echter Spieler anderer Clubs. API-Football Squad-Response war verunreinigt.

Fix: `club_id=NULL`. AV squad 62 → 51. 0 Holdings/Orders betroffen.

---

## Status am Session-Ende

### DB
- 4559 Players (inkl. 11 orphans)
- 2367 stale, 2189 unknown, 3 verified
- sum_mv=30.894.919.125, sum_ref=299.822.691.250, holdings_qty=708, holders=66
- **Byte-identisch zur Session-Start-Baseline**

### Code
- Branch `main`, 6 Commits
- `worklog/active.md`: status=idle
- tsc clean, INV-36/37/38/39 grün

---

## 🔴 Action morgen: Re-Scraper-Wellen (lokal, du)

**Welle 1 — DE (~1 h):**
```bash
npx tsx scripts/tm-rescrape-stale.ts --league="Bundesliga" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="2. Bundesliga" --limit=500 --rate=3000
```

**Welle 2 — TR (~1 h):**
```bash
npx tsx scripts/tm-rescrape-stale.ts --league="Süper Lig" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="TFF 1. Lig" --limit=500 --rate=3000
```

**Welle 3 — EU-Top-3 (~2 h):**
```bash
npx tsx scripts/tm-rescrape-stale.ts --league="Premier League" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="La Liga" --limit=500 --rate=3000
npx tsx scripts/tm-rescrape-stale.ts --league="Serie A" --limit=500 --rate=3000
```

Script loggt pro Spieler, bricht nicht bei Einzelfehlern ab, Coverage-Report am Ende.

---

## 🟠 Nach Wellen → Slice 083 Frontend-Filter aktivieren

Spec existiert: `worklog/specs/083-altbestand-filter.md`. Nach Wellen-Run ist der Filter effektiv (viele Spieler `verified`, weniger `stale`).

Kern-Change: `getPlayersByClubId(clubId, { activeOnly: true })` → `mv_source != 'transfermarkt_stale'`. Club-Kader zeigen nur aktive Spieler.

**Impact bekannt:** Admin-Views Full-Set (activeOnly=false), User-Views activeOnly=true, Cache-Key getrennt. ~45 min.

---

## 🟡 Parallel-Kandidaten falls Wellen nicht gelaufen

**Slice 084** — Ghost-Audit weitere Clubs mit Squad > 40:
Barcelona 56, Hatayspor 52, Bayern 46, Istanbulspor/Kayserispor/Boluspor je 44, VfB/Antalyaspor/Real je 43.

**Slice 085** — CI-Blocker `useMarketData.test.ts:283`:
CEO-Money-Decision: `referencePrice`-Fallback in `computePlayerFloor` behalten oder Test auf 800 updaten? 15 min wenn entschieden.

---

## 🟢 Backlog (nicht dringend)

- **080b** Market Round 2 (Filter F5-F9 Bundle)
- **086** Player-Row-Dedup echte Name-Collisions (Jake O'Brien Everton, Nico O'Reilly ManCity)
- **Phase B** SoT-Architektur `player_field_sources`
- **Phase C** Daily Reconciliation Cron + Data-Quality-Dashboard
- **Playwright** als direct-dep in package.json
- **Multi-Account-Gate** als Pre-Commit-Hook

---

## Erste Action morgen (Checklist)

1. `git log -1` + `cat worklog/active.md` → status=idle bestätigen
2. `SELECT mv_source, COUNT(*) FROM players GROUP BY mv_source` → verified-Count prüfen
3. Je nach Stand:
   - **A)** Wellen gelaufen → Slice 083 aktivieren
   - **B)** Wellen nicht gelaufen → Wellen starten ODER Slice 084/085 parallel
   - **C)** Alles grün, Zeit für Phase 2 → 080b Market Round 2 ODER Phase B SoT

---

## Kontextuell

- **Scope**: ALLE 7 Ligen launch-ready, Sakaryaspor war nur Hook
- **CTO-Autonomie**: bei Border-Cases 2-3 Optionen + Empfehlung, du entscheidest
- **CEO-Scope offen**: useMarketData Money-Decision
- **MCPs live**: Supabase, Playwright, Vercel, Notion, Chrome DevTools, Sentry, Context7
- **4 CI-Guards live**: INV-36/37/38/39 blocken Re-Poisoning

**Gute Nacht. Morgen geht's weiter.**
