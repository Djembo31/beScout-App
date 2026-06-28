# Active Slice

```
status: idle
slice: 442
title: K2.1 Skill-Trees (.agents+bencium) + K2.2 semantisch/ — 89 Einträge weg — DONE
size: S
type: Doc
stage: LOG (DONE)
spec: inline (Ops-Lane, Doc, money-neutral, nicht user-facing)
impact: inline (89 Skill-Tree/memory-Deletions, Verify-vor-Löschen, 0 broken skill)
proof: worklog/proofs/442-k2-skilltree-memory-gc.txt
review: self-review PASS (Ops-Lane; bencium/.agents/beta Verify-Grep, 0 dangling)
```

## Spec (inline, Ops-Lane — Slice 352)

**Problem (Evidence: K2-Recon 2026-06-29):** 3 Skill-Trees (`.claude/skills` 18 kanonisch · `.agents/skills` 77 stale · `bencium`-Repo) + memory-Müll (`debug-backfill-payload` 220K, leeres `semantisch/`, abgebrochene `beta-*` D111). CEO-Entscheid: sichere Mechanik zuerst.

**Plan (Verify-vor-Löschen, §0):**
1. **K2.1:** `.agents/skills/` (77) — verify 0 aktive Refs → weg. `bencium-…/` — **verify ob aktive Skill-Quelle** (doppelte Design-Skills?) BEVOR löschen.
2. **K2.2:** `debug-backfill-payload-BL1-gw4.json` (220K, 0 Refs) → weg · `memory/semantisch/` (leer, D89-tot) → weg · `beta-*`-Docs → Urteil (Infrastruktur-Wert vs Prozess-Müll) · `rollback_*.json` → Urteil (script-referenziert).

**Schnitt-Regel (§0):** kein aktiver Skill/Ref gebrochen. Verify-Grep Pflicht.

**Acceptance:** AC-1 `.agents/skills` weg, 0 broken skill · AC-2 bencium-Status geklärt+behandelt · AC-3 debug-payload+semantisch weg · AC-4 beta/rollback bewusst entschieden (gelöscht ODER begründet behalten) · AC-5 0 dangling.

**Proof:** `worklog/proofs/442-k2-skilltree-memory-gc.txt`. **Review:** self-review (Ops). **Scope-Out:** K2.3-K2.6.
**Stage-Chain:** SPEC → IMPACT(inline) → BUILD → REVIEW(self) → PROVE → LOG.

## Zuletzt

- **Slice 441** (2026-06-29) — K3 docs/plans 147→5 (XS, self-review PASS).
- **Slice 440** (2026-06-29) — K4 root-Müll −4612 Z. (XS).
- **Slice 439** (2026-06-28) — K1 tote Tracker/notes (XS).

Nächstes: K2.3 docs-root · K2.4 wiki/ · K2.5 Anker-Migration · K2.6 Memory-Modell.
