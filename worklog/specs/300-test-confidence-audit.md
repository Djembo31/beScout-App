# Slice 300 — S5 Test-Confidence Audit + Ratchet-Guard

**Slice-Type:** Tool (audit + enforcement script + 2 test-fixes)
**Größe:** M
**CEO-Scope:** Nein (Test-Hygiene-Infra, CTO-Domain — kein src/**-Runtime-Change)
**Datum:** 2026-06-13

---

## 1. Problem-Statement

Stabilization-Master-Audit §7 + §10 Slice S5: „Testgrün wieder aussagekräftig machen." Befund §7: Placeholder-Tests (`expect(true).toBe(true)`), skipped Tests, mock-lastige Tests → grüne Testzahl ≠ Produktvertrauen.

Discovery (read-only, 244 Test-Files):
- **7 `expect(true).toBe(true)`-Placeholder** in 4 Files
- **1 `it.skip`** (ProfileView)

Klassifikation (§7-Taxonomie):
| File | Vorkommen | Klasse |
|------|-----------|--------|
| `community/__tests__/ResearchCard.test.tsx:13` | 1 | **PURE-Placeholder** (no-op `it`, describe sagt selbst „already tested in PostCard") |
| `layout/__tests__/NotificationDropdown.test.tsx:17` | 1 | **PURE-Placeholder** (ganzer File no-op, „too coupled to portal") |
| `community/hooks/__tests__/useCommunityActions.test.ts:1572` | 1 | WEAK (`// No crash = success` — Hook läuft, aber assertion trivial) |
| `lib/__tests__/bug-regression.test.ts` | 4 | CONDITIONAL (data-gated Integration-Guards: `if (no data) expect(true)…` — legitim, kein false-green-Risk) |
| `profile/__tests__/ProfileView.test.tsx:544` | 1 (skip) | HONEST-SKIP (`it.skip` + TODO „Feature not implemented") |

Kein Enforcement gegen NEUE Placeholder/Skips — nur Prosa-Regel §11.4.

## 2. Lösungs-Design

Analog S4 (Slice 299): **Audit-Doc + Baseline-Ratchet-Guard** (Pattern #49), KEIN Big-Bang.

1. **Audit-Doc** `worklog/audits/2026-06-13/s5-test-confidence.md` — Taxonomie-Klassifikation aller 7+1 + Disposition.
2. **Ratchet-Guard** `scripts/test-confidence-check.ts` (#49-Pattern): zählt `expect(true).toBe(true|Truthy)`-Placeholder + Skip-Marker (`it/test/describe.skip`, `xit`, `xdescribe`) je File. Baseline `.test-confidence-baseline.json`, `--check` exit 1 NUR bei Anstieg. Verhindert NEUE false-greens ohne Bestands-Zwang. Verkabelt: package.json + pre-commit + wiring-allowlist.
3. **2 PURE-Placeholder bereinigen** (§10 „real machen ODER quarantinen"):
   - `ResearchCard`: no-op `it` löschen (reines Rauschen; describe = „already tested in PostCard").
   - `NotificationDropdown`: real machen — Render-Smoke (Props-driven, `open`, empty-state). Portal-Target = `document.body` (jsdom-OK), next-intl-Mock → bare keys. Fallback falls Render-Falle: ehrlicher `it.skip` + dokumentierter Grund (ersetzt `expect(true)` durch honest-skip).

WEAK + CONDITIONAL + HONEST-SKIP bleiben (kein false-green-Risk; im Audit dokumentiert). Baseline friert sie ein → kein Neuzuwachs.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `worklog/audits/2026-06-13/s5-test-confidence.md` | NEU — Audit-Doc |
| `scripts/test-confidence-check.ts` | NEU — Ratchet-Guard |
| `.test-confidence-baseline.json` | NEU — Baseline |
| `package.json` | +2 Scripts |
| `.husky/pre-commit` | +1 Step |
| `scripts/wiring-check.ts` | +2 Allowlist |
| `src/components/community/__tests__/ResearchCard.test.tsx` | placeholder-`it` gelöscht |
| `src/components/layout/__tests__/NotificationDropdown.test.tsx` | placeholder → real Render-Smoke |

Kein src/**-Runtime-Change (nur Test-Files + Scripts).

## 4. Code-Reading-Liste (DONE)

| File | Befund |
|------|--------|
| Master-Audit §7 + §10 S5 + §11.4 | Test-Taxonomie + S5-Scope |
| scripts/boundary-check.ts (Slice 299) | Ratchet-Template direkt wiederverwendbar |
| patterns.md #49 | Baseline-Ratchet-Guard-Pattern + Scanner-Falle |
| 4 placeholder-Files + ProfileView | klassifiziert (s.o.) |
| NotificationDropdown.tsx:309/156/381 | portalTarget=document.body (useEffect), mounted via open-Effect, createPortal — real testbar |
| src/test/renderWithProviders.tsx | next-intl-Mock → `(key)=>key`, real QueryClient, navigation gemockt |

## 5. Pattern-References

- **patterns.md #49 Baseline-Ratchet-Guard** — exaktes Template (silent-fail + boundary = jetzt 3. Instanz).
- **Master-Audit §7 Test-Klassen** — Behavioral/Regression/Contract = Vertrauen; Placeholder/Skipped = nein.
- **D54** — Tool muss verkabelt sein.
- **testing.md** — kein Snapshot, renderWithProviders-Pattern, act/waitFor.

## 6. Acceptance Criteria

- AC-1 `test-confidence-check.ts` report-mode → schreibt Report, exit 0.
- AC-2 `--check` at baseline → exit 0.
- AC-3 synthetic +1 `expect(true).toBe(true)` → exit 1; revert → exit 0.
- AC-4 no-baseline → write-initial + exit 0.
- AC-5 Verkabelung (package.json + pre-commit + wiring-allowlist), `audit:wiring:check` exit 0.
- AC-6 Baseline == Live-Stand nach den 2 Fixes (placeholders + skips count).
- AC-7 ResearchCard: placeholder-`it` weg, restliche Tests grün. NotificationDropdown: real Render-Smoke grün (oder honest-skip falls Render-Falle) — KEIN `expect(true).toBe(true)` mehr.
- AC-8 Audit-Doc mit Taxonomie-Tabelle + Disposition.

## 7. Edge Cases

| Case | Erwartung |
|------|-----------|
| `expect(true).toBeTruthy()` Variante | Regex deckt `toBe(true)` + `toBeTruthy()` |
| `it.skip`/`test.skip`/`describe.skip`/`xit`/`xdescribe` | alle als Skip gezählt |
| data-conditional `expect(true)` (bug-regression) | mitzählen (Baseline friert ein) — keine Migration, aber Anstieg blockiert |
| Multi-line skip | regex line-based reicht (Marker auf 1 Zeile) |
| NotificationDropdown Render-Falle (portal/effect) | Fallback honest-skip (entfernt false-green trotzdem) |
| `__tests__`-Scope | Guard scannt nur `*.test.ts(x)` |

## 8. Self-Verification

```bash
npx tsx scripts/test-confidence-check.ts            # report
npx tsx scripts/test-confidence-check.ts --check    # exit 0
npx vitest run src/components/layout/__tests__/NotificationDropdown.test.tsx src/components/community/__tests__/ResearchCard.test.tsx
pnpm run audit:wiring:check                          # exit 0
```

## 9. Open-Questions

- Autonom-Zone (CTO): Guard-Design, Klassifikation, Test-Fixes. Keine CEO-Zone (Anil „1" = S5).
- Folge (NICHT in 300): WEAK useCommunityActions:1572 echte assertion (P3), Mock-lastige Tests systematisch (S5-F-Backlog).

## 10. Proof-Plan

`worklog/proofs/300-test-confidence.txt`: report + `--check` + synthetic-fail + 2 Test-Files grün + wiring exit 0 + baseline-content.

## 11. Scope-Out

- Keine Migration der CONDITIONAL/WEAK-Vorkommen (Baseline friert ein).
- Kein systematisches Mock-Heavy-Audit (eigener Folge-Slice).
- Kein S6 Dead-Artifact.

## 12. Stage-Chain (geplant)

SPEC → IMPACT skipped (Test+Script-Infra) → BUILD → REVIEW → PROVE → LOG.

## 13. Pre-Mortem

1. NotificationDropdown-Render fightet (portal/animation/deps) → Fallback honest-skip (Plan B in Spec).
2. Guard zählt bug-regression-CONDITIONAL als „schlecht" → bewusst mitgezählt, Baseline friert, Audit dokumentiert als legitim.
3. ResearchCard restliche Tests (callColor/categoryColor) sind tautologisch → out-of-scope (kein `expect(true)`), nur im Audit erwähnt.
4. Baseline-Count ändert sich durch die 2 Fixes → Baseline NACH den Fixes einfrieren.
5. Regex zu eng (verpasst `xtest`/`fit`) → Pattern deckt gängige Marker, dokumentiert.
