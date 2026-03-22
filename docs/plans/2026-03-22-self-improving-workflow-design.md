# Self-Improving Workflow — 4-Layer System

**Datum:** 2026-03-22
**Status:** Approved
**Problem:** Claude macht einen Pass und sagt "fertig". Feedback-Memories werden nicht zuverlaessig angewendet. Anil muss selber pruefen ob Aenderungen durchgezogen wurden.

## Architektur

4 Schichten die zusammenwirken:

### Layer 1: Stop Hook (Agent) — Enforcement
- Feuert bei jedem Turn-Ende
- `type: "agent"` (kann Files lesen, Tests ausfuehren)
- Blockiert (exit 2) bis Quality Gates bestanden
- Prueft: common-errors.md, feedback_*.md, tsc, Tests, Duplikate, UI-Texte, Propagation
- Blockiert NICHT bei: stop_hook_active=true, reine Konversation, nur Lese-Operationen
- Timeout: 120s

### Layer 2: SessionEnd Hook — Audit
- Feuert bei Session-Ende (non-blocking)
- Schreibt `memory/sessions/retro-{timestamp}.md`
- Inhalt: Git Diff Summary, offene TODOs
- Timeout: 1.5s Default (nur Shell-Script, kein Agent)

### Layer 3: SessionStart Hook — Re-Injection
- Feuert bei Session-Start
- Liest letzte Retro + errors.md + unpromoted Feedback-Memories
- Injiziert direkt in Claudes Kontext (stdout → context)
- Effekt: Jede Session startet mit Fehlern der letzten Session im Kopf

### Layer 4: Rule Promotion — Escalation
- Gleicher Fehler 2x → promoted von Memory zu Rules (common-errors.md / workflow.md)
- Stop-Hook Agent erkennt wiederkehrende Patterns
- Claude fuehrt Promotion aus (kein Auto-Write in Rules)
- Promoted Memories werden als "promoted" markiert

## Files

| File | Typ | Zweck |
|------|-----|-------|
| `.claude/settings.json` | Config | Stop + SessionEnd + SessionStart Hooks |
| `.claude/hooks/quality-gate.md` | Agent Prompt | Stop-Hook Quality Gate Prompt |
| `.claude/hooks/session-retro.sh` | Shell | SessionEnd Retrospektive |
| `.claude/hooks/inject-learnings.sh` | Shell | SessionStart Injection |
| `memory/sessions/retro-*.md` | Output | Automatische Retrospektiven |
