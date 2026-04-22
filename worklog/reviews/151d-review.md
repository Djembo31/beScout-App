# Slice 151d Review — ESLint-Rule + Pattern D18 + Audit-Script

**Verdict:** PASS (self-review, infrastructure-only)
**Reviewer:** Primary-Claude (self-review, no code-logic change)
**Time-spent:** 15 min

## Scope

- `.claude/rules/common-errors.md` — Pattern D18 + "Money-RPC Idempotency-Window" Subsection
- `scripts/audit-mutation-race.sh` (NEW) — Grep-based race-audit
- `package.json` — +2 npm-scripts (audit + audit:check)
- `.eslintrc.json` — +1 `no-restricted-syntax` rule gegen async onClick

## Pattern-Check

- **Pattern D18:** Klare Erklaerung + Fix-Reference auf useSafeMutation + Migration-Plan-Link (150-audit.md).
- **Audit-Script:** Grep-based, schnell (<1s), exit-code-stable. Baseline-File geschrieben.
- **ESLint-Rule:** Warn-level (nicht Error) — weiche Migration. Kann spaeter auf Error gesetzt werden.

## Findings

Keine. Infrastructure-only, kein Code-Logic-Change.

## Positive

- Audit-Script fuellt Luecke zwischen Pattern-Dokumentation und CI-Gate.
- Script zeigt Migration-Candidates fuer Slice 152+ (Money-Path priorities).
- ESLint-Rule ist defensive — fuer NEUE Code, nicht Backlog-Migration.
- Pattern D18 enthaelt beide Aspekte: Client-Guard (useSafeMutation) + Server-Guard (Idempotency-Window).

## Final Verdict

PASS.
