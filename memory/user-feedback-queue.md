# User-Feedback Queue

Eingehendes Feedback (Anil + später Tester). Triage nach Priorität, dann in Slice umgesetzt oder verworfen.

## Priorität

- **P0** Blocker — kaputte Kernschleife, Crash, Daten-Loss → sofort
- **P1** Major UX — User versteht nicht was tun, visueller Bug auf Core-Page → nächster Slice
- **P2** Nice-to-have — kleine UX-Verbesserung, Edge Case → in Polish-Sweep eingebaut
- **P3** Wunsch — neues Feature, Umbau → nach Phase 1+2 prüfen

## Format

```
### P? | YYYY-MM-DD | Kurz-Titel
- **Seite:** /path oder Component
- **Symptom:** was passiert / Screenshot falls vorhanden
- **Erwartung:** was sollte passieren
- **Status:** open / triaged / in-slice-NNN / fixed / wontfix
- **Slice:** NNN (wenn bearbeitet)
```

---

## Offen

### P0 | 2026-04-19 | Data-Quality Scraper-Poisoning (Aydin/Arda Yilmaz-Fall) ✅ FIXED
- **Seite:** /club/galatasaray + systemweit alle Liga-Kader
- **Symptom:** Anil meldete "Aydin Yilmaz als Torwart bei Galatasaray mit 26M EUR, unrealistisch. Und Kader-Zahlen inkonsistent (36 vs 40)".
- **Root:** (1) TM-Scraper-Fallback-Defaults als echte Werte durch (17 Spieler identisch 500K/2025-07-01 etc.). (2) Arda Yilmaz + Barış Alper Yılmaz bei Galatasaray: beide 26M + contract_end 2021-07-10 (Paired-Poisoning). (3) Aston Villa 62 Spieler (real ~30) wegen Cross-Club-Contamination vom 16.04. Squad-Sync. (4) 52% der DB-Spieler mit stale Daten.
- **Fix:**
  - Slice 081: 897 Mass-Poisoning-Rows (Cluster ≥4) als `mv_source='transfermarkt_stale'` flagged
  - Slice 081b: +36 Paired-Poisoning (Arda+Barış Case gelöst)
  - Slice 081c: +1434 Orphan Stale Contracts (>12 Mon. abgelaufen)
  - Slice 082: Re-Scraper-Script `tm-rescrape-stale.ts` gebaut, Smoke-Test 3/3 grün
  - Slice 081d: 11 Ghost-Rows Aston Villa auf club_id=NULL (AV 62→51)
  - 4 CI-Regression-Guards: INV-36, INV-37, INV-38, INV-39
- **Status:** fixed (Fundament), Phase A.2 Re-Scraper-Wellen pending (lokal auszuführen)
- **Slice:** 081 + 081b + 081c + 082 + 081d

### P1 | 2026-04-20 | F0 1000-row-cap Audit — restliche cron-routes (nach Slice 079c)
- **Seite:** `src/app/api/cron/` + `src/app/api/admin/`
- **Symptom:** ~15 weitere `.from('players')` Stellen ohne `.range()`. Einige haben `.eq()`-Filter (legitim unter 1000), andere nicht. Einzeln evaluieren.
- **Verdächtig (braucht Audit):** `sync-players-daily:237,270`, `sync-injuries:112,166,210,236`, `sync-transfers:144,205`, `gameweek-sync:606,1245,1553,1566`, `sync-transfermarkt-batch:139`, `transfermarkt-search-batch:71`, `backfill-ratings:57`, `players-csv/export:57`, `players-csv/import:110,137`.
- **Audit-Command:** `grep -rn "\.from('players')" src/app/api/ | grep -v "\.range\|\.limit(\|\.eq\|\.single\|\.maybeSingle\|test\|insert\|update"`
- **Erwartung:** Pro Hit entscheiden: (a) `.eq('club_id', x)` Filter vorhanden → OK; (b) bekommt einen Batch wie `.in('id', ids)` → OK; (c) unbedingt ALLE players → while-loop wie 079c.
- **Status:** open — separate Slice empfohlen, P2 vom Reviewer, hier als P1 weil Cron-Stille Data-Drift.
- **Slice:** TBD

