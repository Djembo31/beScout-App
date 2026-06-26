# S7 Aufräum-Route — Phase-3 Rest-Liste

> **Die offenen Reste der Source-of-Truth-Konsolidierung** (Mockup-Reste · toter Code · Brücken/Workarounds). Kuratierbar, damit das Wissen NICHT verloren geht (Anil 2026-06-16: „waren wir damit komplett durch?" — nein).
> Vollständige Domänen-Landkarte: `worklog/audits/2026-06-13/s7-source-of-truth-registry.md`. Master-Strategie: `memory/decisions.md` D80 (Sommer Tech-First).
>
> **Stand-Quelle (Slice 354, Anti-Stale):** Dieses File = **SSOT für die S7-Block-Struktur + aggregierten Block-Stand**. Live-Completion einzelner Slices bleibt in `worklog/log.md` + `TODO.md` autoritativ. Reconcile-Pflicht beim LOG (workflow.md) + `.husky/pre-commit`-`[TRACKER-RECONCILE]`-Reminder.
> **reconciled-through-slice: 401** (Block 1–4 seit 354 inhaltlich unangetastet; Slice 401 hat den e2e-Durchsetzungs-Audit `worklog/notes/401-e2e-enforcement-audit.md` eingearbeitet + 2 Stale-Fakten korrigiert — s. Block 3).

## Programm-Stand

| Phase | Was | Stand |
|-------|-----|-------|
| **1 — Kartieren** | alle 9 Daten-Domänen mappen | ✅ KOMPLETT (Slices 302/314/315) |
| **2 — P0-Money + P1 fixen** | Floor(303) · CommunityValuation(305) · L5(309) · last-5(307) · Gameweek(310/311) · profiles-RLS/push/Gamif(316–323) · FanChallenges-Removal(321) | ✅ größtenteils durch |
| **3 — Abräumen** | die 4 Reste unten | 🔄 LÄUFT — NICHT komplett |

## Die 4 offenen Rest-Blöcke (Phase 3)

### 1. String→UUID-Migration
- ✅ `favorite_club` (Slice 324) · ✅ `clubs.league` (Slice 326)
- ⛔ **`players.club`** — BLOCKIERT (API-Football-Key gesperrt, braucht Reconcile; `club_id` known-stale für Cross-Club-Spieler). Startbar sobald Anil den Key freischaltet.
- **Stand:** 2/3 erledigt, letzter Schritt wartet auf Key.

### 2. Leaderboard-Konsolidierung (5→1)
- 9 Ranking-Impls kartiert: die meisten legitim verschieden (Fantasy/Predictors/Fan-Ranking/Liga-Tabelle/Spieler). **Echte Redundanz nur:** globale User-Rangliste = `scout_scores` (Elo) vs `user_stats` (parallele Kopie) → 1 Quelle.
- 2 „tote" Boards (Monthly-Liga `getMonthlyLeaderboard`, Club-Fan `getClubFanLeaderboard`) = **angefangene Features, nicht löschen → fertig verkabeln**.
  - ✅ **Club-Fan-Board `getClubFanLeaderboard` verkabelt (Slice 349)** + Live-bestätigt (Slice 354: PostgREST-FK-Bug `fan_rankings→profiles` gefixt, Board rendert echte Treue-Fans auf Club-Page Tab „Mehr").
  - ⬜ **Monthly-Liga-Board `getMonthlyLeaderboard`/`useMonthlyLeaderboard` = TOTER-CODE** (e2e-Audit 401): 0 `.tsx`-Consumer; definiert `scoutScores.ts:320` + `gamification.ts:94`, niemand rendert. Aktivieren (Live-Standing-UI, vgl. Treasury-Epic Slice 5) ODER löschen. Hängt mit `close_monthly_liga`-Cron-Frage zusammen (`monthly_liga_winners`=0).
  - ⬜ **Echte Redundanz `scout_scores` (Elo) vs `user_stats`** (e2e-Audit 401): beide live gerendert — `GlobalLeaderboard.tsx:29`→`getScoutLeaderboard`→scout_scores; parallel `useCommunityData.ts:50`→`useLeaderboard`→`getLeaderboard`(`social.ts:211`)→user_stats. Nicht konsolidiert → 1 Quelle.
- **Stand:** Club-Fan-Board ✅ live; Monthly-Liga-Board (toter Code) + scout_scores/user_stats-Konsolidierung offen.

### 3. Dormant-Features (Müll: weder aktiv noch gelöscht)
- Regel (D80): pro Feature **aktivieren ODER löschen** — kein Halbfertiges.
- **Präzisierter Befund (e2e-Audit 401, mit Evidenz):**

| Feature | Befund | Evidenz |
|---|---|---|
| **Creator-Fund + Ad-Revenue-Share** | TOTER-CODE | `creatorFund.ts`/`calculate_creator_fund_payout`/`adRevenueShare.ts` — Calc-RPC ohne Distribution/Cron. (Sponsors selbst = LEBT) |
| **Wildcard Earn-Economy** | TOTER-CODE | `earn_wildcards`/`spend_wildcards` 0 src-Consumer; `wildcards.ts:42` Kommentar „dormant". Read-Pfad (`WildcardsSection`) lebt |
| **Club-Missionen** | TOTER-CODE | `mission_definitions` club_id-Rows = 0 |
| **Monthly-Liga** | OFFEN-CODE | `close_monthly_liga` nur manuell `AdminLigaTab.tsx:45`, kein Cron; `monthly_liga_winners`=0 (s. Block 2 + Treasury-Epic) |
| **2 Voting-Systeme** | OFFEN-CODE | `club_votes` (0 Rows, `AdminVotesTab`) vs `community_polls` (4 Rows) beide gerendert, nicht konsolidiert |
| **Mystery Box (paid)** | MOCK (legitim) | `featureFlags.ts:70` default false + Backend-throw; lizenz-gated; Free-Box lebt |
| **Research** | ~~Dormant~~ **LEBT** (Stale korrigiert) | `AnalystTab` gerendert `ProfileView.tsx:175`, unlock/rate/expire wired, research_posts=3 Rows. Eher „low-data" als dormant |
| **`referral_reward`** | ~~„ohne RPC"~~ **LEBT** (Stale korrigiert) | `reward_referral` existiert + feuert aus `trading.ts:122/255`, `ipo.ts:140`, `offers.ts:243` via `triggerReferralReward`→`referral.ts:52` |

- **Stand:** offen. **3 echte Lösch-/Aktivier-Kandidaten:** Creator-Fund+Ad-Revenue, Wildcard-Earn, Club-Missionen (toter Code); + 2 Konsolidierungen (Monthly-Liga, Voting-Systeme).

### 4. Brücken (Bridges / Workarounds)
- 46 Bridge-Importer (Komponenten greifen direkt auf Service-Schicht zu statt über Boundary) — `boundary-check` Baseline *gehalten* (kein Wachstum), aber nicht reduziert.
- rating-Chain 3-Hop-Bridge (`rating→fantasy_points→gw_score`, Sync via RPC ohne Trigger) — Trigger-Absicherung = post-API-Key-Backlog.
- **Stand:** stabilisiert (Ratchet-Guard), aber nicht abgebaut.

## Laufender Strang — überschneidet sich mit Phase 3

**Money/Reward-Modell (D83)** ist teils selbst Phase-3-Konsolidierung:
- **Club-Treasury-Fundament** = „mehrere Truth-Quellen → eine" (tote Spalte `clubs.treasury_balance_cents` + on-the-fly `get_club_balance` → ein echtes Konto). = Block-Typ wie #2. ✅ gebaut (329–332).
- ✅ **csf_multiplier-Entfernung** = toter Müll-Code weg (**Slice 348**: aus TS + RPC + DROP COLUMN). = Block-Typ wie #3, erledigt.
→ Der Treasury-Bau (Option A) hat einen Teil der Aufräum-Route mit abgearbeitet.

## Reihenfolge-Vorschlag

1. **Treasury-Fundament** (Money + Konsolidierung zugleich) ← AKTUELL GEWÄHLT
2. Leaderboard-Konsolidierung (Detail-Kartierung sichern → bauen)
3. Dormant-Feature-Hygiene (aktivieren/löschen)
4. Bridges reduzieren
5. `players.club` (sobald API-Football-Key frei)

---

*Erstellt 2026-06-16 (Anil „sichern, nicht verlieren"). Bei Fortschritt pro Block hier abhaken.*
