# BeScout — Wissens-Index

> **Die eine Routing-Tabelle: sagt WO durables Wissen liegt + WANN man es konsultiert.**
> Jede Zeile: `[Titel](pfad) — consult_when: <Auslöser>`. Bei Task-Start die passenden `consult_when` matchen → File laden.
> 4 Buckets: **domain** (wie funktioniert X) · **decisions** (warum) · **lessons** (Bug-Klassen/Anti-Patterns) · **research** (extern).
> **Pflege (workflow.md/DISTILL):** jedes neue durable Wissen → Zeile hier + `consult_when`. Kein verlorenes Wissen mehr.
> **Status (E0 Welle 2):** INDEX-first. Einige Pfade zeigen noch auf die Alt-Lage (`memory/`, `worklog/concepts/`, `wiki/`) — werden bei **W2b** (Gold-Migration) auf `docs/knowledge/...` aktualisiert. Löst `memory/cortex-index.md` ab (Ablösung final = **W2c**).
> v1 — 2026-06-17.

---

## 🟢 domain — wie funktioniert X

- [Treasury / Money-Reward-Modell](../../worklog/concepts/csf-club-treasury-model.md) — consult_when: Treasury, CSF, IPO/Erstverkauf, Escrow, Fan-Rewards, Geld-Flows, $SCOUT cents, Fee-Splits-Mechanik
- [Polls — REIN-Geldmaschine](../../worklog/concepts/polls-engagement-monetization-model.md) — consult_when: Polls, Umfragen, poll_revenue, Verein→Treasury vs User→Wallet, Follower-Tor, Discovery
- [Reward-/Ranking-Ökosystem](../../worklog/concepts/reward-ranking-ecosystem.md) — consult_when: Rewards-Strategie, Rankings, Welt1 (Können) vs Welt2 (Treue), Gamification-Landkarte
- [Scout Cards — Trading-Mechanik](../../wiki/scout-cards.md) — consult_when: Scout Card Trading, Floor, Liquidation, Order-Mechanik
- [Fantasy — Spieltag/Scoring](../../memory/features/fantasy.md) — consult_when: Spieltag, Lineup, Captain, Auto-Sub, Gameweek-Cycle, Scoring (+ Code-Regel `.claude/rules/fantasy.md`)
- [Equipment / Chips](../../wiki/equipment-system.md) — consult_when: Equipment, Mystery-Box, Scoring-Boost, Chips
- [Produkt-Überblick + Identität](../../wiki/bescout-overview.md) — consult_when: was ist BeScout, Value-Prop, Positionierung, kein-FPL-Klon (D59)
- [Produkt-Map (WAS)](../../memory/semantisch/produkt/bescout-product-map.md) — consult_when: Feature-Landschaft, was existiert, Produkt-Struktur
- [Vision & Strategie (WOHIN/WARUM)](../../memory/semantisch/produkt/bescout-vision.md) — consult_when: Vision, Langfrist-Richtung, strategisches Framing (+ mogul-mutationsplan = VERTRAULICH, 18-Monats-Fahrplan)
- [Feature-Dependencies](../../memory/semantisch/produkt/bescout-feature-dependencies.md) — consult_when: wie hängen Features zusammen, Abhängigkeiten vor neuem Feature
- [Cross-Domain-Map](../../memory/deps/cross-domain-map.md) — consult_when: Cross-Domain-Impact, welche Domain berührt welche
- [Missions-Architektur](../../memory/semantisch/projekt/missions-architecture.md) — consult_when: Missions, Tagesziele, Mission-Engine, Reward-Trigger
- [Equipment-Realtime-Architektur](../../memory/semantisch/projekt/equipment-realtime.md) — consult_when: Equipment-Realtime, Chip-Aktivierung, Live-Sync
- [3-Hub-Architektur](../../memory/semantisch/projekt/architecture-3hub.md) — consult_when: App-Struktur, Hub-Navigation, Manager/Fantasy/Trading-Hubs
- [BeScout-Liga-Konzept](../../memory/semantisch/projekt/bescout-liga.md) — consult_when: Liga, Rankings-Hub, Liga-weiter Wettbewerb (DEFERRED-Konzept, überlappt Reward-Ranking)

## 🔵 decisions — warum (ADRs)

