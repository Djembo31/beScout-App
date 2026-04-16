# BeScout Workflow — der SHIP-Loop

**Eine Aufgabe. Fuenf Stufen. Keine Ausnahmen.**

## Der Loop

```
TASK  →  SPEC  →  IMPACT  →  BUILD  →  PROVE  →  LOG  →  next
```

Jeder Slice durchlaeuft alle 5 Stufen. Was nicht zutrifft wird explizit als `skipped (Grund)` markiert — nicht weggelassen.

## Stufen im Detail

### 1. SPEC — Was soll gebaut werden?

**Artefakt:** `worklog/specs/NNN-title.md`

**Pflicht-Sektionen:**
- **Ziel** (1 Satz user-sichtbares Verhalten)
- **Betroffene Files** (geschaetzt, mit Begruendung)
- **Acceptance Criteria** (3-7 Punkte, messbar, nicht-subjektiv)
- **Edge Cases** (5-10: null, 0, error, offline, double-click, race condition, stale cache, RLS-unauth, i18n missing, ...)
- **Proof-Plan** (welches Artefakt beweist dass es funktioniert)
- **Scope-Out** (was ausdruecklich NICHT in diesem Slice)

**Gate:** CEO-Approval (wenn CEO-Scope laut `memory/ceo-approval-matrix.md`) ODER Claude setzt `S-Slice: true` fuer triviale Faelle.

**Slice-Groessen:**

| Groesse | Kriterium | Spec-Tiefe |
|---------|-----------|------------|
| XS | 1 File, Pattern-bekannt | Mini-Spec (4-5 Zeilen), keine Approval noetig |
| S | 2-3 Files, klar | Kurz-Spec, 5 min, CEO nickt ab |
| M | 3-5 Files, eine Domain | Voll-Spec, CEO approved |
| L | Cross-Domain oder Schema-Migration | Voll-Spec + Impact + Agents bauen, CEO approved |

### 2. IMPACT — Was wird mitbetroffen?

**Artefakt:** `worklog/impact/NNN-title.md` ODER in active.md als `impact: skipped (Grund)`.

**Pflicht wenn Slice beruehrt:**
- `supabase/migrations/` (Schema-Change, RPC, RLS)
- `src/lib/services/*` (Service-Layer)
- `src/lib/queries/*` (Query-Keys)
- `src/types/*` (Typen die in 3+ Files genutzt werden)
- Cross-Domain (zwei fachlich unabhaengige Bereiche)

**Inhalt:**
- Consumer-Liste (grep-verifiziert, nicht geraten)
- Side-Effects (RLS, Caching, Invalidation, Realtime)
- Migration-Plan (falls Schema)
- Rueckwaerts-Kompatibilitaet (falls Contract-Change)

**Tool:** `/impact` Skill ODER Impact-Analyst-Agent.

### 3. BUILD — Code schreiben

**Regeln:**
- Ein File nach dem anderen
- Nach jedem File: `npx tsc --noEmit` + betroffene Tests
- Bestehende Patterns nutzen (grep statt neu erfinden)
- Pre-Edit-Checks laut `CLAUDE.md` durchgehen (RPC NULL, CHECK constraints, RLS, Return-Shape, Mobile 393px, Hooks vor Returns, etc.)

**Agents:**
- \>3 Files oder Worktree-isoliert → backend/frontend-Agent
- DB-Migration → backend-Agent (Worktree)
- Tests aus Spec → test-writer-Agent

**Gate:** tsc clean + Tests gruen.

### 4. PROVE — Beweise dass es funktioniert

**Artefakt:** `worklog/proofs/NNN-title.*`

**Pflicht je Change-Typ:**

| Change-Typ | Proof |
|------------|-------|
| Service / RPC | `npx vitest run <test-file>` Output als `.txt` |
| UI-Change | Playwright-Screenshot gegen `bescout.net` (via `jarvis-qa@bescout.net`) als `.png` |
| DB-Schema | `SELECT` Query mit echtem Ergebnis als `.txt` |
| Security | Grant/RLS-Listing via `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'` als `.txt` |
| Bug-Fix | Vorher/Nachher-Vergleich (Screenshot oder Log) als `.png`/`.txt` |
| Refactor ohne Behavior-Change | Tests gruen + `git diff --stat` Output |

