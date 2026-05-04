# Pre-Review: Slice 268 — Price-Changes-Cache

**Spec:** `worklog/specs/268-price-changes-cache.md`
**Reviewer:** Cold-Context-Reviewer (D62 Pre-Review-Pattern, BEFORE BUILD)
**Datum:** 2026-05-04
**Time-spent:** ~35 min

---

## Verdict: **CONCERNS**

Spec ist architektonisch solide und folgt etablierten BeScout-Patterns (Cache-Key wie `qk.transactions.tradePlayers`, FIVE_MIN staleTime wie `useTradePlayerMap`, enabled-Schwelle ≥ 2 mappt 1:1 auf existing useHomeData-Logic). Drei MAJOR-Findings betreffen Test-Methodologie und ein vergessener Barrel-Export — alle behebbar in BUILD ohne Architektur-Änderung. **Kein FAIL/REWORK** — Spec ist freigabefähig nach kurzer Klarstellung der unten genannten Punkte.

---

## Spec-Quality-Grade: **B+**

| Kriterium | Soll (S-Slice) | Ist | Bewertung |
|-----------|---------------|-----|-----------|
| Pflicht-Sektionen | 13 | 13 + Compliance + TR-Wording-Vorab + Open-Risiko | A |
| Code-Reading-Liste | ≥ 6 Items | 7 Items | A |
| ACs (executable) | ≥ 6 | 8 mit VERIFY/EXPECTED/FAIL IF | A |
| Edge-Cases-Table | ≥ 6 | 10 Edge-Cases | A |
| Pattern-References | relevant + nicht spammy | 6 References, alle relevant | A |
| Self-Verification | echte Commands | 4 Commands, davon 1 PowerShell-incompatible | B |
| Pre-Mortem | 5+ bei L | 5 bei S (optional) | A |
| Slice-Type-Header | Pflicht D54 | "Service" | A |
| Open-Questions Pflicht/Autonom-Trennung | klar | klar getrennt | A |
| Money-Path-Wording | wenn relevant | N/A korrekt deklariert | A |
| Test-Mock-Migration-Detail | konkret pro Touch-Point | unspezifisch | C |

**Warum B+ und nicht A:** Test-Mock-Migration in `useHomeData.test.ts` ist mit 4+ Touch-Points nicht trivial, Spec behandelt das in §3 als 1-Zeilen-Hint. Self-Verification-Commands haben PowerShell-Inkompatibilität. Zwei MAJOR-Findings sind echte Build-Risiken die in der Spec klarer hätten sein können.

