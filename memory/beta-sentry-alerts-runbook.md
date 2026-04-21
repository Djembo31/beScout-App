# Sentry-Alert-Rules Runbook (Beta-Launch)

**Zweck:** Vor Beta-Start 3 Alert-Rules in Sentry aktivieren, die bei Error-Spikes + P0-Patterns Slack/Email pingen. **Sentry-MCP ist read-only für Alert-Rules** → manuelle UI-Clicks nötig.

**Zeit:** ~20 Minuten für alle 3 Rules. Einmal einrichten, dann nur noch reagieren.

**Sentry-Org:** `bescout`  ·  **Project:** `4510881157218384`  ·  **URL:** https://bescout.sentry.io/alerts/rules/

---

## Vorbereitung (5 Min)

1. **Slack-Webhook holen** (wenn Slack genutzt):
   - Slack → Apps → "Incoming Webhooks" → neuen Channel `#bescout-beta-alerts` erstellen → Webhook-URL kopieren.
   - ODER: Discord-Webhook gleichwertig (Sentry supports both).
   - ODER: Nur Email — dann Sentry-User-Email verifizieren.

2. **Sentry-Team-Integration aktivieren** (wenn Slack):
   - https://bescout.sentry.io/settings/integrations/slack/ → „Install" → Channel wählen.
   - Ohne Slack-Integration: Skip, nutze Email-Notifications.

---

## Rule 1 — Error-Rate-Spike (A2 aus Exit-Criteria)

**Trigger:** Wenn Error-Rate in 5-Minuten-Fenster >1% aller Sessions erreicht.

**Click-Path:** https://bescout.sentry.io/alerts/new/metric/

1. „Create Alert" → **Metric Alert**.
2. Source-Dataset: **Errors**.
3. Query: `event.type:error`
4. Function: `percent_change() over 5m` — threshold: **>1%**.
5. Environment: `production`.
6. Actions:
   - Slack → `#bescout-beta-alerts` (wenn Integration aktiv).
   - Email → `kx.demirtas@gmail.com`.
7. Name: `Beta: Error-Rate >1% in 5min`
8. Speichern.

**Warum:** Plötzlicher Spike = regression. Muss sofort gechecked werden.

---

## Rule 2 — Neue Issue in Production (A1 aus Exit-Criteria)

**Trigger:** Sobald ein bisher unbekannter Error-Fingerprint zum ersten Mal in production auftritt.

**Click-Path:** https://bescout.sentry.io/alerts/new/issue/

1. „Create Alert" → **Issue Alert**.
2. When: **A new issue is created** in project `bescout-app`.
3. If:
   - Environment = `production`.
   - Level ≥ `error`.
4. Actions:
   - Slack → `#bescout-beta-alerts`.
   - Email → `kx.demirtas@gmail.com`.
5. Frequency: Notify me **once per issue** (nicht spammen).
6. Name: `Beta: New Production Issue`
7. Speichern.

**Warum:** Während Beta darf kein neuer Fingerprint unbemerkt reinkommen. Jeder neue Issue = potenziell Blocker.

---

## Rule 3 — P0-Pattern (Money-Path-Errors)

**Trigger:** Error in Money-critical Endpoints.

**Click-Path:** https://bescout.sentry.io/alerts/new/issue/

1. „Create Alert" → **Issue Alert**.
2. When: **An issue's state changes** OR **New issue created**.
3. If:
   - Environment = `production`.
   - `transaction` contains any of:
     - `buy_player`, `sell_player`, `create_offer`, `accept_offer`
     - `liquidate_player`, `setup_dpc`, `score_event`
     - `cron_*` (sync-players-daily, sync-fixtures, score-gameweek)
4. Actions:
   - Slack → `#bescout-beta-alerts` (@channel mention).
   - Email → `kx.demirtas@gmail.com`.
5. Name: `Beta: CRITICAL — Money/Cron Error`
6. Speichern.

**Warum:** Geld-Flows dürfen nicht silent failen. Das ist P0 — Pager-Niveau.

---

## Optional Rule 4 — Performance-Regression

**Trigger:** `/market` LCP >3500ms p75 in 1h.

**Click-Path:** https://bescout.sentry.io/alerts/new/metric/ → Source: **Transactions**.

1. Function: `p75(measurements.lcp)` over 1h.
2. Filter: `transaction:/market`.
3. Threshold: `>3500`.
4. Only Email (nicht Slack — Performance ist P1, kein Pager).

**Warum:** Erkennt Bundle-Bloat + Backend-Regression bevor User abspringen.

---

## Verification

Nach Setup — einmal testen:
1. **Error-Rate-Spike simulieren:** Kurz im Browser JavaScript-Error forcieren (z.B. via Sentry-Test-Page). Slack-Ping muss kommen innerhalb 5 Min.
2. **Alert-History prüfen:** https://bescout.sentry.io/alerts/ → sollte Rule 1 fired zeigen.
3. **Resolve-Test:** Issue in Sentry auf „Resolved" setzen. Kein Spam mehr.

---

## During Beta — Response-Plan

**Wenn Slack-Ping kommt:**

1. **<5 Min:** Issue in Sentry öffnen → `mcp__sentry__search_issues(<id>)` via Claude → verstehen was passiert.
2. **<15 Min:** Triage:
   - Betrifft Money/Auth/Core-Flow? → **STOP-Trading** (Admin-Panel Kill-Switch).
   - Nur Kosmetik? → In Notion-Kanban als „Post-Beta Fix" parken.
3. **<60 Min:** Bei echtem Bug → `mcp__sentry__analyze_issue_with_seer` → Root-Cause → Slice aufmachen → Fix deployen → Post-Deploy-Smoke grün.
4. **Nach Fix:** Pattern in `.claude/rules/common-errors.md` eintragen (Knowledge-Flywheel).

**Wenn Alert FP (false positive):**
- Sentry-Filter anpassen: Ignore dieses Pattern für 7 Tage.
- Alert-Rule verfeinern (Threshold anpassen).

---

## Nach Beta-Ende

Rules beibehalten — werden auch für Public-Launch gebraucht. Thresholds evtl. lockerern wenn DAU steigt (1% Error-Rate bei 100 DAU ≠ 1% bei 10.000 DAU).

---

## Troubleshooting

**Slack-Integration zeigt „not installed":**
- https://bescout.sentry.io/settings/integrations/ → Slack re-installieren.
- Permissions: `chat:write` auf Channel.

**Alert feuert nicht obwohl Error da ist:**
- Environment-Filter prüfen (evtl. Error war auf `preview` statt `production`).
- Rate-Limit prüfen (Sentry throttlet bei >100 Alerts/h).

**Zu viele False-Positives:**
- Level-Filter erhöhen (error → fatal only).
- Ignore-Pattern für bekannte Warnings (z.B. „Failed to fetch" von flaky 3rd-party-APIs).
