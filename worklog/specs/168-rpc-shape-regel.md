# Slice 168 — RPC-Shape-Konsistenz-Regel (database.md)

**Size:** XS · **Stage:** SPEC · **Started:** 2026-04-23
**Type:** Docs (codifiziert Slice 165 Reviewer-Learning)

## Ziel

Explicit RPC-Shape-Konvention in `database.md` codifizieren, bevor weitere RPCs mit inkonsistenter Return-Shape gebaut werden. Learning aus Slice 165: `vote_post` RPC hatte Success-Path `{upvotes, downvotes}` ohne `success: true` flag vs Error-Path `{success: false, error}` — silent-cast-vulnerable im Service.

## Hintergrund (Slice 165)

```sql
-- vote_post Migration (20260404192000):
-- Success-Path:
RETURN json_build_object('upvotes', v_up, 'downvotes', v_down);  -- kein success-flag!

-- Error-Path:
RETURN json_build_object('success', false, 'error', 'Ungueltiger vote_type');
```

Discriminator war effektiv "Vorhandensein von upvotes-Feld" — fragil, Service-Cast lügt bei Error-Body. Slice 165 hat Service-seitig gehärtet. Slice 168 codifiziert DB-seitige Regel.

## Betroffene Files

1. **`.claude/rules/database.md`** "RPC Regeln"-Abschnitt erweitern:
   - Neue Regel: "RPC-Return-Shape MUSS discriminated union sein — Success-Path immer `{success: true, ...}`"
   - Anti-Pattern-Beispiel: vote_post alt vs neu
   - Audit-Command für bestehende inkonsistente RPCs
   - Cross-Ref zu common-errors.md §1 "Silent-Cast ohne Discriminator-Check"

## Acceptance Criteria

1. `.claude/rules/database.md` "RPC Regeln" hat neuen Bullet für Shape-Konsistenz.
2. Anti-Pattern-Beispiel + Audit-Command enthalten.
3. Cross-Ref zu common-errors.md §1 gesetzt.
4. `tsc --noEmit` clean (docs-only safety).

## Proof-Plan

- `git diff --stat` Summary
- Grep-Visual: `grep -A10 "discriminated union" .claude/rules/database.md` zeigt neue Regel

## Scope-Out

- **Actual RPC-Migrations zur Konsistenz** (vote_post nachziehen auf `{success: true, ...}`): Out-of-Scope. Slice 165 hat Service-seitig gehärtet, jetzt Neue-Code-Regel setzen. Alte RPC-Migrations können optional in eigenem Slice migriert werden (Risk: Consumer-Impact).