---

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| F-01 | MAJOR | §2 + §3 | Barrel-Export `src/lib/queries/index.ts` fehlt in betroffenen Files. `useHomeData.ts:10-15` importiert via `from '@/lib/queries'`. Ohne Barrel-Update kompiliert Konsument-Migration nicht. | §3 ergänzen: `src/lib/queries/index.ts` EDIT, `usePlayerPriceChanges7d` re-exportieren. |
| F-02 | MAJOR | §6 AC-05 | Test-Pattern-Risiko: keine Wrapper-Template-Definition. Wenn renderHook pro Call neuen QueryClient erstellt, dedupiert TanStack NICHT. 0 TanStack-Hook-Tests in `src/lib/queries/__tests__/` existieren. | §9 Autonom-Zone konkretisieren: Wrapper-Template `const qc = new QueryClient(); const wrapper = ...QueryClientProvider client={qc}` — beide renderHook-Calls MÜSSEN dasselbe qc teilen. |
| F-03 | MAJOR | §3 + §6 AC-04 | Test-Mock-Migration in useHomeData.test.ts ist nicht trivial. Z.111-115 mockGetPlayerPriceChanges7d wird DEAD CODE. Z.50-64 `vi.mock('@/lib/queries')` muss erweitert werden. Z.417-443 zwei Tests umbauen auf `mockUsePlayerPriceChanges7d.mockReturnValue({ data: [...] })`. | §3 ergänzen: konkrete Test-Touch-Points enumerieren (Z.50-64 erweitern, Z.111-115 entfernen, Z.417-443 zwei Tests umbauen). |
| F-04 | MAJOR | §6 ACs | Fehlender AC: Error-State-Propagation. Bei isError + data===undefined muss Konsument graceful-degrade machen. Ohne expliziten Error-AC: Crash bei `.map(...)`. | AC-09 hinzufügen: `[ERROR-PROPAGATION] Hook isError === true → topMovers === [] (kein Crash)`. |
| F-05 | MINOR | §8 | Powershell-Inkompatibilität: backslash-escaped parens funktionieren nicht. CLAUDE.md/Default-Shell ist PowerShell. | Quoten statt escapen: `npx vitest run "src/app/(app)/hooks/__tests__/useHomeData.test.ts"`. |
| F-06 | MINOR | §6 AC-03 + §11 | Service-Test deckt nicht alle Edge-Cases. Bei `data === null && error === null` (PostgREST-Quirk): aktueller Service `?? []` returnt []. Heal ändert NUR Error-Branch, Success-Path bleibt fallback-fähig. | §2 tabellarisch klären: "Vorher: error→[]; data===null→[] | Nachher: error→throw; data===null→[] (unverändert)". Service-Test 3 Cases. |
| F-07 | MINOR | §2 + §13 | playerIds-Reference-Stability nicht garantiert. Wenn Konsument bei jedem Render neuen Array-Ref erzeugt, recomputet useMemo identisches output aber wasted CPU. | §9 Autonom-Zone: Konsument MUSS `playerIds = useMemo(() => holdings.map(h => h.playerId), [holdings])`. Pre-Mortem #6 ergänzen. |
| F-08 | MINOR | §13 | Trade-Aktivität führt zu Cache-Churn. Aktiv-Tradende User: 5 Holdings → Verkauf → 4 Holdings = neuer Key = neuer RPC. | Pre-Mortem #6: Cache-Effizienz hängt von Holdings-Stabilität ab. Beta-Telemetrie messen. |
| F-09 | MINOR | §8 | grep-Hit-Count Schätzung leicht falsch. Realistisch: 4-5 Hits nicht 5-6. | "Wenn `useHomeData.ts` noch in Liste: Migration unvollständig". |
| F-10 | MINOR | §6 AC-08 + §9 | Aufräum-Schritt fehlt: `logSupabaseError`-Import in useHomeData.ts. Nach Hook-Migration ist try-catch weg. | AC-07 erweitern: `tsc clean + eslint clean (unused-imports)`. |
| F-11 | NIT | §2 | Fehlende `useMemo` import-Anweisung im Spec-Code-Block. | Trivial, Implementer wird's bemerken. |
| F-12 | NIT | §11 | Anschluss-Slice-Hinweis fehlt für Persist-Cache-Verifikation. | §10 Proof-Plan ergänzen: localStorage-Inspection. |
| F-13 | NIT | §3 | Test-File-Naming-Inkonsistenz. `players-priceChanges` vs Codebase `getHoldings-ghost-filter` — beide hyphenated. | Pattern existiert. Kein Fix nötig. |
| F-14 | NIT | §13 | TanStack-default `retry: 3` Erwähnung — aber Spec setzt nicht explizit. Bei flaky-RPC: 3× Roundtrip Battery-Cost. | §9 Autonom-Zone: retry-default belassen UND PROVE-Stage Telemetrie-Plan ODER retry: 1 von Anfang an. |

---

## Architektur-Soundness-Check

| Frage | Antwort |
|-------|---------|
| Cache-Key deterministic? | ✅ `playerIds.slice().sort().join(',')` — konsistent zu `qk.transactions.tradePlayers` (`keys.ts:171`). |
| QueryProvider Layer 3 UUID_REGEX greift? | ✅ Player-IDs sind UUIDs → persist-skip (Layer 3). |
| `enabled: playerIds.length >= 2` konsistent? | ✅ Match exakt useHomeData.ts:216. |
| Service-Heal bricht andere Konsumenten? | ✅ Grep bestätigt: nur 1 Konsument + Test-Mock. |
| Map/Set-typed React-Query-Data Risiko (Slice 267)? | ✅ Plain Array, Layer 4 Filter unnötig. |
| `initialData` vs `placeholderData` Trap (Slice 268-Doku)? | ✅ Hook nutzt weder — pure server-fetch. |

---

## Estimated-Build-Effort: **S+ (60-90 min)**

- keys.ts qk-Sektion: 5 min
- Service-Heal + Service-Test: 15 min
- Hook + Hook-Test (mit Wrapper-Template): 25 min
- Konsument-Migration: 10 min
- Test-Mock-Migration (4+ Touch-Points): 15-20 min
- Barrel-Export: 2 min
- tsc + Pre-Commit + Self-Verification: 10 min

**Total realistic: ~80 min.**

---

## Empfehlung an den Implementer

VOR BUILD diese Spec-Patches einarbeiten (alle non-architectural):

1. **F-01**: §3 Files-Tabelle → `src/lib/queries/index.ts` als EDIT.
2. **F-02**: §9 Autonom-Zone → Wrapper-Template für Hook-Test konkretisieren.
3. **F-03**: §3 Files-Tabelle → konkrete Test-Touch-Points (Z.50-64, Z.111-115, Z.417-443).
4. **F-04**: §6 → AC-09 Error-Propagation.
5. **F-05**: §8 Commands → Quotes statt backslash-Escape.
6. **F-06**: §2 → 3 Service-Branches tabellarisch.
7. **F-10**: §6 AC-07 → eslint-clean nach Migration.

**Signed:** Cold-Context-Reviewer · Slice 268 Pre-Review · 2026-05-04
