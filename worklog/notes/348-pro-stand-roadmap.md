# Pro-Stand-Roadmap — Mock → Pro ohne Reste

> Stand: 2026-06-19, nach Prüfung von `MASTERPLAN.md`, `TODO.md`, `worklog/active.md`, D76/D80/D83/D93, `worklog/s7-phase3-remaining.md`, `docs/knowledge/domain/{treasury,polls,reward-ranking}.md`.
>
> Zweck: Die große Karte für Anil/Claude/Hermes: Was ist schon pro, was ist noch Mock-/Bridge-/Dormant-Rest, welche Komponenten sind betroffen, wie weit ist der Weg bis „professionell ohne offensichtliche Reste".

## 0. Kurzurteil

Claude folgt dem ursprünglichen Masterplan **von Mock zu Pro** weiterhin. Die Richtung ist richtig: Es wurden nicht nur neue UI-Features gebaut, sondern zentrale Mock-/Halbprodukt-Stellen in echte Produktmechanik verwandelt:

- Treasury ist nicht mehr on-the-fly/Spalten-Drift, sondern Ledger/Konto.
- Polls sind nicht mehr Hülle, sondern offizielle Club-/User-Polls mit Geld-Routing und Discovery.
- Fan-Rank ist nicht mehr nur Badge/Deko, sondern hat sichtbare Leiter, Follow-Signal, Poll-Gewicht, Content-Gate und Club-konfigurierbare Schwellen.
- Airdrop wurde korrekt **nicht** gebaut, weil er in die echte-Coin-Phase gehört.

Aber: **Pro-Stand ist noch nicht endgültig erreicht.** Die Kern-Money-/Reward-Achse ist stark, die S7-Aufräumachse hat noch echte Reste: Leaderboard-/Score-Redundanz, Dormant-Features, Bridges, alte `players.club`-String-Achse, Knowledge/Plan-Drift.

## 1. Aktueller Stand nach Epics

| Epic/Track | Stand | Bewertung |
|---|---:|---|
| E0 Operating-System + Knowledge | ✅ weitgehend fertig | Setup/Wissen deutlich professioneller; `docs/TODO.md` war stale und wurde markiert. |
| E1 Treasury | ✅ gebaut | Ledger/Saldo/CSF/Events/Bounties stehen; Money-Slices mit Review/Proof. |
| E1 Polls | ✅ Kern fertig, kleine Reste | Club/User-Polls, REIN-Routing, Discovery, Follower/Abo/Fan-Rank-Gewicht live. Offen: exklusive Treue-Polls + Abo-Early-Access. |
| E1 Fan-Reward-Engine | ✅ aktuelle Phase fertig | FRE-1/2/3/5 live. FRE-4 Airdrop korrekt deferred bis Coin-/CASP-Phase. |
| E2 S7 Tech-First-Aufräumen | 🔄 offen | Größter verbleibender Pro-Rest: Leaderboards, dormant Features, Bridges, players.club blockiert. |
| Legal/Coin/Payment | ⏸️ später | Nicht Sommer-Tech-Ziel; Airdrops/Cashout/Payment erst mit Legal/CASP. |
| GTM/Wachstum | ⏸️ später | D80: Technik/Professionalität zuerst; Wachstum danach. |

## 2. Was „Pro ohne Reste" hier konkret bedeutet

Nicht „jede Idee gebaut". Pro-Stand heißt:

1. **Ein Datenpunkt = eine Quelle**: keine parallelen Score-/Saldo-/Status-Wahrheiten ohne klare Ownership.
2. **Keine halben Features im sichtbaren Produkt**: dormant Features entweder aktivieren, klar parken/verstecken oder entfernen.
3. **Money-Flows ledger-/serverseitig**: keine client-only Preise, keine rückwirkend schrumpfenden Einnahmen, keine ungesicherten SECURITY-DEFINER-RPCs.
4. **Page-/Feature-Contracts grün**: Demo-Pfade haben Loading/Empty/Error/Mobile/E2E oder DB-Proof bei gated Money-Pfaden.
5. **Brücken unter Kontrolle**: Komponenten gehen über Query/Service-Boundaries, keine wachsenden Re-Export-Shims/direct-supabase-Drifts.
6. **Wissen aktuell**: MASTERPLAN/TODO/active/knowledge widersprechen sich nicht.

