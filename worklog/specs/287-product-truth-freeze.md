# Slice 287 — Product Truth Freeze (S0 Stabilization)

Status: SPEC / BUILD docs-only
Date: 2026-06-13
Size: S
Type: Docs / Product Truth / Continuity

---

## Trigger

Anil: "clude ist durch, du bist dran" after Slice 286 completed.

Context:
- Stabilization Master Audit identified truth drift as the first stabilization blocker.
- Claude completed Slice 284 key-independent waves plus 285/286 follow-ups.
- Current `worklog/active.md` is idle at Slice 286 DONE.

---

## Goal

Freeze the current BeScout product truth so future agents do not read stale mockup/pilot docs as current instructions.

---

## Scope

Allowed:
- docs/status/memory only.
- Add current product truth pointer.
- Mark stale README/vision docs as historical or routed through current truth.
- Update beta wording where it contradicts D71 reality.
- Update worklog with this docs-only slice.

Forbidden:
- no `src/**` runtime changes.
- no migrations.
- no feature fixes.
- no UI changes.
- no deletion of historical docs.

---

## Acceptance Criteria

AC-01: A compact current product truth file exists and names the authoritative current sources.

AC-02: README no longer claims the app is an MVP starter / mock-data app without warning.

AC-03: Historical vision docs are not deleted, but carry a warning/pointer that current truth overrides stale pilot/token/launch assumptions.

AC-04: Beta-phase wording no longer implies READY always equals 50-tester onboarding when current D71 status is factual live beta with 3 testers.

AC-05: Proof verifies docs-only scope and no `src/**` changes from this slice.

---

## Implementation Plan

1. Create `memory/current-product-truth.md`.
2. Replace README with a current short project README that points to truth docs and commands.
3. Add top warning blocks to `docs/VISION.md` and `memory/semantisch/produkt/bescout-vision.md`.
4. Patch `worklog/beta-phase.md` phase definition line for READY semantics.
5. Update `worklog/active.md`, `worklog/log.md`, and proof/review docs.

---

## Verification

Use:

```bash
git diff --name-only
python - <<'PY'
from pathlib import Path
changed = '''$(git diff --name-only)'''.splitlines()
print(changed)
PY
```

Manual proof:
- no `src/` files included in Slice 287 diff.
- current truth file exists and is readable.
- README top no longer says current backend is mock-data.