### P2 | 2026-04-20 | F1 Multi-Account-Testing als Hook/Gate
- **Seite:** Polish-Sweep Workflow
- **Symptom:** `feedback_polish_multi_account.md` dokumentiert "2+ Test-Accounts durchklicken". Kein Hook enforced es. Nur Text.
- **Erwartung:** In `/ship` Skill oder als PreToolUse-Hook auf `git commit -m "feat(" | "fix(..."` einchecken dass der Commit-Author mind. 2 Accounts durchgeklickt hat (vermutlich manuelle Checkbox im active.md).
- **Status:** open
- **Slice:** TBD

### P2 | 2026-04-20 | F2 Balance-Format-Konsistenz TopBar vs Hero Cross-Page ✅ FIXED
- **Seite:** Alle Pages mit TopBar-Balance
- **Symptom:** Slice 079 Pass 2 hat Hero-Balance auf `formatScout()` angeglichen. Top-Bar nicht im Scope — möglich dass noch `7.225` vs Hero `7.220,77` divergent.
- **Root:** TopBar nutzte `formatScout()` (gerundet, keine Dezimalen), MarketHeader nutzte `fmtScout(centsToBsd())` (2 Dezimalen) — format-mismatch.
- **Fix:** Slice 080 R1 Commit `2ab40fb2` — TopBar auf `fmtScout(centsToBsd(balanceCents))` vereinheitlicht. Live verified: TopBar "7.220,77" === Header "7.220,77 CR".
- **Status:** fixed
- **Slice:** 080 Round 1

### P3 | 2026-04-20 | F3 fanRankStammgast Graceful Fallback für unbekannte Tiers
- **Seite:** `src/components/manager/ManagerTab.tsx:155`
- **Symptom:** `tg(FAN_RANK_KEYS[fanRanking.rank_tier])` bricht wenn DB neuen Tier liefert der nicht im `FAN_RANK_KEYS`-Map ist → MISSING_MESSAGE raw-string.
- **Erwartung:** `FAN_RANK_KEYS[fanRanking.rank_tier] ?? 'fanRankUnknown'` mit `gamification.fanRankUnknown` Fallback-Key.
- **Status:** open — niedrig-Prio, nur relevant wenn DB neue Tiers bekommt
- **Slice:** TBD

### P0 | 2026-04-19 late | /api/players PostgREST-cap → Holdings unsichtbar ✅ FIXED
- **Seite:** /market (Bestand) + /manager (Kader) + Home ScoutCardStats-Count
- **Symptom:** test12 hat 16 Holdings in DB, UI zeigt nur 7. Players mit last_name-alpha-pos > 1000 werden nicht enriched.
- **Root:** `/api/players` ohne `.range()`-Pagination → PostgREST-cap 1000. DB hat 4556 players.
- **Fix:** Commit `459da7b1` + `c1f7eac3` (pnpm-lock sync) → /api/players returnt jetzt 4556 ✓ verified live
- **Status:** fixed
- **Slice:** 079b-emergency (kein formaler Slice wegen Notfall-Charakter)

### P1 | 2026-04-19 | F4 AuthProvider + Wallet RPC-Timeouts (affects alle Pages)
- **Seite:** global Layout (AuthProvider)
- **Symptom:** Login dauert 10-15s. Console: `loadProfile RPC slow, using 3-query fallback`, `[Wallet] Balance fetch failed (attempt 3/3) — exhausted: Timeout`. Nach Retry klappts, aber User-Experience zum Kotzen.
- **Erwartung:** Login < 3s. Ohne Timeout-Warnings.
- **Status:** open — Backend-Perf-Slice nötig (EXPLAIN ANALYZE auf loadProfile + getWallet RPCs)
- **Slice:** TBD

### P2 | 2026-04-19 | useMarketData referencePrice fallback (CEO-Scope Money)
- **Seite:** /market (+ alle Holdings-Displays)
- **Symptom:** CI Test `useMarketData.test.ts:283` expected 0 / got 800. `computePlayerFloor` nutzt `player.prices.floor ?? player.prices.referencePrice ?? 0`. Test-Intention: referencePrice nicht im Fallback.
- **Erwartung:** Money-Decision — entweder referencePrice aus Fallback raus ODER Test auf erwarteten 800 update.
- **Status:** open — blockt CI bei jedem Commit
- **Slice:** TBD (CEO-Approval nötig)

