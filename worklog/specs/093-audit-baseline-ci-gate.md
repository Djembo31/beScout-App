# Slice 093 — CI-Gate: silent-fail-audit Baseline

## Ziel (1 Satz)
`--check` Flag + `.audit-baseline.json` committed + CI step → PR schlägt fehl wenn HIGH-count gegen Baseline ansteigt.

## Betroffene Files

| Path | Fix |
|------|-----|
| `scripts/silent-fail-audit.ts` | `--check` flag: lädt baseline, vergleicht, exit 1 bei HIGH-increase |
| `.audit-baseline.json` (NEU) | Persisted baseline: total=193, high=98, medium=95 (Slice 092 post-state) |
| `package.json` | Script `audit:silent-fail` + `audit:silent-fail:check` |
| `.github/workflows/ci.yml` | Neuer Step `silent-fail-check` im `lint` job |
| `.claude/rules/common-errors.md` | §1 um CI-Gate Doku ergänzen |

## Check-Logic

```
current = run audit → { total, high, medium }
baseline = JSON.parse(.audit-baseline.json)

if current.high > baseline.high:
  console.error('❌ HIGH increased: ${current.high} > ${baseline.high}')
  exit 1
elif current.medium > baseline.medium:
  console.warn('⚠ MEDIUM increased: ${current.medium} > ${baseline.medium} (soft)')
  exit 0
else:
  console.log('✅ audit within baseline')
  exit 0
```

Soft-warning für MEDIUM: nicht-blockierend, aber sichtbar im CI-log.

## Baseline-Update-Workflow
1. Developer fixt Silent-Fails, HIGH sinkt
2. Entwickler-machen: `npm run audit:silent-fail` → JSON ausgeben
3. Commit `.audit-baseline.json` mit neuen (niedrigeren) counts
4. CI-Gate passt Baseline weiter runter

## Acceptance Criteria

1. `npx tsx scripts/silent-fail-audit.ts --check` liest baseline, exit 0/1 korrekt.
2. `.audit-baseline.json` existiert mit `{total:193,high:98,medium:95}`.
3. package.json hat 2 neue scripts.
4. CI-Job `lint` hat step `silent-fail-audit --check` nach `type-check`.
5. Local test: `--check` grün (counts match baseline).
6. tsc clean.

## Edge Cases

- Missing baseline file → audit-script loggt "no baseline yet, writing initial" + writes current + exit 0 (first-run grace).
- Counts = baseline → grün.
- HIGH sinks unter baseline → warn "baseline outdated, consider updating" + exit 0.
- `--check` ohne `--baseline` argument → default path `.audit-baseline.json` relativ ROOT.

## Proof-Plan

- Baseline JSON committed mit aktuellen counts.
- `npm run audit:silent-fail:check` lokal grün.
- CI yml-change committed + push → GitHub Actions lint-job grün.

## Scope-Out

- Pre-commit hook (husky) — nicht installed.
- Slack-Notify bei HIGH-increase → separate Slice.
- Per-pattern-Baseline (statt aggregate) → separate Slice.
- HIGH auto-reduction via auto-fix — separate Slice (`/optimize`-ähnlich).
