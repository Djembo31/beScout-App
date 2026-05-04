# CTO Review: Slice 268b — Price-Changes-Cache (Phase 3 Live-Pulse Foundation)

**Reviewer:** Cold-Context-Reviewer
**Datum:** 2026-05-04
**Spec:** `worklog/specs/268b-price-changes-cache.md` (v2 post-Patches)
**Pre-Review:** `worklog/reviews/268b-pre-review.md` (CONCERNS, 14 Findings)
**Time-Spent:** ~40 min

> Slice-Number-Note: D63-Roadmap-Item "Slice 268 Price-Changes Cache" wurde auf
> **268b** umnummeriert wegen Konflikt mit historischem Slice 268 (Cold-Start
> Cache-Mirror, commited 2026-04-30). Pattern analog 264b / 195e / 081b.

---

## Verdict: **PASS**

Saubere Slice-Ausführung. ALLE 14 Pre-Review-Findings adressiert (10× ✓ resolved, 4× ✓ dokumentiert/akzeptiert). Drei-Achsen-Heal (Cache + Service-Throw + Konsument-Migration) ist architektonisch sound, alle Tests grün (5+7+28 = 40 neue/migrierte Cases), tsc + eslint clean, Type-Safety bewahrt. Die `.npmrc`-Erweiterung ist eine notwendige + isolierte Tooling-Reparatur (jsdom 28 ESM-Resolver-Bug), nicht Slice-Scope-Creep — sondern Pre-Condition für ALLE jsdom-Tests, nicht nur diesen Slice.

**Code-Quality: A**
**Regression-Risk: NONE**

---

## Spec-Coverage

