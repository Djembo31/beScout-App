---
name: persona-walk
description: Phase C Härte-Test. Laesst tester-persona-walker in 3 Personas (FM-Power, Casual-Fan, TR-Locale) durch User-Journeys auf bescout.net laufen. Output Friction-Report. Use vor Phase D Sign-Off.
---

# /persona-walk — Phase C

**Ziel:** Echte Tester-Erlebnisse simulieren bevor 50 echte Tester loslaufen.

## Aufruf

```
/persona-walk           # alle 3 Personas
/persona-walk M         # nur Persona M (Power-User)
/persona-walk K         # nur Persona K (Casual)
/persona-walk T         # nur Persona T (TR-Locale)
```

## Phase C Pattern

```
1. PRE-CHECK
   - bescout.net deployed neuester main? → vercel-cli + git log
   - Sentry + PostHog Live? → Dashboards offen
   - 3 Test-Accounts existieren?
     - persona-m@bescout.net (Power-User mit 12 Holdings)
     - <new-signup> (Casual, fresh)
     - persona-t@bescout.net (TR-Locale)

2. PERSONA-RUN (parallel oder sequenziell)
   ├─ Agent(tester-persona-walker, persona=M)
   ├─ Agent(tester-persona-walker, persona=K)
   └─ Agent(tester-persona-walker, persona=T)

3. KONSOLIDIERUNG
   → qa-screenshots/personas/<date>/
   → worklog/persona-reports/<date>-summary.md

4. CROSS-PERSONA-PATTERN
   - Findings in 2/3 Personas → systemisch (P0/P1)
   - Findings nur in 1 Persona → persona-spezifisch (P1/P2)

5. TESTER-READY-VERDICT
   - 0 P0 cross-persona → GO
   - 1+ P0 cross-persona → BLOCK + Fix-Liste
```

## Persona-Spezifika

### Persona M (Power-User) — was er TESTET
- Filter-Geschwindigkeit (<500ms)
- Quick-Buy-Klickpfad (<3 Klicks)
- Captain-Pick-Rate als Decision-Helper
- Sortier-Optionen vollstaendig
- Bulk-Actions verfuegbar
- MV-Chart-Hover-Tooltips
- Mobile 393px UX

### Persona K (Casual-Fan) — was er TESTET
- Onboarding-Friction (Slice 187 baseline)
- Empty-States verstaendlich
- Glossar-Begriffe klar
- $SCOUT-Wording compliance
- "Was-ist-mein-erster-Schritt"-CTA
- Visual-Hierarchie (was ist wichtig?)

### Persona T (TR-Locale) — was er TESTET
- 802 TR-Strings konsistent
- DE-Mix eliminiert
- IPO-Wort = "Kulüp Satışı"
- Vereins-Namen lokalisiert
- TR-Pluralisation korrekt
- TFF1/Süper-Lig Default-Sortierung?

## Output-Format

`worklog/persona-reports/<date>-summary.md`:

```markdown
# Persona-Walk Summary — <date>

## Persona M Score: X/10
- Friction-Points: <count>
- Top-Issues: [...]

## Persona K Score: X/10
- Friction-Points: <count>
- Top-Issues: [...]

## Persona T Score: X/10
- TR-String-Drift: <count>
- Compliance-Breaches: <count>

## Cross-Persona Findings (systemisch)
[Tabelle]

## Tester-Ready-Verdict
✅ GO / ⚠️ FIX-FIRST / ❌ BLOCKED

## Recommendation
[2-3 Saetze: koennen wir 50 Tester loslassen]
```

## Anti-Patterns

- **NICHT** Persona-Walk auf localhost (muss bescout.net sein)
- **NICHT** ohne Sentry+PostHog live (Dashboards muessen Tester-Sessions sehen koennen)
- **NICHT** ohne 3 echte Test-Accounts (Persona K braucht Sign-Up-Flow)
- **NICHT** mit Auto-Fix-Cycle (Phase C ist Read-Only-Bewertung)

## Pattern v3 (Slice 253, 2026-04-28) — Walker-Output-Reliability

**Hintergrund:** Slice 215 + 252 zeigten Briefing-Schwäche bei 2/3 Walkern. Persona M (Slice 252) scheiterte mit 0 bytes Output wegen Bash-heredoc-Tool-Issue. Persona K (Slice 252) hatte thin-output (mid-walk-Stopp).

**Pattern v3 (verpflichtend):**
1. **Skeleton zuerst via Write-Tool** (NICHT `touch` + heredoc-append):
   ```
   Write { file_path: "worklog/audits/<date>/persona-<x>-<role>.md",
           content: "# Persona <X> Walk\n\n## Status\n- [ ] Walk\n\n## Findings\n[TODO]\n\n## Verdict\n[TODO]" }
   ```
2. **Findings-Append via Edit-Tool** (Replace TODO-Marker):
   ```
   Edit { file_path: ".../persona-<x>.md", old_string: "[TODO]", new_string: "<echte Findings>" }
   ```
3. **Bash AUSSCHLIESSLICH für:** mkdir -p, git status, Playwright-Run, Read-Only-Greps

**Verbots-Liste:**
- Bash-heredoc `<< 'EOF' >> file.md` für mehrzeilige Findings → fehleranfällig (Quoting, Escape, Markdown-Tabellen)
- `echo "..." >> file.md` für Tabellenzeilen → quoting-mess
- "Skeleton-touch-only, dann Findings nur in transcript-summary" → Findings-loss

**Walker-Self-Check pre-Completion:** `wc -l worklog/audits/<date>/persona-<x>.md` — wenn <30 Zeilen: Walker-Output-Failure, Re-Dispatch nötig.

## Naechster Schritt

- Findings → `/sweep-page <page>` falls page-spezifisch
- Cross-Persona-P0 → sofort fix via Healer
- Verdict GO → `/sign-off` (Phase D)
