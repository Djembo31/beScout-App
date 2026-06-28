# Active Slice

```
status: idle
slice: 443
title: K2.2b — 4 verbrauchte Backfill-Scripts + 5 Daten + test.rtf (−11.817 Z.) — DONE
size: XS
type: Tool
stage: LOG (DONE)
spec: inline (Ops-Lane, money-neutral; verbrauchte one-off Artefakte)
impact: inline (10 Files, 0 Verdrahtung, 0 dangling)
proof: worklog/proofs/443-k2b-backfill-gc.txt
review: self-review PASS (Ops-Lane; CTO-Entscheid faktenbasiert, self-contained verifiziert)
```

## Spec (inline, Ops-Lane — Slice 352)

**Problem (Evidence: K2.2b-Verify 2026-06-29):** 4 Multi-Liga-Backfill/Seed-Scripts (alle 2026-04-15, 0 Verdrahtung in GHA/Vercel/package.json/Hook/Cron, nie wieder angefasst) + ihre 5 Rollback/Debug-Daten-Files (inkl. `debug-backfill-payload` 220K) liegen seit 435-Scripts-GC übrig. Multi-Liga-Expansion ist live → verbraucht. **Anil delegiert die Entscheidung an CTO** („sagen mir nichts").

**Plan:** git rm 4 Scripts + 5 Daten + `docs/test.rtf` (Müll). git=Archiv (jederzeit wiederherstellbar).

**Schnitt-Regel (§0):** Scripts referenzieren NUR ihre eigenen rollback-jsons (self-contained). Post-Delete Re-Grep = 0 dangling.

**§3-Hinweis:** berührt KEINE Money/Scoring-Logik — nur verbrauchte one-off Artefakte (Daten längst in Prod). Selbst verifiziert, nicht delegiert.

**Acceptance:** AC-1 4 Scripts weg · AC-2 5 Daten-Files weg · AC-3 test.rtf weg · AC-4 0 dangling (kein lebender Reader).

**Proof:** `worklog/proofs/443-k2b-backfill-gc.txt`. **Review:** self-review (Ops). **Scope-Out:** K2.3 (Strategie-Doc-Dubletten, Inhalts-Urteil), K2.4-K2.6.
**Stage-Chain:** SPEC → IMPACT(inline) → BUILD → REVIEW(self) → PROVE → LOG.

## Zuletzt

- **Slice 442** (2026-06-29) — K2.1 Skill-Trees + K2.2 semantisch/, 89 Einträge (S).
- **Slice 441** (2026-06-29) — K3 docs/plans 147→5 (XS).
- **Slice 440** (2026-06-29) — K4 root-Müll (XS).

Nächstes: K2.3 docs-Strategie-Dubletten (Inhalts-Urteil) · K2.4 wiki/ · K2.5 Anker · K2.6 Memory-Modell.
