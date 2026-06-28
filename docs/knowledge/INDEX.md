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
- [Vision & Strategie (WAS/WARUM/WOHIN)](domain/vision.md) — consult_when: Vision, Langfrist-Richtung, strategisches Framing, Differenzierung vs FPL/Socios/Sorare, Asset-Klasse-Positionierung, Kategorie-Innovation, Bitcoin/Meme-Coin-Analogie, Timing-These, Zielmarkt
- [Feature-Dependencies](domain/feature-dependencies.md) — consult_when: wie hängen Features zusammen, Abhängigkeiten vor neuem Feature, Feature-Kopplung
- [Cross-Domain-Map](domain/cross-domain-map.md) — consult_when: Cross-Domain-Impact, welche Domain berührt welche, Fee-Splits-Überblick, Domain-Kopplung
- [Missions-Architektur](domain/missions.md) — consult_when: Missions, Tagesziele, Mission-Engine, Reward-Trigger, club-vs-global Missionen
- [Equipment-Realtime-Architektur](domain/equipment-realtime.md) — consult_when: Equipment, Mystery-Box, Scoring-Boost, Chips, Equipment-Realtime, Live-Sync
- [3-Hub-Architektur](domain/architecture-3hub.md) — consult_when: App-Struktur, Hub-Navigation, Manager/Fantasy/Trading-Hubs, Inventory/Profile/Home
- [BeScout-Liga-Konzept](domain/bescout-liga.md) — consult_when: Liga, Rankings-Hub, Liga-weiter Wettbewerb (DEFERRED-Konzept, überlappt Reward-Ranking)

## 🔵 decisions — warum (ADRs)

- [Decisions-Log D1–D117](../../memory/decisions.md) — consult_when: warum-Entscheidung, ADR-Historie, Scope/Architektur/Prozess-Begründung, „warum nicht anders". **Jüngste Decisions (Kurzform; voller Text + Alternativen in `decisions.md`):**
  - **D117** Anti-Akkretion Signal-Bein: `audit:dup` Register-Ratchet (§0-Detektor maschinell — Geheilt-Regression code+db, Discovery `format`/`calc`-Synonym-Twins, WARN-first→BLOCK); Baseline = `dup-registry`-Block in `disease-register.md` (kein zweites File); Dogfood-Fund D-33 (`timeAgo`/`formatTimeAgo`). Slice 434.
  - **D116** Elite-Workflow-Reset (Anti-Akkretion): Schnitt-Regel (kein ungetrackter 2. Weg = unfertig) + 4 §0-Prinzipien + SSOT pro Ebene (auch Pläne: `MASTERPLAN`=1 Plan) + Operating-Agreement; Audit `wf_82fc04e4-733`; Slices 431/432/433; Register `worklog/notes/disease-register.md`.
  - **D115** Gameweek-Lifecycle = Per-Liga (GW-Fork 427-429): `leagues.active_gameweek`=SSOT (`clubs.active_gameweek` frozen→428b DROP via Expand/Contract), Status-Views liga-gefiltert `1..max_gameweeks` (427), `set_active_gameweek` leagues-only+Guard>max (428), `finalizeGameweek` entkoppelt „Score≠Advance" (429); Recon `worklog/notes/gameweek-engine-recon.md`.
  - **D114** Synergie-Mechanik (Gleicher-Verein +5 %/≥2-Verein, money-wirksam in `score_event`) BEHALTEN + Client-Vorschau exakt an Server angleichen (424); Alt „ganz entfernen" verworfen.
  - **D113** Spieler-Score fixture-gebunden (Sorare-Pro): `player_gameweek_scores` `UNIQUE(player_id,fixture_id)` + denorm `league_id` statt GW-Nummer; `score_event` liga-bewusst (`COALESCE`, SUM); 1401 Mock-Orphans gelöscht; 419/419b, errors-db S419.
  - **D112** Trading = Orderbuch (CLOB, 6 %) UND P2P-Offers (3 %) beide behalten + getrennt härten (Welle-1.4 Fork B); Sub-Plan 1.4a-d; Anker `worklog/notes/406b-orderbook-offers-map.md`.
  - **D111** Beta ABGEBROCHEN → Mock→Pro-Programm (ganze Codebase auf Profi-/Sorare-Niveau, Domäne für Domäne; 7-Wellen-Plan; 3 Grund-Ursachen Teil-Konsolidierung/Datenmodell-Integrität/Client-only); supersedes project_beta_live; `mock2pro-audit.md` + `mock2pro-plan.md`.
  - **D110** e2e-Durchsetzungs-Audit (PROCESS) — Trackern NICHT glauben, parallele Verifikations-Agents gegen Live-DB+Code, jede Behauptung mit Evidenz.
  - **D109** Monats-Liga-Reward — Rang-Top-3 + `overall`-Mehrkampf bewusst beibehalten (kein Mindest-Delta-Gate, CEO); analyst-Negativ = Mock-Artefakt → Launch-Reset.
  - **D108** User-Events Geld-Modell B — Pot aus Eintritten (−5 % BeScout→Topf), Ersteller verdient nichts (Modell C verworfen = Glücksspiel-Nähe), min_entries→Refund, admin-Erstell-Gebühr; E-4a-Kern Slice 396.
  - **D107** Event-Bedingungen — zwei Töpfe: Eintritts-Türsteher (feste Spalten in `rpc_lock_event_entry`) · Aufstellungs-Regel (JSONB `lineup_rules` in `rpc_save_lineup`); Anker event-creator-liga-epic.md §3b/E-3.
  - **D106** BeScout-Saison pro Liga — echte Rewards mit admin-anpassbarem Preispool; E-2a Anzeige → E-2b per-Liga-Payout; scout_scores NICHT pro Liga.
  - **D105** Begriffs-Trennung — „Liga"=nur Fußball-Liga; Nutzer-Wettbewerb=„BeScout-Saison"; 3 Achsen (Liga-Bindung/Wertungs-Stärke/Creator-Typ); präzisiert D104.
  - **D104** Event-Modell — „Creator"=Oberbegriff (BeScout/Verein/User/Sponsor, zahlt Pot+verdient, BeScout-Anteil), Liga-Events liga-gebunden + Wertung pro Liga UND global; Roadmap `worklog/notes/event-creator-liga-epic.md`.
  - **D103** Cold-Start-Liquidität RAUS-Kanäle = Genesis-Seed + harter Deckungs-Check + manueller Trigger; kein Fallback-Mint pro Auszahlung.
  - **D102** DPC-Mastery entfernt — Dormant-Mock (XP-Cron=Vanity); UI raus, Engine+Tabelle reversibel erhalten.
  - **D101** Markteintritt — erster IPO = eingefrorener Eintritt (`ipo_price`, set-once), spätere IPOs = aktueller IPO-Preis; präzisiert D100.
  - **D100** Scout-Card-Wertmodell — 4 getrennte Zahlen, `ipo_price`=Vereins-Eintrittspreis (MV-entkoppelt, nie auto-sync), Floor=transparentes Orderbuch; supersedes D99 Pkt 4.
  - **D99** $SCOUT-Phasenmodell — Pilot/Beta = wertloses Spielgeld ohne €-Wert, Coin-Wert erst ICO, Early-Adopter-Bonus diskretionär.
  - **D97/D98** Topf-Saldo = SUM-on-read (Variante A) · Fee-Auffang = voller Auffang 100 % (kein Teil-Burn/Cap).
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

