# Slice 290 Review — Home Portfolio Floor Parity

Status: PASS
Date: 2026-06-13
Reviewer: Hermes self-review after TDD cycle

---

## Review checks

- The fix targets exactly Slice 289 F-1: Home scalar floor vs Manager/Market canonical floor.
- No broad refactor: only `useHomeData` and its focused test changed.
- No full-list player fetch reintroduced; Home still uses byIds mini fetch, now including holding IDs.
- Fallback preserved: if canonical byIds player is unavailable, Home still uses `h.player.floor_price` from the Home dashboard payload.
- Existing cost semantics preserved: `avgBuy` and `portfolioCost` still come from holdings avg buy price.

---

## Risk review

Risk: adding holding IDs to Home mini fetch could add extra requests.
Mitigation: this remains a targeted byIds fetch for owned players plus existing trending/IPO IDs, not the removed 4.2MB `usePlayers()` full-list fetch.

Risk: query key churn from non-stable arrays.
Mitigation: IDs are deduped through `Set` inside `useMemo`; source arrays are dashboard/trending/IPO query outputs already used by the hook.

Risk: delayed dashboard could produce first render with fallback/empty IDs.
Mitigation: once dashboard resolves, holding IDs enter byIds and canonical floors replace scalar fallback. Existing hook already tolerates staged query resolution.

---

## Verdict

PASS.

The change is narrow, TDD-backed, and directly resolves the highest demo-coherence finding from Slice 289.
