# Beta-Exit-Kriterien (Go / Extend / Abort)

**Ziel:** Klare messbare Schwellen entscheiden Launch-Go-Live, nicht Bauchgefühl.
**Scope:** Invite-Only-Beta mit 10-20 Pilot-Fans, 7 Tage (Default) oder 14 Tage (Extended).

## 3 mögliche Ausgänge

| Ausgang | Bedingung | Action |
|---------|-----------|--------|
| **GO-LIVE** | Alle P0-Kriterien grün + ≥80% P1 grün | Public-Launch-Vorbereitung starten (mehr Invites, Marketing) |
| **EXTEND** (+7 Tage) | 1-2 P1 verfehlt, aber Trend positiv | Verlängerung, Pilot-Fans informieren, P1s priorisiert fixen |
| **ABORT** | Mindestens 1 P0 rot ODER ≥4 P1 rot | Back-to-dev, Launch-Datum verschieben, Root-Cause-Analyse |

**P0 = Launch-Blocker** (muss grün sein). **P1 = wichtig** (bevorzugt grün). **P2 = nice-to-have**.

---

## A. Technische Gesundheit

| # | Kriterium | Schwelle | Prio | Messen |
|---|-----------|---------:|:----:|--------|
| A1 | Sentry P0-Issues (unresolved) | 0 | P0 | `mcp__sentry__search_issues("isUnresolved:true level:error")` |
| A2 | Sentry-Error-Rate 7d | <1% der Sessions | P0 | Sentry-Dashboard → Session-Health |
| A3 | Post-Deploy-Smoke Fail-Rate | 0 (aller Deploys in Beta) | P0 | `gh run list --workflow="Post-Deploy Smoke" --status=completed` |
| A4 | `/market` LCP warm (Chrome-DevTools Median) | <2500ms | P1 | Chrome DevTools oder Sentry-Performance |
| A5 | 500er auf API-Routes | <0,1% aller Requests | P1 | Vercel-Deployment-Logs + Sentry |
| A6 | Silent-Fail-Audit HIGH-Findings | ≤ Baseline (188) | P1 | `pnpm run audit:silent-fail:check` |

## B. User-Engagement (SQL-basiert, kein PostHog nötig)

| # | Kriterium | Schwelle | Prio | SQL-Source |
|---|-----------|---------:|:----:|------------|
| B1 | Signup → First-Login Activation | ≥90% | P0 | `profiles` mit `handle` vs. `user_stats` mit `total_trades>0` |
| B2 | First-Trade Funnel (7d) | ≥60% der Fans | P1 | `transactions WHERE type='trade_buy'` COUNT DISTINCT user_id |
| B3 | D1-Retention (Login Day 1 → Day 2) | ≥50% | P1 | `auth.users.last_sign_in_at` per Cohort |
| B4 | D7-Retention | ≥30% | P1 | Cohort-Analyse gleiches Prinzip |
| B5 | Ø Sessions pro User / 7 Tage | ≥3 | P2 | Von Sentry-Session-Events oder Supabase-Auth-Logs |

## C. Feature-Usage (Hat die Plattform Leben?)

| # | Kriterium | Schwelle | Prio | SQL-Source |
|---|-----------|---------:|:----:|------------|
| C1 | ≥5 Fans haben Scout Card gekauft | 5+ | P0 | `trades WHERE buyer_id IS NOT NULL` COUNT DISTINCT |
| C2 | ≥3 Fantasy-Event-Entries | 3+ | P1 | `event_entries` COUNT in Beta-Timeframe |
| C3 | ≥5 Community-Posts (human) | 5+ | P1 | `posts WHERE user_id NOT IN bot-ids` in Beta-Timeframe |
| C4 | ≥50% Missions claimed | ≥50% der aktiven User | P2 | `user_daily_challenges WHERE claimed=true` |
| C5 | ≥1 Fan folgt mindestens 1 Club | ≥1 | P2 | `user_follows` COUNT |

## D. Money-Flow (Phase-1 kritisch)

| # | Kriterium | Schwelle | Prio | SQL-Source |
|---|-----------|---------:|:----:|------------|
| D1 | DB-Invariants alle grün | 36/36 PASS | P0 | `npx vitest run src/lib/__tests__/db-invariants.test.ts` |
| D2 | Wallet-Balance-Mismatches (wallet.balance ≠ sum(transactions)) | 0 | P0 | SQL-Invariant (INV-01 in db-invariants) |
| D3 | Holdings-Quantity-Zombies (qty=0 rows) | 0 | P0 | `holdings WHERE quantity=0` sollte 0 sein (INV-15) |
| D4 | Trading-Volume 7d | ≥10.000 $SCOUT (100.000 cents) | P1 | `SUM(transactions.amount) WHERE type LIKE 'trade_%'` |
| D5 | Fee-Distribution korrekt (3.5/1.5/1 split) | matches business.md | P1 | `fees` Tabelle sum-check |
| D6 | Kein `.catch(() => null)` in Money-Services | 0 neue | P1 | `pnpm run audit:silent-fail:check` |

## E. Compliance / Legal