### P2 | 2026-04-19 | F3 Activity-Feed Dedup (Phase 3 Social)
- **Seite:** / Home (FollowingFeedRail)
- **Symptom:** Bei 1 gefolgtem User → 5× identisch "oksmoz2/kemal2 hat ein Lineup eingereicht" → wirkt wie Bug/Bot
- **Erwartung:** Consolidation ("X hat 5× Lineups eingereicht") oder DISTINCT-action-per-user-per-day
- **Status:** deferred — Phase 3 Social
- **Slice:** TBD

### P2 | 2026-04-19 | playwright-package fehlt in package.json direct-deps
- **Seite:** scripts/tm-*.ts
- **Symptom:** Lokale TM-Scraper-Scripts importieren `playwright` — kein direct-dep, läuft via transitive resolution (@playwright/test). Slice 079-Healing hat scripts/ aus tsconfig exclud, aber root-cause bleibt.
- **Erwartung:** `npm install -D playwright` hinzufügen → Scripts auch type-safe + auf anderen Maschinen lauffähig
- **Status:** open
- **Slice:** quick (5 min)

### P3 | 2026-04-19 | F9 Quick-Actions Label 10px Touchability
- **Seite:** / Home (Quick-Actions Row)
- **Symptom:** `text-[10px] font-bold text-white/60` auf Card-Labels. Tap-Target OK (Card hat min-44px), aber Label-Reading auf iPhone mit Reading-Glasses-Users?
- **Erwartung:** Manual Test auf echtem Mobile oder Accessibility-Audit
- **Status:** open — auf echtem Device testen
- **Slice:** Pass 3 wenn User-Feedback kommt

### P3 | 2026-04-19 | F10 Divider-Gradient Abstand
- **Seite:** / Home (zwischen Hero + Main-Column)
- **Symptom:** `divider-gradient` wirkt visuell etwas eng
- **Erwartung:** Visual polish with design eye
- **Status:** open — niedrig-Priorität

### P3 | 2026-04-19 | F13 Welcome Bonus Modal (nur isNewUser testable)
- **Seite:** / Home (first login)
- **Symptom:** Jarvis-QA ist existing user, Modal rendert nicht. Nicht getestet.
- **Erwartung:** New-User-Account erstellen und Flow durchspielen
- **Status:** open — beim nächsten User-Test-Run
- **Slice:** Phase 5 (Welcome/Onboarding)

### P3 | 2026-04-19 | OnboardingChecklist nicht getestet
- **Seite:** / Home + /onboarding
- **Status:** open — Phase 5 (Welcome/Onboarding)


### P1 | 2026-04-20 | F2 Club-Namen-Typos im Market-Filter (Hatayspor/Karagümrük/Bandırmaspor) ✅ CLOSED
- **Seite:** /market Bestand-Tab Club-Filter-Chips
- **Symptom:** Ich las im Screenshot "Holoyspor", "Karagümrüka", "Bandirma" — vermutete DB-Typos oder verlorene Diacritics.
- **Root:** Falsches OCR meinerseits. DB-Verify via supabase MCP zeigte alle Namen korrekt: `Hatayspor`, `Fatih Karagümrük`, `Bandırmaspor`, `Sakaryaspor`, `Adana Demirspor`.
- **Status:** wontfix — kein Bug, OCR-Fehler. Lessons-Learned: vor DB-Migration immer erst DB-Query, nie auf Screenshot-Text vertrauen.
- **Slice:** —

## Erledigt (Heute-Stand 2026-04-20 Vormittag)

- **P1 | 2026-04-19 late | /api/players PostgREST-cap** → fixed Slice 079b-emergency (`459da7b1`, `c1f7eac3`)
- **P2 | 2026-04-20 | F2 Balance-Format Cross-Page** → fixed Slice 080 R1 (`2ab40fb2`)
- **P1 | 2026-04-20 | F2 Club-Namen-Typos** → wontfix (OCR-Fehler, keine DB-Daten kaputt)
