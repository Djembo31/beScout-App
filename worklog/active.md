# Active Slice

```
status: in-progress
slice: 433
title: Plan-Konsolidierung — die EINE Plan-Quelle (MASTERPLAN als SSOT)
size: M
type: Doc (Ops-Lane, money-neutral)
stage: BUILD
spec: inline (unten) + MASTERPLAN.md
proof: worklog/proofs/433-*.txt
review: self-review (Ops-Lane, kein Money/Security)
```

## 433 — Plan-Konsolidierung (Anil approved „ja, schreib den einen Plan", 2026-06-28)
**Problem (Ist-Stand-Scan gemessen):** ~14 Plan-Docs für EINEN Plan · 5 konkurrierende Wissens-Heimaten (`docs/knowledge`+`wiki`+`memory`+`memory/semantisch`+Auto-Memory) · versionierte Doc-Dubletten (v3/v4-FINAL/v8) · 2× session-handoff (root tot) · 2× TODO · `docs/plans` 147 · 1615 Artefakte. Akkretion auf Meta-Ebene = dieselbe Krankheit wie im Code.
**Getan (dieser Slice):** `MASTERPLAN.md` neu = DIE eine Plan-Quelle — Vision + Tracker-Architektur (1 SSOT/Ebene) + alle Wellen (TEIL A Meta-Cleanup K1-K7 · TEIL B Code/DB W0-W7 + Querschnitt). disease-register-Essenz + Mock2Pro + 11-Punkt-Inventur reingefaltet.

**NÄCHSTE Schritte = TEIL A execution (peek-then-delete, git=Archiv):**
- K1 safe-deletes: dead root `session-handoff.md` (03-28), `docs/TODO.md`, `docs/WORKFLOW.md`.
- K2 Wissens-Heimat: `wiki/` + `memory/semantisch/` + `disease-register` → `docs/knowledge/`; versionierte Dubletten auf je 1.
- K1 notes-fold + delete (14 Plan-Docs) · K3/K4/K7 archive.

## ➡️ DANACH: TEIL B (Code/DB) — W0 DB-Security-Migration zuerst (§3, Anil-Go offen)
Stand: `memory/session-handoff.md`.