| # | Kriterium | Schwelle | Prio | Source |
|---|-----------|---------:|:----:|--------|
| E1 | TR-Audit-Findings (audit-Rules) | ≤12 (aktueller Baseline) | P0 | `pnpm run audit:tr-strings` |
| E2 | Compliance-Audit grün | pass | P0 | `pnpm run audit:compliance` |
| E3 | TradingDisclaimer auf allen $SCOUT-Seiten sichtbar | 100% | P0 | Visual-Check + grep |
| E4 | FantasyDisclaimer auf Fantasy-Seiten | 100% | P1 | Visual-Check |
| E5 | Kein Cash-Out-Pfad aktiv (ADR-028 Phase 3) | 0 Pfade | P0 | grep `cashOut\|withdraw` in src/ |
| E6 | Kill-Switch funktioniert (BSD bei EUR 900K) | test pass | P1 | Manual-Test in Admin-UI |
| E7 | `Bug 2` Bots bleiben offline | 0 neue Bot-Posts | P0 | `SELECT COUNT FROM posts WHERE user_id IN (bot-ids)` = 0 |

## F. Support / Ops

| # | Kriterium | Schwelle | Prio | Source |
|---|-----------|---------:|:----:|--------|
| F1 | Bug-Reports beantwortet | <24h Response | P1 | Anil-Tracking, eigene Notiz |
| F2 | Kritische Bugs gefixt | <48h Fix | P1 | Anil-Tracking |
| F3 | Incident-Rollback getestet (vercel rollback) | test pass | P2 | Manuell einmal machen vor Beta-Start |
| F4 | Sentry-Alert-Rules aktiv | ≥3 Rules | P1 | Sentry-Dashboard |
| F5 | Session-Handoff-Doku aktuell | immer <24h alt | P2 | `memory/session-handoff.md` mtime |

## G. Business-Viability (weiches Signal)

| # | Kriterium | Schwelle | Prio | Source |
|---|-----------|---------:|:----:|--------|
| G1 | Qualitatives Fan-Feedback mehrheitlich positiv | ≥70% würden weiterempfehlen | P1 | Direct-Interview in Zoom-Call am Beta-Ende |
| G2 | ≥1 Pilot-Fan kauft Founding Pass | 1+ | P2 | `user_founding_passes` COUNT |
| G3 | NPS-Score (optional Mini-Umfrage) | ≥+20 | P2 | Post-Beta-Email mit 1-Frage-Umfrage |

---

## Daily-Check-Routine (während Beta-Phase)

**Jeden Morgen 5 Minuten:**

```bash
# Tech-Health
pnpm run audit:silent-fail:check                     # A6
pnpm run audit:compliance                            # E2
pnpm run audit:tr-strings                            # E1
gh run list --workflow="Post-Deploy Smoke" --limit 5 # A3
npx vitest run src/lib/__tests__/db-invariants.test.ts  # D1

# Sentry (MCP)
mcp__sentry__search_issues("isUnresolved:true level:error")  # A1

# User-Metrics (Supabase SQL — einen Query-Helper bauen):
# COUNT DISTINCT users mit Trade → Funnel B2
# COUNT Bot-Posts → sollte 0 sein (E7)
```

**Ergebnis in `memory/beta-daily-check-YYYY-MM-DD.md` loggen** (eine Zeile pro Check: `✅ A1 / ❌ B2 (45% statt 60%)`).

---

## Go/Extend/Abort-Entscheidung am Ende

**Am Tag 7 (oder Tag 14 bei EXTEND):**

1. Checkliste durchgehen, jedes Kriterium grün/rot markieren.
2. Zählen:
   - **P0 rot = 0 & P1 rot ≤ 20%** → **GO-LIVE**
   - **P0 grün & P1 rot 20-40%** → **EXTEND** (+7 Tage, fix P1s)
   - **P0 rot ≥ 1 ODER P1 rot >40%** → **ABORT**
3. Entscheidung in `worklog/log.md` dokumentieren mit Evidenz (welche Kriterien rot warum).
4. Nächste Schritte:
   - GO-LIVE: Invite-Liste erweitern auf 100+, Marketing starten
   - EXTEND: Pilot-Fans informieren + Fix-Sprint
   - ABORT: Launch-Datum verschieben, Root-Cause-Analyse

---

## Bekannte Gaps (vor Beta-Start angehen)

1. **PostHog-Instrumentation minimal** (nur 1 `track()`-Call in src/). Ohne bessere Event-Instrumentation → müssen Retention via Supabase-Queries rechnen (machbar aber umständlich). Sollte vor Beta: `login`, `first_trade`, `first_lineup`, `first_post` als PostHog-Events instrumentieren (1h Arbeit).
2. **Sentry-Alert-Rules nicht gesetzt** (A1 + A2 sind check-reactive). Rules für Error-Rate >1% / neue Issue → Slack-Webhook + Email wären ideal.
3. **Rollback-Runbook fehlt** (F3). Einmaliger Test: kleinen intentionalen Fehler deployen → `vercel rollback` üben → Zeit messen.

Post-Beta-Task-Backlog (falls Beta-GO-LIVE entschieden wird):
- KYC-Integration (Sumsub vs Veriff) — blockiert CASP-Phase 3 Cash-Out
- Bot-Templates bilingual — wenn man Bots wieder einschalten will
- Cost-Scaling-Plan (Free-Tier → Pro bei 100+ DAU)
