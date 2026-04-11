# BeScout Liga + Rankings Hub — Built (2026-04-10)

## Status
**DONE** — 4 commits, all waves 0-3 + partial wave 4 completed in one session.

## Was gebaut wurde (3 Commits: 8ea2400, 314ece6, c94a7c1)

### /rankings Page — 7 Widgets
Route: `/rankings` (Q5 beantwortet: eigene Page, nicht Tab)
Alle 7 Widgets implementiert (Q6 beantwortet):
- `GlobalLeaderboard` — Top 100 Global
- `FriendsLeaderboard` — Freunde-Rangliste
- `ClubLeaderboard` — Club-Rangliste
- `MonthlyWinners` — Monats-Sieger History
- `LastEventResults` — Letzte Spieltag-Ergebnisse
- `PlayerRankings` — Spieler-Rankings
- `SelfRankCard` — Eigener Rang

### DB + Backend (3 Tabellen, 4 RPCs)
- `liga_seasons` — Saison-Modell (Q1 beantwortet: Fußball-Saison Aug-Mai)
- `user_liga_season_scores` — Saison-Scores per User
- `monthly_liga_winners` — Monats-Sieger-Archiv
- RPCs: `get_current_liga_season`, `get_user_liga_rank`, `get_monthly_liga_winners`, `close_monthly_liga`
- Admin: `close_liga_season` RPC für Saison-Reset + Admin-Tab `AdminLigaTab.tsx`
- Cron: `gameweek-sync/route.ts` extended um Liga-Scoring

### Liga Event Scoring (`is_liga_event` flag, Commit c94a7c1)
- Events-Tabelle bekommt `is_liga_event BOOLEAN DEFAULT FALSE`
- Admin kann Events als Liga-Events markieren (`AdminEventsManagementTab.tsx` + `EventFormModal.tsx`)
- Scoring-Multiplikator: Liga-Events = 1.0x (voll), Non-Liga-Events = 0.25x
- Season-Cap: Non-Liga-Contributions gecappt auf 10% des Saison-Scores
- Backfill: Alle existierenden freien BeScout-Events als `is_liga_event = TRUE` migriert

### Nav-Integration
- `BottomNav.tsx`: Rankings-Icon hinzugefügt
- `CommunitySidebar.tsx`: Liga-Link in Sidebar

### i18n
- DE + TR: `messages/de.json` + `messages/tr.json` beide gepflegt

---

## Economy-Entscheidungen (2026-04-10, finale Antworten von Anil)

| Frage | Antwort |
|-------|---------|
| Q1 Saison-Modell | **Fußball-Saison Aug-Mai** |
| Q3 Saison-Reset | **80% Soft-Reset** |
| Q4 Monats-Sieger Rewards | **$SCOUT + Badge** (bereits gebaut) |
| Q5 Rankings-URL | **`/rankings`** eigene Page |
| Q6 Widgets | **Alle 7** (Global, Friends, Club, Monthly, LastEvent, PlayerRankings, SelfRankCard) |
| Fee-Discounts | **NEIN** — kein Liga-Rang-Rabatt auf Trading Fees |
| PBT | **Bleibt liquidation-bound** — keine Liga-Distribution |
| Community Fee Boost | **NEIN** — kein Analyst-Rang-Boost auf Research/Bounty/Poll-Fees |
| Club-Sub Stacking | **NEIN** — kein additiver Bonus Liga+Club-Sub |
| CardMastery | **AUS SCOPE ENTFERNT** — wird nicht gebaut in dieser Iteration |

---

## Scope-Creep Fixes (Commit efcb3f5 + Follow-up 7eb7d37)

### Mystery Box Daily-Cap (Server-Side) — efcb3f5, gefixt in 7eb7d37
- `open_mystery_box_v2` RPC enforced daily-cap server-side
- Vorher: nur client-side (bypassable), jetzt: DB-Check in RPC
- Hintergrund: Daily-only = compliance mit Mystery Box "täglich ein Überraschungsbox"-Promise
- **Follow-up 7eb7d37 (2026-04-11):** Der efcb3f5-Commit hatte 3 kaskadierende Backend-Bugs
  die den Free-Path komplett lahmgelegt haben (silent errors → endless-loop im Frontend weil
  localStorage-Gate nie zu ging). Alle 3 in Migration 20260411* gefixt:
  1. `created_at` → `opened_at` Column-Ref (Daily-Cap-Query crashte)
  2. Equipment-Branch las `mystery_box_config.equipment_type` / `.equipment_rank` — Spalten
     existieren nicht; Rank kommt aus `min_value`/`max_value`, Key random aus `equipment_definitions`
  3. `ticket_transactions.source = 'mystery_box_reward'` violiert CHECK constraint — auf
     `'mystery_box'` gemappt (description distinguishes)
- **Frontend-Härtung gleichzeitig**: `useHasFreeBoxToday` Hook (server-authoritative gate via
  COUNT auf `mystery_box_results` für UTC-Tag); `handleOpenMysteryBox` throws jetzt auf !ok
  (Modal zeigt echte RPC-Error-Message); localStorage-Fallback `bescout-free-box-day` entfernt.
- Live verifiziert auf bescout.net (jarvis-qa, 2026-04-11): Free Open = Epic/130 Tickets,
  zweiter Versuch = "Heute schon geöffnet".

### 7d Price Changes RPC
- Neues RPC: `get_player_price_changes_7d`
- Home-Hook `useHomeData.ts` nutzt jetzt echte 7d-Daten statt Mock-Daten
- Widget: Preis-Veränderung der letzten 7 Tage (real, nicht placeholder)

---

## Events Architecture Audit (Erkenntnisse aus dieser Session)

### Was funktioniert
- Abo-Gate war KEIN Bug — korrekt gefixt in Migration 20260325
- `is_liga_event` flag ist rückwärts-kompatibel

### Identifizierte Gaps (NOT gebaut, für spätere Sessions)
- Sponsor-System ist rudimentär (Placeholder-Logik, kein echtes Sponsor-Management)
- Fan-Engagement-Tools fehlen: keine Event-Stories, keine Event-Challenges, kein Live-Leaderboard während Event
- Diese Gaps sind im Scope-Creep-Log, werden nach Polish-Sweep adressiert

---

## Files

| File | Zweck |
|------|-------|
| `src/app/(app)/rankings/page.tsx` | Rankings Hub Page |
| `src/components/rankings/` | 7 Widget Components + index.ts |
| `src/app/(app)/bescout-admin/AdminLigaTab.tsx` | Admin: Saison close + reset |
| `src/components/admin/EventFormModal.tsx` | is_liga_event Checkbox |
| `src/app/api/cron/gameweek-sync/route.ts` | Liga-Scoring in Cron |
| `src/app/(app)/hooks/useHomeData.ts` | 7d Price Changes (real) |
| `docs/plans/2026-04-10-bescout-liga-spec.md` | Ursprünglicher Spec-Plan |

---

## Session Log
- **2026-04-09** — Spec erstellt, Q2 beantwortet, Q1/3/4/5/6 offen, CardMastery undefiniert
- **2026-04-10** — Alle Qs beantwortet, alles gebaut (Waves 0-3 + Economy-Entscheidungen final)
