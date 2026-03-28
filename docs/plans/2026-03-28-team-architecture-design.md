# BeScout Team Architecture — Design Doc

> Created: 2026-03-28 | Status: Approved

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Wissen-Architektur | **Hybrid** | Skills backen Agent-spezifisches Wissen ein, referenzieren Rules wo nötig |
| Anzahl Domain-Skills | **3 (Minimal)** | beScout-frontend, beScout-backend, beScout-business. YAGNI. |
| Skill-Agent Binding | **Hybrid Load** | Agent lädt Skill selbst (statisch), CTO liefert Task-Context (dynamisch) |
| Execution-Modus | **Dual** | Sub-Agents (Tier 1-3) + Agent Teams (Tier 4) |
| Agent-Struktur | **Erbt von Implementer** | Journal, Self-Healing Loop, Circuit Breaker werden übernommen |
| Isolation | **Worktree für schreibende Agents** | frontend/backend in Worktree, business read-only |
| Learnings | **Pflicht-Output** | Jeder Agent gibt LEARNINGS Sektion aus, CTO entscheidet Rückfluss |

---

## 1. Skill-Architektur

### Verzeichnis

```
~/.claude/skills/
├── skill-creator/              ← Meta-Skill (installiert)
├── beScout-frontend/
│   └── SKILL.md                ← ~150 Zeilen
├── beScout-backend/
│   └── SKILL.md                ← ~150 Zeilen
└── beScout-business/
    └── SKILL.md                ← ~100 Zeilen
```

### beScout-frontend (~150 Zeilen)

Zielgruppe: Frontend-Agent, auch Jarvis bei UI-Arbeit

Eingebackenes Wissen:
- **Component Registry** — PlayerPhoto (first/last/pos), Modal (IMMER open prop), Card (bg-white/[0.02]), TabBar, Button (active:scale-[0.97]), Loader2
- **Design Tokens** — Background #0a0a0a, Gold var(--gold, #FFD700), Button Gradient from-[#FFE44D] to-[#E6B800], Card Border border-white/10 rounded-2xl, Positions GK=emerald DEF=amber MID=sky ATT=rose
- **CSS Anti-Patterns** — flex-1 iPhone overflow, dynamic Tailwind JIT, overflow:hidden kein Containing Block
- **React Patterns** — Hooks VOR returns, Loading Guard VOR Empty Guard, cn(), Array.from(new Set()), Tab-gated enabled
- **i18n** — next-intl t(), DE Labels EN Code, Cookie bescout-locale

Referenzen (on-demand):
- `→ .claude/rules/ui-components.md` (vollständiges Registry)
- `→ .claude/rules/common-errors.md` (CSS/React Sektion)

### beScout-backend (~150 Zeilen)

Zielgruppe: Backend-Agent, auch Jarvis bei DB/Service-Arbeit

Eingebackenes Wissen:
- **DB Column Names** — players: first_name/last_name, wallets: PK=user_id, orders: side (nicht type), profiles: top_role, notifications: read (nicht is_read) — KOMPLETT
- **CHECK Constraints** — club_subscriptions.tier: 'bronze'/'silber'/'gold', user_stats.tier: 'Rookie'→'Ikone', research_posts.call: 'Bullish'/'Bearish'/'Neutral'
- **RPC Patterns** — REVOKE FROM PUBLIC, authenticated, anon. Wrapper-RPCs nutzen (nicht interne). Guards in allen Trading-RPCs. FK-Reihenfolge.
- **Service Layer** — Component → Service → Supabase (NIE direkt). qk.* Factory. invalidateQueries nach Writes.
- **Supabase CLI** — `supabase db execute` statt MCP. Migration via `supabase migration new`.
- **RLS** — Neue Tabelle = Policies für ALLE Client-Ops (SELECT + INSERT + DELETE)

Referenzen (on-demand):
- `→ .claude/rules/database.md`
- `→ .claude/rules/trading.md`
- `→ .claude/rules/common-errors.md` (DB/RPC Sektion)

