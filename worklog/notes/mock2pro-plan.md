# Mock→Pro — Finaler Plan (Domäne für Domäne)

> **Entstanden aus der 7-Domänen-Bestandsaufnahme** (`worklog/notes/mock2pro-audit.md`, 2026-06-26). Auftrag Anil: Beta abgebrochen, ganze Codebase auf Profi-/Sorare-Niveau glattziehen. **Priorisierung (Anil-Entscheid): Domäne für Domäne komplett** — jede Domäne in EINER Welle vollständig auf Pro-Niveau, einmal angefasst, dann fertig.
>
> **Drei Grund-Ursachen über alle Domänen** (jede Welle adressiert sie für ihre Domäne):
> 1. **Teil-Konsolidierung** („von allem zwei") → eine Quelle durchsetzen, alle Oberflächen reinziehen.
> 2. **Datenmodelle ohne erzwungene Integrität** → DB-erzwungene Bindung (Aufstellung, Scores).
> 3. **Client-only-Architektur** → Server-Rendering + Auth aus dem kritischen Pfad.
>
> **Querschnitt-Prinzip je Welle:** „eine Quelle pro Konzept, alle Oberflächen lesen sie." Money-Wellen (1/2/3): selbst bauen (§3), Live-`pg_get_functiondef` VOR Spec (D87), Zero-Sum-Beweis, Reviewer-Pflicht. Jede Welle = mehrere SHIP-Slices.

**Reihenfolge-Vorschlag (CTO, abhängigkeits-bewusst — korrigierbar):** Trading → Spieltag/Scoring → Events → Follow → Money/State → Performance → Design zuletzt (Design-Sweep nach allen Refactors, weil die UI vorher noch wandert).

---

## Welle 1 — Trading & Kaufprozess  [Money/CEO]
**Pro-Ziel:** EINE order-gebundene Kauf-Pipeline, „was du siehst = was abgebucht wird", ein Bid-System, eine Club-Geld-Wahrheit.
- **1.1 [CRITICAL] ✅ DONE (Slice 404, 2026-06-26; UI-Playwright post-Deploy offen):** Markt-Tab auf order-gebundene Pipeline konsolidiert — günstigste Fremd-Order via dem geteilten `useSellOrders` (gleiche Quelle wie Player-Detail), Preis+Menge daran gebunden, Kauf via `buy_from_order`; Listenpreis exkludiert eigene Orders (Liste==Modal==Kauf). Reviewer PASS. **Folge 405:** Player-Detail `usePlayerTrading`-onSuccess Shape-Norm (`new_balance ?? buyer_new_balance`) + BuyConfirmation.tsx est-total. *(Audit D1 CRIT ×2 + HIGH)*
- **1.2 [CRITICAL, Money] ✅ DONE (Slice 403, 2026-06-26):** `buy_from_ipo` `idempotency_key` ergänzt (Doppelkauf-Schutz, Spiegel buy_player_sc/buy_from_order) — RPC + Service + beide IPO-Buy-Hooks (Verkabelungs-Loch mitgeschlossen: liefen auf `useSafeMutation`). Reviewer PASS, force-rollback Zero-Sum=0/Replay bewiesen. Nebenbefund für 1.3: `clubs.treasury_balance_cents` bekommt nur den direkten +club_share (kein 2. Write via Trades-Trigger auf DIESE Spalte).
- **1.3 [HIGH, Money]** Club-Geld-Doppelschreibung auflösen: RPC-Direkt-`UPDATE clubs.treasury_balance_cents` vs Trigger-`book_club_treasury`; IPO-85%-Share läuft fälschlich durch „trade_fee"-Trigger. Erst verifizieren: reine Legacy-Drift vs echte Doppel-Zählung.
- **1.4 [HIGH, CEO-Architektur]** Bid-System klären: Limit-Buy-`orders` vs P2P-`offers` = EIN Orderbuch ODER mind. dieselbe Bid-Quelle für Player-Detail + Markt; „Best Bid" nach Preis sortiert (nicht created_at/limit 50).
- **1.5 [MEDIUM-Cluster]** Konsistenz: Rate-Limit vereinheitlichen (tier-basiert überall), „BSD"→„Credits" in Fehlertexten, fee_config-Lookup angleichen, Menge-zu-viel-Verhalten (still kappen vs ablehnen), `price_change_24h` in allen Kaufwegen, `idempotency_pending` in KNOWN_KEYS.
- **1.6 [MEDIUM]** Orderbuch Empty-State statt `return null`; Best-Ask/Spread eigene Orders excludieren.

## Welle 2 — Spieltag/Gameweek + Scoring  [Money/CEO, Datenmodell]
**Pro-Ziel:** Jeder Score hart an Karte×Fixture gebunden; Team-Identität über UUID.
- **2.1 [HIGH, Datenmodell]** `player_gameweek_scores` fixture-/liga-gebunden (Score ans konkrete Spiel statt nur GW-Nummer). Migrations-Pfad + Reader umstellen.
- **2.2 [HIGH, Money]** `score_event`: league-Filter im Minutes-Join (kein Cross-Liga-Summieren); Default-40-Phantom → 0/explizit „nicht gewertet".
- **2.3 [HIGH]** Heim/Auswärts (`getPlayerMatchTimeline`) + FDR (`ClubFixturesStrip`/`FDRBadge`) über Club-**UUID** statt Short-String/Majority-Vote.
- **2.4 [MEDIUM]** Per-Liga-GW-Max durchrouten (`getLeagueMaxGameweeks`→`SpieltagSelector`); toten `GameweekSelector` löschen; GW-Score-Map Dedup-Konflikt loggen.

## Welle 3 — Events & Fantasy-Aufstellung  [Money/CEO, Datenmodell]
**Pro-Ziel:** Karte exklusiv pro Wettbewerb gebunden, DB-erzwungen; Entry/Lineup entkoppelt.
- **3.1 [HIGH, Integrität]** Bank-Karten-Bindung: Bench in `holding_locks`-INSERT + Cross-Event-Available-Check (schließt das real offene „1 Karte in N Events"-Loch).
- **3.2 [HIGH, Architektur, CEO-Umfang]** Lineup-Datenmodell: Slot-Zeilen + DB-`UNIQUE(lineup_id, player_id)` statt 16 Spalten — ODER (kleiner) mind. DB-Constraint gegen Doppel-Spieler. Schrumpft den 25k-Validator.
- **3.3 [MEDIUM, CEO-UX]** Entry/Lineup entkoppeln (früh beitreten, bis Deadline editieren).
- **3.4 [MEDIUM]** `onJoin`-Fehler bricht Sequenz sauber ab (kein Doppel-Toast); LineupPanel Reinvest-CTA neutralisieren (Compliance).

## Welle 4 — Community & Follow
**Pro-Ziel:** Follow-Status auf ALLEN Ebenen am geteilten Cache.
- **4.1 [HIGH]** Discovery-Liste (`clubs/page.tsx`) in React Query heben + an `useToggleFollowClub.onSettled` hängen.
- **4.2 [HIGH]** `fanRanking`-Key in `onSettled` invalidieren (Follow=+5 sofort sichtbar; money-nah).
- **4.3 [MEDIUM/LOW]** Hero/StatsBar gemeinsamer Count; `isUserFollowingClub` wirft statt `false`-swallow.
- **4.4 [MEDIUM]** Event/Poll-Eintritt: Client-Vorab-Hinweis „erst folgen/Rang X" (Server-Gate bleibt Wahrheit).

## Welle 5 — Money-/Wallet-Anzeige & State-Freshness  [cross-cutting]
**Pro-Ziel:** Eine Geld-Formatierung, ein Freshness-Mechanismus, OffersTab nachgezogen.
- **5.1 [HIGH]** EIN kanonischer `formatBalance(cents)` (Header=Sidebar=Modal byte-identisch) + bewusste Präzisions-Policy.
- **5.2 [HIGH]** OffersTab-Heal (aus Domäne 6): Error-State + Retry, 5 rohe i18n-Keys auflösen, `preventClose` bei aktiver Mutation.
- **5.3 [MEDIUM]** Freshness-Self-Heal in `useIsBalanceFresh`/`useWallet` ziehen + Fetch-Fehler-Pfad (Retry statt Dauer-Hang).
- **5.4 [MEDIUM]** verstreute `cents/100` → `centsToBsd()`; Skeleton-Lücke HomeStoryHeader.

## Welle 6 — App-Shell & Performance
**Pro-Ziel:** Sofort sichtbare Hülle + progressiver Inhalt; Auth nicht im kritischen Pfad.
- **6.1 [CRITICAL, Architektur]** Above-the-fold server-rendern: Home + Player-Detail als RSC mit `prefetchQuery` + `HydrationBoundary` (LCP unabhängig vom Client-Fetch). Bundle-Arbeit unangetastet (ist gut).
- **6.2 [CRITICAL]** Auth aus dem kritischen Render-Pfad: ClubProvider unconditional mounten, Daten-Queries via `enabled:!!uid` selbst-gaten; Notfall-Timeouts (10–15s) entschärfen.
- **6.3 [HIGH]** Home-Query-Wasserfall reduzieren (`usePlayersByIds`-byIds server-seitig joinen; above/below-fold trennen).
- **6.4 [MEDIUM]** Clubs/Ligen (quasi-statisch) build-time/server statt Client-Roundtrip beim Mount.

## Welle 7 — Design-System & Konsistenz  [Sweep, zuletzt]
**Pro-Ziel:** Eine Quelle pro visuellem Baustein, alle Haupt-Flächen durchgezogen.
- **7.1 [HIGH]** Quelle angleichen: `Card`-Default ↔ DNA-Spec (2% vs 5%) bewusst entscheiden.
- **7.2 [HIGH]** Haupt-Flächen durch `Card`/`Button variant="gold"` ziehen (411 hand-Surfaces → Primitive; 12 kopierte Gold-Buttons inkl. Kauf-CTA vereinheitlichen).
- **7.3 [MEDIUM]** `vivid-green/red`-Token durchsetzen (506 Stellen); Position- vs Quality-Farb-Kollision auflösen; `yellow-*`→`status-doubtful`.
- **7.4 [LOW]** Number-Weight-Regel; restliche `bg-black/xx`-Innenkacheln → Surface-Token.

---

## Carry-over: bestehende offene TODOs (vollständig erfasst, 2026-06-26)
> Reconcile gegen TODO.md + s7-phase3-remaining.md + session-handoff.md, damit der Pivot keinen alten Punkt verliert.

**A) Überlappt mit einer Welle (wird dort miterledigt):**
- `scout_scores`↔`user_stats` Ranking-Konsolidierung → **Welle 2** (eine Ranking-Quelle).
- Monthly-Liga-Board (toter Code, 0 Consumer) → **Welle 2** (aktivieren/löschen mit Scoring/Ranking).
- Fan-Rang verzögert (kein Trigger auf Abo/Holdings, D92-Revisit) → **Welle 4**.
- `lineups.mutations.ts:62` Throw-Refactor (dynamischer Toast-Kontext) → **Welle 5**.
- OffersTab-Heal (Error-State + Key-Auflösung + preventClose) → **Welle 5 (5.2)**.
- Orderbuch-Empty-State → **Welle 1 (1.6) / 7**.

**B) S7-Aufräum-Block — toter Code + Konsolidierung (eigener Block nach/zwischen den Wellen; CEO pro Stück aktivieren-oder-löschen):**
- Wildcard-Earn-Economy (echter toter Schreib-Pfad) · Creator-Fund+Ad-Revenue (gebaut, nie ausgezahlt) · Club-Missionen *club-Dimension* (System lebt, club_id ungenutzt) · `club_votes`↔`community_polls` (2 Voting-Systeme) · Bridges (46) abbauen.

