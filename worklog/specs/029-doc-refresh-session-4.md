# Slice 029 — Doc-Refresh Session 4 (common-errors + Briefing)

**Groesse:** XS · **CEO-Scope:** nein (Doc-only) · **Typ:** Doc-Maintenance analog Slice 022/026

## Ziel

Knowledge-Flywheel pflegen: 5 neue Bug-/Architektur-Patterns aus Session 4 (Slices 023-028) in `common-errors.md` kompilieren. Session-Briefing-File refreshen (B4/B5 sind nicht mehr gelb, CEO-Follow-Ups alle durch).

## Betroffene Files

| File | Was |
|------|-----|
| `.claude/rules/common-errors.md` | +5 neue Pattern-Sektionen |
| `memory/next-session-briefing-2026-04-18.md` | Komplett-Rewrite: aktueller Stand Ende Session 4 |

## Neue Patterns (aus Session 4)

1. **Holdings Auto-Delete-Zero Trigger-Pattern** (Slice 025) — `AFTER UPDATE OF quantity ... WHEN (NEW.quantity = 0)` als DB-Trigger statt RPC-Patch
2. **Server-Validation-Pflicht fuer Money/Fantasy-RPCs** (Slice 023) — Client-UX ist nicht die Wahrheit; RPC muss Formation/Slot-Count/GK etc. validieren
3. **Transaction-Type → activityHelpers-Sync** (Slice 027) — jeder neue RPC der in `transactions.type` schreibt braucht activityHelpers-Mapping + DE+TR-Labels
4. **auth.users DELETE NO-ACTION-FK-Pre-Cleanup** (Slice 028) — `DELETE FROM auth.users` scheitert an NO-ACTION-FKs; Pre-Audit via pg_constraint Pflicht
5. **pg_cron Wrapper-RPC Fail-Isolation** (Slice 024) — per-Item `BEGIN...EXCEPTION WHEN OTHERS...END` + scored/skipped/errored Return-Shape

## Acceptance Criteria

1. common-errors.md hat 5 neue Sektionen, alle mit Regel + Fix-Pattern + Audit-Signal
2. Briefing-File zeigt aktuellen Stand: B4+B5 gruen, alle 4 CEO-Follow-Ups abgehakt
3. Briefing listet verbleibende Offen-Punkte (Phase 7, CTO-Residuen)
4. Keine tsc/Test-Impact (pure Doc-Change)

## Proof

- `git diff --stat` → 2 Files, ~100-150 Zeilen Zuwachs
- Audit-Signal: nach Commit kann ein neuer Session-Start via Briefing-File direkten Kontext laden

## Scope-Out

- **Session-Digest** — handoff.md wird automatisch vom Stop-Hook geschrieben
- **Archive-Move** — alten Briefing-Inhalt nicht archivieren, direkt ueberschreiben (Git-Historie ist Archiv)
- **Neue Regeln in rules/business.md / database.md** — nur common-errors.md fuer diese Runde
