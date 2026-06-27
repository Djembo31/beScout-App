# BeScout — Wissens-Index

> **Die eine Routing-Tabelle: sagt WO durables Wissen liegt + WANN man es konsultiert.**
> Jede Zeile: `[Titel](pfad) — consult_when: <Auslöser>`. Bei Task-Start die passenden `consult_when` matchen → File laden.
> 4 Buckets: **domain** (wie funktioniert X) · **decisions** (warum) · **lessons** (Bug-Klassen/Anti-Patterns) · **research** (extern).
> **Pflege (workflow.md/DISTILL):** jedes neue durable Wissen → Zeile hier + `consult_when`. Kein verlorenes Wissen mehr.
> **Status (E0 Welle 2c):** Gold-Files migriert + Routing-SSOT. `memory/cortex-index.md` abgelöst (→ `_archive`, alle Consumer hier repointet). ephemere memory-Files archiviert. v3 — 2026-06-17.

---

## 🟢 domain — wie funktioniert X

- [Treasury / Money-Reward-Modell](domain/treasury.md) — consult_when: Treasury, CSF, IPO/Erstverkauf, Escrow, Fan-Rewards, Geld-Flows, $SCOUT cents, Fee-Splits-Mechanik, Liquidation, Ledger
- [Polls — REIN-Geldmaschine](domain/polls.md) — consult_when: Polls, Umfragen, poll_revenue, Verein→Treasury vs User→Wallet, Follower-Tor, Discovery, Identitätsgrenze
- [Reward-/Ranking-Ökosystem](domain/reward-ranking.md) — consult_when: Rewards-Strategie, Rankings, Welt1 (Können) vs Welt2 (Treue), Gamification-Landkarte, Monatsliga, fan_rankings, scout_scores
- [Scout Cards — Trading-Mechanik](../../wiki/scout-cards.md) — consult_when: Scout Card Trading, Floor, Liquidation, Order-Mechanik
- [Fantasy — Spieltag/Scoring](domain/fantasy.md) — consult_when: Spieltag, Lineup, Captain, Auto-Sub, Gameweek-Cycle, Scoring, Fantasy-Flows (+ Code-Regel `.claude/rules/fantasy.md`)
- [Equipment / Chips](../../wiki/equipment-system.md) — consult_when: Equipment, Mystery-Box, Scoring-Boost, Chips
- [Produkt-Überblick + Identität](../../wiki/bescout-overview.md) — consult_when: was ist BeScout, Value-Prop, Positionierung, kein-FPL-Klon (D59)
- [Produkt-Map (WAS)](domain/product-map.md) — consult_when: Feature-Landschaft, was existiert, Produkt-Struktur, 3 Säulen, Zielgruppen
- [Vision & Strategie (WOHIN/WARUM)](domain/vision.md) — consult_when: Vision, Langfrist-Richtung, strategisches Framing, Differenzierung vs FPL/Socios
- [Feature-Dependencies](domain/feature-dependencies.md) — consult_when: wie hängen Features zusammen, Abhängigkeiten vor neuem Feature, Feature-Kopplung
- [Cross-Domain-Map](domain/cross-domain-map.md) — consult_when: Cross-Domain-Impact, welche Domain berührt welche, Fee-Splits-Überblick, Domain-Kopplung
- [Missions-Architektur](domain/missions.md) — consult_when: Missions, Tagesziele, Mission-Engine, Reward-Trigger, club-vs-global Missionen
- [Equipment-Realtime-Architektur](domain/equipment-realtime.md) — consult_when: Equipment, Mystery-Box, Scoring-Boost, Chips, Equipment-Realtime, Live-Sync
- [3-Hub-Architektur](domain/architecture-3hub.md) — consult_when: App-Struktur, Hub-Navigation, Manager/Fantasy/Trading-Hubs, Inventory/Profile/Home
- [BeScout-Liga-Konzept](domain/bescout-liga.md) — consult_when: Liga, Rankings-Hub, Liga-weiter Wettbewerb (DEFERRED-Konzept, überlappt Reward-Ranking)

## 🔵 decisions — warum (ADRs)

