# Slice 242 — orphan-component-detector Allowlist (D52 Refinement #3)

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Tool · **Scope:** CTO · **Datum:** 2026-04-28

> nightly-audit Issue #30 / #22 wiederholt sich täglich weil orphan-component-detector 13 orphans findet (3 test-only + 1 Slice-227-deferred + 9 echte unused). Slice 242 fügt Allowlist-Mechanism analog wiring-check.ts KNOWN_ORPHANS hinzu. Test-only + deferred = silent. 9 echte unused bleiben real-drift bis Anil Wire-Plan-Decisions trifft (Slice 239).

---

## 1. Problem Statement

`scripts/orphan-component-detector.ts` (Slice 228) detected 13 orphans heute (Issue #30). Davon:
- 3 sind `(test-only)` — von Tests genutzt, nicht von Production-JSX. Per Definition NICHT-Drift.
- 1 ist `CommunityValuation` mit `@experimental` JSDoc (Slice 227 deferred mit Wire-Plan-Decision wenn Skala >20)
- 9 sind echte unused-Components — Anil-Decision-Pending (Slice 239 Wire-Plan-Wave)

Detector exit 1 + nightly-audit creates Issue #30 jeden Tag, identisch zu Issues #22 + #30 vergangener Tage. Issue-Dedupe-Pipeline (Slice 234) bündelt sie → Comment-Update statt new Issue, aber Issue #30 bleibt OPEN trotz "kein Bug-Drift seit Slice 228 Detection".

**Wer ist betroffen:** CI-Output-Reader (Anil + ich). Daily Issues für stable-state ist Noise. Real-drift (jemand baut neuen orphan-Component) wird unsichtbar im Rauschen.

**Wie oft:** Täglich. nightly-audit Schedule 03:00 UTC.

## 2. Lösungs-Design

Allowlist-Mechanism analog `scripts/wiring-check.ts` KNOWN_ORPHANS:

```ts
const KNOWN_ORPHANS: Record<string, string> = {
  // Test-only fixtures (intentionally not used in production-JSX)
  'src/components/community/FollowBtn.tsx': 'Test-only fixture (used by community-feed tests)',
  'src/components/home/HomeSkeleton.tsx': 'Test-only fixture (loading-state test scaffold)',
  'src/features/market/components/portfolio/OffersTab.tsx': 'Test-only fixture (manager-offers test scaffold)',
  // Deferred mit @experimental JSDoc (Slice 227 ORPHAN-NEU-1)
  'src/components/player/detail/CommunityValuation.tsx': 'Slice 227 @experimental — wire-Plan if scale >20 active-scouts, sonst delete',
};
```

**Logik in main():**
- Pro orphan: prüfe `KNOWN_ORPHANS[component.relPath]`
- Wenn known: skip (nicht in `orphans` array, nicht im exit-1-Decision)
- Wenn unknown + (unused OR test-only): treat as real-drift → orphan-finding
- exit 0 wenn `orphans.length - knownOrphans.length === 0`

**Stats erweitert:**
- `knownAllowlisted: count` — neue Stat-Variable
- Console-Output: "Real orphans (drift): N" + "Known (allowlisted): M" analog wiring-check

**Trade-off:** Allowlist veraltet wenn Anil entscheidet einen deferred-Component zu deleten. Mitigation: Allowlist-Entries haben Begründung, Slice 239 review pflicht-aktualisiert allowlist.

**Wiring:** detector ist bereits in `package.json` `audit:orphan` + `nightly-audit.yml`. Slice 242 ist reine Logik-Erweiterung.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `scripts/orphan-component-detector.ts` | EDIT | KNOWN_ORPHANS const + main()-Logik + Stats |
| `worklog/specs/242-orphan-detector-allowlist.md` | NEU | Diese Spec |
| `worklog/active.md` + `worklog/log.md` | EDIT | Stage-Updates + Slice-Eintrag |
| `worklog/proofs/242-orphan-detector-smoke.txt` | NEU | Pre/Post-Run + AC-Verify |
| `worklog/reviews/242-review.md` | NEU | Self-Review D35 |

**Vor diesem Slice greppen:**
```bash
pnpm run audit:orphan 2>&1 | tail -20  # Pre-state: 13 orphans, exit 1
grep -n "KNOWN_ORPHANS\|allowlist" scripts/wiring-check.ts | head -3  # Pattern-Vorbild
```

## 4. Code-Reading-Liste

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `scripts/orphan-component-detector.ts:272-333` | main() Funktion | Wo orphan-array gesammelt + exit-Decision |
| `scripts/wiring-check.ts:49-80` | KNOWN_ORPHANS-Pattern-Vorbild | Format + Begründungs-Stil |
| `scripts/wiring-check.ts:120-200` | Allowlist-Skip-Logik | `knownOrphan?: string` field + skip-Branch |
| `worklog/specs/227-*.md` (CommunityValuation defer) | Begründungs-Source | Genauer Wortlaut Wire-Plan-Decision |
| `src/components/player/detail/CommunityValuation.tsx:1-15` | @experimental JSDoc-Verify | Bestätige JSDoc-Status |

## 5. Pattern-References

- Slice 234 D54 — wiring-check.ts KNOWN_ORPHANS ist Architektur-Vorbild
- Slice 240 — TM-Scripts-Triage analog allowlist-pruning
- Slice 238 — D52 Refinement #2 (Audit-Heuristik tightenen, gleiche Klasse)
- Slice 227 ORPHAN-NEU-1 — CommunityValuation @experimental Source-of-Truth

## 6. Acceptance Criteria

```
AC-01: [ALLOWLIST] KNOWN_ORPHANS const definiert
  VERIFY: grep -A8 "const KNOWN_ORPHANS" scripts/orphan-component-detector.ts
  EXPECTED: ≥ 4 entries (3 test-only + 1 deferred)

AC-02: [LOGIC] main() filtert known-orphans
  VERIFY: grep -nE "KNOWN_ORPHANS\[|knownOrphan|allowlistKey" scripts/orphan-component-detector.ts
  EXPECTED: ≥ 2 references (definition + lookup)

AC-03: [EXIT] Detector exit 0 bei nur-known-orphans
  VERIFY: pnpm run audit:orphan; echo "EXIT=$?"
  EXPECTED: EXIT=1 (9 echte unused noch da, ABER 4 known weg)
  NOTE: full-cleanup wäre nach Anil-Wire-Plan-Decisions

AC-04: [STATS] Console zeigt "Known (allowlisted): N"
  VERIFY: pnpm run audit:orphan 2>&1 | grep -i "known\|allowlist"
  EXPECTED: ≥ 1 line "Known (allowlisted): 4"

AC-05: [REPORT] orphan-components-<date>.md zeigt allowlist-status
  VERIFY: cat worklog/audits/orphan-components-$(date -u +%Y-%m-%d).md | grep -i "allowlist\|known"
  EXPECTED: ≥ 1 mention

AC-06: [NO-LOSS] echte unused-Components noch detected
  VERIFY: pnpm run audit:orphan 2>&1 | grep -E "DpcMasteryCard|GameweekScoreBar|LimitOrderModal|HoldingsSection|IPOBuySection|TransferBuySection|BuyOrderModal|TradeSuccessEffect|PlayerImagePlaceholder"
  EXPECTED: ≥ 9 matches (9 echte unused noch sichtbar als drift)

AC-07: [REGRESSION] Allowlist-Components nicht mehr in unused-list
  VERIFY: pnpm run audit:orphan 2>&1 | grep -E "FollowBtn|HomeSkeleton|ManagerOffersTab|CommunityValuation"
  EXPECTED: 0 matches (allowlisted weg aus output)
```

## 7. Edge Cases

| # | Flow | Case | Mitigation |
|---|------|------|------------|
| 1 | Allowlist-Entry-Drift | Component umbenannt | Allowlist key ist relPath — bei rename auto-detected als unknown-orphan |
| 2 | Allowlist-Entry für deleted component | Component entfernt | Allowlist-Entry harmlos (kein lookup match) |
| 3 | Test-only Component wird used in Production | onlyInTests=false → wird unused | Detector klassifiziert als unused-orphan (allowlist by relPath, type-flag-Wechsel triggers re-classification) |
| 4 | Nightly-Audit Issue-Pipeline | exit 1 weil 9 echte unused | Pipeline erstellt Issue mit nur 9 (statt 13) — cleaner |
| 5 | Verschiedene allowlist-keys (relPath case-sens) | Windows-Path vs Unix-Path | normalize via .replace(/\\/g, '/') wie wiring-check |

## 8. Self-Verification Commands

```bash
# Pre-Slice-242:
pnpm run audit:orphan 2>&1 | tail -20  # 13 orphans, exit 1

# Post-Edit:
pnpm run audit:orphan 2>&1 | tail -20  # 9 orphans visible, 4 allowlisted, exit 1
pnpm run audit:orphan 2>&1 | grep "Known"  # "Known (allowlisted): 4"
pnpm run audit:orphan 2>&1 | grep -E "FollowBtn|HomeSkeleton|ManagerOffersTab|CommunityValuation"  # 0 matches
pnpm run audit:orphan 2>&1 | grep -cE "DpcMasteryCard|GameweekScoreBar|LimitOrderModal"  # 3 matches (subset of 9)
```

## 9. Open-Questions

**Pflicht-Klärung:** Keine — KNOWN_ORPHANS-Entries sind by definition (test-only + Slice 227 @experimental).

**Autonom-Zone:** Allowlist-Begründungs-Wording, Stats-Output-Format, Report-Markdown-Layout.

**Nicht-Autonom:** Wire-Plan-Decisions für die 9 echten unused (Slice 239 Anil-Decision).

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| Tool / Script | Pre/Post Audit-Output + AC-Verify (allowlist visible, real-drift unverändert) → `worklog/proofs/242-orphan-detector-smoke.txt` |

## 11. Scope-Out

- **9 echte unused-Components Wire-Plan** → Slice 239 (Anil-Decision)
- **Generic Allowlist-Loader** (z.B. JSON-File) → out-of-scope, in-script-const reicht
- **Future Auto-Detect-test-only** (jede onlyInTests=true auto-allowlist) → erwogen, aber explicit ist sicherer (Allowlist-Entry zwingt zu Begründung)
- **Issue #30 closen** → out-of-scope, will autoclose when nightly-audit re-runs post-Slice-242 + exit-status changed (oder bei Master-Tracker-Pattern)

## 12. Stage-Chain

```
SPEC → IMPACT (skipped: Tool-only)
     → BUILD (orphan-component-detector.ts edit)
     → REVIEW (self-review D35 — Pattern-Wiederholung Slice 238/240 Audit-Tool-Refinement)
     → PROVE (Pre/Post-Run + AC-Verify)
     → LOG
```

## Wiring (Slice-Type=Tool DoD-Pflicht)

`scripts/orphan-component-detector.ts` Wiring (pre-Slice-242 + unverändert):
- `package.json` npm-Script: `audit:orphan` ✓
- `.github/workflows/nightly-audit.yml`: Step (Slice 233 + 234) ✓
- Failure-Handling: exit 1 + Auto-Issue ✓

Slice 242 ändert NUR Logik (allowlist), kein Wiring-Change.

## Open Risiko

**Risk:** CommunityValuation Allowlist-Entry wird nie geupdated wenn Anil delete-Decision trifft (Slice 239 reviews allowlist). **Probability:** LOW — Slice 239 Spec wird allowlist-Update als AC enthalten. **Mitigation:** Allowlist-Entry-Begründung referenziert Slice 227 + Future-Slice-239 für Discovery.