## 3. Rest-Roadmap bis Pro-Stand

### Phase A — Plan-/Knowledge-Hygiene (XS, sofort)

Ziel: Keine falschen nächsten Schritte resurrecten.

Status heute:
- `worklog/active.md` war stale: sprach bei Slice 347 noch von „FRE-3 (dieser Slice)" und „danach FRE-4 Airdrop".
- `MASTERPLAN.md` hatte Polls/Fan-Reward-Status teilweise doppelt/stale.
- `docs/TODO.md` war März-2026-alt, aber klang wie aktuelle TODO.

Bereits in dieser Hygiene erledigt:
- `worklog/active.md` auf Slice 347 + Pro-Roadmap aktualisiert.
- `MASTERPLAN.md` Polls/FRE-Status korrigiert.
- Root-`TODO.md` auf nächste Track-Auswahl aktualisiert.
- `docs/TODO.md` als historisch/stale markiert.

Offen optional:
- `docs/knowledge/domain/treasury.md` §8/§9 auf FRE-1/2/3/5-Stand 2026-06-18 aktualisieren.
- `docs/knowledge/domain/reward-ranking.md` W2-C/W2-D von „offen" auf „teilweise adressiert" aktualisieren.

Betroffene Dateien:
- `worklog/active.md`
- `MASTERPLAN.md`
- `TODO.md`
- `docs/TODO.md`
- optional `docs/knowledge/domain/treasury.md`
- optional `docs/knowledge/domain/reward-ranking.md`

### Phase B — Kleiner Debt-Slice: `csf_multiplier` raus (S/M)

Warum:
- D83/D93 sagt: CSF rein proportional; Treue läuft über Fan-Reward-Engine.
- `csf_multiplier` ist alte Mock-/Hybrid-Mechanik: sieht wichtig aus, war aber durch 1,15×-Deckel fast wirkungslos und verwässert das Modell.

Ziel:
- `csf_multiplier` aus `calculate_fan_rank`/Fan-Rank-Writepfad entfernen oder neutralisieren.
- CSF/Liquidation bleibt proportional.
- UI/Types/Docs zeigen Fan-Rank als Perks-/Treue-System, nicht CSF-Booster.

Betroffene Komponenten:
- DB/RPC: `calculate_fan_rank`, ggf. `fan_rankings.csf_multiplier`, `liquidate_player` falls noch liest.
- Migrations: neue Slice-Migration, Live-`pg_get_functiondef` zuerst.
- Types/Services: `src/lib/services/fanRanking.ts`, `src/lib/fanRanking.ts`, `src/types/index.ts`.
- UI: `FanRankBadge`, `FanRankLadder`, `FanRankOverview`, Admin/Fans falls Text referenziert.
- Docs: `domain/reward-ranking.md`, `domain/treasury.md`, `.claude/rules/trading.md` falls Verweis.

Proof:
- `pg_get_functiondef` vor/nach, `has_function_privilege`, DB-smoke Fan-Rank + Liquidation unchanged/proportional.
- Focused vitest fanRanking/FanRankLadder.

### Phase C — Polls-Reste / Club-Value polish (M)

Warum:
Polls sind B2B-Geldmaschine. Kern steht, aber zwei Perk-Lücken sind noch offen.

Option C1 — Exklusive Treue-Umfragen:
- Schema: `community_polls.min_fan_rank` oder äquivalentes Gate.
- Vote-Guard + Sichtbarkeits-/Preview-Regel.
- Recalc-on-read oder klare Staleness-Regel, weil Fan-Rank jetzt Zugang steuert.
- UI: Admin/CreatePollModal, CommunityPollCard, Error/Locked preview.

Option C2 — Abo Early-Access:
- Zeitfenster oder Statusfeld für Abonnenten-Frühzugang.
- Vote-/Read-Guard.
- UI Copy für locked/early state.

