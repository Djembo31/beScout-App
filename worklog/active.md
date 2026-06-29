# Active Slice

```
status: idle
slice: 446
title: knowledge:check TZ-Bug Fix (UTC→Lokal) — DONE
size: XS
type: Hook
stage: LOG (DONE)
spec: inline (Ops-Lane; Hook-Fix, kein Money/Security/user-facing)
impact: inline (1 Zeile audit-knowledge.ts; 13 weitere toISOString-Vorkommen = Report-Dateinamen, kosmetisch, nicht angefasst)
proof: worklog/proofs/446-knowledge-tz-fix.txt
review: self-review (Ops-Lane)
```

## Spec (inline, Ops-Lane)

**Problem (Evidence: Slice 445 Live-Block):** `scripts/audit-knowledge.ts:155` berechnete „heute" via `new Date().toISOString().slice(0,10)` = **UTC**. Check 8 (HARD pre-commit, `fm.updated !== today`) vergleicht gegen ein lokal gesetztes `updated:`. Folge: jeder `docs/knowledge/`-Edit im Fenster **lokal 00:00–02:00 (+0200)** wird fälschlich geblockt (`updated-not-today`), weil UTC noch „gestern" ist. Traf Slice 445 (musste `updated:2026-06-28` erzwingen obwohl lokal der 29. war). git/log/CLAUDE nutzen alle Lokalzeit.

**Fix:** lokale Berechnung `${y}-${M}-${D}` via `getFullYear/getMonth/getDate` (alle lokal).

**Scope-Disziplin:** Nur der eine HARD-Block-Vergleich gefixt. Die 13 weiteren `toISOString().slice(0,10)` in `scripts/` sind **Report-Dateinamen** (kosmetisch, kein Block) → bewusst nicht angefasst.

**Acceptance:** AC-1 `today` = Lokaldatum · AC-2 Report-File `knowledge-2026-06-29.md` (lokal, vorher -28) · AC-3 HARD 0.
**Proof:** `worklog/proofs/446-knowledge-tz-fix.txt`. **Review:** self-review (Ops).
**Stage-Chain:** SPEC(inline) → BUILD → REVIEW(self) → PROVE → LOG.

## Zuletzt

- **Slice 445** (2026-06-29) — K2.3 Welle B: Vision/GTM-Harvest (M).
- **Slice 444** (2026-06-29) — K2.3 Welle A: 7 superseded docs/-root GC (S).

Nächstes (K2.3): Welle C Legal/Sales-Kanonisierung · D Gamification/Scaling-Harvest · E Frontend-Dedup.