### beScout-business (~100 Zeilen)

Zielgruppe: Business-Agent, auch Jarvis bei Compliance-Prüfung

Eingebackenes Wissen:
- **Wording-Compliance** — NIEMALS: Investment/ROI/Profit/Ownership. IMMER: Utility Token/Platform Credits/Scout Assessment
- **Licensing-Phasen** — Phase 1 (jetzt): Trading + Free Fantasy. Phase 3/4: NICHT BAUEN
- **Fee-Split** — Trading 6% (3.5+1.5+1), IPO (85/10/5), Research (80/20), P2P (2+0.5+0.5)
- **Geofencing** — 5 Tiers: FULL/CASP/FREE/RESTRICTED/BLOCKED mit Länder-Zuordnung
- **$SCOUT** — Platform Credits, kein Crypto. Code-intern "dpc" bleibt. Geld als BIGINT cents.

Referenzen (on-demand):
- `→ .claude/rules/business.md`

---

## 2. Agent-Architektur

### Verzeichnis

```
.claude/agents/
├── frontend.md         ← NEU — BeScout Frontend Engineer
├── backend.md          ← NEU — BeScout Backend Engineer
├── business.md         ← NEU — BeScout Business & Compliance
├── reviewer.md         ← BEHALTEN (cross-domain, lädt Wissen selbst)
│                         Bekommt im Briefing: welcher Agent + welcher Skill
├── test-writer.md      ← BEHALTEN (Spec-only, kein Domain-Skill nötig)
├── qa-visual.md        ← BEHALTEN (Playwright Screenshots)
├── healer.md           ← BEHALTEN (hat LEARNINGS-Output bereits ✅)
├── impact-analyst.md   ← BEHALTEN (cross-domain Analysis)
└── implementer.md      ← DEPRECATED (ersetzt durch frontend/backend)
                          Bleibt als Fallback für gemischte Tasks
```

### Agent-Struktur (Template)

```yaml
---
name: [agent-name]
description: [role description]
tools: [Read, Write, Edit, Grep, Glob, Bash]
model: inherit
isolation: worktree          # frontend/backend: worktree | business: NICHT
maxTurns: 100
memory: project
---

## Phase 0: Knowledge Loading (MANDATORY)

### Step 1: Load Skill (STATISCH — bekannter Pfad)
Read: ~/.claude/skills/beScout-[domain]/SKILL.md
→ Domain-Wissen: Patterns, Anti-Patterns, Conventions, Registry

### Step 2: Validate Dependencies
For each dependency listed in skill:
  - File exists? → Continue
  - File MISSING? → STOP. Report to CTO: "BLOCKED: Missing [path]"
  DO NOT proceed to Phase 1 with missing dependencies.

### Step 3: Read Task-Package (DYNAMISCH — vom CTO geliefert)
Der CTO hat im Prompt ALLES mitgegeben:
  - Relevante Types (kopiert)
  - Service-Signaturen (kopiert)
  - Pattern-Beispiele (kopiert)
  - Acceptance Criteria (Checkliste)
→ NICHT selbst nach Task-spezifischem Code suchen.
→ Wenn etwas fehlt: STOP. Melde "INCOMPLETE PACKAGE: Brauche [was]"

## Phase 1: Journal + Execute (geerbt von Implementer)
1. Journal starten: memory/journals/[feature]-journal.md
2. Implement im Self-Healing Loop (max 5 Runden)
3. Bei jeder Runde: Journal updaten, tsc prüfen
4. Context-Decay-Check nach Fails: eigenes Journal re-lesen
5. Circuit Breaker: 3x gleicher Fehler → anderer Ansatz, 5 Runden → STOP

## Phase 2: Self-Check + Learnings (PFLICHT)
1. Verification: tsc --noEmit + vitest run [betroffene Tests]
2. Acceptance Criteria Checkliste durchgehen (jeder Punkt ja/nein)
3. LEARNINGS Sektion outputten:
   - Fehler die in Skill/Rules fehlen
   - Patterns die entdeckt wurden
   - Was im Task-Package gefehlt hat (→ CTO verbessert Package-Template)
```

