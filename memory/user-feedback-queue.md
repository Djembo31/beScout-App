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


## Erledigt

(leer)
