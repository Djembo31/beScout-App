---
name: CTO Tool Setup
description: Wie der CTO-Orchestrator (Claude) Sentry, Vercel, GitHub und Supabase nutzt. Patterns fuer jedes Tool, Test-Calls zur Verifikation, Quick-Reference.
type: reference
created: 2026-04-14
---

# CTO Tool Setup

Tooling fuer autonomen CTO-Orchestrator-Mode. Alle Tools sind LIVE und einsatzbereit.

## Sentry MCP Server (live)

**Setup:** Sentry MCP-Server registriert in Claude Code (User-Scope, alle Projekte).

```
URL:     https://mcp.sentry.dev/mcp/bescout/javascript-nextjs
Org:     bescout (ID: 4510881151713280)
Project: javascript-nextjs (ID: 4510881157218384, Platform: Next.js)
Auth:    OAuth completed 2026-04-14
```

**Re-Authentifizierung wenn noetig:**
```
/mcp  → Authenticate sentry
```

**Was ich damit kann (nach Restart der Session):**
- Letzte Issues + Frequency-Ranking pullen
- Event-Detail (Stack-Trace, User-Context, Breadcrumbs)
- Release-Tracking + Regression-Detection
- Triaging (Issue assignen, resolven)
- Performance-Daten (Transactions, Slow-RPCs)

**Test-Call bei Session-Start:**
"List the top 10 issues from the last 24h" — beweist Auth + Project-Scope.

---

## Vercel CLI (live)

**Setup:** `npx vercel` authentifiziert, Projekt gelinkt via `.vercel/project.json`.

```
Account:    kxdemirtas-7031
Team:       bescouts-projects (orgId: team_7mLWgW5L1cmFsTAdKHNNuoSq)
Project:    bescout-app     (projectId: prj_BdWkc1kN9tu7mrdqCkTy3jxeW0cX)
Production: https://www.bescout.net
Node:       24.x
```

**Patterns:**

```bash
# Letzten Deploy-Status
npx vercel ls --yes | head -10

# Logs vom letzten Deploy
npx vercel logs <deployment-url-or-id>

# Build-Logs eines spezifischen Deploys
npx vercel inspect <deployment-id> --logs

# Env-Vars listen (zum Audit)
npx vercel env ls

# Production-URL öffnen
npx vercel open
```

**Test-Call bei Session-Start:**
```bash
npx vercel ls --yes | head -3
```

**Wichtige Vercel-Projekte im Account:**
- `bescout-app` → www.bescout.net (Production)
- `be-scout-landing-xmqq` → pilot.bescout.net (Pilot Landing)
- `bescout_landing_test`, `be-scout-landing*` → Legacy/Test (alt, nicht anfassen)

---

## GitHub CLI (live)

**Setup:** `gh` authentifiziert.

```
Account:  Djembo31
Protocol: HTTPS
Scopes:   repo, workflow, read:org, gist
Token:    keyring-stored
```

**Patterns:**

```bash
# Aktuelle PRs
gh pr list

# PR-Details
gh pr view <number>

# PR-Checks-Status
gh pr checks <number>

# CI-Workflow-Run triggern
gh workflow run ci.yml

# Letzten Workflow-Run anschauen
gh run list --limit 5
gh run view <run-id> --log

# Issue erstellen (z.B. bug-tracker entries)
gh issue create --title "..." --body "..."

# Branch protection check
gh api repos/:owner/:repo/branches/main/protection
```

**Test-Call bei Session-Start:**
```bash
gh pr list --limit 3
```

---

## Supabase MCP (live, schon laenger)

**Setup:** Supabase MCP-Server via `npx -y supabase-mcp-server@latest` mit Access-Token.

```
Project ID: skzjfhvgccaeplydsunz
URL:        https://skzjfhvgccaeplydsunz.supabase.co
```

**Wichtige MCP Tools:**
- `mcp__supabase__execute_sql` — read-only SQL queries
- `mcp__supabase__apply_migration` — migrations (DDL ops)
- `mcp__supabase__list_migrations` — remote migration list
- `mcp__supabase__list_tables` — schema discovery
- `mcp__supabase__get_logs` — Postgres + API logs
- `mcp__supabase__get_advisors` — security + perf advisors

**Migration Drift Reminder:**
- Local: 61 migrations | Remote: 44 migrations
- **NIE** `supabase db push`
- **IMMER** `mcp__supabase__apply_migration` (siehe `reference_migration_workflow.md`)

---

## Playwright MCP (live)

**Setup:** `@playwright/mcp` mit isolated user-data-dir.

**Patterns:**
- `mcp__playwright__browser_navigate` → URL ansteuern
- `mcp__playwright__browser_take_screenshot` → vor-after Vergleich
- `mcp__playwright__browser_snapshot` → DOM-Snapshot fuer accessibility tree
- `mcp__playwright__browser_click` → User-Interaction simulieren

**Wichtig:** Playwright laeuft GEGEN bescout.net, NICHT localhost (siehe `feedback_no_local_qa.md`).

---

## Workflow-Patterns (Multi-Tool Combos)

### Pattern 1: Live-Bug-Diagnose (Sentry → Vercel → Supabase)
```
1. Sentry: "Issue X aufgepoppt — was war der Trigger?"
2. Vercel: "Welcher Deploy ist live? Function-Logs der letzten 1h?"
3. Supabase: "Welche RPC wurde aufgerufen, was war der Input?"
4. Fix lokal, test, deploy, monitor Sentry
```

### Pattern 2: Pre-Deploy Sicherheitscheck
```
1. GitHub: "PR-Checks gruen?"
2. Supabase Advisors: "Neue Security-Warnings?"
3. Vercel: "Build erfolgreich auf Preview?"
4. Wenn alles ✅ → Merge
```

### Pattern 3: Beta-User Onboarding-Verifikation
```
1. Playwright: Onboarding-Flow gegen bescout.net
2. Sentry: Errors waehrend Onboarding-Window?
3. Supabase: Profile-Row erfolgreich erstellt?
4. Vercel Function-Logs: Auth-Edge-Function ohne Errors?
```

---

## Troubleshooting

### Sentry MCP "Needs authentication" trotz vorheriger Auth
1. `claude mcp list | grep sentry` → Status check
2. Wenn weiter "Needs auth": `/mcp` → Authenticate sentry
3. Wenn auch das nicht hilft: Claude Code restart
4. Wenn dann immer noch: `claude mcp remove sentry -s user && claude mcp add --transport http --scope user sentry https://mcp.sentry.dev/mcp/bescout/javascript-nextjs`

### Vercel CLI fragt nach Login
- Token expired? `npx vercel login` → Browser
- Project unlinked? `npx vercel link --project bescout-app --yes`

### GitHub gh "authentication required"
- `gh auth status` → Status
- Wenn fehlt: `gh auth login` → GitHub.com → HTTPS → Browser

---

## Was NICHT eingerichtet wurde (CEO-Entscheidung 2026-04-14)

- ❌ Slack/Discord Webhooks (nicht noetig)
- ❌ Beta-User-Listen API (nicht noetig)
- 🟡 PostHog (existiert als MCP, OAuth pending — entscheiden ob noetig fuer Beta)