**C) Standalone-Backlog (klein, nicht verlieren):**
- 346-Review: Teaser-RPC oberes LIMIT-Cap (`LEAST(...,50)`) · `posts`-INSERT-Policy `club_admins`-Härtung (Security).
- TR-i18n Anil-Review (successFee, eventPrizeTreasuryInsufficient, bountyTreasuryInsufficient, bountyNotClubAdmin, Polls-`pollErr*`/`createPoll*`).
- 379b neutraler „aus dem Topf gedeckt"-Text (DE+TR).
- E0 Welle 4: Historie abspecken (`git filter-repo`, Backup) — LOW.

**D) Verifikations-Schuld (offene Playwright aus alten Slices — die Wellen-Flächen verifizieren das ohnehin neu):**
- 368e: RewardsTab „Dein Einstieg" == TradingTab „Markteintritt" == PriceChart · 368c AC7 Floor-Sublabel · E-1b Picker-Live-Walk (liga-gebundenes Event + Multi-Liga-Holdings) · 1× echter `bescout`/`special`-Event-Settle (377/378 real beweisen).

**E) Bewusst geparkt (Pivot: Feature-Bau pausiert):**
- Event-Backlog E-5 Ticket-Events / E-6 Creator-Sponsor-Flow / E-7-Rest · neue Event-/Treasury-Quellen (sponsor/creator-Mint, Deposit-Pfad) · Liga (auf Pause) · FRE-4 Airdrop (Coin-Phase, ADR-026).
- `players.club` String→UUID (⛔ API-Football-Key gesperrt — Anil-Action).

**F) Launch-Phase (nach Mock→Pro, bei Re-Launch-Prep — `project_launch_sequence_reset`):**
- `scout_scores.season_start_analyst` echter Start-Score-Reset (Mock uniform 500 → echte Werte) · Test-IPOs / kompletter Daten-Reset / Cold-Start-Liquidität · Monats-Liga-Reward-Delta-Revisit (D109, nach Reset).

**G) Geschlossen (kein offener Punkt):** D109 Reward-Smells (CEO-akzeptiert) · E-4-Wildcard-COALESCE-Vormerkung (in Slice 396 erledigt) · DPC-Mastery (375 entfernt).

## Arbeitsweise je Welle
SHIP-Loop pro Slice. Money-Wellen: §3 selbst, Live-functiondef vor Spec, force-rollback Zero-Sum-Smoke, Reviewer-Pflicht. Pro Welle: am Ende Live-Verify (Playwright gegen Deploy) dass die Domäne „eine Quelle, alle Oberflächen" erfüllt. Audit-Evidenz je Punkt: `mock2pro-audit.md`.
