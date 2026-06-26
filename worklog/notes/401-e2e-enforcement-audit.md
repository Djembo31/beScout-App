# e2e-Durchsetzungs-Audit — „Alles seit Mock→Pro wirklich end-to-end?" (Slice 401, 2026-06-26)

> **Auslöser:** Anil-Frage „alles was wir seit Mock 2 Pro gemacht haben — wurde es e2e durchgesetzt?"
> **Methode:** 4 parallele Verifikations-Agents, je ein Cluster, alle Slices **329–400** gegen **Live-DB (`skzjfhvgccaeplydsunz`) + echten Code + i18n** verifiziert (nicht Vermerke nachgeplappert). Jede Status-Behauptung mit file:line / grep / `pg_get_functiondef` / SELECT-Evidenz.
> **Klassen:** ERLEDIGT (stale marker) · OFFEN-CODE (Verkabelung/Cleanup fehlt) · OFFEN-LIVE (Code+DB verkabelt, nur Playwright/DB-State-Beweis fehlt) · TOTER-CODE (existiert, 0 Consumer) · MOCK (UI ohne Backend).

## Kernbefund (eine Zeile)
**Die neue Geld-/Feature-Maschine (Treasury, Polls, Fan-Rewards, Events E1–E5) ist e2e VERKABELT — keine „Build-without-Wire"-Löcher.** Alle Migrationen live appliziert, alle RPCs von echtem `src/` aufgerufen, alle UI-Komponenten gemountet, alle i18n-Keys DE+TR. **Aber:** die Geld-RAUS-Seite ist bewiesen-korrekt aber nie real gelaufen, und der S7-Aufräum-Pfad selbst ist nicht durchgesetzt (tote/halbfertige Features).

---

## Cluster Treasury (329–378) — 8 ERLEDIGT-stale · 0 OFFEN-CODE · 6 OFFEN-LIVE
- **REIN live-bewiesen:** `platform_treasury_ledger` hat echte Rows für trading/ipo/poll/research/bounty + genesis-Seed (50M). Alle 8 Money-RPCs + 3 Event-Trigger enthalten `book_platform_treasury` (live `pg_get_functiondef`). Services/Tabs in Render-Trees importiert.
- **🔴 OFFEN-LIVE — der substantielle Fund: RAUS-Kanäle nie real gelaufen.**
  - **376 Monats-Liga:** verkabelt+fähig, aber `platform_treasury_ledger` source='monthly_liga' **rows=0**. Nur manueller Trigger (kein Cron), nie geklickt. `monthly_liga_winners` = 0 rows.
  - **377 BeScout-Events:** Trigger verkabelt, source='bescout_event' **rows=0**.
  - **378 special-Events:** Trigger verkabelt, source='special_event' **rows=0**.
  - → Alle RAUS-Beweise waren force-rollback-Smokes. Kein echter Topf-Abfluss ist je passiert. **Echter e2e-Gap: die Geld-RAUS-Seite ist bewiesen-korrekt, nicht bewiesen-gelaufen.**
- **OFFEN-LIVE (nur Screenshot, ~0 Risiko):** 330b (Kontoauszug-UI gemountet `AdminWithdrawalTab.tsx:57`), 357 (Topf-Card gemountet `BescoutAdminContent.tsx:346` — Screenshot existiert lokal, Marker stale), 371 (`qk.wallet.all`-Invalidate verdrahtet `useCommunityActions.ts` — AC1/AC2 laut TODO aber LIVE PASS, Marker stale).

