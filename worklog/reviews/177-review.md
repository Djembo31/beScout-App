# CTO Review: Slice 177 — Zod + Pilot-Schemas (Tier B1 Foundation)

**Verdict:** PASS
**time-spent:** 35 min
**reviewer:** cold-context reviewer-agent (2026-04-23)
**note:** Finding #2 (`isValidationError` Type-Guard) wurde IN 177-Scope geschlossen (1-Line-Change pro Route, 4 Routes).

---

## Spec-Coverage

| AC | Status | Evidence |
|----|--------|----------|
| A1 | PASS | `zod@4.3.6` in dependencies, pnpm-lock updated |
| A2 | PASS | 3 Schema-Files (DRY: backfill-ratings + backfill-positions share `backfillGameweek.schema.ts`) |
| A3 | PASS | `parseBody(req, schema)` wirft `ValidationError` mit `field` + `message` + `cause` |
| A4 | PASS | 4 Pilot-Routes migriert, Cast-Pattern durch `isValidationError`-Guard ersetzt |
| A5 | DEFERRED | Spec-AC5 widerspricht Spec-Risks (withLogger out-of-scope) → Slice 177b für withLogger-Integration |
| A6 | PASS | 25/25 Tests grün (6 InviteClub + 10 BackfillGW + 4 SyncContracts + 5 parseBody) |
| A7 | PASS | tsc clean, Proof-File bestätigt |

## Findings

| # | Severity | Status | Issue | Fix |
|---|----------|--------|-------|-----|
| 1 | MEDIUM | Follow-Slice 177b | Observability-Gap: ValidationError wird nicht via Sentry captured (Admin-Routes nutzen nicht `withLogger` aus Slice 175) | Slice 177b: Admin-Routes auf `withLogger` migrieren — dann AC5 vollständig |
| 2 | MEDIUM | ✅ RESOLVED in-slice | Cast-Pattern `(err as { field?: string }).field` statt Type-Guard | `isValidationError` aus `@/lib/errors` in allen 4 Routes, 0 Casts mehr |
| 3 | LOW | Follow-Slice | `sync-contracts` legacy `invalid_json`-Fallback Test fehlt | 1 Test für empty-body-Default später |
| 4 | LOW | Doku-Follow-up | `BackfillGameweekSchema` output-key-rename `{gameweek}`→`{gameweeks}` untyped in JSDoc | JSDoc ergänzen |
| 5 | LOW | Informational | Zod v4 `.uuid()` / `.email()` deprecated (funktioniert bis v5) | Bei v5-Upgrade: Audit-grep `z\.string().*\.(uuid\|email)` |
| 6 | LOW | Follow-Slice | Modal-Regex vs Zod `.email()` können divergieren | Shared-Regex-Konstante oder Modal-Client-Validation droppen |
| 7 | LOW | Follow-Slice | Edge-Cases nicht getestet: XSS, IDN-Unicode, explicit null | `*.schema.test.ts` Batch erweitern |
| 8 | LOW | Cosmetic | `syncContracts.schema.ts` double-default redundant | 1 Ebene entfernen |

## Pattern-Konformität

- ✅ **Slice 174 DomainError** — `ValidationError` korrekt geworfen, Type-Guard genutzt
- ✅ **Slice 176 captureError** — nicht in 177-Scope (Routes ohne withLogger), gehört zu 177b
- ✅ **Money/CEO-Scope respektiert** — keine Trading/Money-RPCs in Scope, Spec-OUT eingehalten
- ✅ **Server-only Bundle** — Zod (`~14kB gzipped`) nur in route.ts, 0 Client-Bundle-Impact
- ✅ **Spec-driven** — Scope-Out explicit, kein Scope-Creep

## Fokus-Antworten

**Zod v4 Compat:** 3 Schemas v4-konform. `.uuid()` strict (nur v4 UUIDs — PostgreSQL `gen_random_uuid()` ist v4, kompatibel). `.email()` ASCII-only (potentielles TR-IDN-Problem, Follow-Slice).

**parseBody ValidationError:** Nach Finding-#2-Fix nutzt Route `isValidationError(err)` Type-Guard → `err.field` direkt typed, kein Cast mehr.

**sync-contracts `invalid_json` Sonderfall:** Legitim (legacy empty-body-Verhalten), aber dokumentations-wert. Finding #3 LOW.

**BackfillGameweek Range:** Output-key-Rename `{gameweek}`→`{gameweeks}` funktional OK (Consumer lesen `parsed.gameweeks`), aber JSDoc fehlt. Finding #4 LOW.

**Money/CEO-Scope:** Korrekt ausgeschlossen. Keine Trading-Routes in Scope.

**Backward-Compat UUIDs:** Postgres `gen_random_uuid()` ist v4 → kompatibel. Admin-UI sendet solche UUIDs direkt.

**Bundle-Size:** Zod ist server-only bundled (bestätigt via Grep: keine 'use client' Component importiert aus `src/lib/schemas/`).

## Positive

- Type-safe Input-Inference via `z.infer<typeof Schema>` exportiert
- Clean DRY: BackfillGameweekSchema shared spart ~20 LOC
- ValidationError mit Zod-Error als `cause` für Debugging
- Server-only Bundle — 0 Client-Impact
- Solide Edge-Case-Rejection (inverted range, out-of-bounds, non-numeric)
- Email-Normalization (trim + lowercase)
- Spec-driven Scope-Out (Money-Routes, Client-Validation)
- In-slice Finding-#2-Resolution — Ferrari-Standard
- Proof-Artefakte vorbildlich (pnpm ls + tsc + vitest + git diff + Beispiel-Inputs)

## Learnings für Knowledge-Capture

1. **Pattern `common-errors.md`:** "Type-Guard narrow auf DomainError-Subclass statt Cast. `isValidationError` / `isPermissionError` etc. aus `@/lib/errors`. Niemals `(err as { field? })`-Casts nach Slice 174."
2. **Pattern `common-errors.md`:** "Zod v4 deprecated string-chains. Bei Major-Bump auf v5: `z.string().uuid()` → `z.uuid()`, gleiches für `.email()`. Audit-grep bereitstellen."
3. **Pattern `memory/patterns.md`:** "Validation-Stack für Admin-Routes = Schema + parseBody + isValidationError-Guard. Slice 177b für withLogger-Integration."

## Summary

Solide B1-Foundation. 7/7 AC (A5 bewusst deferred zu 177b), Finding #2 in-slice resolved. Pilot-Migration wertvoll und blueprint-fähig für die nächsten ~15 Routes. Tests minimal-aber-ausreichend, Types sauber, Scope-Out respektiert. Merge-ready.

**Empfohlener nächster Slice:** 177b — `withLogger`-Migration für 4 Admin-Routes (schließt AC5). Danach 178 (Idempotency Tier A1) oder 179 (Transactions Append-Only Tier A2).