- [Decisions-Log D1–D113](../../memory/decisions.md) — consult_when: warum-Entscheidung, ADR-Historie, Scope/Architektur/Prozess-Begründung, „warum nicht anders" (**D113: Spieler-Score fixture-gebunden (Sorare-Pro) — `player_gameweek_scores` `UNIQUE(player_id,fixture_id)` + denorm `league_id` statt GW-Nummer (über alle 7 Ligen geteilt = mehrdeutig); Score = ein konkretes Spiel; `score_event` liga-bewusst (`COALESCE(events.league_id,clubs.league_id)`, SUM); 1401 herkunftslose Mock-Orphans GW32-35 gelöscht; Alt B Liga-gebunden / C Status-quo-Guards verworfen; Slice 419/419b, errors-db S419**) (**D112: Trading-Modell — Orderbuch (CLOB) UND P2P-Offers beide behalten + getrennt härten (Welle-1.4 Fork B); orders=lebender Markt 6 %, offers=P2P-Verhandlung 3 % ~0 Nutzung; Sub-Plan 1.4a Fee-Kohärenz [Money/CEO] / 1.4b UI-Klarheit / 1.4c offers-Robustheit / 1.4d Buy-Limit gated-doc; Alt A retire + C full-CLOB verworfen; Anker `worklog/notes/406b-orderbook-offers-map.md`**) (**D111: Beta ABGEBROCHEN → Mock→Pro-Programm — ganze Codebase auf Profi-/Sorare-Niveau, Domäne für Domäne; 7-Wellen-Plan; 3 Grund-Ursachen Teil-Konsolidierung/Datenmodell-Integrität/Client-only; Feature-Bau+Liga pausiert; supersedes project_beta_live; Befund `worklog/notes/mock2pro-audit.md` + Plan `mock2pro-plan.md`**) (D97: Topf-Saldo = SUM-on-read Variante A, Revisit B bei Skalierung · D98: Fee-Auffang = voller Auffang 100 %, kein Teil-Burn/Cap · D99: $SCOUT-Phasenmodell — Pilot/Beta = wertloses Spielgeld ohne €-Wert, Coin-Wert erst ICO, Early-Adopter-Bonus diskretionär · D100: Scout-Card-Wertmodell — 4 getrennte Zahlen, `ipo_price` = Vereins-Eintrittspreis (MV-entkoppelt, nie auto-sync), Floor = transparentes Orderbuch; supersedes D99 Pkt 4 · D101: Markteintritt-Modell — erster IPO = eingefrorener Eintritt (`ipo_price`, set-once-Trigger), spätere IPOs = aktueller IPO-Preis (live); Daten-Reparatur statt Spalten-Kollaps; präzisiert D100 · D102: DPC-Mastery-Feature entfernt — Dormant-Mock (täglicher XP-Cron = Vanity, kein echtes Engagement); UI raus, Engine+Tabelle reversibel erhalten · D103: Cold-Start-Liquidität der Topf-RAUS-Kanäle = Genesis-Seed (einmaliges sichtbares Minting in den Topf) + harter Deckungs-Check + manueller Trigger; kein Fallback-Mint pro Auszahlung, kein Hard-Gate-Stillstand · **D104: Event-Modell — „Creator" = Oberbegriff (BeScout/Verein/User/Sponsor, zahlt Pot + verdient Einnahmen, BeScout-Anteil), Liga-Events Liga-gebunden + Wertung pro Liga UND global, andere Events wählen Liga-Bindung frei; Zielbild-Roadmap `worklog/notes/event-creator-liga-epic.md`** · **D105: Begriffs-Trennung — „Liga" = nur Fußball-Liga; Nutzer-Wettbewerb = „BeScout-Saison" (heute fälschlich „Liga"/`is_liga_event`); jedes Event = 3 getrennte Achsen (Fußball-Liga-Bindung E-1 · Wertungs-Stärke E-2 · Creator-Typ); präzisiert D104** · **D106: BeScout-Saison Wertung pro Liga — echte Rewards mit ADMIN-anpassbarem Preispool (nicht hardcodiert), gestuft: E-2a Anzeige+Rename (kein Money) → E-2b per-Liga-Payout konfigurierbar; scout_scores ist NICHT pro Liga (Manager-Dim aus E-1 league-Events ableitbar, Trader/Analyst global)** · **D107: Event-Bedingungen — zwei Töpfe (Eintritts-Türsteher Follower/Fan-Rang/Abo = feste Spalten in `rpc_lock_event_entry` · Aufstellungs-Regel Alter/Nation/min-vom-Verein/MV/Position = JSONB `lineup_rules` Regel-Liste in `rpc_save_lineup`, Weg B statt Spalte-pro-Regel) + creator-zentrierter Builder; Anker event-creator-liga-epic.md §3b/E-3** · **D108: User-Events Geld-Modell (Modell B) — dynamischer Pot aus Eintritten (−5 % BeScout → Topf, Rest → Pot), optionaler Start-Pot aus Wallet, Ersteller verdient nichts (fee 5/0, Modell C „mitverdienen" verworfen = Glücksspiel-Nähe), min_entries→Absage+Refund, Auszahlung Ersteller-wählbar, Anti-Müll = admin-steuerbare Erstell-Gebühr; „Eintritt→Pot"-Settle ist heute nur halb gebaut = E-4a-Kern (Slice 396); Lock-on-join + Charge-at-settle** · **D109: Monats-Liga-Reward (Slice 402 erster echter Lauf) — Rang-basierte Top-3-Auszahlung + `overall`-Mehrkampf bewusst BEIBEHALTEN (kein Mindest-Delta-Gate, CEO Anil); analyst-Negativ-Payout = Mock-Artefakt (`season_start_analyst` uniform 500) → S7/Launch-Reset, KEIN Reward-Modell-Defekt** · **D110: e2e-Durchsetzungs-Audit (PROCESS) — „ist das Gebaute wirklich end-to-end?" NICHT Trackern glauben (driften), sondern parallele Verifikations-Agents gegen Live-DB+Code, jede Behauptung mit Evidenz; Klassen ERLEDIGT-stale/OFFEN-CODE/OFFEN-LIVE/TOTER-CODE/MOCK; vor Strang-Wechsel + Launch fahren**)
- [CEO/CTO-Approval-Matrix](../../memory/ceo-approval-matrix.md) — consult_when: wer entscheidet (Anil vs Claude), Approval-Scope, Money/Security-Gate
- [Business-Modell (Revenue/Fees/Pricing-Asset)](../../wiki/business-model.md) — consult_when: ipo_price=MV/1.000 Credits, Einheit Credits=cents/100, Fee-Splits, Pricing-Asset-Logik (MONEY-kritisch; Anker-Entscheidung = D83; Naming/Phasen/Einheit = D99)
- [$SCOUT-Launch / Legal-Phasen](../../wiki/scout-launch-strategie.md) — consult_when: Founding Pass, Licensing-Phasen, CASP/MiCA-Roadmap, Token-Launch (vertraulich)
- [Notion Source-of-Truth-Split](../../memory/reference_notion_integration.md) — consult_when: wo lebt Wahrheit (git/Obsidian/Notion), Sync-Regeln (D4)
- [Mogul-Mutationsplan (VERTRAULICH)](decisions/mogul-mutationsplan.md) — consult_when: persönlicher Founder-Fahrplan, strategischer Lebenskontext, Warum-jede-Session-zählt (Detail nur bei direkter Anil-Frage)