### Zwei Wissens-Typen (KLAR GETRENNT)

| Was | Quelle | Wer liefert | Wann |
|-----|--------|-------------|------|
| **Domain-Wissen** (Patterns, Anti-Patterns, Registry) | Skill SKILL.md | Agent lädt selbst | Phase 0 Step 1 |
| **Task-Context** (Types, Services, Code-Snippets) | Task-Package im Prompt | CTO assembliert | Phase 0 Step 3 |

Regel: Agent LIEST den Skill (bekannter Pfad). Agent SUCHT NICHT nach Task-Code (CTO liefert).

### Skill-Trigger Scope

Skills in `~/.claude/skills/` triggern projekt-übergreifend. BeScout-Skills MÜSSEN scoped sein:
```yaml
description: "Internal BeScout domain knowledge for frontend agents.
Only use in the beScout-app project when implementing UI components,
pages, or hooks."
```

### Fail-Fast Guarantee

Drei Schutzebenen gegen fehlende Files:

**Ebene 1 — Skill Dependencies:**
Jeder Skill deklariert required files im Header. Agent validiert in Phase 0.

**Ebene 2 — Agent Phase 0 Fail-Fast:**
Agent STOPPT wenn Dependency fehlt. Meldet "BLOCKED: Missing [path]" an CTO.
Agent arbeitet NIEMALS ohne vollständige Dependencies weiter.

**Ebene 3 — CTO Task-Package Assembly:**
Jarvis assembliert VOR jedem Agent-Spawn:
1. Skill-File existiert → laden
2. Alle Skill-Dependencies existieren → validieren
3. Task-spezifische Files LESEN und relevante Teile KOPIEREN in den Prompt:
   - Types → exakte Interface-Definitionen
   - Services → Funktions-Signaturen + Return-Types
   - Components → Pattern-Beispiele aus ähnlichen Components
   - DB → Column-Names + CHECK Constraints für betroffene Tabellen
   - i18n → Keys prüfen, fehlende VORHER anlegen
4. Acceptance Criteria → binäre Checkliste (ja/nein)
5. Fehlt was → Erst ERSTELLEN, dann in Package aufnehmen, DANN dispatchen
6. Agent bekommt ALLES — muss NICHTS selbst suchen

---

## 3. Workflow — Dual-Modus

### Tier 1-3: Sub-Agents (Daily Work)

```
Anil sagt Task
  → Jarvis bestimmt Tier + Agent
  → Jarvis: Task-Package Assembly (KRITISCH)
  → Dispatch Agent mit KOMPLETTEM Package
  → Agent: Phase 0 (Skill + Validate) → Phase 1 (Execute) → Phase 2 (Self-Check)
  → Jarvis: Review + Commit
```

### Task-Package Assembly (CTO Pflicht)

Der Agent darf NICHTS selbst suchen müssen. Jarvis assembliert VOR Dispatch:

```
Task-Package = {
  1. SKILL           → Domain-Wissen (Patterns, Anti-Patterns, Conventions)
  2. TASK-BRIEF      → Was genau zu tun ist (Kontext, Zweck, Scope)
  3. LIVE-CONTEXT    → Echte Code-Snippets die der Agent braucht:
                       - Relevante Types (kopiert, nicht Pfad)
                       - Service-Signaturen (Funktion + Return-Type + Pfad)
                       - Ähnliche Components als Pattern-Beispiel
                       - DB Column-Names für betroffene Tabellen
                       - i18n Keys (prüfen ob existieren)
  4. ACCEPTANCE       → Binäre Kriterien (ja/nein Checkliste)
                       - Jedes Kriterium muss vom Agent selbst prüfbar sein
                       - Kein "sieht gut aus" — nur "existiert/funktioniert"
}
```

**Regel:** Wenn der CTO eine Information NICHT in das Package aufnimmt,
darf der Agent sie NICHT brauchen. Braucht er sie doch → Package war unvollständig
→ CTO-Fehler, nicht Agent-Fehler. Fix: Package-Template erweitern.