- [Decisions-Log D1–D87](../../memory/decisions.md) — consult_when: warum-Entscheidung, ADR-Historie, Scope/Architektur/Prozess-Begründung, „warum nicht anders"
- [CEO/CTO-Approval-Matrix](../../memory/ceo-approval-matrix.md) — consult_when: wer entscheidet (Anil vs Claude), Approval-Scope, Money/Security-Gate
- [Business-Modell (Revenue/Fees/Pricing-Asset)](../../wiki/business-model.md) — consult_when: ipo_price=MV/100.000, 1 $SCOUT=1 cent, Fee-Splits, Pricing-Asset-Logik (MONEY-kritisch; Anker-Entscheidung = D83)
- [$SCOUT-Launch / Legal-Phasen](../../wiki/scout-launch-strategie.md) — consult_when: Founding Pass, Licensing-Phasen, CASP/MiCA-Roadmap, Token-Launch (vertraulich)
- [Notion Source-of-Truth-Split](../../memory/reference_notion_integration.md) — consult_when: wo lebt Wahrheit (git/Obsidian/Notion), Sync-Regeln (D4)

## 🟠 lessons — Bug-Klassen & Anti-Patterns

- [Silent-Fails (Cross-Cutting)](../../.claude/rules/common-errors.md) — consult_when: data liar, `.in()` >100, 1000-row-cap, error-swallow, Promise.allSettled, Discriminator-Cast
- [Worktree-Isolation-Escape](../../.claude/rules/common-errors.md) — consult_when: Worktree-Agent, relative vs absolute Pfade, Pre-Merge-Audit (§0)
- [Observability-Stack 3-Tier](../../memory/pattern_observability_stack.md) — consult_when: logSilentRejects, logSilentCatch, Silent-Fail-Audit (D41)
- [DB/RPC-Patterns](../../.claude/rules/errors-db.md) — consult_when: RPC-Design, NULL-COALESCE, Return-Shape-Cast, RLS, React-Query-Cache, DB-Migration (NIE `db push`, nur `apply_migration` — D38)
- [Infra/Deploy/Cron-Patterns](../../.claude/rules/errors-infra.md) — consult_when: Cron-Guard (API-vs-DB-Count), Deploy-Health, Hook-Shell-Bugs, Bundle-Budget
- [Community/Realtime-Regeln](../../.claude/rules/community.md) — consult_when: Supabase Realtime respektiert RLS (kein Client-Filter), Follow/Unfollow-Reconcile (D11)
- [Pattern: RLS Cross-User-Writes](../../memory/semantisch/pattern/rls-cross-user-writes.md) — consult_when: RLS-Policy für Writes auf fremde Rows, Admin-im-Namen-von
- [Pattern: Tier-based Config](../../memory/semantisch/pattern/tier-based-config.md) — consult_when: Tier/Stufen-Konfiguration, Paket-abhängige Limits
- [Pattern: Slot-Composition](../../memory/semantisch/pattern/slot-composition.md) — consult_when: Slot-/Komponenten-Komposition, flexible UI-Slots
- [Pattern: DB+i18n Schema-Extension](../../memory/semantisch/pattern/db-i18n-schema-extension.md) — consult_when: neue DB-Spalte mit i18n, Schema-Erweiterung mehrsprachig

## 🟣 research — externe Recherche & Markt

- [Wettbewerber-Matrix](../../wiki/vergleich-competitors.md) — consult_when: Wettbewerb, Positionierung, Markt-Vergleich (Detail: comunio/kickbase/sorare/socios-chiliz/fancraze/hattrick/onefootball in `wiki/`)
- [Early-Adopter-Feedback](../../wiki/early-feedback-freundeskreis.md) — consult_when: Demand-Signal, Freundeskreis-Validierung, Zielgruppen-Reaktion
- [Agent-Systems Best-Practices](../../memory/research-agent-systems-best-practices.md) — consult_when: Multi-Agent-Architektur, Orchestrierung, Agent-Design
- [Claude-Code Elite-Setup (Distillat)](../../worklog/concepts/setup-elite-upgrade.md) — consult_when: Claude-Code-Fähigkeiten, Setup-Prinzipien, Karpathy-Minimalismus (D84)
- [Rollback-Runbook](../../memory/beta-rollback-runbook.md) — consult_when: Vercel-Rollback, Deploy-Notfall, Pipeline-Wiederherstellung
- [Sentry-Alerts-Runbook](../../memory/beta-sentry-alerts-runbook.md) — consult_when: Sentry-Alert-Rules, Error-Monitoring-Setup

---

## Hinweis zur Migration (W2b/W2c)
Beim physischen Verschieben eines Gold-Files nach `docs/knowledge/<bucket>/`:
1. File mit Pflicht-Front-matter versehen (siehe `README.md`).
2. Pfad in der Zeile oben aktualisieren.
3. Inhalt auf Juni-Stand heben (Treasury/Polls/Slices 329-332 kennen).
4. Alt-Pfad: erst entfernen wenn keine `[[wikilink]]`/Referenz mehr zeigt (grep `src/ scripts/ messages/ .claude/ worklog/ memory/`).
