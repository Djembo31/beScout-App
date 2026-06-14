<!-- auto:handoff-start -->
# Session Handoff — Auto

> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker.
<!-- auto:handoff-end -->

---

# 🎯 RESUME-ANKER NÄCHSTE SESSION (2026-06-15 — S7 Phase-3 läuft, nächster Schritt = Slice 326)

**Status: idle** · HEAD `b385c3af` (Slice 325) · origin/main synchron · **0 Reverts** (durchgehend seit 261). Working tree: nur Auto-Handoff-Block + 3 self-renewing Audit-Churn-Files (`worklog/audits/{audit-stale,type-truth,wiring}-2026-06-14.md` → `git restore`/ignorieren).

## ⚡ ERSTE ACTION: Slice 326 — clubs.league String→UUID VOLLMIGRATION (der große gelbe Block)

**EINE kohärente L-Einheit** (in Slice 325 bewusst NICHT angefangen, nur Drift-Stop gemacht). Landkarte: `worklog/audits/2026-06-14/string-to-uuid-map.md` Sektion B + „Vorlage-Lehren". Scope-Out-Liste: `worklog/specs/325-clubs-league-uuid-filters.md` §11.

**326-Bausteine (alle zusammen):**
1. `getLeagueById(id)` in `src/lib/leagues.ts` (war in 325 vorbereitet, reverted weil sonst Orphan — jetzt MIT Konsument bauen).
2. `dbToPlayer` → `leagueId` exposen (`src/lib/services/players.ts`, aus `getClub(club_id)?.league_id`; Player-Type hat `leagueId?` schon, types:133).
3. **Filter-Consumer Name→ID** (alle vergleichen aktuell `player.league`/`club.league` === `useLeagueScope.leagueName`; Store hat `leagueId` schon):
   - `marktplatz/TrendingSection.tsx:20,27` · `TransferListSection.tsx:54,89` · `ClubVerkaufSection.tsx:63,104` (club.league_id; getClub=ClubLookup hat league_id)
   - `kader/KaderTab.tsx:117,262(smartLeague gibt Namen→auf id via getLeaguesByCountry()[0].id),276,304`
   - `rankings/PlayerRankings.tsx:56` (filterLeague ist **PROP** von `rankings/page.tsx:54` → Parent mit-umstellen)
   - `portfolio/BestandView.tsx` (filterLeague + eigener LeagueBar)
   - `marktplatz/LeagueBar.tsx:26-31` (**Listbuilder** baut Liga-Pillen aus `c.league`-Name als Map-Key → league_id/Name-Paar; genutzt von LeagueScopeHeader + BestandView)
4. **Club-Cache entkoppeln** (`src/lib/clubs.ts:42` liest `clubs.league`-String → `ClubLookup.league` Name): SELECT `league` raus, `lookup.league` aus `getLeagueById(league_id)?.name` ableiten. **Cache-Ordering:** League-Cache MUSS vor Club-Cache ready sein (sonst Name leer) — prüfen ob initLeagueCache vor initClubCache (ClubProvider). `leagueLookup` (players.ts:178) auf `club.league_id`→getLeagueById.
5. **Anzeige-Reader** (player.league Name): bleiben — Name kommt aus Cache via league_id (Schritt 4).
6. **localStorage** (`leagueScopeStore` KEY `bescout-league-scope-v1`): leagueName bleibt (Display), leagueId ist Truth → KEIN Break. Falls leagueName ganz raus: buster-bump.
7. **DROP** `clubs.league` (Migration NACH Code-Deploy, BEGIN/COMMIT; Spalte NOT NULL default 'TFF 1. Lig' → Default/NOT-NULL weg oder direkt DROP). Pre-Drop-grep PFLICHT auch `scripts/` + `messages/` (Vorlage-Lehre Slice 324!).

**Muster aus Slice 324 (favorite_club):** Backfill→Reader via getXById(id).name→Writer id-only→Type/SELECT→DROP. Vorlage-Lehre #2: **Truth-Achse pro Paar prüfen** — clubs.league: league_id=Truth + 0 Drift (einfach); players.club (Paar A): invertiert → echter Reconcile nötig.

## ✅ Diese Session (2026-06-14/15) — 11 Slices, 0 Reverts

**S7 Phase-2 KOMPLETT (P0-Money + P1-Security + P1-Demo):**
- 316 Founding-Pass Money-Härtung (bcredits TS↔RPC + Preis server-validiert; Anil-Decision: RPC-Werte)
- 317 (+317b) profiles_update RLS Spalten-Whitelist (Trigger SEC INVOKER) + apply_referral_code RPC
- 318 /api/push Row-Derived (Phishing-Stop)
- 319 notifications i18n-SELECT + push-unsubscribe error-capture
- 320 cancel_club_subscription RPC (RLS-Gap)
- 321 FanChallenges Dead-Feature-Removal (4-Achsen)
- 322 claim_score_road ok-Discriminator + Leaderboard Median-RPC
- 323 Ticket-Ledger-Reconciliation (1 User +5, balance war Truth)

**S7 Phase-3 START (D80):**
- Landkarte `string-to-uuid-map.md` (3 Paare club/league/favorite_club)
- 324 favorite_club String→UUID (VORLAGE-Migration, Spalte gedroppt)
- 325 create_club league_id Drift-Stop (clubs.league Teil 1)

## 🧭 Strategie (D80, memory/decisions.md)
Sommer 2026 = **Tech-First Tiefen-Umbau** (Sommerpause/keine Tester = sicheres Fenster). Monetarisierung erst nach Legal-Go; Wachstum/GTM später; 1000-Nutzer-Ziel akzeptiert-verschoben. Nordstern = professionelle/strukturierte/solide Plattform. Sequenz: favorite_club ✅ → clubs.league (326) → players.club (Paar A, L, API-Key-abhängig).

## 📌 Anil-Modus
**Lern-Modus aktiv** (feedback_teaching_mode.md): alles detailliert/kindgerecht erklären (warum/was/wofür, Lern-Merksätze). Bei „erkläre/warum/wo stehen wir" ausführlich-pädagogisch.

## Carry-over (Anil-Action)
- **🚨 API-Football-Key gesperrt seit 06.05.** (dashboard.api-football.com) → blockiert players.club-Reconcile (294 falsche Liga), Fantasy-#2/#7, Slice 284b (154 Geister), Süper-Lig-GW-Drift.
- **TR-Review (3 Strings):** `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").
- **Identity #3 (Taki profillos):** Anil-Decision „lassen" → erledigt, kein Eingriff.
- **316-Backlog:** Founding-Pass-Kaufstrecke für normale User tot (Admin-gated + kein Payment) → post-Legal-Go.
- **318-Residual:** notifications cross-user INSERT RLS → cross-user-Notification-Creation auf SEC-DEFINER-RPCs (großer Slice, später).

## S7-Phase-3-Roadmap (nach clubs.league)
players.club (Paar A, L) · 5 Leaderboard-Impls→1 · dormante Features (Research/Voting/Creator-Fund/Monthly-Liga aktivieren-oder-löschen) · Ad-Revenue-Share (0€-Writepath) · Cron-Monitoring · Onboarding-Glättung. Quellen: `string-to-uuid-map.md` + S7-Registry `worklog/audits/2026-06-13/s7-source-of-truth-registry.md`.