**Qualitäts-Kriterium:** Agent muss Task zu 100% erledigen können
OHNE einen einzigen Grep/Glob/Read auf unbekannte Files.
Alles was er liest muss im Package stehen oder im Skill deklariert sein.

### Tier 4: Agent Teams (Features)

```
Anil sagt Feature
  → Jarvis: Brainstorming → Plan
  → TeamCreate: frontend + backend + test-writer
  → Shared Task-List, Agents kommunizieren via SendMessage
  → Jarvis koordiniert als Lead
  → Quality Gate (tsc + vitest + Reviewer + a11y)
  → Commit
```

### Wann welcher Modus?

| Kriterium | Sub-Agent | Agent Team |
|-----------|-----------|------------|
| Files betroffen | <5 | 5+ |
| Domains betroffen | 1 | 2+ (Frontend + Backend) |
| Kommunikation nötig | Nein | Ja (API Contracts etc.) |
| Dauer | <30 Min | 1h+ |
| Kosten-Toleranz | Gering | Höher OK |

---

## 4. Self-Improving Loop

```
Skill-Creator (Meta-Skill)
  → Baut/verbessert Domain-Skills
  → Eval-Loop: 3 Test-Prompts + Binary Assertions
  → Agents laden verbesserte Skills
  → Besserer Output
  → Fehler entdeckt → fließen zurück in Skills
  → Skill-Creator verbessert erneut
  → Compound Improvement
```

### Knowledge-Capture Regeln

| Trigger | Ziel |
|---------|------|
| Agent macht Fehler der in Skill fehlt | Skill updaten |
| Gleicher Fehler 2x | Rule Promotion (common-errors.md) |
| Neues Pattern entdeckt | patterns.md + ggf. Skill updaten |
| Anil trifft Entscheidung | decisions.md + ggf. business Skill |
| Agent meldet "INCOMPLETE PACKAGE" | CTO Task-Package Template erweitern |

### Learnings-Rückfluss (CTO-Verantwortung)

Agent output IMMER eine LEARNINGS Sektion. CTO liest und entscheidet:
1. **Skill-relevant** → Skill SKILL.md updaten (Pattern/Anti-Pattern hinzufügen)
2. **Rule-relevant** → common-errors.md oder domain-rule updaten
3. **Einmalig** → errors.md appendieren
4. **Package-Lücke** → CTO Pre-Dispatch Checkliste erweitern

Agent updated NIEMALS selbst den Skill oder die Rules.

### Skill-Typen Abgrenzung

| Typ | Beispiele | Genutzt von | Trigger |
|-----|-----------|-------------|---------|
| **Domain** | beScout-frontend, -backend, -business | Agents | Agent Phase 0 |
| **Process** | deliver, brainstorming, writing-plans | Jarvis (CTO) | User-Request / Workflow |
| **Quality** | cto-review, impact | Jarvis + Reviewer/Impact | Nach Implementation |
| **Meta** | skill-creator | Jarvis | Skill-Verbesserung |

---

## 5. Migration von Heute → Neu

### Phase 1: Skills bauen (Tag 1)
- beScout-frontend SKILL.md schreiben
- beScout-backend SKILL.md schreiben
- beScout-business SKILL.md schreiben

### Phase 2: Agents bauen (Tag 1)
- frontend.md Agent-Definition
- backend.md Agent-Definition
- business.md Agent-Definition
- implementer.md als deprecated markieren

### Phase 3: Validieren (Tag 2)
- Jeden Skill mit Skill-Creator Eval-Loop testen (3 Prompts je Skill)
- Agent-Dispatch testen (funktioniert Phase 0? Fail-Fast?)
- Ersten echten Task mit neuem System lösen

### Phase 4: Iterate (laufend)
- Skill-Creator Eval-Loop bei Problemen
- Knowledge-Capture nach jedem Sprint
- Agent Teams bei nächstem Tier-4 Feature testen