Betroffene Komponenten:
- DB/RPC: `community_polls`, `create_community_poll`, `cast_community_poll_vote`, read RPC/query falls vorhanden.
- Services: `src/lib/services/communityPolls.ts`, `src/lib/queries/polls.ts`.
- UI: `CreatePollModal`, `CreatePollButton`, `CommunityPollCard`, `CommunityFeedTab`, `AdminVotesTab`.
- i18n: `messages/de.json`, `messages/tr.json`.
- Docs: `docs/knowledge/domain/polls.md`, `TODO.md`.

### Phase D — S7 Leaderboard-/Score-Konsolidierung (L)

Warum:
Größter verbleibender „Mock zu Pro"-Block. Aktuell existieren mehrere Score-Wahrheiten:
- `scout_scores` = kanonischer Elo-/Können-Score.
- `user_stats` = parallele Aktivitäts-Kopie mit ähnlichen Namen, anderer Formel.
- `airdrop_scores` = dritte Aggregat-Welt.
- Club-Fan-Board gebaut, aber nicht gemountet.
- Monatsliga RPC payoutfähig, aber dormant.

Zielbild:
- Welt 1: `scout_scores` als Können-SSOT. `user_stats` nur noch Cache/Counts oder Score-Spalten retire/ableiten.
- Welt 2: `fan_rankings` sichtbar und wirksam; Club-Fan-Board mounten.
- Quer: `airdrop_scores` klar als Airdrop-/Marketing-Achse deklarieren oder ableiten.

Betroffene Komponenten:
- DB: `scout_scores`, `score_history`, `user_stats`, `airdrop_scores`, `fan_rankings`, `monthly_liga_winners`, `rang_thresholds`.
- RPCs/Triggers: `award_dimension_score`, `refresh_user_stats`, `refresh_airdrop_score`, `close_monthly_liga`, `getClubFanLeaderboard`, `getMonthlyLeaderboard`, `get_scout_leaderboard_overall`.
- Services: `scoutScores.ts`, `gamification.ts`, `homeDashboard.ts`, `social.ts`, `search.ts`, `fanRanking.ts`, `airdropScore.ts`.
- Queries: `src/lib/queries/gamification.ts`, `fanRanking.ts`, `airdrop.ts`, `homeDashboard.ts`.
- UI: `/rankings` (`GlobalLeaderboard`, `FriendsLeaderboard`, `ClubLeaderboard`, `MonthlyWinners`), profile (`ManagerTab`, `AnalystTab`, `FollowListModal`), home widgets, search, scouting board, club detail Mehr-Tab/Fan-Rang area.
- Tests: service tests for leaderboard/search/home/social, rankings component tests.

Empfohlene Slices:
1. Detail-Kartierung sichern: alle `user_stats` score-reader + `scout_scores` reader + `airdrop_scores` reader mit Pfad/Surface.
2. Club-Fan-Treue-Board mounten (kleiner sichtbarer Gewinn, W2-B schließen).
3. `user_stats` Score-Reader Welle 1 auf `scout_scores`/Helper umstellen (read-only surfaces).
4. `user_stats` Score-Reader Welle 2 mutation-/profile-nahe Flächen.
5. Monatsliga-Entscheidung: aktivieren, parken oder UI entfernen. Wenn aktiv: Minting/CEO-Scope.
6. `airdrop_scores` Entscheidung: behalten als Marketing-Achse oder ableiten.

### Phase E — Dormant-Feature-Hygiene (M/L, mehrere Slices)

Warum:
D80-Regel: aktivieren ODER löschen, kein Halbfertiges.

Bekannte Kandidaten:
- Research / Paywalls: aktiv? Discovery-Anker stehen, aber prüfen ob monetär/UX vollständig.
- 2 Voting-Systeme: `club_votes` vs `community_polls` sauber trennen oder konsolidieren.
- Creator-Fund / Ad-Revenue-Share: 0€-Writepath, Sponsor/Revenue-Reste.
- Monthly-Liga: payoutfähig, kein Cron.
- Wildcard: Ledger korrekt, aber Earn-Quellen dormant.
- Bezahlte Mystery Box: lizenz-gated, nicht sichtbar/aktivieren.
- Club-Missionen: Infra mit `club_id`, 0 Seeds.
- `referral_reward`: Typ existiert, kein Auszahl-RPC.

