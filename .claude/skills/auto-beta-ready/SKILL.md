---
name: auto-beta-ready
description: Master-Orchestrator für autonomen Beta-Launch-Self-Healing-Loop. Phase A → B → C → D mit Hard-Gates. Sub-Commands `start`, `status`, `signoff`. Nutze wenn Anil sagt "wir sind fertig"/"beta launch" — Skill verifiziert echten Stand statt zu glauben.
---

# /auto-beta-ready — Beta-Launch Self-Healing-Master

**Slice 214 (D50 Wave 2):** Operationalisiert die "Fertig"-Definition. Skill orchestriert die existierenden Phase-Skills (audit-beta-readiness, sweep-page, persona-walk, sign-off) zu einem Self-Healing-Loop.

**Grundregel:** Beta-READY = `worklog/beta-phase.md.last_signoff == PASS` UND `findings_open.P0 == 0` UND `findings_open.P1 ≤ akzeptabel`. Keine andere Definition zählt.

## Sub-Commands

### `/auto-beta-ready start` — Voll-Loop starten

Orchestriert Phase A → B → C → D als Loop:

```
Phase A: audit-beta-readiness (Re-Run nur wenn last_phase_run > 7 Tage alt)
  ↓ Findings → Pipeline → Slice-Stubs
Phase B: sweep-page für jede Findings-Page (P1+)
  ↓ Findings → Slices durchgezogen
Phase C: persona-walk (3 Personas FM-Power/Casual/TR-Locale)
  ↓ Friction-Reports → Pipeline → Slice-Stubs
Phase D: /sign-off (Beta-Exit-Kriterien-Check)
  ↓ PASS? → READY-Flag
  ↓ FAIL? → zurück zu betroffener Phase
```

**Gate-Bedingungen:**
- Phase A → B: nur wenn `findings_open.P0 == 0` (Show-Stopper sind raus)
- Phase B → C: nur wenn `findings_open.P1 ≤ 5` (Wichtige Items im Griff)
- Phase C → D: nur wenn 0 P0/P1 Findings aus Persona-Walk
- Phase D → READY: nur wenn `last_signoff == PASS`

**Implementation-Schritte (pro Run):**

1. **Pre-Check:** Read `worklog/beta-phase.md` → aktueller Stand
2. **Skip-Logic:** Wenn last_phase_run einer Phase < 7 Tage und letzte Phase noch nicht durch → skip Re-Audit
3. **Phase-Run:** Dispatch entsprechende Sub-Skill (z.B. `/persona-walk`)
4. **Findings-Pipeline:** `npx tsx scripts/findings-to-slices.ts --audit-dir=worklog/audits/<date> --apply`
5. **Slice-Backlog:** Anil approved generierte Slice-Stubs (manuell oder per `/auto-beta-ready continue`)
6. **Heal-Loop:** Slices via `/ship` durchgezogen
7. **Re-Walk:** Nach Heal: gleiche Phase nochmal
8. **Phase-Tracker-Update:** `last_phase_run`, `findings_open` aktualisiert

### `/auto-beta-ready status` — echter Stand

Output:
```
Beta-Phase-Status (worklog/beta-phase.md):
  Phase: <A|B|C|D|READY>
  Last-Run: <timestamp>
  Sign-Off: <never|FAIL|PASS>
  Findings Open: P0=N, P1=N, P2=N, P3=N
  Aggregate: worklog/audits/<date>/aggregate.md

Gate: <Beta-fertig erlaubt? ja|nein, mit Begründung>
```

Nutzt Hook `ship-phase-gate.sh`-Output-Format. Read-only (kein State-Change).

### `/auto-beta-ready signoff` — Phase D Sign-Off

Ruft `/sign-off` Skill auf. Bei PASS:
- Update `worklog/beta-phase.md.last_signoff = PASS`
- Update `last_signoff_date = <ISO>`
- Update `last_signoff_verdict = "<short reasoning>"`
- Phase wechselt auf `READY`

Bei FAIL:
- Update `last_signoff = FAIL`
- Update `last_signoff_verdict` mit failed-Kriterien
- Phase bleibt auf D

**Sign-Off-Bedingungen (nur PASS wenn ALLE grün):**
- `findings_open.P0 == 0`
- `findings_open.P1 ≤ akzeptable_grenze` (default 0 für Launch, 5 für Beta-Pilot)
- Tech-Health-Check grün (Sentry, Smoke-Suite, CI)
- Compliance-Check grün (TR-Audit, no Cash-Out, Disclaimer)
- Money-Flow-Invariants 36/36 PASS
- Phase D Sign-Off-Skript-Output verifiziert

## Briefing-Pattern für Sub-Skill-Aufrufe

Wenn `/auto-beta-ready start` Phase C dispatcht, ruft sie nicht selbst die Agents — sie ruft `/persona-walk` Skill auf, der die Agents dispatcht. **Wichtig (Slice 214 Learning):**

Background-Agents brauchen explicit:
> "FIRST write findings to <output-path> via Bash heredoc, THEN summarize."

Sonst landen Findings nur im Transcript (kontext-incompatible). Pipeline kann dann nichts parsen.

## Integration mit existing Skills

| Phase | Skill | Was es tut |
|-------|-------|-----------|
| A | `/audit-beta-readiness` | 8 Audit-Agents parallel auf 21 Pages |
| B | `/sweep-page` | 6-Linsen-Sweep einer Page |
| C | `/persona-walk` | 3 Personas durch User-Journeys |
| D | `/sign-off` | Beta-Exit-Kriterien-Check |

`/auto-beta-ready` ersetzt KEINE dieser Skills — sie orchestriert sie + verbindet mit Phase-Tracker + Pipeline.

## Anti-Patterns

1. **"Phase A done = fertig"** — Phase-A ist Audit-Findings, nicht End-to-End. Kein READY ohne Phase D PASS.
2. **Pipeline ohne Aggregate** — Skill darf nicht raten was "Findings" sind. Aggregate-Datei (`worklog/audits/<date>/aggregate.md`) ist Pflicht-Input.
3. **Sign-Off mit P1 open** — Default-Bedingung ist 0 P1. Nur explizit von Anil aufgeweicht (Beta-Pilot ≤ 5 P1).
4. **`spec: inline (...)` Bypass** — Slice 212 Hook silent bei inline-Spec. Bei Slice-Stubs aus Pipeline IMMER vollwertige Spec, nicht inline.

## Wave-Plan (Slice 214 → 215+)

- **Slice 214 (jetzt):** Foundation. Phase-Tracker + Hook + Pipeline + Master-Skill + Doku.
- **Slice 215:** Heal Phase-C-Findings (FM-NEU-1 + UX-NEU-1 + P2-Bundle aus heute).
- **Slice 216:** Re-Run incomplete Persona-K + FM-Mechanics-Audits (mit verbessertem Briefing-Pattern).
- **Slice 217:** Phase-D Sign-Off-Trial-Run.
- **Slice 218+ on demand:** Wave 3 Cron-Automation, GitHub-Issue-First-Migration.

## Pflicht-Doku-Verlinkung

Wenn `/auto-beta-ready` ausgeführt wird, schreibt sie nach `worklog/log.md`:
```markdown
## NNN | YYYY-MM-DD | auto-beta-ready Run (Phase X)
- input: worklog/beta-phase.md (vorher)
- output: worklog/beta-phase.md (nachher)
- generated-stubs: <count>
- next-action: <was Anil tun soll>
```

Plus Update von `worklog/active.md` mit Slice-Backlog falls Stubs generiert.
