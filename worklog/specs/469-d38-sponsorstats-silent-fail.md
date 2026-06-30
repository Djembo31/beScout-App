# Slice 469 — D-38: sponsorStats Silent-Fail (throw statt return [])

**Status:** SPEC · **Größe:** XS · **Slice-Type:** Service · **Scope:** CTO · **Datum:** 2026-06-30

## 1. Problem Statement
`src/lib/queries/sponsorStats.ts:14-17` — `fetchSponsorStats` schluckt den RPC-Error (`console.error` + `return []`) → React Query cached `[]` als **SUCCESS** (kein Retry, kein Error-State; Admin sieht leere Sponsor-Stats ohne Fehler-Hinweis). common-errors §1 „Service Error-Swallowing". Reviewer-Catch S467/D-38.

## 3. Betroffene Files
| File | Aktion | Begründung |
|------|--------|------------|
| `src/lib/queries/sponsorStats.ts` | EDIT | `if (error) throw new Error(error.message)` statt `return []` |

## 4. Code-Reading-Liste
- `sponsorStats.ts` (Silent-Fail-Stelle) — **ERLEDIGT**.
- Consumer `AdminSponsorsTab.tsx:204` (`stats ?? []`) + `AdminSponsorTab.tsx:49` (`allStats ?? []`) — **ERLEDIGT: beide guarden undefined** → throw crasht nicht, nur kein Silent-Cache mehr. Beide admin-gated.
- `common-errors.md` §1 „Service Error-Swallowing" (throw → React Query retried).

## 6. Acceptance Criteria
```
AC-01: [ERROR] RPC-Error wird geworfen (nicht geschluckt)
  VERIFY: Code: `if (error) throw new Error(error.message)`
  EXPECTED: throw; React Query → Error-State + Retry
  FAIL IF: return [] / console.error-only
AC-02: [REGRESSION] Consumer crashen nicht bei undefined data
  VERIFY: AdminSponsorsTab `stats ?? []` (204) + SponsorStatsSection-Prop; AdminSponsorTab `allStats ?? []` (49)
  EXPECTED: beide guarden → kein .map/.reduce auf undefined
  FAIL IF: ungeguardetes stats.map
AC-03: [REGRESSION] tsc
  VERIFY: npx tsc --noEmit → exit 0
```

## 8. Self-Verification
```bash
npx tsc --noEmit
grep -n "throw new Error" src/lib/queries/sponsorStats.ts
```

## 10. Proof-Plan
Code-Diff (throw) + Consumer-Guard-Beleg (stats ?? []) + tsc 0 → `worklog/proofs/469-d38-sponsorstats.txt`

## 12. Stage-Chain
SPEC → BUILD (1 Edit) → REVIEW (self-review, XS triviale common-errors-§1-Pattern-Wiederholung) → PROVE (tsc + Consumer-Guard) → LOG