Betroffene Komponenten nach Feature:
- Research: `research_posts`, `src/lib/services/scouting.ts`, `AnalystTab`, community feed/cards, paywall UI.
- Votes/Polls: `AdminVotesTab`, `club_votes`, `community_polls`, `CommunityPollCard`, `CreatePollModal`.
- Creator/Sponsor: `AdminSponsorsTab`, sponsor/banner components, revenue docs/RPCs.
- Monthly Liga: `close_monthly_liga`, `MonthlyWinners`, `/rankings`, cron/GHA.
- Wildcard/Mystery: `wildcards` service/query, event lineup UI, mystery box components/RPCs.
- Missions: `mission_definitions`, mission services/UI, club admin seeds.

Method:
- Pro Feature 1 RED/GREEN Removal- oder Activation-Slice.
- Vor Delete: imports, DB refs, i18n, tests, tooling allowlists, prod rows prüfen.

### Phase F — Bridge-/Boundary-Abbau (M/L, laufend)

Warum:
46 Bridge-Importer sind stabilisiert, aber noch nicht reduziert. Das ist weiterhin Mock-Erblast.

Ziel:
- Komponenten lesen über Query-Facades/Domain-Services, nicht direkt Bridge-Shims oder `supabaseClient`.
- Boundary-Ratchet darf nicht nur „nicht wachsen", sondern soll sinken.

Betroffene Komponenten:
- Bridge-Shims unter `src/lib/services/*` (Fantasy-Bridges laut boundary baseline).
- Direct-supabase-Komponenten: z.B. historisch `PlayerRankings`, `FollowListModal` und Admin-Ausnahmen prüfen.
- Query layer: `src/lib/queries/*`, Feature-query modules.
- Tooling: `scripts/boundary-check.ts`, `.boundary-baseline.json`.

Empfohlene Slices:
1. Bridge-Baseline nach aktuellem Stand lesen.
2. 5–10 einfache Importer pro Welle auf kanonische Facade umstellen.
3. Baseline senken (`--update`) nur nach grünem Proof.
4. Direct-supabase non-owner surfaces in Query-Facade migrieren.

### Phase G — String→UUID Rest: `players.club` (L, blockiert)

Warum:
Letzter großer String→UUID-Rest. Wichtig für professionelle Datenqualität.

Blocker:
- API-Football-Key gesperrt; `club_id` known-stale für Cross-Club-Spieler; braucht Reconcile.

Betroffene Komponenten:
- DB: `players.club`, `players.club_id`, `clubs`, league/club mapping.
- Services: `players.ts`, `club.ts`, market/player queries, imports/sync scripts.
- UI: Market filters, player detail, admin player import/edit, club pages.
- Scripts/Cron: sync players daily, transfermarkt/API-football sync, backfills.
- Tests: players service, market, club pages.

Methode:
- D82 DROP-Sequenz: Reader umstellen → Review → Deploy/Network-Gate → DROP → post-DROP verify.

### Phase H — Page Contract / Demo-Polish (M, nach Struktur)

Warum:
„Pro" ist nicht nur intern sauber; Demo-Pfade müssen sich fertig anfühlen.

Pfad-Reihenfolge:
1. Home/Welcome/Login/Onboarding
2. Clubs discovery + club detail
3. Market + player detail + buy flow
4. Fantasy event flow
5. Community/Polls/Research/Bounties
6. Club Admin dashboard (Treasury, Polls, Fans, Events, Bounties, Players)
7. Rankings/Profile/Inventory

Pro Page Contract:
- Primary job
- gates/auth roles
- data sources
- mutations
- loading/empty/error/mobile
- source-of-truth owner
- bridges/debt
- tests/e2e
- status GREEN/YELLOW/RED

Betroffene Components breit:
- `src/app/(app)/**/page.tsx`
- `src/components/**`
- `src/features/**`
- E2E specs under `e2e/`

## 4. Gesamt-Restweg — ehrliche Schätzung