**Verboten als Proof:**
- *"sollte passen"*
- *"tsc clean"* allein
- *"Pattern ist wie anderswo"*

**tsc clean ist Voraussetzung, kein Proof.**

### 5. LOG — Abschluss

**Artefakt:** Eintrag in `worklog/log.md`, Format:

```
## NNN | YYYY-MM-DD | Titel
- Stage-Chain: SPEC → IMPACT → BUILD → PROVE → LOG
- Files: <git diff --stat summary>
- Proof: worklog/proofs/NNN-xxx.png
- Commit: <hash>
- Notes: (optional, 1-2 Saetze)
```

**Pflicht:**
- Git-Commit mit aussagekraeftiger Message
- Wenn Bug gefixt: neue Regel in `.claude/rules/common-errors.md`
- `worklog/active.md` zurueck auf `status: idle`

## Gates (architektonisch via Hooks)

| Hook | Trigger | Wirkung |
|------|---------|---------|
| `ship-session-start.sh` | SessionStart | 5-Zeilen-Briefing: Branch, Slice, Stage, tsc, uncommitted |
| `ship-spec-gate.sh` | PreToolUse Edit auf kritischen Pfaden | Blockt ohne aktiven Slice (Exit 2) |
| `ship-post-service.sh` | PostToolUse Edit auf `src/lib/services/` | Triggert vitest, Output im Kontext |
| `ship-proof-gate.sh` | PreToolUse Bash `git commit` | Blockt `fix(`/`feat(`-Commits ohne Proof |
| `ship-status-gate.sh` | UserPromptSubmit mit "fertig\|status\|stand" | Injiziert git log + active.md |
| `ship-no-audit-slice.sh` | Stop | Markiert Audit-only Slices (kein git diff) als `invalid` |
| `ship-meta-plan-block.sh` | PreToolUse Write auf `memory/project_*.md` | Blockt neue Meta-Plaene |

## Rollenverteilung

Siehe `memory/ceo-approval-matrix.md` fuer vollstaendige Liste.

Kern:
- **Anil (CEO)**: WAS gebaut wird, Geld-Flows, Security, Business-UX, TR-i18n vor Commit, neue Meta-Prozesse
- **Claude (CTO)**: WIE gebaut wird, Patterns, Agents, Tests, Refactors ohne Scope-Change, interne Tools

## Anti-Patterns (was wir NICHT mehr machen)

1. **Audit als Slice** — "Slice 3: geprueft, ist ok, gelb". Audit ist Vorarbeit, kein Fortschritt.
2. **Meta-Plan-Stapel** — mehrere parallele Projekt-Plaene. Nur EIN aktiver.
3. **Morning-Briefing-Marathon** — 10 Minuten Lesen vor Code. SessionStart ist 30 Sekunden.
4. **Stale-Status uebernehmen** — Zahlen ohne Verifizierung. Jede Status-Behauptung braucht eine Query/git-Ausgabe.
5. **Proof-Skip** — "tsc clean, sollte passen". Ohne Screenshot/Query/Test kein DONE.
6. **Scope-Creep** — "und gleich noch das fixen". Neues Problem → neuer Slice.
7. **Claude macht Business-Entscheidung** — Fee-Split gesetzt, Scope erweitert, Feature ersetzt. Immer CEO.

## Notbremse

Wenn Anil sagt: **"Notfall, einfach fixen"**:
- `/ship emergency "<Grund>"` — setzt active.md auf `slice: emergency`, `stage: BUILD`
- Spec-Gate und Proof-Gate warnen aber blocken nicht
- Nach dem Fix: nachtraeglich Spec + Proof nachholen ODER bewusst als `emergency-fix` loggen

Nicht missbrauchen. Wenn der Anti-Pattern-Count in einer Woche > 2 ist: Retrospektive.
