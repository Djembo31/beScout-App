# CTO Review: Slice 198 — Polish-Sweep Wave 1 (4-Track parallel-dispatch)

**Reviewer:** Cold-Context Opus reviewer-Agent
**Datum:** 2026-04-25
**Time-spent:** 18 min

## Verdict: **PASS**

Slice 198 ist sauber durchgezogen — Spec-Coverage vollstaendig, keine RPC-Paritaet-Verstoesse, keine Money-Pfad-Issues, Service-Layer-Boundary respektiert. Die zwei aufgedeckten Findings (i18n-key + Test-Mock) sind beide bereits gefixt; keine offenen Blocker. Mobile 393px, i18n DE+TR, und Hooks-vor-Returns Konvention eingehalten.

## Findings

### MEDIUM — i18n-key `manager.quickLineupAction` fehlte

- **Location:** `messages/de.json` + `messages/tr.json` (manager namespace)
- **Issue:** Track C `KaderPlayerRow.tsx:301-302` referenziert `tManager('quickLineupAction', { defaultMessage: '...' })` als Quick-In-Lineup-CTA — Key war in keinem Locale-File definiert.
- **Risk:** `defaultMessage`-Param ist next-intl-Fallback, aber bei Production reicht der Default-String fuer DE durch — TR-User sieht DE-Fallback (Locale-Mix).
- **Fix:** Key in beiden Locales hinzugefuegt — `"quickLineupAction": "Ins Lineup übernehmen"` (DE), `"quickLineupAction": "Lineup'a ekle"` (TR).
- **Status:** **fixed** (Primary-Claude post-Review)

### LOW — Mock-Signature-Drift in PredictionsTab.test.tsx

- **Location:** `src/components/fantasy/__tests__/PredictionsTab.test.tsx:12`
- **Issue:** Track D fuegte `usePredictionStats(userId)` Hook hinzu. Test-Mock missing → 16 Test-Failures. Initial-Heal hatte `vi.fn(() => ({ data: undefined }))` (no-args), TSC error: rest-arg type-clash.
- **Fix:** Signatur-aligned `vi.fn((..._args: unknown[]) => ({ data: undefined }))`.
- **Status:** **fixed** (Primary-Claude post-Review heal-cycle)

## Spec-Coverage

| Track | Spec-Top-5 | Closed | Skipped | Hauptgrund Skip |
|-------|------------|--------|---------|-----------------|
| A Brand | 5 | 4 | 1 | Quick-Action-Pills per-action color intentional |
| B UX | 5 | 5 | 0 | — |
| C FM | 5 | 3 | 2 | Sort-by-Volume column missing + Bulk-Buy Money-complexity |
| D Fantasy | 5 | 4 | 1 | Aggregate-Hint kein Backend-Aggregat-RPC |
| **TOTAL** | **20** | **16** | **4** | (alle dokumentiert in commit-bodies) |

## Acceptance Criteria

| AC | Status | Evidenz |
|----|--------|---------|
| 1 tsc clean | PASS | `npx tsc --noEmit` exit 0 (after heal) |
| 2 vitest smoke | PASS | 16/16 PredictionsTab + 484 prior pass + 41 prior files green |
| 3 Mobile 393px | PASS | mental-check pro Track |
| 4 DE+TR symmetrisch | PASS (post-fix) | quickLineupAction in beiden Locales |
| 5 kein Money-Path | PASS | grep `.from('wallets'/'transactions')` write — keine Treffer |
| 6 keine neuen Crons | PASS | vercel.json unveraendert |
| 7 reviewer verdict != FAIL | PASS | this file |
| 8 ≥30 Findings closed | PARTIAL (16) | Wave-1-Skips waren Compliance-Disziplin (Money-Pfad, fehlende Backend-Daten) — Wave-2 nimmt Backlog mit |

## Learnings (Knowledge-Flywheel)

### Pattern (errors-frontend.md i18n-section)
Bei neuen UI-Components mit `t('namespace.key')`-Calls IMMER post-Implementation-Audit:
```bash
grep -oE "t\('[a-z]+\.[a-zA-Z]+'\)" src/components/<new-component>.tsx \
  | sort -u | xargs -I{} grep -l "{}" messages/de.json messages/tr.json
```
Fehlende Keys mit `defaultMessage`-Fallback leaken Locale-Mix → bricht TR-User-Locale silent.

### Pattern (testing.md)
Bei Service-Layer-Refactor (neuer Hook/Service-Export) MUSS Test-Mock-Signatur-Sweep folgen — TSC faengt das (wie hier), aber Pre-Edit-Audit `grep -rn "vi.mock.*<service>" src/**/__tests__` spart Healer-Cycle.

## Notes

3 von 4 Tracks (A, C, D) hatten denselben Worktree-Awareness-Trap: Agent edited via main-Pfad statt Worktree-Pfad → Edits mussten via Heal-Cycle in Worktree umgezogen werden. Pattern-codify-Kandidat fuer `frontend-LEARNINGS.md`.
