---
name: sign-off
description: Phase D Final-Pass vor 50-Tester-Launch. Verifiziert alle Phase-A/B/C Outputs, smoke-suite green, dashboards live, tester-onboarding-doc fertig. Output GO/NO-GO mit Begruendung.
---

# /sign-off — Phase D Tester-Ready Sign-Off

**Ziel:** Letzter Gate vor "50 Tester-Mails raus". GO/NO-GO mit harten Kriterien.

## Pre-Conditions (alle MUESSEN erfuellt sein)

### 1. Phase-A komplett
- `worklog/audits/<date>/MASTER.md` existiert
- 0 P0 Findings ungefixt
- <5 P1 Findings ungefixt

### 2. Phase-B Sweep komplett
- 21/21 Pages durch Sweep gelaufen
- Per-Page-Health-Score >= 40/50 fuer alle Pages
- Backlog (P2/P3) dokumentiert

### 3. Phase-C Persona-Walk gruen
- Persona M Score >= 7/10
- Persona K Score >= 8/10 (Casual ist kritischer fuer Beta)
- Persona T Score >= 8/10 (Compliance-Risiko)
- 0 Cross-Persona-P0

### 4. Infrastruktur
- bescout.net Auto-Deploy: green (vercel-cli list_deployments letzter = success)
- Beta-Smoke-Suite: green (gh issue list mit `smoke-fail` label = 0 open)
- Sentry: connected, EU-Endpoint (CSP-Headers korrekt)
- PostHog: connected, Funnel "Sign-Up → First-Buy" konfiguriert
- Test-Accounts: 50 angelegt + Credentials in `memory/beta-tester-list.md` (nicht committen!)

### 5. Tester-Onboarding-Doc
- `memory/beta-onboarding.md` existiert
- 1-Page Format: Was ist BeScout / Was sollst du testen / Wie meldest du Bugs
- DE + TR Versionen
- Zoom-Call-Slot fuer Anil eingeplant?

### 6. Beta-Blocker P0/P1
- 0 GitHub-Issues mit `beta-blocker` Label open

## Sign-Off-Workflow

```
1. PRE-CHECK (parallel)
   ├─ Read worklog/audits/<latest>/MASTER.md
   ├─ Read worklog/persona-reports/<latest>-summary.md
   ├─ vercel list_deployments → letzter status
   ├─ gh issue list -l beta-blocker
   ├─ pnpm run test:smoke (gegen bescout.net)
   └─ Sentry whoami + PostHog project-get

2. SCORE-AGGREGATION
   - Per-Page-Health-Average
   - Persona-Score-Average
   - Open-P0-Count
   - Open-P1-Count

3. DECISION-MATRIX
   | Kriterium | Schwelle | IST | Pass |
   |-----------|----------|-----|------|
   | Per-Page-Health-Avg | >=42/50 | X | ✅ |
   | Persona-Score-Avg | >=7.5/10 | X | ✅ |
   | Open-P0 | =0 | X | ✅ |
   | Open-P1 | <=3 | X | ✅ |
   | Smoke-Green | true | X | ✅ |
   | Sentry+PH connected | true | X | ✅ |
   | 50 Test-Accounts | true | X | ❓ |
   | Onboarding-Doc | true | X | ❓ |

4. VERDICT
   - Alle ✅ → GO
   - 1 ❓ → SOFT-NO-GO (Anil entscheidet)
   - 1 ❌ → HARD-NO-GO (fix first)
```

## Output

`worklog/sign-off/<date>-readiness.md`:

```markdown
# Sign-Off: 50-Tester-Launch — <date>

## Verdict: GO | SOFT-NO-GO | HARD-NO-GO

## Decision-Matrix
[Tabelle aus oben]

## Phase-Summaries
- Phase A: <link MASTER.md>
- Phase B: 21/21 Sweeps complete
- Phase C: <link persona-summary>

## Open Items (wenn SOFT-NO-GO)
[Liste mit Action + Owner + ETA]

## Tester-Launch-Plan (wenn GO)
- T-0: 50 Mails raus (Anil)
- T+1: erster Zoom-Call (Anil moderiert)
- T+3: Sentry+PostHog Tagesreview
- T+7: Erste Iteration auf Top-3-Findings

## Recommendation
[Anil's nachster Schritt: Mails raus / Fix-Cycle / Phase wiederholen]
```

## Aktion nach GO

1. Anil bekommt 1-Page-Sign-Off-Bericht
2. Anil entscheidet final (er ist CEO, wir sind CTO-Empfehlung)
3. Bei GO: 50 Mails raus + Sentry/PostHog-Dashboards offen halten
4. Bei NO-GO: Fix-Cycle, dann erneut /sign-off

## Aktion nach NO-GO

- HARD-NO-GO: Liste der Pflicht-Fixes, dann zurueck zu /sweep-page
- SOFT-NO-GO: Anil-Entscheidung — riskieren oder nochmal Cycle?

## Anti-Patterns

- **NICHT** /sign-off ohne Phase A+B+C komplett (sonst blind-flight)
- **NICHT** GO bei offenen P0 (immer HARD-NO-GO)
- **NICHT** Smoke-Suite gegen localhost (muss bescout.net sein)
- **NICHT** Sign-Off ohne Tester-Onboarding-Doc (Tester muessen wissen was sie tun)