## Cluster E4 Money-Glattzug (366–379b) — 19 ERLEDIGT · 1 OFFEN-CODE · 5 OFFEN-LIVE
- Massiv erledigt. Mehrere als „offen" gelogte Follow-ups sind durch spätere Slices faktisch zu: 366-eventCurrency→374, 367-F#3-Mastery→375, 368c-Label-Rest→373, 368e-DROP→368f. → Marker stale.
- **OFFEN-CODE:** 367 F#1 („ohne verkaufen"-Teilverkauf-Semantik) + F#2 (Hold-Regression-Tests) — non-blocking, explizit Anil-deferred Scope-Out, kein Money/Compliance-Risiko.
- **OFFEN-LIVE (Code+DB da, nur Playwright):** 368b (RewardsTab visuell), 368c (AC7 Floor-Sublabel — laut findings bereits im E2E live gesehen), 368d (von 372-Live-Trade mit abgedeckt), 368e (Markteintritt visuell), 371, 373 (selbst als „optional" markiert).

## Cluster E5 Events (380–400) — 14 ERLEDIGT-stale · 1 OFFEN-CODE · 5 OFFEN-LIVE
- Alle 21 Migrationen live appliziert (Schema/functiondef-SELECTs), alle UI gemountet, i18n DE+TR komplett.
- **🔴 OFFEN-CODE:** **400** — `AdminEventFeesSection.tsx:20` toter `creator`-Key in `Record<string,…>`-TYPE_META (tsc-unsichtbar; DB-CHECK creator-frei → unerreichbar/tot, aber widerspricht „restlos über 11 Flächen"). → in **Slice 401** gefixt.
- **OFFEN-LIVE:** 381 (`LeagueSeasonLeaderboard` gemountet `rankings/page.tsx:43`, nur Screenshot), 382 (Picker-Filter `isInBoundLeague` in `LineupPanel` verdrahtet, Live-Walk gegen bound-Event offen).
- **STALE-LIVE (Marker veraltet — Beweis existiert):** 386/388/389/390/392 „post-Deploy Playwright" wurde im **393-Vorlauf-Bundle** gefahren (`worklog/proofs/e3-bundle-playwright-verify.md` = Builder-Render PASS, 14/14 Inputs, NationMultiSelect funktional, 0 Leaks).
- **Legitim offen (nie als done behauptet):** E-7-Rest Freiform-Reward-Editor (Backlog).

## Cluster S7 + Polls/FRE (333–356, S7-Tracker) — ~13 ERLEDIGT · 5 OFFEN-CODE · 3 OFFEN-LIVE · 4 TOTER-CODE · 1 MOCK
- **Polls (333–337/343/356) + FRE (344–347):** alles gebaut + verkabelt + gerendert + Money-Smoke-bewiesen. polls=4 Rows, fan_rankings=37 Rows. Nur 3 OFFEN-LIVE (Post-Deploy-Screenshots 333/334/336).
- **🔴 Hier liegen die echten Verkabelungs-Löcher (= der Mock→Pro-Aufräum-Strang):**

| S7-Block | Punkt | Status | Evidenz |
|---|---|---|---|
| 1 String→UUID | `players.club` | OFFEN-CODE (legitim blockiert) | String-Spalte existiert; wartet auf API-Football-Key |
| 2 Leaderboard | `getMonthlyLeaderboard`/`useMonthlyLeaderboard` (scout_scores) | **TOTER-CODE** | 0 `.tsx`-Consumer; def `scoutScores.ts:320`+`gamification.ts:94`, niemand rendert |
| 2 Leaderboard | `scout_scores` (GlobalLeaderboard) vs `user_stats` (`getLeaderboard`→community-Widget) | OFFEN-CODE | beide live gerendert, Redundanz nicht konsolidiert |
| 3 Dormant | `club_votes` (alt, 0 Rows) vs `community_polls` (neu, 4 Rows) | OFFEN-CODE | beide gerendert (`AdminVotesTab` + Polls-Stack), 2 Voting-Systeme |
| 3 Dormant | Creator-Fund + Ad-Revenue-Share | **TOTER-CODE** | `creatorFund.ts`/`calculate_creator_fund_payout`/`adRevenueShare.ts` ohne Distribution/Cron |
| 3 Dormant | Monthly-Liga `close_monthly_liga` | OFFEN-CODE | nur manuell `AdminLigaTab.tsx:45`, kein Cron/vercel.json; winners=0 |
| 3 Dormant | Wildcard Earn-Economy (`earn_wildcards`/`spend_wildcards`) | **TOTER-CODE** | 0 src-Consumer; Service-Kommentar `wildcards.ts:42` „dormant" (Read-Pfad lebt) |
| 3 Dormant | Mystery Box (paid) | MOCK | `featureFlags.ts:70` default false + Backend-throw; Free-Box lebt |
| 3 Dormant | Club-Missionen | **TOTER-CODE** | `mission_definitions` club_id-Rows = 0 |
| 4 Bridges | 46 Bridge-Importer | OFFEN-CODE | Ratchet-Guard hält Baseline, nicht abgebaut |

- **🟢 LEBT (Tracker-Stale korrigieren):**
  - `referral_reward` — Tracker sagt „ohne RPC" = **FALSCH**: `reward_referral` existiert + feuert aus `trading.ts:122/255`, `ipo.ts:140`, `offers.ts:243` via `triggerReferralReward`→`referral.ts:52`.
  - Research — `348-pro-stand-roadmap.md` listet als Dormant, aber **lebt**: `AnalystTab` gerendert `ProfileView.tsx:175`, unlock/rate/expire wired, research_posts=3 Rows. Eher „low-data" als dormant.
  - `s7-phase3-remaining.md` `reconciled-through-slice: 354`, HEAD=400 (~46 Slices Drift; Block-Inhalt seit 354 aber unangetastet → korrekt).

---

## Konsequenz / nächste Schritte (priorisiert)
1. **Slice 401 (jetzt, Hygiene):** 400-Rest fixen + Stale-Tracker heilen + diese Befunde in die Epics einarbeiten. ← dieser Slice.
2. **RAUS-Geld real beweisen (Money/CEO):** EINE echte Monats-Liga-Auszahlung auf Live-DB → echte `monthly_liga`-Ledger-Rows + winners. Schließt den einzigen substantiellen e2e-Gap der Geld-Maschine. (Anker `358-platform-treasury-epic.md`.)
3. **S7 Mock→Pro durchziehen (CEO pro Feature):** Block-3-Dormant (toter Code: Monthly-Board, Creator-Fund/Ad-Revenue, Wildcard-Earn, Club-Missionen → aktivieren ODER löschen) + Block-2-Redundanz (scout_scores↔user_stats, club_votes↔community_polls). Anker `s7-phase3-remaining.md`.