Skala: „Pro ohne offensichtliche Reste" = keine bekannten P0/P1 Mock-/Bridge-/Dormant-Probleme auf Demo-/Money-Pfaden; nicht „jede Zukunftsidee gebaut".

| Bereich | Fortschritt | Rest |
|---|---:|---|
| Money/Treasury-Kern | 80–85 % | kleine REIN/Quelle-Reste, Deposit/Cashout später legal-gegated |
| Polls-Geldmaschine | 80–90 % | exklusive Treue-Polls + Early-Access, UI surfacing |
| Fan-Reward aktuelle Phase | 90 % | `csf_multiplier`-Debt, docs refresh; Airdrop später bewusst out-of-scope |
| S7 Source-of-Truth | 60–70 % | Leaderboards, dormant features, bridges, players.club |
| Knowledge/Plan-Kohärenz | 75–85 % | einzelne stale domain docs, alte docs markiert/archivieren |
| Demo/Page-Finish | 65–75 % | Page contracts + focused polish after structural cleanup |

**Gesamtgefühl:** ca. **70 % des Weges** vom Mock-Gefühl zum professionellen Kern sind geschafft. Die schwerste Money-Basis ist gebaut. Die verbleibenden 30 % sind weniger „neue große Vision", mehr konsequentes Abräumen:

- 1 kleiner Debt-Slice (`csf_multiplier`)
- 1–2 Polls-Perk-Slices
- 4–6 Leaderboard/Score-Konsolidierungs-Slices
- 4–8 Dormant-Feature-Entscheidungs-/Removal-/Activation-Slices
- 4–6 Bridge-Wellen
- 1 großer `players.club`-L-Slice sobald API-Key frei
- 5–8 Page-Contract/Polish-Slices für Demo-Finish

Realistisch: **15–25 saubere SHIP-Slices** bis „Pro-Stand ohne bekannte große Reste". Weniger, wenn wir aggressive löschen/parken; mehr, wenn wir alle Dormant-Features aktivieren statt entfernen.

## 5. Empfohlene Reihenfolge ab jetzt

1. **Docs/Plan-Hygiene schließen** (dieser Note + active/TODO/Masterplan synchron).
2. **`csf_multiplier` raus** — kleiner symbolischer und architektonischer Closure-Slice.
3. **Polls-Rest wählen**: exklusive Treue-Polls oder Abo-Early-Access.
4. **Leaderboard-Konsolidierung Detailkarte** — keine weitere Feature-Arbeit bis die größte Score-Redundanz entschärft ist.
5. **Club-Fan-Board mounten** — sichtbarer Pro-Gewinn, nutzt vorhandene Mechanik.
6. **Dormant-Hygiene Batch 1** — Monthly-Liga/Wildcard/Missions/Research priorisieren.
7. **Bridge-Reduktion Welle 1** — Baseline aktiv senken.
8. **Page-Contract-Audit Demo-Pfad** — erst nach den wichtigsten Source-of-Truth-Fixes.
9. **`players.club`** sobald API-Key freigeschaltet.

## 6. Entscheidungspunkte für Anil

1. Nach dieser Hygiene: zuerst **csf_multiplier raus** oder **Polls-Rest**?
2. Bei Dormant-Features: eher **hart löschen/parken** oder **aktivieren**, wenn sie produktstrategisch passen?
3. Monatsliga: aktivieren trotz Minting, oder bis Token/Legal/Season-Konzept parken?
4. Research: Kernprodukt (Scout-Wissen-Markt) jetzt polieren oder später?
5. Page-Contract: nach S7-Score/Bridge zuerst Demo-Pfad auf „wow" bringen oder weiter intern aufräumen?

## 7. No-go / nicht wieder aufmachen ohne neue Entscheidung

- FRE-4 Airdrop jetzt bauen — nein, echte-Coin-Phase.
- Polls-P4 Teilnehmer-Auszahlung/Lotterie — verworfen wegen Glücksspiel-Risiko.
- Payment/Cashout/Coin — Legal/CASP-gated.
- Growth/1000-User-Ziel — nicht Sommer-Tech-Ziel laut D80.
- `players.club` ohne API-Key-Reconcile droppen.
