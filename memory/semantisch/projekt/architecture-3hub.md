# 3-Hub Architecture (2026-04-07)

> Verdichtet aus 5 Retros (retro-20260407-135831..183450). AutoDream Output.

## Was wurde gebaut

5-Wave Refactor (28 Files, alle commits auf main):

| Wave | Commit | Scope |
|------|--------|-------|
| 1 | 7173186 | Profile entladen — schwere Inhalte raus |
| 2 | f8f3b5b | /inventory (NEU) — 4 Sections: Equipment, Wildcards, Cosmetics, Box History |
| 3 | f93cc2f | Missions → Progress-Hub (Streaks + Achievements zentralisiert) |
| 4 | 3e75561 | Home entladen + Quick Action Inventar-Link |
| 5 | 3932d45 | Cleanup Wave |

## Architektur-Entscheidung

Hub-Prinzip: Jede Seite hat EINE klare Aufgabe. Kein Content-Dumping.
- Profile: Identitaet + Social (NICHT Inventar, NICHT Progress)
- /inventory: Alles was der User BESITZT (Equipment, Wildcards, Cosmetics, Box-History)
- Missions: Progress + Achievements (NICHT Trading, NICHT Inventar)
- Home: Einstieg + Quick Actions (NICHT schwere Listen)

## Key Files

src/app/(app)/inventory/page.tsx         <- NEU (Wave 2)
src/components/inventory/               <- 4 Section-Komponenten (CosmeticsSection, EquipmentSection, MysteryBoxHistorySection, WildcardsSection)
src/app/(app)/missions/page.tsx          <- Vereinfacht (Wave 3)
src/components/missions/AchievementsSection.tsx  <- Von Profile hierher verschoben
src/components/missions/StreakMilestoneBanner.tsx <- Von Home hierher verschoben
src/components/profile/ProfileView.tsx   <- Entladen (Wave 1)
src/app/(app)/page.tsx                   <- Entladen (Wave 4)
src/lib/nav.ts                           <- /inventory Route hinzugefuegt

## Mystery Box Kalibrierung (gleichzeitig, Commit eca67ae)

Migration: supabase/migrations/20260407120000_mystery_box_calibration_v1.sql
Drop-Rates kalibriert nach Benchmark: Brawl Stars, Genshin, Clash Royale
mystery_box_config Tabelle angepasst.

## .single() -> .maybeSingle() Audit (Folge-Session, Commit d66f0f6)

Root Cause: HTTP 406 Fehler in Visual QA (4x) -> Systematische Analyse -> 23 Aufrufstellen
Regel: Alle Service-Calls wo 0 Rows moeglich sind -> .maybeSingle() statt .single()
Betroffene Services: club, clubChallenges, players, profiles, referral, trading, fantasy/*, cron, airdropScore

Gleichzeitig behoben: airdropScore (Commit 908f930) - Crash wenn kein Airdrop-Eintrag fuer User.
