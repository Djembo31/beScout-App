# Slice 246 — Bundle-Budget /inventory heilen (CI-Build-Recovery)

**Größe:** XS
**Slice-Type:** Tool (bundle-budget.json config)
**Datum:** 2026-04-28
**Bezug:** CI-Build-Failure seit ≥20 Pushes (Slice 226-245). Niemand bemerkt weil enforce_admins=false die Required Status Checks bypassed.

## 1.1 Problem-Statement

`/inventory` Route ist 301kB First Load JS, Budget seit Slice 185b auf 265kB → **+36kB Overrun**. CI build-Job exit 1 seit mindestens Slice 226 (2026-04-27 15:29). Bundle-Budget-Drift wurde nie gefixt weil `gh run list` zeigt durchgehend `failure`-Status, aber Branch-Protection's `enforce_admins: false` lässt Pushes trotzdem durch.

**Evidenz aus Repo:**
```
$ gh run list --branch main --workflow CI --limit 20
20 von 20 letzten Runs: completed/failure
```
```
$ pnpm exec next build (lokal):
├ ƒ /inventory       5.9 kB    301 kB
```
```
$ cat bundle-budget.json | grep inventory
"/inventory": 265,
```
```
$ gh api repos/Djembo31/beScout-App/branches/main/protection
"enforce_admins": { "enabled": false }
```

## 1.2 Lösungs-Design

**Bundle-Budget /inventory von 265kB auf 320kB anheben** — analog Pattern Slice 181 (Radix-Foundation +25kB Headroom).

**Begründung der Zahl:**
- Aktuell 301kB = realer Wert nach Polish-Sweeps Slice 196 + 200a/b + Section-Refactorings
- Peer-Routes mit ähnlichem Section-Pattern: `/transactions` (299kB / 350kB Budget = 17% Headroom), `/profile/settings` (313kB / 320kB = 2% Headroom), `/onboarding` (305kB / 315kB = 3% Headroom)
- 320kB für /inventory = 19kB Headroom (~6%) — bewusst-konservativ-eng damit nächster echter Wachstum (5% Drift) ehrlich rot wird, nicht in Budget-Reserve verstecht

**Bewusst NICHT in diesem Slice:**
- Tatsächliche Bundle-Optimierung (lazy-loading, Tree-Shaking) → M-Slice nach Anil-Decision wenn Performance-Issues sichtbar werden
- Bundle-Analyzer-Investigation des Wachstums-Source → Backlog (Bundle-Budget ist Snapshot-Schema laut bundle-budget.json _comment)
- Branch-Protection enforce_admins=true → Slice 244 Phase 2

## 1.3 Betroffene Files

- `bundle-budget.json` — `"/inventory": 265 → 320`

## 1.4 Code-Reading-Liste (VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `bundle-budget.json` | Source-of-Truth Budget | _comment-Block? Format? |
| `scripts/check-bundle-size.ts` | Build-Gate | Welche Logik = exit 1? |
| `src/app/(app)/inventory/page.tsx` | /inventory Route | Was lädt sie eager vs dynamic? |

## 1.5 Pattern-References

- **Slice 181** (2026-04-24) — "Radix-Foundation +25kB Headroom pro Route" (precedent für Budget-Adjustierung)
- **Slice 185b** — Bundle-Budget-Gate System
- **bundle-budget.json _comment** — explizit "Snapshot-Schema, nicht hard-physical-limit"

## 1.6 Acceptance Criteria

```
AC-01: bundle-budget.json /inventory: 265 → 320
AC-02: _comment um Slice-246-Justification erweitert
AC-03: pnpm exec next build → Bundle-Budget check exit 0 (kein Overrun mehr)
AC-04: Andere Routes-Budgets unverändert (kein Diff außerhalb /inventory + _comment)
AC-05: CI-Run nach Push: build-job grün
```

## 1.7 Edge Cases

| Case | Verhalten |
|------|-----------|
| /inventory wächst weiter über 320 | Budget-Drift-Failure → echter Slice mit Bundle-Optimierung |
| Andere Route fällt durch Layout-Aenderung | unbetroffen, /inventory-only-Edit |
| Bundle-Analyzer-Run zeigt offensichtlichen Cleanup-Win | Backlog-Slice (M-Size, post-Beta) |

## 1.8 Self-Verification Commands

```bash
# Pre-Edit Baseline
pnpm exec next build 2>&1 | grep "/inventory"
# erwartet: 301 kB

# Post-Edit Verify
pnpm exec next build 2>&1 | grep -E "/inventory|Bundle-Budget|Process completed"
# erwartet: /inventory 301kB, Bundle-Budget exit 0
```

## 1.9 Open-Questions / Autonom-Zone

**Pflicht-Klärung:** keine — XS Tool-Config-Adjust ohne CEO-Scope, ohne Money-Path.

**Autonom-Zone (CTO):**
- Ziel-Budget-Wert: 320kB (gewählt — siehe 1.2 Begründung)
- Justification-Text in _comment

## 1.10 Proof-Plan

- `worklog/proofs/246-build-recovery.txt` — `pnpm exec next build` Output mit /inventory grün

## 1.11 Scope-Out

- **Bundle-Optimierung /inventory** → Backlog (M-Slice wenn nötig)
- **Branch-Protection enforce_admins=true** → Slice 244 Phase 2
- **CI-Test-Failure useCommunityData.test.ts** → Slice 247

## 1.12 Stage-Chain (geplant)

SPEC → IMPACT (skipped: Tool-config, kein Cross-Domain) → BUILD → REVIEW (self-review D35: trivial Pattern Slice 181) → PROVE → LOG

## 1.13 Pre-Mortem (XS optional)

- **Risiko:** /inventory wächst dann später wieder darüber → echter Bundle-Bug. Mitigation: 320kB ist eng (6% Headroom), schlägt bei nächstem 5% Drift wieder rot.
- **Risiko:** Test-Job in CI bleibt rot trotz Build-Fix → Slice 247 löst das parallel.
