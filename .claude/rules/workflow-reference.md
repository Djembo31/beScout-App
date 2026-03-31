---
description: Workflow Reference — Agent Tables, API Endpoints, Skills, Dispatch Details (on-demand)
globs: "memory/session-handoff.md"
---

## Paperclip Agent-Team

| Agent | Model | Rolle |
|-------|-------|-------|
| CEO | Opus 4.6 | Strategie, Delegation |
| SeniorEngineer | Sonnet 4.6 | Backend, DB, RPCs |
| FrontendEngineer | Sonnet 4.6 | UI, Components, i18n |
| QA | Sonnet 4.6 | Testing, Visual QA |
| BusinessAnalyst | Sonnet 4.6 | Compliance, Wording |
| CodexReviewer | gpt-5.4-mini | Adversarial Review |

Server: `npx paperclipai start` (localhost:3100).
Company ID: `cab471f1-96c2-403d-b0a7-1c5bf5db0b5d`.

### Agent IDs
- CEO: `35f1ae98-0117-41aa-8bfe-6ecb8afd6270`
- FrontendEngineer: `56e93bfc-3f91-43a4-a99f-ad7578029a4a`
- SeniorEngineer: `696e7864-5234-4466-982b-6c52c7d8cb3c`
- QA: `6792bfc9-855f-416f-b9f1-b5a0f8ef378a`
- BusinessAnalyst: `35626122-c3bb-49b1-a7fd-aa04d3641a80`
- CTO: `b9833192-2f62-420a-9cdd-a71bf5a10378` (paused)
- CodexReviewer: `fbfc77b0-6224-4f44-95e5-e9e482383091`

## Claude Code Sub-Agents (direkte Sessions)

| Agent | Skill | Isolation |
|-------|-------|-----------|
| frontend | beScout-frontend | worktree |
| backend | beScout-backend | worktree |
| business | beScout-business | read-only |
| reviewer | keiner | read-only |
| test-writer | keiner | worktree |
| qa-visual | keiner | read-only |
| healer | keiner | main |
| impact-analyst | keiner | read-only |

## Paperclip API

| Endpoint | Zweck |
|----------|-------|
| `GET /api/companies/{id}/dashboard` | Status-Check |
| `POST /api/companies/{id}/issues` | Issue erstellen |
| `POST /api/agents/{id}/heartbeat/invoke` | Agent triggern |
| `POST /api/approvals/{id}/approve` | Approval erteilen |
| `PATCH /api/issues/{id}` | Issue updaten |
| `PATCH /api/agents/{id}` | Agent Status aendern |

Issue-Fields: `title`, `body`/`description`, `status` (todo/in_progress/in_review/done), `priority` (low/medium/high/critical), `assigneeAgentId`.

## Skills

| Skill | Trigger |
|-------|---------|
| brainstorming | Neues Feature (Tier 4) |
| writing-plans | Nach Brainstorming |
| executing-plans | Nach Plan |
| finishing-branch | Nach allen Tasks |
| /impact | VOR DB/RPC/Service-Aenderungen |
| /fixing-accessibility | Nach UI-Aenderungen |
| /codex:rescue | 3x gescheiterter Fix |

## Task-Package Assembly (CTO Pflicht — VOR Agent-Dispatch Tier 3+)

1. Types LESEN + relevante Interfaces in Prompt KOPIEREN
2. Service-Signaturen LESEN + in Prompt KOPIEREN
3. Pattern-Beispiel aus aehnlichen Components
4. DB Column-Names aus common-errors.md
5. i18n Keys pruefen — fehlende VORHER anlegen
6. Acceptance Criteria (binaer ja/nein)

Agent bekommt ALLES — muss NICHTS selbst suchen.

## Wann Agent, wann selbst, wann Paperclip?

| Claude Code Sub-Agent | Selbst | Paperclip |
|---|---|---|
| Neue Datei (isoliert) | Quick Fix <2 Min | Routine Bug-Fixes |
| 10+ Files durchsuchen | Kontext-schwere Logik | Test-Suite Runs |
| Tests schreiben | Geld/Wallet/Security | Compliance Audits |
| Code Review | Brainstorming | Scheduled Reviews |

## Visual QA Regel (bei UI)

VOR jedem "sieht gut aus":
1. DB-Query: Spieler mit ALLEN Feldern
2. JEDEN sichtbaren Wert einzeln pruefen
3. Fehlende Daten EXPLIZIT benennen

## DB Feature Smoke Test (bei neuen Tabellen/RPCs)

1. Feature EINMAL ausfuehren (echte Aktion)
2. `SELECT COUNT(*) FROM neue_tabelle` → MUSS Rows haben
3. RLS Policies pruefen: `SELECT policyname, cmd FROM pg_policies`
4. "Was passiert mit bestehenden Daten?" IMMER fragen