- [Go-To-Market & Markt-These](research/gtm-strategy.md) — consult_when: GTM, Launch-Plan/Funnel, Zielgruppe Dream-Scout, Demand-Pools, Personas (Maria/Ömer/Yusuf/Lisa/Klaus), FM-Community-Beachhead, Club-Targeting (Bundesliga/Süper-Lig/EU-Top-5 Plan A-D), ARR-Benchmarks, Exit-Szenarien, Pitch-Struktur
- [Wettbewerber-Matrix](../../wiki/vergleich-competitors.md) — consult_when: Wettbewerb, Positionierung, Markt-Vergleich (Detail: comunio/kickbase/sorare/socios-chiliz/fancraze/hattrick/onefootball in `wiki/`)
- [Early-Adopter-Feedback](../../wiki/early-feedback-freundeskreis.md) — consult_when: Demand-Signal, Freundeskreis-Validierung, Zielgruppen-Reaktion
- [Agent-Systems Best-Practices](../../memory/research-agent-systems-best-practices.md) — consult_when: Multi-Agent-Architektur, Orchestrierung, Agent-Design
- [Claude-Code Elite-Setup (Distillat)](research/claude-code-setup.md) — consult_when: Claude-Code-Fähigkeiten, Setup-Prinzipien, Karpathy-Minimalismus (D84)
- [Rollback-Runbook](../../memory/beta-rollback-runbook.md) — consult_when: Vercel-Rollback, Deploy-Notfall, Pipeline-Wiederherstellung
- [Sentry-Alerts-Runbook](../../memory/beta-sentry-alerts-runbook.md) — consult_when: Sentry-Alert-Rules, Error-Monitoring-Setup

---

## Pflege-Hinweis
Neues durable Wissen → Datei im richtigen Bucket (`docs/knowledge/<bucket>/`, Front-matter-Pflicht siehe `README.md`) + Zeile hier mit `consult_when`. `pnpm audit:knowledge` (Pre-Commit HARD / nightly SOFT) hält Index + Files konsistent.