## 🟠 lessons — Bug-Klassen & Anti-Patterns

- [Silent-Fails (Cross-Cutting)](../../.claude/rules/common-errors.md) — consult_when: data liar, `.in()` >100, 1000-row-cap, error-swallow, Promise.allSettled, Discriminator-Cast
- [Worktree-Isolation-Escape](../../.claude/rules/common-errors.md) — consult_when: Worktree-Agent, relative vs absolute Pfade, Pre-Merge-Audit (§0)
- [Observability-Stack 3-Tier](../../memory/pattern_observability_stack.md) — consult_when: logSilentRejects, logSilentCatch, Silent-Fail-Audit (D41)
- [DB/RPC-Patterns](../../.claude/rules/errors-db.md) — consult_when: RPC-Design, NULL-COALESCE, Return-Shape-Cast, RLS, React-Query-Cache, DB-Migration (NIE `db push`, nur `apply_migration` — D38)
- [Infra/Deploy/Cron-Patterns](../../.claude/rules/errors-infra.md) — consult_when: Cron-Guard (API-vs-DB-Count), Deploy-Health, Hook-Shell-Bugs, Bundle-Budget
- [Community/Realtime-Regeln](../../.claude/rules/community.md) — consult_when: Supabase Realtime respektiert RLS (kein Client-Filter), Follow/Unfollow-Reconcile (D11)
- [Pattern: RLS Cross-User-Writes](lessons/rls-cross-user-writes.md) — consult_when: RLS-Policy für Writes auf fremde Rows, Admin-im-Namen-von, Cross-User-Write
- [Pattern: Tier-based Config](lessons/tier-based-config.md) — consult_when: Tier/Stufen-Konfiguration, Paket-abhängige Limits, tier-based config
- [Pattern: Slot-Composition](lessons/slot-composition.md) — consult_when: Slot-/Komponenten-Komposition, flexible UI-Slots
- [Pattern: DB+i18n Schema-Extension](lessons/db-i18n-schema-extension.md) — consult_when: neue DB-Spalte mit i18n, Schema-Erweiterung mehrsprachig, DB+i18n

## 🟣 research — externe Recherche & Markt

- [Wettbewerber-Matrix](../../wiki/vergleich-competitors.md) — consult_when: Wettbewerb, Positionierung, Markt-Vergleich (Detail: comunio/kickbase/sorare/socios-chiliz/fancraze/hattrick/onefootball in `wiki/`)
- [Early-Adopter-Feedback](../../wiki/early-feedback-freundeskreis.md) — consult_when: Demand-Signal, Freundeskreis-Validierung, Zielgruppen-Reaktion
- [Agent-Systems Best-Practices](../../memory/research-agent-systems-best-practices.md) — consult_when: Multi-Agent-Architektur, Orchestrierung, Agent-Design
- [Claude-Code Elite-Setup (Distillat)](research/claude-code-setup.md) — consult_when: Claude-Code-Fähigkeiten, Setup-Prinzipien, Karpathy-Minimalismus (D84)
- [Rollback-Runbook](../../memory/beta-rollback-runbook.md) — consult_when: Vercel-Rollback, Deploy-Notfall, Pipeline-Wiederherstellung
- [Sentry-Alerts-Runbook](../../memory/beta-sentry-alerts-runbook.md) — consult_when: Sentry-Alert-Rules, Error-Monitoring-Setup

---

## Pflege-Hinweis
Neues durable Wissen → Datei im richtigen Bucket (`docs/knowledge/<bucket>/`, Front-matter-Pflicht siehe `README.md`) + Zeile hier mit `consult_when`. `pnpm audit:knowledge` (Pre-Commit HARD / nightly SOFT) hält Index + Files konsistent.