| AC | Status | Evidenz |
|----|--------|---------|
| AC-01 [HAPPY] Hook returnt PriceChange7d[] | ✓ | `players-priceChanges.test.tsx:45-59` |
| AC-02 [EMPTY] Disabled bei <2 Items (3 Varianten: undef/[]/[1]) | ✓ | `.test.tsx:61-89` deckt alle 3 Branches |
| AC-03 [ERROR] Service throw statt silent | ✓ | `players-priceChanges.test.ts:33-37` + `players.ts:300-302` |
| AC-04 [LOADING] Konsument zeigt empty-state | ✓ | `useHomeData.test.ts:459-469` |
| AC-05 [REGRESSION] Cache-Dedup mit shared QC | ✓ | `.test.tsx:104-124` mit ein-shared-qc, sortiert ['a','b','c'] vs ['c','b','a'] |
| AC-06 [REGRESSION] topMovers-Shape unverändert | ✓ | `useHomeData.test.ts:432-457` mapping verifiziert |
| AC-07 [TYPE-SAFETY + LINT] tsc + eslint clean | ✓ | Aufgabe-Output bestätigt |
| AC-08 [I18N] keine i18n-Mutation | ✓ | Pure-Backend, keine messages/*.json-Edits |
| AC-09 [ERROR-PROPAGATION] graceful-degrade isError | ✓ | `useHomeData.test.ts:471-488` mit explizitem F-04-Tag |

---

## Pre-Review F-Status (alle 14 Findings)

| # | Sev | Status | Evidenz |
|---|-----|--------|---------|
| F-01 (Barrel-Export) | MAJOR | ✓ resolved | `queries/index.ts:7` `usePlayerPriceChanges7d` re-exportiert |
| F-02 (Wrapper-Template, shared qc) | MAJOR | ✓ resolved | `players-priceChanges.test.tsx:22-34` `createWrapper()` mit `gcTime: Infinity` + `retry: false`; AC-05 ein Wrapper für beide renderHooks |
| F-03 (Test-Touch-Points) | MAJOR | ✓ resolved | `useHomeData.test.ts`: Hook-Mock + vi.mock-queries erweitert + Service-Mock auf `centsToBsd` reduziert + 3 Tests umgebaut |
| F-04 (AC-09 Error-Propagation) | MAJOR | ✓ resolved | AC-09 in Spec, Test mit explizitem Slice-268b-AC-09-Tag |
| F-05 (PowerShell-Quotes §8) | MINOR | ✓ resolved | Spec §8 Quotes |
| F-06 (3-Branch-Service-Logic) | MINOR | ✓ resolved | Service-Test deckt success + throw + null-data ab |
| F-07 (playerIds useMemo) | MINOR | ✓ resolved | `useHomeData.ts:219` |
| F-08 (Cache-Churn) | MINOR | ✓ akzeptiert | Spec §13 #7 + Beta-Telemetrie-Plan |
| F-09 (grep-Hit-Count §8) | MINOR | ✓ resolved | Spec §8 Schätzung 4-5 |
| F-10 (eslint-clean) | MINOR | ✓ resolved | `logSupabaseError`-Import entfernt |
| F-11 (useMemo-Import) | NIT | ✓ resolved | Beide Files |
| F-12 (Persist-Skip-Verifikation) | NIT | ✓ akzeptiert | Spec §10 referenziert |
| F-13 (Test-File-Naming) | NIT | ✓ akzeptiert | Pattern matcht |
| F-14 (retry: 3 default) | NIT | ✓ akzeptiert | Beta-Telemetry-Plan |

---

## Findings (Cold-Context-Review)

| # | Severity | File:Line | Issue | Fix |
|---|----------|-----------|-------|-----|
| F-NEW-01 | NIT | `queries/players.ts:104` | queryFn könnte `playerIds!`-Assertion haben für Doku-Klarheit. | Optional. |
| F-NEW-02 | NIT | `services/players.ts:303` | Pre-existing Cast `(data as PriceChange7d[])` ohne Discriminator. | Out-of-Scope. |
| F-NEW-03 | NIT | `useHomeData.ts:222-234` | `priceChanges ?? []` defensive null-strict-equality (Slice 265) korrekt angewandt. | Lobenswert. |
| F-NEW-04 | NIT | `.npmrc` (NEU) | Watch CI-Run für `pnpm install --frozen-lockfile` Errors. | Watchpoint. |
| F-NEW-05 | NIT | `useHomeData.ts:223` | topMovers-Recompute bei holdings-mutation existing pattern; Beta-Telemetrie-Watchpoint. | Slice-Scope OK. |

**Keine MAJOR/CRITICAL Findings.**

---

## Architektur-Soundness-Check

| Achse | Bewertung |
|-------|-----------|
| Cache-Key deterministic (sort+join) | ✅ matcht `qk.transactions.tradePlayers`-Pattern 1:1 |
| qk-Factory Pattern | ✅ JSDoc dokumentiert Persist-Verhalten |
| Service-Heal: nur Error-Branch | ✅ Success-Path unchanged |
| TanStack-Hook-Stil | ✅ Folgt etabliertem `usePlayers`-Pattern |
| enabled-Gate Schwelle ≥ 2 | ✅ Konsistent mit useHomeData pre-Slice |
| Map/Set-Persist-Risk (Slice 267) | ✅ N/A — plain Array |
| initialData/placeholderData (Slice 268-Pattern) | ✅ Beide vermieden |
| Defensive `?? []` im Konsument | ✅ matcht Slice 265 Pattern |
| Layer 3 UUID_REGEX greift | ✅ Player-IDs UUIDs |
| topMovers-Shape regression-safe | ✅ identisch zu pre-Slice |

---

## Bekannte BeScout-Fallen Check

| Falle | Adressiert? |
|-------|-------------|
| errors-db.md "Service Error-Swallowing" | ✓ |
| errors-frontend.md "Defensive null-strict-equality" (Slice 265) | ✓ |
| errors-frontend.md "Map/Set Persist-Issue" (Slice 267) | ✓ N/A |
| errors-db.md "Silent-Cast ohne Discriminator-Check" | ⚠ Pre-existing — F-NEW-02 |
| errors-frontend.md "TanStack v5 initialData vs placeholderData" | ✓ Beide vermieden |
| performance.md "staleTime" | ✓ FIVE_MIN |

---

## Done-of-Definition (Service-Slice-Type)

- ✅ in 1+ Hook/Query verwendet (`useHomeData.ts:220`)
- ✅ vitest green (5+7+28 = 40 neue/migrierte, 3163/3164 Full-Suite)
- ✅ tsc clean
- ✅ NICHT Money-Path

---

## Side-Effects

### `.npmrc` (NEU)
- Inhalt: `public-hoist-pattern[]=@csstools/*`
- Bewertung: Notwendig + isoliert. Pre-Slice waren ALLE jsdom-vitest-Tests silent-broken.
- Verdict: OK als Pre-Condition-Hygiene.

### Scope-Out Compliance
- ✅ Keine Migration · ✅ Kein Realtime · ✅ Keine andere Konsumenten preempt-built · ✅ Keine i18n.

---

## Compliance: N/A — Pure-Backend.

---

## Positive Highlights

1. Pre-Review-Pattern (D62) hat sich bewahrt — 14 Findings VOR BUILD identifiziert.
2. F-04 (AC-09) explizit kommentiert im Test — Bug-Klasse-Trace transparent.
3. `.npmrc` File-Header ist exemplary — Future-Reader versteht warum.
4. JSDoc auf qk + Hook — Persist-Verhalten + Caller-Stability dokumentiert.
5. Test-Schichtung sauber: Service (Node), Hook (jsdom + Wrapper), Konsument (jsdom + vi.hoisted).
6. Defensive null-strict-equality korrekt — `priceChanges ?? []`.

---

## Learnings für Knowledge Capture

### Pattern-Promotion-Kandidaten

1. **TanStack-Query-Hook für deterministisch-keyed Multi-ID Aggregat-RPC** → `memory/patterns.md` Kandidat.
2. **`.npmrc` public-hoist-pattern für jsdom 28** → `errors-infra.md` Kandidat.
3. **Pre-Review-Memo (D62) ROI-Bestätigung** — Cold-Context-Review ~60→40 min reduziert.

### Knowledge-Flywheel-Vorschlag

- **Service-Cast-Discriminator-Check** (F-NEW-02): systematische Future-Slice für Player-Service-Cast-Hardening.

---

**Verdict:** PASS
**Code-Quality-Grade:** A
**Regression-Risk:** NONE
**Time-Spent:** ~40 min

**Signed:** Cold-Context-Reviewer · Slice 268b Post-BUILD Review · 2026-05-04
