# Slice 174 — Error-Classes Foundation (Tier A3)

**Typ:** S-Slice (2 neue Files, 0 Consumer-Aenderung). Money-Path: Nein (Infrastruktur).
**Impact:** skipped (neue Module, noch keine Consumer).

---

## Ziel

Professionelle Error-Klassen-Hierarchie als Foundation. Services koennen typed errors throwen, UI kann type-check via `instanceof` und Error-Class-spezifisch rendern (Top-Up-CTA bei InsufficientFunds, Retry-Timer bei RateLimit).

---

## Problem

Heute: **0 custom Error-Klassen** im Code. Alle Services throwen `new Error('i18n.key')` als raw String. UI kann nicht zwischen ValidationError, PermissionError, RateLimitError unterscheiden — alles landet im generischen Error-Toast.

Folgen:
- User sieht generische Messages statt passender CTAs
- `setError(err.message)` muss `mapErrorToKey(normalizeError(err))` durchlaufen um i18n-leaks zu vermeiden
- Error-Handling-Code ist ueberall per-catch dupliziert

---

## Professional-Standard (Sorare/Socios)

```ts
class DomainError extends Error { code: string; ... }
class ValidationError extends DomainError { field?: string }
class PermissionError extends DomainError {}
class RateLimitError extends DomainError { retryAfter: number }
class InsufficientFundsError extends DomainError { required: number; available: number }
class NotFoundError extends DomainError {}
class ConflictError extends DomainError {}
```

Plus type-guards: `isInsufficientFunds(err): err is InsufficientFundsError`.

Services throwen `throw new InsufficientFundsError('buy_player', required, available)`. UI:
```ts
if (isInsufficientFunds(err)) showTopUpFlow(err.required - err.available);
else if (isRateLimit(err)) showRetryIn(err.retryAfter);
else showGenericErrorToast(err);
```

---

## Betroffene Files

| # | File | Aenderung |
|---|------|-----------|
| 1 | `src/lib/errors/index.ts` | NEU — 7 Error-Klassen + type-guards + `toDomainError(unknown)` |
| 2 | `src/lib/errors/__tests__/errors.test.ts` | NEU — Coverage aller Klassen + type-guards |

**Nicht geaendert:** Services bleiben bei `throw new Error(...)`. Migration der 61 Services in separaten Slices (B2 Service-Shape-Consolidation).

---

## Acceptance Criteria

1. **A1** — 7 Error-Klassen in Hierarchie `Error → DomainError → {Validation, Permission, RateLimit, InsufficientFunds, NotFound, Conflict, Unexpected}`
2. **A2** — Jede Klasse hat static `code` + strukturierte Felder (retryAfter, required/available, field, ...)
3. **A3** — Type-Guards `isDomainError`, `isValidationError`, ..., `isInsufficientFunds` fuer jede Klasse
4. **A4** — `toDomainError(err: unknown): DomainError` — normalisiert unknown errors (DB-Error-Codes → ValidationError, Supabase-Auth-Error → PermissionError)
5. **A5** — 100% test coverage (alle Klassen + type-guards + toDomainError)
6. **A6** — tsc clean + tests gruen

---

## Proof-Plan

`worklog/proofs/174-errors.txt` — vitest Output + ts-check clean.

---

## Scope-Out

- Service-Migration zu typed errors → Slice B2 (nach Foundation ready)
- UI-Consumer (InsufficientFunds-CTA, RateLimit-Retry-Timer) → separate Frontend-Slices
- `mapErrorToKey` refactor → Slice B2

---

## Time-Estimate

~30 min Implementation + Tests.
