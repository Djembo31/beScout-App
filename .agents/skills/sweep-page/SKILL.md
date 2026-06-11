---
name: sweep-page
description: Phase B Fließband-Sweep einer EINZELNEN Page durch 6 Linsen parallel (Brand, UX, Domain, Compliance, Bugs, Code). Findings → sofort Fix via Healer-Agent. Use im Polish-Sweep nach Phase A.
---

# /sweep-page — Phase B Fließband

**Ziel:** Eine Page komplett tester-ready machen. Audit-Pipeline → Fix-Pipeline → Verify in EINEM Durchlauf.

## Aufruf

```
/sweep-page <page-slug>
```

Beispiel: `/sweep-page manager`, `/sweep-page market`, `/sweep-page fantasy`

## Phase B Pattern (pro Page)

```
1. AUDIT (alle 6 Linsen parallel)
   ├─ brand-coherence-auditor (auf Page)
   ├─ ux-coherence-auditor (auf Page)
   ├─ DOMAIN-EXPERT (fm-mechanics ODER fantasy-scoring je Page)
   ├─ /beScout-business (Compliance auf Page)
   ├─ /silent-fail-audit (Code-Hygiene auf Page-Files)
   └─ walkthrough-crawler (Bug-Detection auf Page)

   → worklog/sweeps/<date>-<page>.md (konsolidiert)

2. PRIORISIERUNG (Anil-Decision oder Auto)
   - P0 + P1 → fix
   - P2 → backlog
   - P3 → ignore

3. FIX (sequenziell, healer-Agent)
   ├─ Backend-Fixes (RPC/Service)
   ├─ Frontend-Fixes (Component/i18n)
   └─ Test-Updates wenn noetig

4. VERIFY
   ├─ tsc --noEmit
   ├─ vitest auf betroffene Tests
   ├─ Playwright-Screenshot gegen bescout.net (nach Vercel-Deploy)
   └─ qa-visual-Agent: 393px + 1280px Vergleich

5. LOG
   - worklog/log.md neuer Eintrag "## Sweep <page> | <date> | ..."
   - worklog/active.md: status: idle
```

## Domain-Expert pro Page

| Page | Domain-Agent |
|------|--------------|
| `/`, Home | fm-mechanics + fantasy-scoring (beide light) |
| `/manager` | fm-mechanics |
| `/market` | fm-mechanics |
| `/player/[id]` | fm-mechanics |
| `/transactions` | fm-mechanics |
| `/missions` | fm-mechanics |
| `/inventory` | fm-mechanics |
| `/fantasy` | fantasy-scoring |
| `/community` | fantasy-scoring (predictions) + ux-coherence |
| `/rankings` | fantasy-scoring |
| `/profile`, `/profile/settings` | ux-coherence (kein Domain) |
| `/clubs`, `/club/[slug]` | fm-mechanics + fantasy-scoring |
| `/founding`, `/airdrop` | fm-mechanics + impact-analyst (Money) |
| `/compare` | fm-mechanics |

## Briefing-Template

```
KONTEXT: Beta-Launch-Endspurt. Phase B Sweep auf <page>.
SCOPE: Audit + Fix + Verify in einem Durchlauf.
LINSEN: brand + ux + <domain> + compliance + silent-fail + bugs
DU ENTSCHEIDEST: Fix-Reihenfolge (P0 zuerst), Component-Struktur fuer Fixes
VERIFY: tsc clean + vitest gruen + Playwright-Screenshot vs Baseline
WICHTIG: Nutze AGENTS.md fuer Tokens. Pattern aus errors-*.md. Wording aus business.md.
```

## Fließband-Reihenfolge (Phase-B-Default)

Sortiert nach Tester-Impact:

```
Day 1: /, /manager, /market         (= 80% Tester-Verhalten)
Day 2: /fantasy, /community, /missions
Day 3: /transactions, /profile, /clubs, /club/[slug]
Day 4: /player/[id], /rankings, /compare, /inventory
Day 5: /founding, /airdrop, /profile/settings, /signup
```

## Output-Format

`worklog/sweeps/<date>-<page>.md`:

```markdown
# Sweep: <page> — <date>

## Pre-Sweep Health (aus Phase A)
- Brand: X/10
- UX: X/10
- Domain: X/10
- Compliance: X/10

## Audit-Findings (konsolidiert aus 6 Linsen)
| # | Linse | Severity | File:Line | Issue | Fix |
|---|-------|----------|-----------|-------|-----|
| 1 | Brand | P1 | ... | ... | ... |

## Fixes Angewendet
- Files: <git diff --stat>
- Commits: <hashes>

## Verify
- tsc: clean
- vitest: X/Y green
- Playwright: <screenshot-link>

## Post-Sweep Health
- Brand: 10/10
- UX: 9/10 (1 P2 backlog)
- ...

## Backlog (P2/P3 nicht in diesem Sweep gefixt)
[Liste fuer post-Beta]

## Status
✅ Tester-Ready / ⚠️ Mit Backlog / ❌ Blocked
```

## Wann fertig

Page ist "tester-ready" wenn:
- Brand: keine P0/P1 Drift
- UX: alle 4 States (Loading/Empty/Error/Modal-preventClose) abgedeckt
- Domain: keine P0 Mechanik-Luecke
- Compliance: 0 forbidden words
- Code: 0 silent-fails neue
- Crawler: 0 P0/P1 Findings

## Anti-Patterns

- **NICHT** Sweep starten waehrend andere Page in Sweep ist (Knowledge-Capture wuerde bleiben)
- **NICHT** P2/P3 in Sweep mitfixen — geht in Post-Beta-Backlog
- **NICHT** ohne Phase-A-Daten (Pre-Sweep-Health-Score sollte aus MASTER.md kommen)
- **NICHT** ohne Vercel-Deploy-Verify am Ende (Live-Status zaehlt, nicht localhost)
