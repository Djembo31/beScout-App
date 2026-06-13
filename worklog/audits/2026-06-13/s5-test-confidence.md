# S5 — Test-Confidence Audit

**Slice:** 300 · **Datum:** 2026-06-13 · **Status:** AUDIT (Klassifikation) + Ratchet-Guard (Enforcement) + 2 Placeholder-Fixes
**Scope:** Master-Audit §7 (Test-Confidence-Befund) + §10 Slice S5 + §11.4 Anti-Kreis-Regel

> Maschinen-Report (Counts) → `scripts/test-confidence-check.ts` → `s5-test-confidence-report.md`.
> Dieses Doc ist die kuratierte Taxonomie-Klassifikation + Disposition.

---

## 1. Befund (244 Test-Files, read-only)

- **7 `expect(true).toBe(true)`-Placeholder** in 4 Files (pre-Fix)
- **1 `it.skip`** (ProfileView)

## 2. Taxonomie-Klassifikation (§7) + Disposition

| File:Line | Klasse | Bewertung | Disposition (Slice 300) |
|-----------|--------|-----------|--------------------------|
| `community/__tests__/ResearchCard.test.tsx:13` | **PURE-Placeholder** | no-op `it`, describe = „already tested in PostCard" → 0 Vertrauen | **gelöscht** (false-green entfernt) |
| `layout/__tests__/NotificationDropdown.test.tsx:17` | **PURE-Placeholder** | ganzer File no-op, „too coupled to portal" → 0 Vertrauen | **real gemacht** — Render-Smoke (open→dialog+empty-state, closed→null). portalTarget=document.body (jsdom-OK), real lucide+cn (Proxy-Mock crashte Suite-Load) |
| `community/hooks/__tests__/useCommunityActions.test.ts:1572` | **WEAK** | `// No crash = success` — Hook läuft, assertion trivial | **bleibt** (kein false-green, Hook wird real ausgeführt); Folge-Backlog S5-F-1 |
| `lib/__tests__/bug-regression.test.ts:84,110,182,203` | **CONDITIONAL** | data-gated Integration-Guards (`if (no data) expect(true)…`) gegen Live-Prod | **bleibt** (legitim — kein false-green, Test validiert wenn Daten da; Skip-Pfad nur bei leerem Dataset) |
| `profile/__tests__/ProfileView.test.tsx:544` | **HONEST-SKIP** | `it.skip` + TODO „Feature not implemented" | **bleibt** (ehrlich markiert, skipped ≠ false-green) |

**Pure-Placeholder (0 Vertrauen):** 2 → beide bereinigt.
**Akzeptabel (kein false-green):** 5 (1 weak + 4 conditional) + 1 honest-skip → bleiben, Baseline friert ein.

## 3. Enforcement (dieser Slice)

`scripts/test-confidence-check.ts` + `.test-confidence-baseline.json` — Baseline-Ratchet (patterns.md #49, 3. Instanz nach silent-fail + boundary):
- Baseline post-Fix: **placeholders 5, skips 1**.
- `--check` (pre-commit Step 6): exit 1 NUR bei Anstieg (strict `>`).
- Zählt `expect(true).toBe(true|Truthy)` + `it/test/describe.skip` + `xit`/`xdescribe`.
- Verhindert NEUE false-greens ohne Bestands-Zwang. Master-Audit §11.4 von Prosa → enforced.

## 4. Folge-Findings (separate Slices — NICHT in 300)

| ID | Finding | Vorschlag | Prio |
|----|---------|-----------|------|
| **S5-F-1** | useCommunityActions:1572 WEAK „no-crash"-assertion | echte Behavior-Assertion (Service-Call-Count bei empty userId) | P3 |
| **S5-F-2** | bug-regression CONDITIONAL `expect(true)` bei no-data | optional: `test.skip()` mit Skip-Reason statt no-op-pass (Klarheit), oder belassen | P3 |
| **S5-F-3** | Mock-lastige Tests systematisch erfassen (§7) | Audit-Pass „Behavioral vs Mock-against-Mock" auf Demo-Path-Tests | P2 (Confidence) |
| **S5-F-4** | ResearchCard callColor/categoryColor-Tests tautologisch (testen Literal-Arrays, nicht Component) | echte Component-Render-Tests ODER löschen | P3 |

## 5. Scope-Out

- Keine Migration der WEAK/CONDITIONAL-Vorkommen (Baseline friert ein).
- Kein systematisches Mock-Heavy-Audit (= S5-F-3, eigener Slice).
- Kein S6 Dead-Artifact-Inventory.

## 6. Anti-Kreis-Compliance

- §11.4 (Testanzahl ≠ Vertrauen ohne Placeholder/Skip-Trennung): jetzt enforced + dokumentiert. ✅
- §10 S5 („real machen ODER quarantinen"): 2 PURE → 1 real + 1 gelöscht. ✅
- §11.8 (Proof): test-confidence-check Runs + synthetic-fail + 2 Test-Files grün. ✅
- §0 (kein Big-Bang): nur 2 PURE gefixt, Rest Baseline-eingefroren. ✅
