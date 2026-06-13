# Slice 293 Review — Deterministic Fantasy Lifecycle E2E

**Reviewer:** reviewer-Agent (Cold-Context) · **Datum:** 2026-06-13 · **time-spent:** ~14 min

## Verdict: PASS

A genuinely well-built test slice. The core question — „kann der Test bei echter Regression rot werden?" — is answered with a clear yes for every assertion, and each anchor was verified against live source. Two MINOR observations and one NIT, none blocking.

## Findings

| # | Severity | Location | Issue | Fix | Status |
|---|----------|----------|-------|-----|--------|
| F-1 | MINOR | spec:32 | i18n-leak namespace list is opportunistic, not exhaustive — a leak in an unlisted namespace escapes detection. | Comment that list is best-effort allowlist. | ✅ inline-fixed (clarifying comment added) |
| F-2 | MINOR | spec:28 + de.json | `getByText(DATA_LOAD_FAILED)` substring-matches the period-variants `common.errorLoadFailed` / `fantasy.loadError` → widens failure surface beyond intent. | `{ exact: true }` to bind to FantasyError's no-period string. | ✅ inline-fixed (both AC-04 + AC-05 usages) |
| F-3 | NIT | spec:88 | `toHaveClass(/text-gold/)` — robust today; a Tailwind class-rename would break it, but that's a *desirable* drift-catch. | None. | accepted as-is |

## Focus-Antworten

**1. Wirklich deterministisch UND nicht-konditional?** Ja. Jede Assertion ist ein hartes `expect`. Die einzigen `isVisible()`-Calls leben in `dismissOverlays` (helpers.ts) — safe pre-step, keine Assertion. Verifiziert gegen Source: FantasyContent.tsx:187 (skeleton early-return) + :189 (error early-return) sitzen VOR dem FantasyNav-Render → „4 Tabs sichtbar" ist sauberer Beweis für „skeleton cleared AND not error". AC-04-Reasoning korrekt.

**2. Determinismus gegen volatile GW-States?** Stark. Anker rein strukturell (tab role+name, disclaimer-prefix, `text-gold` active-class, `dataLoadFailed`-absence) — stabil über jeden GW-State. Edge-Cases #3/#4 (0 events / leeres RPC-Array) korrekt: „resolved" via tabs-present + error-absent, NICHT via event-existiert. Flake-Risiko nur Cold-Start (mitigiert via retries:1 + nightly Warm-Up).

**3. AC-07 i18n-Regex false-positive?** Low, well-bounded. Regex verlangt `namespace.` + sofortiger Kleinbuchstabe; deutsche Satzgrenzen (`. ` + Großbuchstabe) matchen nie. Disclaimer + ScoringRules triggern nicht.

**4. AC-08 Overflow-Check?** Sinnvoll + robust. ≤1px-Toleranz absorbiert Sub-Pixel-Rounding. `documentElement`-Scope korrekt für horizontalen Page-Overflow.

**5. Helper-Duplikation loginViaUI?** Akzeptabel. Rationale (proven smoke nicht anfassen) ist sound — beta-smoke ist P0-Post-Deploy-Gate, Refactor = Regression-Risiko für 0 funktionalen Gewinn jetzt. ~6 Zeilen, beide teilen Slice-282b-aware `waitForURL(!/login)`. Backlog-Notiz: beta-smoke später auf loginViaUI konvergieren wenn eh angefasst.

**6. nightly continue-on-error Trigger?** Korrekt + YAML-valide. `if: always()` + `continue-on-error: true` nach Smoke-Step, gleiche env. Non-blocking → flaky Run failt Job nicht. Folge: fantasy-lifecycle-Failure wird silent geschluckt (nur in Logs, kein Issue) — intentional per Spec §11 (erst Stabilität beweisen, dann zum Gate promoten).

## Positive

- Jeder Anker traceable + verifiziert: tab labels (de.json Spiele/Events/Mitmachen/Ergebnisse), `text-gold` (FantasyNav.tsx:67), `dataLoadFailed` exact (FantasyError.tsx:20), disclaimer-prefix (de.json:3633), skeleton/error early-returns (FantasyContent.tsx:187/189). Test-Kommentare zitieren exakte Source-Lines — exzellente Traceability.
- Richtiges Mental-Model: Contract (Struktur + data-path-resolved + no-errors) statt volatile Werte. Schließt den 5×-wiederholten demo-yellow-Caveat sauber.
- Pattern-Disziplin: Slice 282b (client-side redirect → waitForURL), SO-4 (Cold-Start retries:1 + Warm-Up), 282a (kein first()-click auf live lists — nutzt stabile Nav-Buttons) alle respektiert.
- AC-04 „tabs-present proves skeleton-resolved" = cleverer, verifiziert-korrekter Collapse zweier Checks in eine deterministische Assertion.
- Proof real: echter Prod-Run (8.1s, 1 passed), tsc clean, Anti-Pattern-grep dokumentiert.

## Learnings (Knowledge-Capture-Kandidaten)

- **patterns.md:** „Contract-Level E2E gegen Live-Prod" — assert Struktur + data-path-resolved (loading-early-return cleared via downstream-element-presence) + error-absence + no-pageerror, NICHT volatile Werte. Reusable Blueprint für die verbleibenden /club, /clubs Lifecycle-E2Es (Demo-Step 8).
- **testing.md (MINOR):** `getByText` substring vs `{ exact: true }` für Error-Anker — bei i18n-Strings die sich nur in Interpunktion unterscheiden (`dataLoadFailed` no-period vs `errorLoadFailed`/`loadError` with-period) → `{ exact: true }` verhindert breitere Failure-Surface (F-2).
