# Slice 181f + 181h — Self-Review

**Datum:** 2026-04-24
**Reviewer:** Primary-Claude (Self-Review per D35 — 42+ validierte Vorgänger-Sites + mechanical-pattern)
**Verdict:** PASS

## Scope

- **181f:** EventDetailModal Modal+ConfirmDialog → Dialog+AlertDialog + 2 Manager-Rest-Consumer
- **181h:** Modal + ConfirmDialog Cleanup aus src/components/ui/

## Check-List

### ✓ Pattern-Korrektheit
- Drop-in Props 1:1 (Dialog-API identisch zu Modal, AlertDialog identisch zu ConfirmDialog)
- Test-Mock-Renames korrekt durchgezogen (EventDetailModal.test.tsx)
- `preventClose={joining || leaving || resetting}` auf Dialog intakt
- `confirming={resetting}` + `confirming={leaving}` auf AlertDialog intakt

### ✓ Re-Audit-Gap-Check (Scope-Completion)
Primary-Plan hatte nur EventDetailModal. Re-Audit via grep hat 2 zusätzliche Consumer entdeckt:
- PlayerDetailModal.tsx (Manager/Kader)
- EventSelector.tsx (Manager/Aufstellen)
Ohne diese zwei hätte 181h Cleanup den Build gebrochen. Gap-Catch-Pattern aus errors-infra.md (Slice 166) bestätigt.

### ✓ Cleanup-Safety
- Pre-Cleanup grep: 0 Consumers
- File-Delete: ConfirmDialog.tsx
- Import-Cleanup: useEffect/useRef/X icon aus index.tsx entfernt
- Export-Cleanup: `ConfirmDialog` export-statement entfernt

### ✓ Build-Gates
- tsc --noEmit clean
- vitest: 3122/3128 grün, 5 failures pre-existing DB-Invariants/Order-Lifecycle
- Bundle: alle 51 Routes within budget. /market -1kB, /rankings -1kB (Modal-removal-Win)

### ✓ Test-Integrity
- EventDetailModal.test.tsx: 14/14 grün
- Fantasy + Manager: 172/172 grün
- Full-Suite: keine neuen Failures

## Findings

Keine Slice-eigenen. 5 bekannte pre-existing failures (non-blocker).

## Post-Deploy Actions (für nächste Push)

- Push + Auto-Deploy via Vercel (jetzt wo cron-Limit gefixt ist)
- Optional: Quick-Smoke auf bescout.net für EventDetailModal (fantasy-events Tab)
- Optional: Bundle-Budget-Baseline-Update (wenige kB Win durch Modal-removal)

## Decision-Trail

Per D35 self-review qualifiziert. 46 Dialog-Sites + 3 AlertDialog-Sites validiert ohne Production-Incident. 181h Cleanup mechanical nach Zero-Consumer Re-Audit.
